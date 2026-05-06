CREATE EXTENSION IF NOT EXISTS pg_net;

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
  request_id BIGINT;
  function_url TEXT;
  anon_key TEXT;
BEGIN
  IF NEW.guest_name IS NOT NULL AND trim(NEW.guest_name) <> '' THEN
    client_name := NEW.guest_name;
  ELSE
    SELECT name INTO client_name FROM public.profiles WHERE user_id = NEW.user_id;
    IF client_name IS NULL OR trim(client_name) = '' THEN
      client_name := 'Novo cliente';
    END IF;
  END IF;

  apt_time := to_char(NEW.appointment_time::time, 'HH24:MI');
  apt_date := to_char(NEW.appointment_date, 'DD/MM/YYYY');
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push';
  anon_key := current_setting('app.settings.anon_key', true);

  IF function_url IS NULL OR function_url = '/functions/v1/send-push' OR anon_key IS NULL OR anon_key = '' THEN
    function_url := 'https://etfujmuzwzzhztucqbek.supabase.co/functions/v1/send-push';
    anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJldGZ1am11end6emh6dHVjcWJlayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY3ODIwNzU0LCJleHAiOjIwODMzOTY3NTR9.J0EQtBMyiVchphMa3OijiPjr7j3l44oFlMPkfXAFYo0';
  END IF;

  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
    ),
    body := jsonb_build_object(
      'role', 'admin',
      'title', '📅 Novo Agendamento',
      'message', client_name || ' agendou para ' || apt_date || ' às ' || apt_time,
      'url', '/admin/agenda',
      'data', jsonb_build_object('appointment_id', NEW.id)
    ),
    timeout_milliseconds := 5000
  ) INTO request_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_push_on_new_appointment ON public.appointments;
CREATE TRIGGER trigger_push_on_new_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_new_appointment();

DROP TRIGGER IF EXISTS trigger_notify_admins_on_new_appointment ON public.appointments;
DROP TRIGGER IF EXISTS on_new_appointment_notify ON public.appointments;
CREATE TRIGGER on_new_appointment_notify
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_new_appointment();