-- Create function to send push notification to admins on new appointment
CREATE OR REPLACE FUNCTION public.send_push_on_new_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_name TEXT;
  apt_time TEXT;
  apt_date TEXT;
  payload JSONB;
BEGIN
  -- Get client name
  IF NEW.guest_name IS NOT NULL THEN
    client_name := NEW.guest_name;
  ELSE
    SELECT name INTO client_name FROM public.profiles WHERE user_id = NEW.user_id;
    IF client_name IS NULL THEN
      client_name := 'Novo cliente';
    END IF;
  END IF;

  -- Format date and time
  apt_time := to_char(NEW.appointment_time::time, 'HH24:MI');
  apt_date := to_char(NEW.appointment_date, 'DD/MM/YYYY');

  -- Build payload
  payload := jsonb_build_object(
    'title', '🗓️ Novo Agendamento!',
    'body', client_name || ' agendou para ' || apt_date || ' às ' || apt_time,
    'url', '/admin/agenda',
    'targetRole', 'admin'
  );

  -- Call edge function via pg_net (async HTTP call)
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := payload
  );

  RETURN NEW;
END;
$$;

-- Create trigger for new appointments
DROP TRIGGER IF EXISTS trigger_push_on_new_appointment ON public.appointments;
CREATE TRIGGER trigger_push_on_new_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_new_appointment();