-- ============================================================================
-- Sistema Multi-Barbeiros (2+ cadeiras independentes, comissões e painel exclusivo)
-- Data: 2026-11-21
-- Nota: 100% idempotente e seguro para executar em bloco único no SQL Editor.
-- ============================================================================

-- 1. Tabela de Barbeiros
CREATE TABLE IF NOT EXISTS public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 50.00
    CHECK (commission_percent >= 0 AND commission_percent <= 100),
  is_owner BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_open_today BOOLEAN NOT NULL DEFAULT true,
  notify_push BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barbers_user_id ON public.barbers(user_id);
CREATE INDEX IF NOT EXISTS idx_barbers_active_order ON public.barbers(is_active, display_order);

-- Trigger updated_at em barbers
DROP TRIGGER IF EXISTS update_barbers_updated_at ON public.barbers;
CREATE TRIGGER update_barbers_updated_at
  BEFORE UPDATE ON public.barbers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Funções auxiliares (SECURITY DEFINER, sem depender de alterar enum app_role na mesma transação)
CREATE OR REPLACE FUNCTION public.get_my_barber_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.barbers
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_barber(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.barbers
    WHERE user_id = _user_id
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_default_barber_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.barbers
  WHERE is_active = true
  ORDER BY is_owner DESC, display_order ASC, created_at ASC
  LIMIT 1;
$$;

-- 3. Seed automático do Barbeiro Dono ("Alan Delon") caso ainda não exista
INSERT INTO public.barbers (user_id, name, bio, commission_percent, is_owner, is_active, display_order)
SELECT
  (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' ORDER BY ur.created_at ASC LIMIT 1),
  'Alan Delon',
  'Proprietário · Master Barber',
  100.00,
  true,
  true,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM public.barbers WHERE is_owner = true
);

-- 4. Adicionar barber_id nas tabelas principais + backfill para o dono
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS commission_percent_at_booking NUMERIC(5,2);

ALTER TABLE public.blocked_slots
  ADD COLUMN IF NOT EXISTS barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE;

ALTER TABLE public.business_hours
  ADD COLUMN IF NOT EXISTS barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE;

ALTER TABLE public.client_packages
  ADD COLUMN IF NOT EXISTS barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL;

ALTER TABLE public.client_packages
  ADD COLUMN IF NOT EXISTS price_at_purchase NUMERIC;

-- Índices por barbeiro
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date
  ON public.appointments(barber_id, appointment_date, status);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_barber_date
  ON public.blocked_slots(barber_id, blocked_date, blocked_time);

CREATE INDEX IF NOT EXISTS idx_client_packages_barber
  ON public.client_packages(barber_id, user_id, status);

-- Backfill de registros existentes para o barbeiro dono + congelamento histórico de preços e comissões
DO $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT public.get_default_barber_id() INTO v_owner_id;
  IF v_owner_id IS NOT NULL THEN
    UPDATE public.appointments
    SET barber_id = v_owner_id
    WHERE barber_id IS NULL;

    UPDATE public.blocked_slots bs
    SET barber_id = COALESCE(
      (SELECT a.barber_id FROM public.appointments a WHERE a.id = bs.appointment_id),
      v_owner_id
    )
    WHERE bs.barber_id IS NULL;

    UPDATE public.client_packages
    SET barber_id = v_owner_id
    WHERE barber_id IS NULL;
  END IF;

  -- Congela comissão histórica nos agendamentos já existentes
  UPDATE public.appointments a
  SET commission_percent_at_booking = CASE
    WHEN b.is_owner THEN 100.00
    ELSE b.commission_percent
  END
  FROM public.barbers b
  WHERE a.barber_id = b.id
    AND a.commission_percent_at_booking IS NULL;

  -- Congela preço histórico nas assinaturas já existentes
  UPDATE public.client_packages cp
  SET price_at_purchase = p.price
  FROM public.packages p
  WHERE cp.package_id = p.id
    AND cp.price_at_purchase IS NULL;
END $$;

-- 4b. Triggers de snapshot histórico: comissão do barbeiro e preço da assinatura
-- Garantem que reajustes futuros não alterem relatórios/registros passados.
CREATE OR REPLACE FUNCTION public.ensure_appointment_commission_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barber_id UUID;
  v_rate NUMERIC(5,2);
BEGIN
  v_barber_id := COALESCE(NEW.barber_id, public.get_default_barber_id());

  IF TG_OP = 'INSERT' THEN
    IF NEW.commission_percent_at_booking IS NULL THEN
      SELECT CASE WHEN b.is_owner THEN 100.00 ELSE b.commission_percent END
      INTO v_rate
      FROM public.barbers b
      WHERE b.id = v_barber_id;

      NEW.commission_percent_at_booking := COALESCE(v_rate, 50.00);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.commission_percent_at_booking IS NULL
       OR (OLD.barber_id IS DISTINCT FROM NEW.barber_id
           AND NEW.commission_percent_at_booking IS NOT DISTINCT FROM OLD.commission_percent_at_booking)
    THEN
      SELECT CASE WHEN b.is_owner THEN 100.00 ELSE b.commission_percent END
      INTO v_rate
      FROM public.barbers b
      WHERE b.id = v_barber_id;

      NEW.commission_percent_at_booking := COALESCE(v_rate, 50.00);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_appointment_commission_snapshot ON public.appointments;
CREATE TRIGGER trg_ensure_appointment_commission_snapshot
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_appointment_commission_snapshot();

CREATE OR REPLACE FUNCTION public.ensure_client_package_price_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg_price NUMERIC;
BEGIN
  IF NEW.price_at_purchase IS NULL THEN
    SELECT price INTO v_pkg_price
    FROM public.packages
    WHERE id = NEW.package_id;

    NEW.price_at_purchase := COALESCE(v_pkg_price, 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_client_package_price_snapshot ON public.client_packages;
CREATE TRIGGER trg_ensure_client_package_price_snapshot
  BEFORE INSERT ON public.client_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_client_package_price_snapshot();

-- 5. Atualizar constraints únicas de blocked_slots e business_hours para suportar múltiplos barbeiros
-- 5a. Remover antiga UNIQUE(blocked_date, blocked_time) em blocked_slots
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  FOR v_conname IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.blocked_slots'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.blocked_slots DROP CONSTRAINT %I', v_conname);
  END LOOP;
END $$;

-- Remover eventuais duplicatas exatas antes de criar a nova constraint
DELETE FROM public.blocked_slots a
USING public.blocked_slots b
WHERE a.id > b.id
  AND a.blocked_date = b.blocked_date
  AND a.blocked_time = b.blocked_time
  AND a.barber_id IS NOT DISTINCT FROM b.barber_id;

ALTER TABLE public.blocked_slots
  ADD CONSTRAINT blocked_slots_date_time_barber_unique
  UNIQUE (blocked_date, blocked_time, barber_id);

-- 5b. Remover antiga UNIQUE(day_of_week) em business_hours e criar índices parciais (geral vs por barbeiro)
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  FOR v_conname IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.business_hours'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.business_hours DROP CONSTRAINT %I', v_conname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_hours_global_day
  ON public.business_hours(day_of_week)
  WHERE barber_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_hours_barber_day
  ON public.business_hours(day_of_week, barber_id)
  WHERE barber_id IS NOT NULL;

-- 6. Trigger para garantir barber_id padrão em blocked_slots se vier NULL
CREATE OR REPLACE FUNCTION public.ensure_blocked_slot_barber()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.barber_id IS NULL THEN
    IF NEW.appointment_id IS NOT NULL THEN
      SELECT barber_id INTO NEW.barber_id FROM public.appointments WHERE id = NEW.appointment_id;
    END IF;
    IF NEW.barber_id IS NULL THEN
      NEW.barber_id := public.get_default_barber_id();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_blocked_slot_barber ON public.blocked_slots;
CREATE TRIGGER trg_ensure_blocked_slot_barber
  BEFORE INSERT ON public.blocked_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_blocked_slot_barber();

-- 7. Atualizar validação de conflito em appointments (conflito ISOLADO por barber_id / cadeira!)
CREATE OR REPLACE FUNCTION public.validate_appointment_no_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_start TIME;
  new_end   TIME;
  conflicting RECORD;
  bh RECORD;
  dow_int INT;
BEGIN
  -- Garante barber_id padrão (barbeiro dono) se não especificado
  IF NEW.barber_id IS NULL THEN
    NEW.barber_id := public.get_default_barber_id();
  ELSIF TG_OP = 'INSERT' AND NEW.status IN ('pending', 'confirmed') AND NOT EXISTS (
    SELECT 1 FROM public.barbers WHERE id = NEW.barber_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'BARBER_UNAVAILABLE: O profissional selecionado não está disponível no momento';
  END IF;

  IF NEW.status NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  -- Encaixe / Corte Externo: bypass intencional de todas as regras
  IF NEW.is_force_booking IS TRUE THEN
    RETURN NEW;
  END IF;

  -- Em UPDATE: só revalida se data/hora/duração/barbeiro mudou ou se o agendamento foi reativado.
  IF TG_OP = 'UPDATE'
     AND OLD.status IN ('pending','confirmed')
     AND OLD.appointment_date = NEW.appointment_date
     AND OLD.appointment_time = NEW.appointment_time
     AND OLD.total_duration IS NOT DISTINCT FROM NEW.total_duration
     AND OLD.barber_id IS NOT DISTINCT FROM NEW.barber_id
  THEN
    RETURN NEW;
  END IF;

  new_start := NEW.appointment_time::TIME;
  new_end   := new_start + (COALESCE(NEW.total_duration, 30) * INTERVAL '1 minute');
  dow_int   := EXTRACT(DOW FROM NEW.appointment_date::DATE)::int;

  -- ===== Validação de horário de funcionamento e almoço (por barbeiro, fallback geral) =====
  SELECT * INTO bh
  FROM public.business_hours
  WHERE day_of_week = dow_int
    AND barber_id = NEW.barber_id
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO bh
    FROM public.business_hours
    WHERE day_of_week = dow_int
      AND barber_id IS NULL
    LIMIT 1;
  END IF;

  IF NOT FOUND OR bh.is_open IS NOT TRUE THEN
    RAISE EXCEPTION 'CLOSED_DAY: O estabelecimento não atende neste dia da semana (dia %, data %)',
      dow_int, NEW.appointment_date;
  END IF;

  IF new_start < bh.open_time::TIME OR new_end > bh.close_time::TIME THEN
    RAISE EXCEPTION 'OUTSIDE_HOURS: Horário fora do expediente. Expediente: % às %. Solicitado: % até %',
      to_char(bh.open_time::TIME, 'HH24:MI'), to_char(bh.close_time::TIME, 'HH24:MI'),
      to_char(new_start, 'HH24:MI'), to_char(new_end, 'HH24:MI');
  END IF;

  IF bh.lunch_start IS NOT NULL AND bh.lunch_end IS NOT NULL
     AND bh.lunch_start::TIME < bh.lunch_end::TIME
     AND new_start < bh.lunch_end::TIME AND new_end > bh.lunch_start::TIME THEN
    RAISE EXCEPTION 'LUNCH_BREAK: Horário indisponível - intervalo das % às %',
      to_char(bh.lunch_start::TIME, 'HH24:MI'), to_char(bh.lunch_end::TIME, 'HH24:MI');
  END IF;

  -- ===== Conflito com outros agendamentos DO MESMO BARBEIRO (cadeira independente!) =====
  SELECT a.id, a.appointment_time, a.total_duration
  INTO conflicting
  FROM public.appointments a
  WHERE a.appointment_date = NEW.appointment_date
    AND a.barber_id IS NOT DISTINCT FROM NEW.barber_id
    AND a.status IN ('pending', 'confirmed')
    AND a.id != NEW.id
    AND new_start < (a.appointment_time::TIME + (COALESCE(a.total_duration, 30) * INTERVAL '1 minute'))
    AND a.appointment_time::TIME < new_end
  LIMIT 1;

  IF conflicting.id IS NOT NULL THEN
    RAISE EXCEPTION 'SLOT_CONFLICT: Horário % já está ocupado para este profissional', NEW.appointment_time;
  END IF;

  -- ===== Bloqueios manuais DO MESMO BARBEIRO =====
  IF EXISTS (
    SELECT 1 FROM public.blocked_slots bs
    WHERE bs.blocked_date = NEW.appointment_date
      AND bs.barber_id IS NOT DISTINCT FROM NEW.barber_id
      AND bs.is_manual = true
      AND bs.blocked_time >= new_start
      AND bs.blocked_time < new_end
  ) THEN
    RAISE EXCEPTION 'SLOT_BLOCKED: O horário % está bloqueado manualmente', NEW.appointment_time;
  END IF;

  RETURN NEW;
END;
$$;

-- 8. Atualizar sync_blocked_slots para gravar e atualizar respeitando barber_id
CREATE OR REPLACE FUNCTION public.sync_blocked_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_offset     INTEGER := 0;
  slot_time       TIME;
  dur             INTEGER;
  v_barber_id     UUID;
BEGIN
  v_barber_id := COALESCE(NEW.barber_id, public.get_default_barber_id());

  -- ── Ativação: agendamento passou para pending/confirmed ──
  IF NEW.status IN ('pending', 'confirmed')
     AND (OLD IS NULL OR OLD.status NOT IN ('pending', 'confirmed'))
  THEN
    dur       := COALESCE(NEW.total_duration, 30);
    slot_time := NEW.appointment_time::TIME;

    WHILE slot_offset < dur LOOP
      INSERT INTO public.blocked_slots
        (blocked_date, blocked_time, reason, is_manual, appointment_id, barber_id)
      VALUES
        (NEW.appointment_date, slot_time, 'Agendamento', false, NEW.id, v_barber_id)
      ON CONFLICT (blocked_date, blocked_time, barber_id)
        DO UPDATE
          SET appointment_id = NEW.id,
              reason         = 'Agendamento',
              is_manual      = false
        WHERE blocked_slots.appointment_id IS NULL
           OR blocked_slots.appointment_id = NEW.id;

      slot_time   := slot_time + INTERVAL '30 minutes';
      slot_offset := slot_offset + 30;
    END LOOP;
  END IF;

  -- ── Desativação: agendamento foi cancelado/concluído/no-show ──
  IF NEW.status IN ('cancelled', 'completed', 'no_show')
     AND OLD IS NOT NULL
     AND OLD.status IN ('pending', 'confirmed')
  THEN
    DELETE FROM public.blocked_slots
    WHERE appointment_id = NEW.id
      AND is_manual = false;
  END IF;

  -- ── Reagendamento ou troca de barbeiro enquanto ativo ──
  IF OLD IS NOT NULL
     AND NEW.status IN ('pending', 'confirmed')
     AND OLD.status IN ('pending', 'confirmed')
     AND (OLD.appointment_date != NEW.appointment_date
          OR OLD.appointment_time != NEW.appointment_time
          OR OLD.total_duration IS DISTINCT FROM NEW.total_duration
          OR OLD.barber_id IS DISTINCT FROM NEW.barber_id)
  THEN
    DELETE FROM public.blocked_slots
    WHERE appointment_id = NEW.id
      AND is_manual = false;

    dur         := COALESCE(NEW.total_duration, 30);
    slot_time   := NEW.appointment_time::TIME;
    slot_offset := 0;

    WHILE slot_offset < dur LOOP
      INSERT INTO public.blocked_slots
        (blocked_date, blocked_time, reason, is_manual, appointment_id, barber_id)
      VALUES
        (NEW.appointment_date, slot_time, 'Agendamento', false, NEW.id, v_barber_id)
      ON CONFLICT (blocked_date, blocked_time, barber_id)
        DO UPDATE
          SET appointment_id = NEW.id,
              reason         = 'Agendamento',
              is_manual      = false
        WHERE blocked_slots.appointment_id IS NULL
           OR blocked_slots.appointment_id = NEW.id;

      slot_time   := slot_time + INTERVAL '30 minutes';
      slot_offset := slot_offset + 30;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Ressincronizar blocked_slots existentes com barber_id correto
DELETE FROM public.blocked_slots WHERE is_manual = false;

DO $$
DECLARE
  apt         RECORD;
  slot_offset INTEGER;
  slot_time   TIME;
  dur         INTEGER;
  v_barber    UUID;
BEGIN
  FOR apt IN
    SELECT id, appointment_date, appointment_time, total_duration, barber_id
    FROM public.appointments
    WHERE status IN ('pending', 'confirmed')
    ORDER BY appointment_date, appointment_time
  LOOP
    v_barber    := COALESCE(apt.barber_id, public.get_default_barber_id());
    dur         := COALESCE(apt.total_duration, 30);
    slot_time   := apt.appointment_time::TIME;
    slot_offset := 0;

    WHILE slot_offset < dur LOOP
      INSERT INTO public.blocked_slots
        (blocked_date, blocked_time, reason, is_manual, appointment_id, barber_id)
      VALUES
        (apt.appointment_date, slot_time, 'Agendamento', false, apt.id, v_barber)
      ON CONFLICT (blocked_date, blocked_time, barber_id)
        DO UPDATE
          SET appointment_id = apt.id,
              reason = 'Agendamento',
              is_manual = false
        WHERE blocked_slots.appointment_id IS NULL
           OR blocked_slots.appointment_id = apt.id;

      slot_time   := slot_time + INTERVAL '30 minutes';
      slot_offset := slot_offset + 30;
    END LOOP;
  END LOOP;
END $$;

-- 9. RPC pública para buscar horários ocupados por barbeiro (sem expor PII de clientes)
CREATE OR REPLACE FUNCTION public.get_barber_booked_slots(p_date DATE, p_barber_id UUID)
RETURNS TABLE(slot_time TIME)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barber UUID;
  apt RECORD;
  cur TIME;
  end_t TIME;
BEGIN
  v_barber := COALESCE(p_barber_id, public.get_default_barber_id());

  -- Retorna slots vindos dos agendamentos ativos daquele barbeiro
  FOR apt IN
    SELECT a.appointment_time::TIME AS start_t,
           COALESCE(a.total_duration, 30) AS dur
    FROM public.appointments a
    WHERE a.appointment_date = p_date
      AND a.barber_id IS NOT DISTINCT FROM v_barber
      AND a.status IN ('pending', 'confirmed')
  LOOP
    cur := apt.start_t;
    end_t := apt.start_t + (apt.dur * INTERVAL '1 minute');
    WHILE cur < end_t LOOP
      slot_time := cur;
      RETURN NEXT;
      cur := cur + INTERVAL '30 minutes';
    END LOOP;
  END LOOP;

  -- Retorna também os bloqueios (manuais ou automáticos) daquele barbeiro
  RETURN QUERY
  SELECT DISTINCT bs.blocked_time::TIME AS slot_time
  FROM public.blocked_slots bs
  WHERE bs.blocked_date = p_date
    AND bs.barber_id IS NOT DISTINCT FROM v_barber;
END;
$$;

-- 10. RPC para o próprio barbeiro consultar seus dados e alternar status Aberto/Fechado da sua cadeira
CREATE OR REPLACE FUNCTION public.get_my_barber_profile()
RETURNS SETOF public.barbers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.barbers
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.toggle_my_barber_status()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status BOOLEAN;
BEGIN
  UPDATE public.barbers
  SET is_open_today = NOT is_open_today,
      updated_at = now()
  WHERE user_id = auth.uid()
    AND is_active = true
  RETURNING is_open_today INTO v_new_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barbeiro não encontrado para o usuário logado';
  END IF;

  RETURN v_new_status;
END;
$$;

ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS notify_push BOOLEAN NOT NULL DEFAULT true;

-- 10b. RPC para o barbeiro alternar notificação Push de novos agendamentos
CREATE OR REPLACE FUNCTION public.toggle_my_barber_notify_push(p_enabled BOOLEAN DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status BOOLEAN;
BEGIN
  UPDATE public.barbers
  SET notify_push = COALESCE(p_enabled, NOT notify_push),
      updated_at = now()
  WHERE user_id = auth.uid()
    AND is_active = true
  RETURNING notify_push INTO v_new_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barbeiro não encontrado para o usuário logado';
  END IF;

  RETURN v_new_status;
END;
$$;

-- 11. RPC exclusiva do Admin para vincular conta auth (por e-mail) ao barbeiro e confirmar o e-mail
CREATE OR REPLACE FUNCTION public.admin_assign_barber_account(p_barber_id UUID, p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_barber RECORD;
  v_clean_email TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Apenas administradores podem vincular contas de barbeiros';
  END IF;

  v_clean_email := lower(trim(p_email));
  IF v_clean_email = '' THEN
    RAISE EXCEPTION 'INVALID_EMAIL: E-mail inválido';
  END IF;

  SELECT * INTO v_barber FROM public.barbers WHERE id = p_barber_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BARBER_NOT_FOUND: Barbeiro não encontrado';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = v_clean_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND: Nenhuma conta encontrada com o e-mail %', v_clean_email;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.barbers WHERE user_id = v_user_id AND id != p_barber_id
  ) THEN
    RAISE EXCEPTION 'USER_ALREADY_LINKED: Este e-mail já está vinculado a outro barbeiro';
  END IF;

  -- Confirmar e-mail automaticamente para liberar login imediato (ignora se sem permissão)
  BEGIN
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Garantir perfil existente para a conta
  INSERT INTO public.profiles (user_id, name, phone, avatar_url)
  VALUES (v_user_id, v_barber.name, v_barber.phone, v_barber.avatar_url)
  ON CONFLICT (user_id) DO UPDATE
    SET name = COALESCE(NULLIF(profiles.name, ''), EXCLUDED.name),
        phone = COALESCE(NULLIF(profiles.phone, ''), EXCLUDED.phone);

  UPDATE public.barbers
  SET user_id = v_user_id,
      email = v_clean_email,
      updated_at = now()
  WHERE id = p_barber_id;

  RETURN v_user_id;
END;
$$;

-- 12. Atualizar triggers de notificação para incluir nome do barbeiro e notificar o barbeiro escolhido
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_name TEXT;
  barber_name TEXT;
  barber_uid  UUID;
  apt_time    TEXT;
  msg_text    TEXT;
BEGIN
  IF NEW.guest_name IS NOT NULL AND trim(NEW.guest_name) <> '' THEN
    client_name := NEW.guest_name;
  ELSE
    SELECT name INTO client_name FROM public.profiles WHERE user_id = NEW.user_id;
    IF client_name IS NULL OR trim(client_name) = '' THEN
      client_name := 'Novo cliente';
    END IF;
  END IF;

  SELECT b.name, b.user_id INTO barber_name, barber_uid
  FROM public.barbers b
  WHERE b.id = NEW.barber_id;

  apt_time := to_char(NEW.appointment_time::time, 'HH24:MI');
  msg_text := client_name || ' agendou'
    || COALESCE(' com ' || barber_name, '')
    || ' para ' || to_char(NEW.appointment_date, 'DD/MM/YYYY')
    || ' às ' || apt_time;

  -- Notifica todos os admins
  INSERT INTO public.notifications (user_id, title, message, type, appointment_id)
  SELECT ur.user_id, '📅 Novo Agendamento', msg_text, 'info', NEW.id
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  -- Notifica também o barbeiro do atendimento (caso não seja admin para evitar duplicata)
  IF barber_uid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = barber_uid AND ur.role = 'admin'
  ) THEN
    INSERT INTO public.notifications (user_id, title, message, type, appointment_id)
    VALUES (barber_uid, '📅 Novo Agendamento', msg_text, 'info', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_push_on_new_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_name  TEXT;
  barber_name  TEXT;
  barber_uid   UUID;
  barber_push  BOOLEAN;
  apt_time     TEXT;
  apt_date     TEXT;
  msg_text     TEXT;
  request_id   BIGINT;
  function_url TEXT;
  anon_key     TEXT;
BEGIN
  IF NEW.guest_name IS NOT NULL AND trim(NEW.guest_name) <> '' THEN
    client_name := NEW.guest_name;
  ELSE
    SELECT name INTO client_name FROM public.profiles WHERE user_id = NEW.user_id;
    IF client_name IS NULL OR trim(client_name) = '' THEN
      client_name := 'Novo cliente';
    END IF;
  END IF;

  SELECT b.name, b.user_id, COALESCE(b.notify_push, true)
  INTO barber_name, barber_uid, barber_push
  FROM public.barbers b
  WHERE b.id = NEW.barber_id;

  apt_time := to_char(NEW.appointment_time::time, 'HH24:MI');
  apt_date := to_char(NEW.appointment_date, 'DD/MM/YYYY');
  msg_text := client_name || ' agendou'
    || COALESCE(' com ' || barber_name, '')
    || ' para ' || apt_date || ' às ' || apt_time;

  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push';
  anon_key := current_setting('app.settings.anon_key', true);

  IF function_url IS NULL OR function_url = '/functions/v1/send-push' OR anon_key IS NULL OR anon_key = '' THEN
    function_url := 'https://etfujmuzwzzhztucqbek.supabase.co/functions/v1/send-push';
    anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJldGZ1am11end6emh6dHVjcWJlayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY3ODIwNzU0LCJleHAiOjIwODMzOTY3NTR9.J0EQtBMyiVchphMa3OijiPjr7j3l44oFlMPkfXAFYo0';
  END IF;

  -- Push para Admins
  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
    ),
    body := jsonb_build_object(
      'role', 'admin',
      'title', '📅 Novo Agendamento',
      'message', msg_text,
      'url', '/admin/agenda',
      'data', jsonb_build_object('appointment_id', NEW.id, 'barber_id', NEW.barber_id)
    ),
    timeout_milliseconds := 5000
  ) INTO request_id;

  -- Push exclusivo para o Barbeiro específico quando notify_push = true (caso não seja admin)
  IF barber_uid IS NOT NULL
     AND COALESCE(barber_push, true) IS TRUE
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur WHERE ur.user_id = barber_uid AND ur.role = 'admin'
     )
  THEN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key,
        'apikey', anon_key
      ),
      body := jsonb_build_object(
        'role', 'barber',
        'user_id', barber_uid,
        'title', '📅 Novo Agendamento para Você',
        'message', msg_text,
        'url', '/barber/agenda',
        'data', jsonb_build_object('appointment_id', NEW.id, 'barber_id', NEW.barber_id)
      ),
      timeout_milliseconds := 5000
    ) INTO request_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 13. RLS Policies — Barbers & Isolamento Estrito Admin vs Barbeiro
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active barbers" ON public.barbers;
CREATE POLICY "Public can view active barbers" ON public.barbers
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Barbers can view own record" ON public.barbers;
CREATE POLICY "Barbers can view own record" ON public.barbers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all barbers" ON public.barbers;
CREATE POLICY "Admins can manage all barbers" ON public.barbers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Appointments: barbeiro vê, cria, atualiza e exclui APENAS agendamentos da sua cadeira
DROP POLICY IF EXISTS "Barbers can view own barber appointments" ON public.appointments;
CREATE POLICY "Barbers can view own barber appointments" ON public.appointments
  FOR SELECT USING (barber_id = public.get_my_barber_id());

