-- Fix the notify_admins_on_new_appointment function to properly handle time type
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  client_name TEXT;
  admin_users RECORD;
  apt_time TEXT;
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

  -- Convert time to text properly
  apt_time := to_char(NEW.appointment_time::time, 'HH24:MI');

  -- Insert notification for all admin users
  INSERT INTO public.notifications (user_id, title, message, type, appointment_id)
  SELECT 
    ur.user_id,
    '📅 Novo Agendamento',
    client_name || ' agendou para ' || NEW.appointment_date || ' às ' || apt_time,
    'info',
    NEW.id
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;