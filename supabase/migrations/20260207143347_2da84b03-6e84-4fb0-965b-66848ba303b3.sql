-- Create a function to validate appointment time slot availability on INSERT
CREATE OR REPLACE FUNCTION public.validate_new_appointment_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  slot_minutes INTEGER;
  duration_minutes INTEGER;
  start_time TIME;
  current_slot_time TIME;
  conflicting_appointment_id UUID;
  conflicting_time TIME;
BEGIN
  -- Only validate new appointments (INSERT) that are not cancelled
  IF NEW.status IN ('pending', 'confirmed') THEN
    duration_minutes := COALESCE(NEW.total_duration, 30);
    start_time := NEW.appointment_time::TIME;
    current_slot_time := start_time;
    slot_minutes := 0;
    
    -- Check each slot that would be needed
    WHILE slot_minutes < duration_minutes LOOP
      -- Check if this slot is occupied by another appointment (pending or confirmed)
      SELECT a.id, a.appointment_time INTO conflicting_appointment_id, conflicting_time
      FROM public.appointments a
      WHERE a.appointment_date = NEW.appointment_date
        AND a.status IN ('pending', 'confirmed')
        AND a.id != NEW.id
        -- Check if there's any overlap: the slot time falls within another appointment's time range
        AND current_slot_time >= a.appointment_time::TIME
        AND current_slot_time < (a.appointment_time::TIME + (COALESCE(a.total_duration, 30) * INTERVAL '1 minute'))
      LIMIT 1;
      
      IF conflicting_appointment_id IS NOT NULL THEN
        RAISE EXCEPTION 'Conflito de horário: o slot % já está ocupado por outro agendamento', current_slot_time;
      END IF;
      
      -- Also check if another appointment would start during our slot
      SELECT a.id, a.appointment_time INTO conflicting_appointment_id, conflicting_time
      FROM public.appointments a
      WHERE a.appointment_date = NEW.appointment_date
        AND a.status IN ('pending', 'confirmed')
        AND a.id != NEW.id
        AND a.appointment_time::TIME >= current_slot_time
        AND a.appointment_time::TIME < (current_slot_time + INTERVAL '30 minutes')
      LIMIT 1;
      
      IF conflicting_appointment_id IS NOT NULL THEN
        RAISE EXCEPTION 'Conflito de horário: o slot % conflita com um agendamento às %', current_slot_time, conflicting_time;
      END IF;
      
      -- Check if there's a manual block for this slot
      SELECT bs.id INTO conflicting_appointment_id
      FROM public.blocked_slots bs
      WHERE bs.blocked_date = NEW.appointment_date
        AND bs.blocked_time = current_slot_time
        AND bs.is_manual = true
      LIMIT 1;
      
      IF conflicting_appointment_id IS NOT NULL THEN
        RAISE EXCEPTION 'Conflito de horário: o slot % está bloqueado manualmente', current_slot_time;
      END IF;
      
      current_slot_time := current_slot_time + INTERVAL '30 minutes';
      slot_minutes := slot_minutes + 30;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for INSERT (runs BEFORE to validate)
DROP TRIGGER IF EXISTS validate_appointment_slot_on_insert ON public.appointments;
CREATE TRIGGER validate_appointment_slot_on_insert
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_new_appointment_slot();

-- Also update existing validate_appointment_no_overlap to improve validation on UPDATE
CREATE OR REPLACE FUNCTION public.validate_appointment_no_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  slot_minutes INTEGER;
  duration_minutes INTEGER;
  start_time TIME;
  current_slot_time TIME;
  conflicting_appointment_id UUID;
  conflicting_time TIME;
BEGIN
  -- Only validate when status changes to confirmed or pending
  IF NEW.status IN ('pending', 'confirmed') AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status OR OLD.appointment_date IS DISTINCT FROM NEW.appointment_date OR OLD.appointment_time IS DISTINCT FROM NEW.appointment_time) THEN
    duration_minutes := COALESCE(NEW.total_duration, 30);
    start_time := NEW.appointment_time::TIME;
    current_slot_time := start_time;
    slot_minutes := 0;
    
    -- Check each slot that would be needed
    WHILE slot_minutes < duration_minutes LOOP
      -- Check if this slot is blocked by ANOTHER appointment
      SELECT a.id, a.appointment_time INTO conflicting_appointment_id, conflicting_time
      FROM public.appointments a
      WHERE a.appointment_date = NEW.appointment_date
        AND a.status IN ('pending', 'confirmed')
        AND a.id != NEW.id
        AND current_slot_time >= a.appointment_time::TIME
        AND current_slot_time < (a.appointment_time::TIME + (COALESCE(a.total_duration, 30) * INTERVAL '1 minute'))
      LIMIT 1;
      
      IF conflicting_appointment_id IS NOT NULL THEN
        RAISE EXCEPTION 'Conflito de horário: o slot % já está ocupado por outro agendamento', current_slot_time;
      END IF;
      
      current_slot_time := current_slot_time + INTERVAL '30 minutes';
      slot_minutes := slot_minutes + 30;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;