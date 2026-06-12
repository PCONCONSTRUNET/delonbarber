-- ============================================================
-- FIX: Conflito de Horários Duplos (Double Booking)
-- Data: 2026-06-12
-- Problema: múltiplos triggers conflitantes + lógica fraca de bloqueio
-- Solução: remover tudo e criar sistema limpo de validação por range
-- ============================================================

-- -----------------------------------------------
-- 1. REMOVER TODOS OS TRIGGERS ANTIGOS / CONFLITANTES
-- -----------------------------------------------
DROP TRIGGER IF EXISTS on_appointment_status_change              ON public.appointments;
DROP TRIGGER IF EXISTS validate_appointment_overlap_trigger      ON public.appointments;
DROP TRIGGER IF EXISTS validate_appointment_overlap_insert_trigger ON public.appointments;
DROP TRIGGER IF EXISTS validate_appointment_slot_on_insert       ON public.appointments;
DROP TRIGGER IF EXISTS validate_appointment_slot_on_update       ON public.appointments;
DROP TRIGGER IF EXISTS handle_appointment_blocking_trigger       ON public.appointments;

-- Remover funções antigas
DROP FUNCTION IF EXISTS public.validate_appointment_no_overlap()  CASCADE;
DROP FUNCTION IF EXISTS public.validate_new_appointment_slot()    CASCADE;
DROP FUNCTION IF EXISTS public.handle_appointment_blocking()      CASCADE;

-- -----------------------------------------------
-- 2. FUNÇÃO DE VALIDAÇÃO — BEFORE INSERT / UPDATE
-- Usa range overlap direto na tabela appointments.
-- Não depende de blocked_slots (que pode estar desatualizado).
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_appointment_no_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_start       TIME;
  new_end         TIME;
  conflicting     RECORD;
BEGIN
  -- Só valida agendamentos ativos (pending ou confirmed)
  IF NEW.status NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  new_start := NEW.appointment_time::TIME;
  new_end   := new_start + (COALESCE(NEW.total_duration, 30) * INTERVAL '1 minute');

  -- Busca qualquer agendamento que se sobreponha no mesmo dia
  -- Condição de overlap: A.start < B.end  AND  B.start < A.end
  SELECT
    a.id,
    a.appointment_time,
    a.total_duration,
    COALESCE(g.name, p.full_name, 'cliente') AS client_name
  INTO conflicting
  FROM public.appointments a
  LEFT JOIN public.profiles p ON a.user_id = p.user_id
  LEFT JOIN (
    SELECT id, guest_name AS name FROM public.appointments WHERE guest_name IS NOT NULL
  ) g ON g.id = a.id
  WHERE a.appointment_date = NEW.appointment_date
    AND a.status IN ('pending', 'confirmed')
    AND a.id != NEW.id          -- não comparar consigo mesmo (UPDATE)
    -- Overlap: novo.start < existente.end  AND  existente.start < novo.end
    AND new_start < (a.appointment_time::TIME + (COALESCE(a.total_duration, 30) * INTERVAL '1 minute'))
    AND a.appointment_time::TIME < new_end
  LIMIT 1;

  IF conflicting.id IS NOT NULL THEN
    RAISE EXCEPTION
      'SLOT_CONFLICT: Horário % já está ocupado até % (agendamento de %)',
      NEW.appointment_time,
      (conflicting.appointment_time::TIME + (COALESCE(conflicting.total_duration, 30) * INTERVAL '1 minute'))::TEXT,
      conflicting.client_name;
  END IF;

  -- Verificar bloqueios manuais no range do novo agendamento
  IF EXISTS (
    SELECT 1 FROM public.blocked_slots bs
    WHERE bs.blocked_date = NEW.appointment_date
      AND bs.is_manual = true
      -- slot manual está dentro do range do novo agendamento
      AND bs.blocked_time >= new_start
      AND bs.blocked_time < new_end
  ) THEN
    RAISE EXCEPTION
      'SLOT_BLOCKED: O horário % contém um bloqueio manual pelo administrador',
      NEW.appointment_time;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------
