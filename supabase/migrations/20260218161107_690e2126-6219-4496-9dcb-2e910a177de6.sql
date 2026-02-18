
CREATE OR REPLACE FUNCTION public.validate_new_appointment_slot()
 RETURNS trigger
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
  day_close_time TIME;
  day_is_open BOOLEAN;
BEGIN
  -- Only validate new appointments that are not cancelled
  IF NEW.status IN ('pending', 'confirmed') THEN
    duration_minutes := COALESCE(NEW.total_duration, 30);
    start_time := NEW.appointment_time::TIME;
    end_time := start_time + (duration_minutes * INTERVAL '1 minute');
    
    -- Check business hours: appointment must finish before closing time
    SELECT close_time, COALESCE(is_open, false) INTO day_close_time, day_is_open
    FROM public.business_hours
    WHERE day_of_week = EXTRACT(DOW FROM NEW.appointment_date::DATE);
    
    IF NOT day_is_open THEN
      RAISE EXCEPTION 'Estabelecimento fechado neste dia';
    END IF;
    
    IF end_time > day_close_time THEN
      RAISE EXCEPTION 'Agendamento ultrapassa o horário de fechamento (%). O serviço terminaria às %', day_close_time, end_time;
    END IF;
    
    -- Check for any overlapping appointments using time range overlap
    SELECT a.id, a.appointment_time, a.total_duration, 
           COALESCE(a.guest_name, p.name) as client_name
    INTO conflicting_appointment
    FROM public.appointments a
    LEFT JOIN public.profiles p ON a.user_id = p.user_id
    WHERE a.appointment_date = NEW.appointment_date
      AND a.status IN ('pending', 'confirmed')
      AND a.id != NEW.id
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