DROP POLICY IF EXISTS "Barbers can insert own barber appointments" ON public.appointments;
CREATE POLICY "Barbers can insert own barber appointments" ON public.appointments
  FOR INSERT WITH CHECK (barber_id = public.get_my_barber_id());

DROP POLICY IF EXISTS "Barbers can update own barber appointments" ON public.appointments;
CREATE POLICY "Barbers can update own barber appointments" ON public.appointments
  FOR UPDATE
  USING (barber_id = public.get_my_barber_id())
  WITH CHECK (barber_id = public.get_my_barber_id());

DROP POLICY IF EXISTS "Barbers can delete own barber appointments" ON public.appointments;
CREATE POLICY "Barbers can delete own barber appointments" ON public.appointments
  FOR DELETE USING (barber_id = public.get_my_barber_id());

-- Appointment services: barbeiro gerencia serviços dos seus agendamentos
DROP POLICY IF EXISTS "Barbers can manage own appointment services" ON public.appointment_services;
CREATE POLICY "Barbers can manage own appointment services" ON public.appointment_services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_services.appointment_id
        AND a.barber_id = public.get_my_barber_id()
    )
  );

-- Blocked slots: barbeiro gerencia APENAS seus bloqueios
DROP POLICY IF EXISTS "Barbers can manage own blocked slots" ON public.blocked_slots;
CREATE POLICY "Barbers can manage own blocked slots" ON public.blocked_slots
  FOR ALL
  USING (barber_id = public.get_my_barber_id())
  WITH CHECK (barber_id = public.get_my_barber_id());

