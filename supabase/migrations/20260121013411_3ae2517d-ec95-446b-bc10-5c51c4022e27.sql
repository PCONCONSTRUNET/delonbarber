-- Remove the problematic trigger that uses pg_net (not available)
DROP TRIGGER IF EXISTS trigger_push_on_new_appointment ON public.appointments;

-- Drop the function that uses pg_net
DROP FUNCTION IF EXISTS public.send_push_on_new_appointment();