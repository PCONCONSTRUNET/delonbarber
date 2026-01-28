-- Create a function to validate appointment overlaps BEFORE confirming
CREATE OR REPLACE FUNCTION public.validate_appointment_no_overlap()
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
  conflicting_appointment_id UUID;
  conflicting_time TIME;
BEGIN
  -- Only validate when confirming an appointment
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'confirmed') THEN
    duration_minutes := COALESCE(NEW.total_duration, 30);
    start_time := NEW.appointment_time::TIME;
    current_slot_time := start_time;
    slot_minutes := 0;
    
    -- Check each slot that would be needed
    WHILE slot_minutes < duration_minutes LOOP
      -- Check if this slot is blocked by ANOTHER appointment (not manual blocks, not this appointment)
      SELECT bs.appointment_id, bs.blocked_time INTO conflicting_appointment_id, conflicting_time
      FROM public.blocked_slots bs
      WHERE bs.blocked_date = NEW.appointment_date
        AND bs.blocked_time = current_slot_time
        AND bs.is_manual = false
        AND bs.appointment_id IS NOT NULL
        AND bs.appointment_id != NEW.id
      LIMIT 1;
      
      IF conflicting_appointment_id IS NOT NULL THEN
        RAISE EXCEPTION 'Conflito de horário: o slot % já está ocupado por outro agendamento', conflicting_time;
      END IF;
      
      current_slot_time := current_slot_time + INTERVAL '30 minutes';
      slot_minutes := slot_minutes + 30;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger that runs BEFORE the blocking trigger to validate
DROP TRIGGER IF EXISTS validate_appointment_overlap_trigger ON public.appointments;
CREATE TRIGGER validate_appointment_overlap_trigger
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment_no_overlap();

-- Also add for INSERT (when appointment is created already confirmed)
DROP TRIGGER IF EXISTS validate_appointment_overlap_insert_trigger ON public.appointments;
CREATE TRIGGER validate_appointment_overlap_insert_trigger
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment_no_overlap();

-- Update the blocking function to NOT overwrite other appointments' blocks
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
  -- When appointment is confirmed, block all necessary slots
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'confirmed') THEN
    duration_minutes := COALESCE(NEW.total_duration, 30);
    start_time := NEW.appointment_time::TIME;
    current_slot_time := start_time;
    slot_minutes := 0;
    
    WHILE slot_minutes < duration_minutes LOOP
      -- Only insert if slot doesn't exist OR belongs to this appointment
      INSERT INTO public.blocked_slots (blocked_date, blocked_time, reason, is_manual, appointment_id)
      VALUES (NEW.appointment_date, current_slot_time, 'Agendamento confirmado', false, NEW.id)
      ON CONFLICT (blocked_date, blocked_time) DO UPDATE
      SET reason = 'Agendamento confirmado', 
          is_manual = false, 
          appointment_id = NEW.id
      WHERE blocked_slots.appointment_id IS NULL 
         OR blocked_slots.appointment_id = NEW.id
         OR blocked_slots.is_manual = true;
      
      current_slot_time := current_slot_time + INTERVAL '30 minutes';
      slot_minutes := slot_minutes + 30;
    END LOOP;
  END IF;
  
  -- When cancelled, unblock only this appointment's slots
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    DELETE FROM public.blocked_slots 
    WHERE appointment_id = NEW.id AND is_manual = false;
  END IF;
  
  RETURN NEW;
END;
$function$;