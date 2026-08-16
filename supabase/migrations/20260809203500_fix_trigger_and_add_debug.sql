-- ============================================================
-- FIX: Correção do trigger de validação de agendamentos
-- Data: 2026-08-09
-- Problema: O trigger pode falhar silenciosamente quando:
--   1. Não encontra registro em business_hours para o dia
--   2. O campo is_open é NULL ao invés de false
-- Solução:
--   - Adicionar validação mais clara
--   - Garantir que business_hours tem entrada para todos os dias
--   - Corrigir comparação de horários
-- ============================================================

-- Recriar a função com tratamento mais robusto
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
  WHERE day_of_week = EXTRACT(DOW FROM NEW.appointment_date::DATE)::int;

  -- Se não encontrou registro para o dia, ou is_open é false/null → dia fechado
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

-- Garantir que o trigger está criado corretamente
DROP TRIGGER IF EXISTS trg_validate_appointment_conflict ON public.appointments;
CREATE TRIGGER trg_validate_appointment_conflict
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment_no_conflict();