-- 3. FUNÇÃO DE BLOQUEIO — AFTER INSERT / UPDATE
-- Sincroniza blocked_slots com os agendamentos ativos.
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_blocked_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  slot_offset     INTEGER := 0;
  slot_time       TIME;
  dur             INTEGER;
BEGIN
  -- ── Ativação: agendamento passou para pending/confirmed ──
  IF NEW.status IN ('pending', 'confirmed')
     AND (OLD IS NULL OR OLD.status NOT IN ('pending', 'confirmed'))
  THEN
    dur       := COALESCE(NEW.total_duration, 30);
    slot_time := NEW.appointment_time::TIME;

    WHILE slot_offset < dur LOOP
      INSERT INTO public.blocked_slots
        (blocked_date, blocked_time, reason, is_manual, appointment_id)
      VALUES
        (NEW.appointment_date, slot_time, 'Agendamento', false, NEW.id)
      ON CONFLICT (blocked_date, blocked_time)
        -- Só sobrescreve se o slot estava livre (sem appointment) ou é deste mesmo agendamento
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

  -- ── Reagendamento: data/hora mudou enquanto ainda ativo ──
  IF OLD IS NOT NULL
     AND NEW.status IN ('pending', 'confirmed')
     AND OLD.status IN ('pending', 'confirmed')
     AND (OLD.appointment_date != NEW.appointment_date
          OR OLD.appointment_time != NEW.appointment_time
          OR OLD.total_duration != NEW.total_duration)
  THEN
    -- Remove slots antigos
    DELETE FROM public.blocked_slots
    WHERE appointment_id = NEW.id
      AND is_manual = false;

    -- Insere novos slots
    dur       := COALESCE(NEW.total_duration, 30);
    slot_time := NEW.appointment_time::TIME;
    slot_offset := 0;

    WHILE slot_offset < dur LOOP
      INSERT INTO public.blocked_slots
        (blocked_date, blocked_time, reason, is_manual, appointment_id)
      VALUES
        (NEW.appointment_date, slot_time, 'Agendamento', false, NEW.id)
      ON CONFLICT (blocked_date, blocked_time)
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

-- -----------------------------------------------
-- 4. CRIAR OS TRIGGERS DEFINITIVOS (ordem importa!)
-- -----------------------------------------------

-- 4a. BEFORE: valida ANTES de inserir/atualizar (bloqueia conflito)
CREATE TRIGGER trg_validate_appointment_conflict
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment_no_conflict();

-- 4b. AFTER: sincroniza blocked_slots DEPOIS da inserção/atualização
CREATE TRIGGER trg_sync_blocked_slots
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_blocked_slots();

-- -----------------------------------------------
-- 5. RESSINCRONIZAR blocked_slots dos agendamentos EXISTENTES
-- (limpa registros órfãos e recria bloqueios corretos)
-- -----------------------------------------------

-- Remover todos os bloqueios automáticos antigos (não manuais)
DELETE FROM public.blocked_slots WHERE is_manual = false;

-- Recriar bloqueios corretos para todos os agendamentos ativos
DO $$
DECLARE
  apt     RECORD;
  slot_offset INTEGER;
  slot_time   TIME;
  dur         INTEGER;
BEGIN
  FOR apt IN
    SELECT id, appointment_date, appointment_time, total_duration
    FROM public.appointments
    WHERE status IN ('pending', 'confirmed')
    ORDER BY appointment_date, appointment_time
  LOOP
    dur         := COALESCE(apt.total_duration, 30);
    slot_time   := apt.appointment_time::TIME;
    slot_offset := 0;

    WHILE slot_offset < dur LOOP
      INSERT INTO public.blocked_slots
        (blocked_date, blocked_time, reason, is_manual, appointment_id)
      VALUES
        (apt.appointment_date, slot_time, 'Agendamento', false, apt.id)
      ON CONFLICT (blocked_date, blocked_time)
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
END;
$$;