-- Business hours: barbeiro gerencia APENAS seus próprios horários (barber_id = seu id), nunca o geral (NULL) ou do dono
DROP POLICY IF EXISTS "Barbers can manage own business hours" ON public.business_hours;
CREATE POLICY "Barbers can manage own business hours" ON public.business_hours
  FOR ALL
  USING (barber_id IS NOT NULL AND barber_id = public.get_my_barber_id())
  WITH CHECK (barber_id IS NOT NULL AND barber_id = public.get_my_barber_id());

-- Profiles: barbeiro visualiza perfis APENAS dos clientes que agendaram ou assinaram pacote com ele
DROP POLICY IF EXISTS "Barbers can view their own clients profiles" ON public.profiles;
CREATE POLICY "Barbers can view their own clients profiles" ON public.profiles
  FOR SELECT USING (
    public.is_barber()
    AND (
      EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.user_id = profiles.user_id
          AND a.barber_id = public.get_my_barber_id()
      )
      OR EXISTS (
        SELECT 1 FROM public.client_packages cp
        WHERE cp.user_id = profiles.user_id
          AND cp.barber_id = public.get_my_barber_id()
      )
    )
  );

-- Client notes: barbeiro vê e adiciona notas para seus clientes
DROP POLICY IF EXISTS "Barbers can manage notes for own clients" ON public.client_notes;
CREATE POLICY "Barbers can manage notes for own clients" ON public.client_notes
  FOR ALL
  USING (
    public.is_barber()
    AND (
      EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.user_id = client_notes.client_id
          AND a.barber_id = public.get_my_barber_id()
      )
    )
  )
  WITH CHECK (
    public.is_barber()
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.user_id = client_notes.client_id
        AND a.barber_id = public.get_my_barber_id()
    )
  );

