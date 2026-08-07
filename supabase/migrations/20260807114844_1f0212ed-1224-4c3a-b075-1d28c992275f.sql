CREATE OR REPLACE FUNCTION public.validate_appointment_no_conflict()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_start TIME;
  new_end   TIME;
  conflicting RECORD;
  bh RECORD;
BEGIN
  IF NEW.status NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  -- Encaixe / Corte Externo: bypass intencional de todas as regras
  IF NEW.is_force_booking IS TRUE THEN
    RETURN NEW;
  END IF;

  -- Em UPDATE: só revalida se data/hora/duração mudou ou se o agendamento foi reativado.
  -- Isso garante que marcar pagamento/concluir agendamentos antigos continue funcionando.
  IF TG_OP = 'UPDATE'
     AND OLD.status IN ('pending','confirmed')
     AND OLD.appointment_date = NEW.appointment_date
     AND OLD.appointment_time = NEW.appointment_time
     AND OLD.total_duration IS NOT DISTINCT FROM NEW.total_duration
  THEN
    RETURN NEW;
  END IF;

  new_start := NEW.appointment_time::TIME;
  new_end   := new_start + (COALESCE(NEW.total_duration, 30) * INTERVAL '1 minute');

  -- ===== Validação de horário de funcionamento e almoço =====
  SELECT * INTO bh
  FROM public.business_hours
  WHERE day_of_week = EXTRACT(DOW FROM NEW.appointment_date)::int;

  IF bh IS NULL OR bh.is_open IS NOT TRUE THEN
    RAISE EXCEPTION 'CLOSED_DAY: O estabelecimento não atende neste dia da semana';
  END IF;

  IF new_start < bh.open_time OR new_end > bh.close_time THEN
    RAISE EXCEPTION 'OUTSIDE_HOURS: Horário fora do expediente (% às %)',
      to_char(bh.open_time, 'HH24:MI'), to_char(bh.close_time, 'HH24:MI');
  END IF;

  IF bh.lunch_start IS NOT NULL AND bh.lunch_end IS NOT NULL
     AND new_start < bh.lunch_end AND new_end > bh.lunch_start THEN
    RAISE EXCEPTION 'LUNCH_BREAK: Horário indisponível - intervalo das % às %',
      to_char(bh.lunch_start, 'HH24:MI'), to_char(bh.lunch_end, 'HH24:MI');
  END IF;

  -- ===== Conflito com outros agendamentos =====
  SELECT a.id, a.appointment_time, a.total_duration
  INTO conflicting
  FROM public.appointments a
  WHERE a.appointment_date = NEW.appointment_date
    AND a.status IN ('pending', 'confirmed')
    AND a.id != NEW.id
    AND new_start < (a.appointment_time::TIME + (COALESCE(a.total_duration, 30) * INTERVAL '1 minute'))
    AND a.appointment_time::TIME < new_end
  LIMIT 1;

  IF conflicting.id IS NOT NULL THEN
    RAISE EXCEPTION 'SLOT_CONFLICT: Horário % já está ocupado por outro agendamento', NEW.appointment_time;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocked_slots bs
    WHERE bs.blocked_date = NEW.appointment_date
      AND bs.is_manual = true
      AND bs.blocked_time >= new_start
      AND bs.blocked_time < new_end
  ) THEN
    RAISE EXCEPTION 'SLOT_BLOCKED: O horário % está bloqueado manualmente', NEW.appointment_time;
  END IF;

  RETURN NEW;
END;
$function$