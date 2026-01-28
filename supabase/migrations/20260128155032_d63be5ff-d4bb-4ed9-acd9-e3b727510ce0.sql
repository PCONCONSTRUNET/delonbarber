-- Drop and recreate the trigger function to handle all cancellation scenarios
CREATE OR REPLACE FUNCTION public.handle_appointment_blocking()
RETURNS TRIGGER AS $$
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
  
  -- When cancelled or completed from ANY previous state, unblock this appointment's slots
  IF NEW.status IN ('cancelled', 'completed') AND OLD.status IN ('pending', 'confirmed') THEN
    DELETE FROM public.blocked_slots 
    WHERE appointment_id = NEW.id AND is_manual = false;
  END IF;
  
  -- Also handle deletion - clean up slots when appointment is deleted
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also create a trigger to clean up on DELETE
CREATE OR REPLACE FUNCTION public.handle_appointment_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.blocked_slots 
  WHERE appointment_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop if exists and recreate delete trigger
DROP TRIGGER IF EXISTS on_appointment_delete ON public.appointments;
CREATE TRIGGER on_appointment_delete
  BEFORE DELETE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_delete();