-- Client packages: barbeiro vê assinaturas vinculadas a ele
DROP POLICY IF EXISTS "Barbers can view own client packages" ON public.client_packages;
CREATE POLICY "Barbers can view own client packages" ON public.client_packages
  FOR SELECT USING (barber_id = public.get_my_barber_id());

-- Client package usage / ratings / loyalty_rewards: permitir leitura/limpeza quando vinculado ao agendamento do barbeiro
DROP POLICY IF EXISTS "Barbers can manage usage for own appointments" ON public.client_package_usage;
CREATE POLICY "Barbers can manage usage for own appointments" ON public.client_package_usage
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = client_package_usage.appointment_id
        AND a.barber_id = public.get_my_barber_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.client_packages cp
      WHERE cp.id = client_package_usage.client_package_id
        AND cp.barber_id = public.get_my_barber_id()
    )
  );

DROP POLICY IF EXISTS "Barbers can manage ratings for own appointments" ON public.ratings;
CREATE POLICY "Barbers can manage ratings for own appointments" ON public.ratings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = ratings.appointment_id
        AND a.barber_id = public.get_my_barber_id()
    )
  );

DROP POLICY IF EXISTS "Barbers can manage loyalty rewards for own appointments" ON public.loyalty_rewards;
CREATE POLICY "Barbers can manage loyalty rewards for own appointments" ON public.loyalty_rewards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = loyalty_rewards.appointment_id
        AND a.barber_id = public.get_my_barber_id()
    )
  );

