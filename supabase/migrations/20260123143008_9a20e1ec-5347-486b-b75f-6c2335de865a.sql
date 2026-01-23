-- Verificar e recriar trigger para garantir bloqueio de slots
DROP TRIGGER IF EXISTS trigger_handle_appointment_blocking ON public.appointments;

-- Função melhorada para bloquear slots
CREATE OR REPLACE FUNCTION public.handle_appointment_blocking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  slot_minutes INTEGER;
  duration_minutes INTEGER;
  start_time TIME;
  current_slot_time TIME;
BEGIN
  -- When appointment is created or confirmed, block all necessary slots based on duration
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'confirmed') THEN
    -- Get the duration in minutes (default to 30 if not set)
    duration_minutes := COALESCE(NEW.total_duration, 30);
    start_time := NEW.appointment_time::TIME;
    current_slot_time := start_time;
    slot_minutes := 0;
    
    -- Block slots in 30-minute increments until duration is covered
    WHILE slot_minutes < duration_minutes LOOP
      INSERT INTO public.blocked_slots (blocked_date, blocked_time, reason, is_manual, appointment_id)
      VALUES (NEW.appointment_date, current_slot_time, 'Agendamento confirmado', false, NEW.id)
      ON CONFLICT (blocked_date, blocked_time) DO UPDATE
      SET reason = 'Agendamento confirmado', 
          is_manual = false, 
          appointment_id = NEW.id;
      
      -- Move to next 30-minute slot
      current_slot_time := current_slot_time + INTERVAL '30 minutes';
      slot_minutes := slot_minutes + 30;
    END LOOP;
  END IF;
  
  -- When appointment is cancelled, unblock all slots for this appointment
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    DELETE FROM public.blocked_slots 
    WHERE appointment_id = NEW.id AND is_manual = false;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar trigger
CREATE TRIGGER trigger_handle_appointment_blocking
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_blocking();

-- Corrigir agendamentos confirmados que não têm blocked_slots
DO $$
DECLARE
  apt RECORD;
  slot_minutes INTEGER;
  duration_minutes INTEGER;
  current_slot_time TIME;
BEGIN
  FOR apt IN 
    SELECT a.id, a.appointment_date, a.appointment_time, a.total_duration
    FROM appointments a
    WHERE a.status = 'confirmed'
    AND NOT EXISTS (
      SELECT 1 FROM blocked_slots bs 
      WHERE bs.appointment_id = a.id
    )
  LOOP
    duration_minutes := COALESCE(apt.total_duration, 30);
    current_slot_time := apt.appointment_time::TIME;
    slot_minutes := 0;
    
    WHILE slot_minutes < duration_minutes LOOP
      INSERT INTO blocked_slots (blocked_date, blocked_time, reason, is_manual, appointment_id)
      VALUES (apt.appointment_date, current_slot_time, 'Agendamento confirmado', false, apt.id)
      ON CONFLICT (blocked_date, blocked_time) DO UPDATE
      SET reason = 'Agendamento confirmado', 
          is_manual = false, 
          appointment_id = apt.id;
      
      current_slot_time := current_slot_time + INTERVAL '30 minutes';
      slot_minutes := slot_minutes + 30;
    END LOOP;
  END LOOP;
END $$;