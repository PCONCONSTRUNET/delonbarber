-- ============================================================================
-- Bloqueio de Sábado (e fim de semana) no backend para clientes VIP / assinantes
-- e clientes marcados como exclusivos, respeitando os dias úteis (Seg-Sex / Ter-Sex)
-- configurados em business_hours no painel.
-- Nota: 100% idempotente e seguro para executar em bloco único no SQL Editor.
-- ============================================================================

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
  today_brt DATE;
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

  -- Encaixe / Corte Externo / Agendamento Manual: bypass intencional de todas as regras
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
  today_brt := (timezone('America/Sao_Paulo', now()))::date;

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

  -- ===== Bloqueio de Sábado (e Domingo) para clientes de assinatura VIP / exclusivos =====
  -- Clientes com plano/assinatura ativo ou marcados como exclusivos só podem agendar
  -- nos dias úteis (segunda a sexta) abertos conforme configurado no painel.
  IF NEW.guest_client_id IS NULL
     AND (NEW.guest_name IS NULL OR trim(NEW.guest_name) = '')
  THEN
    IF dow_int IN (0, 6) AND EXISTS (
      SELECT 1
      FROM public.client_packages cp
      WHERE cp.user_id = NEW.user_id
        AND cp.status = 'active'
        AND cp.end_date >= today_brt
    ) THEN
      RAISE EXCEPTION 'VIP_SATURDAY_BLOCKED: Clientes com assinatura VIP não podem agendar aos sábados ou domingos. Escolha entre segunda e sexta conforme configurado no painel.';
    END IF;

    IF dow_int = 6 AND EXISTS (
      SELECT 1
      FROM public.exclusive_clients ec
      WHERE ec.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'VIP_SATURDAY_BLOCKED: Clientes exclusivos não podem agendar aos sábados.';
    END IF;
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
