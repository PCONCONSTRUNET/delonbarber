-- Fix the create_appointment_notification function to properly handle time type
CREATE OR REPLACE FUNCTION public.create_appointment_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
  apt_date TEXT;
  apt_time TEXT;
BEGIN
  -- Only process if status or payment_status changed
  IF (OLD.status IS DISTINCT FROM NEW.status) OR (OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    apt_date := NEW.appointment_date::TEXT;
    apt_time := to_char(NEW.appointment_time::time, 'HH24:MI');
    
    -- Check status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      CASE NEW.status
        WHEN 'confirmed' THEN
          notification_title := 'Agendamento Confirmado';
          notification_message := 'Seu agendamento para ' || apt_date || ' às ' || apt_time || ' foi confirmado!';
          notification_type := 'success';
        WHEN 'completed' THEN
          notification_title := 'Atendimento Concluído';
          notification_message := 'Seu atendimento de ' || apt_date || ' foi concluído. Obrigado pela preferência!';
          notification_type := 'success';
        WHEN 'cancelled' THEN
          notification_title := 'Agendamento Cancelado';
          notification_message := 'Seu agendamento para ' || apt_date || ' às ' || apt_time || ' foi cancelado.';
          notification_type := 'error';
        ELSE
          notification_title := NULL;
      END CASE;
      
      IF notification_title IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, appointment_id)
        VALUES (NEW.user_id, notification_title, notification_message, notification_type, NEW.id);
      END IF;
    END IF;
    
    -- Check payment status changes
    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'paid' THEN
      INSERT INTO public.notifications (user_id, title, message, type, appointment_id)
      VALUES (NEW.user_id, 'Pagamento Confirmado', 'Seu pagamento para o agendamento de ' || apt_date || ' foi confirmado!', 'success', NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;