-- Realtime para tabela barbers (status aberta/fechada e atualizações)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'barbers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.barbers;
  END IF;
END $$;

-- 11b. Auto-vinculação no login caso barbers.email já esteja cadastrado com user_id NULL
CREATE OR REPLACE FUNCTION public.claim_my_barber_account()
RETURNS SETOF public.barbers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_target_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.barbers WHERE user_id = v_uid) THEN
    RETURN QUERY
    SELECT * FROM public.barbers WHERE user_id = v_uid LIMIT 1;
    RETURN;
  END IF;

  SELECT lower(email) INTO v_email
  FROM auth.users
  WHERE id = v_uid
    AND email_confirmed_at IS NOT NULL;

  IF v_email IS NOT NULL AND v_email <> '' THEN
    SELECT id INTO v_target_id
    FROM public.barbers
    WHERE user_id IS NULL
      AND is_active = true
      AND lower(trim(email)) = v_email
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_target_id IS NOT NULL THEN
      UPDATE public.barbers
      SET user_id = v_uid,
          email = v_email,
          updated_at = now()
      WHERE id = v_target_id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT * FROM public.barbers WHERE user_id = v_uid LIMIT 1;
END;
$$;

-- Permissões explícitas de execução nas funções RPC
GRANT EXECUTE ON FUNCTION public.get_default_barber_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_barber_booked_slots(DATE, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_barber_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_barber(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_barber_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_my_barber_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_my_barber_notify_push(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_barber_account(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_my_barber_account() TO authenticated;
