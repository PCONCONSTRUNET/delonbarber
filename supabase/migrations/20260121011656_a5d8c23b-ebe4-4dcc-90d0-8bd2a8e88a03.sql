-- Create a function to call the push notification edge function via pg_net
CREATE OR REPLACE FUNCTION public.send_push_on_new_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  client_name TEXT;
  service_names TEXT;
  apt_time TEXT;
  request_id BIGINT;
BEGIN
  -- Get client name
  IF NEW.guest_name IS NOT NULL THEN
    client_name := NEW.guest_name;
  ELSE
    SELECT name INTO client_name FROM public.profiles WHERE user_id = NEW.user_id;
    IF client_name IS NULL THEN
      client_name := 'Cliente';
    END IF;
  END IF;

  -- Get service names from appointment_services
  SELECT string_agg(s.name, ', ') INTO service_names
  FROM appointment_services aps
  JOIN services s ON s.id = aps.service_id
  WHERE aps.appointment_id = NEW.id;

  IF service_names IS NULL THEN
    service_names := 'Serviço';
  END IF;

  -- Format time
  apt_time := to_char(NEW.appointment_time::time, 'HH24:MI');

  -- Call edge function via pg_net http_post
  SELECT net.http_post(
    url := 'https://etfujmuzwzzhztucqbek.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZnVqbXV6d3p6aHp0dWNxYmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjA3NTQsImV4cCI6MjA4MzM5Njc1NH0.J0EQtBMyiVchphMa3OijiPjr7j3l44oFlMPkfXAFYo0'
    ),
    body := jsonb_build_object(
      'title', '📅 Novo Agendamento',
      'body', service_names || ' para ' || NEW.appointment_date || ' às ' || apt_time,
      'url', '/admin/agenda',
      'targetRole', 'admin'
    )
  ) INTO request_id;

  RETURN NEW;
END;
$function$;

-- Create trigger to fire on new appointments
DROP TRIGGER IF EXISTS trigger_push_on_new_appointment ON public.appointments;
CREATE TRIGGER trigger_push_on_new_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_new_appointment();