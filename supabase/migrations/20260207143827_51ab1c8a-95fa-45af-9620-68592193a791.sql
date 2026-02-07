-- Update the blocking trigger to block slots for BOTH pending and confirmed appointments
CREATE OR REPLACE FUNCTION public.handle_appointment_blocking()
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
BEGIN
  -- When appointment is created or confirmed (pending or confirmed), block all necessary slots
  IF NEW.status IN ('pending', 'confirmed') AND (OLD IS NULL OR OLD.status NOT IN ('pending', 'confirmed')) THEN
    duration_minutes := COALESCE(NEW.total_duration, 30);
    start_time := NEW.appointment_time::TIME;
    current_slot_time := start_time;
    slot_minutes := 0;
    
    WHILE slot_minutes < duration_minutes LOOP
      INSERT INTO public.blocked_slots (blocked_date, blocked_time, reason, is_manual, appointment_id)
      VALUES (NEW.appointment_date, current_slot_time, 'Agendamento', false, NEW.id)
      ON CONFLICT (blocked_date, blocked_time) DO UPDATE
      SET reason = 'Agendamento', 
          is_manual = false, 
          appointment_id = NEW.id
      WHERE blocked_slots.appointment_id IS NULL 
         OR blocked_slots.appointment_id = NEW.id
         OR blocked_slots.is_manual = true;
      
      current_slot_time := current_slot_time + INTERVAL '30 minutes';
      slot_minutes := slot_minutes + 30;
    END LOOP;
  END IF;
  
  -- When cancelled or completed, unblock this appointment's slots
  IF NEW.status IN ('cancelled', 'completed') AND OLD.status IN ('pending', 'confirmed') THEN
    DELETE FROM public.blocked_slots 
    WHERE appointment_id = NEW.id AND is_manual = false;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Also ensure the validation trigger catches ALL overlaps properly
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
  end_time TIME;
  current_slot_time TIME;
  conflicting_appointment RECORD;
BEGIN
  -- Only validate new appointments that are not cancelled
  IF NEW.status IN ('pending', 'confirmed') THEN
    duration_minutes := COALESCE(NEW.total_duration, 30);
    start_time := NEW.appointment_time::TIME;
    end_time := start_time + (duration_minutes * INTERVAL '1 minute');
    
    -- Check for any overlapping appointments using time range overlap
    -- Two appointments overlap if: start1 < end2 AND start2 < end1
    SELECT a.id, a.appointment_time, a.total_duration, 
           COALESCE(a.guest_name, p.name) as client_name
    INTO conflicting_appointment
    FROM public.appointments a
    LEFT JOIN public.profiles p ON a.user_id = p.user_id
    WHERE a.appointment_date = NEW.appointment_date
      AND a.status IN ('pending', 'confirmed')
      AND a.id != NEW.id
      -- Overlap condition: our start < their end AND their start < our end
      AND start_time < (a.appointment_time::TIME + (COALESCE(a.total_duration, 30) * INTERVAL '1 minute'))
      AND a.appointment_time::TIME < end_time
    LIMIT 1;
    
    IF conflicting_appointment.id IS NOT NULL THEN
      RAISE EXCEPTION 'Conflito de horário: já existe agendamento de % às % neste horário', 
        COALESCE(conflicting_appointment.client_name, 'cliente'), 
        conflicting_appointment.appointment_time;
    END IF;
    
    -- Check for manual blocks in the time range
    current_slot_time := start_time;
    slot_minutes := 0;
    
    WHILE slot_minutes < duration_minutes LOOP
      IF EXISTS (
        SELECT 1 FROM public.blocked_slots bs
        WHERE bs.blocked_date = NEW.appointment_date
          AND bs.blocked_time = current_slot_time
          AND bs.is_manual = true
      ) THEN
        RAISE EXCEPTION 'Conflito de horário: o slot % está bloqueado manualmente', current_slot_time;
      END IF;
      
      current_slot_time := current_slot_time + INTERVAL '30 minutes';
      slot_minutes := slot_minutes + 30;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create/recreate the trigger to run BEFORE INSERT
DROP TRIGGER IF EXISTS validate_appointment_slot_on_insert ON public.appointments;
CREATE TRIGGER validate_appointment_slot_on_insert
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_new_appointment_slot();

-- Also add validation on UPDATE (when changing date/time)
DROP TRIGGER IF EXISTS validate_appointment_slot_on_update ON public.appointments;
CREATE TRIGGER validate_appointment_slot_on_update
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  WHEN (OLD.appointment_date IS DISTINCT FROM NEW.appointment_date 
        OR OLD.appointment_time IS DISTINCT FROM NEW.appointment_time
        OR (OLD.status NOT IN ('pending', 'confirmed') AND NEW.status IN ('pending', 'confirmed')))
  EXECUTE FUNCTION public.validate_new_appointment_slot();