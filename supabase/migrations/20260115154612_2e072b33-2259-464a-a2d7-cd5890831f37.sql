-- Create a function to call the push notification edge function when a new appointment is created
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  client_name TEXT;
  admin_users RECORD;
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

  -- Insert notification for all admin users
  INSERT INTO public.notifications (user_id, title, message, type, appointment_id)
  SELECT 
    ur.user_id,
    '📅 Novo Agendamento',
    client_name || ' agendou para ' || NEW.appointment_date || ' às ' || substring(NEW.appointment_time from 1 for 5),
    'info',
    NEW.id
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_admins_on_new_appointment ON public.appointments;

-- Create trigger for new appointments
CREATE TRIGGER trigger_notify_admins_on_new_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_new_appointment();