-- ============================================================
-- Ajuste geral do horário de atendimento:
-- Terça a Sexta (2 a 5): 08:00 às 15:00, intervalo das 12:00 às 13:00
-- Limpeza de intervalos zerados ('00:00:00')
-- ============================================================

-- Garantir Terça (2), Quarta (3), Quinta (4) e Sexta (5) das 08:00 às 15:00 com intervalo 12:00 às 13:00
UPDATE public.business_hours
SET
  is_open = true,
  open_time = '08:00:00',
  close_time = '15:00:00',
  lunch_start = '12:00:00',
  lunch_end = '13:00:00'
WHERE day_of_week IN (2, 3, 4, 5);

-- Garantir Domingo (0) e Segunda (1) fechados
UPDATE public.business_hours
SET
  is_open = false,
  lunch_start = NULL,
  lunch_end = NULL
WHERE day_of_week IN (0, 1);

-- Limpar intervalos inválidos ('00:00:00' - '00:00:00' ou início >= fim)
UPDATE public.business_hours
SET
  lunch_start = NULL,
  lunch_end = NULL
WHERE (lunch_start = '00:00:00' AND lunch_end = '00:00:00')
   OR (lunch_start IS NOT NULL AND lunch_end IS NOT NULL AND lunch_start >= lunch_end);

-- Atualizar função de validação no banco para ignorar intervalos zerados/inválidos e validar corretamente o expediente e almoço
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
  WHERE day_of_week = EXTRACT(DOW FROM NEW.appointment_date::DATE)::int;

  IF NOT FOUND OR bh.is_open IS NOT TRUE THEN
    RAISE EXCEPTION 'CLOSED_DAY: O estabelecimento não atende neste dia da semana (dia %, data %)',
      EXTRACT(DOW FROM NEW.appointment_date::DATE)::int, NEW.appointment_date;
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
$function$;

