
-- Re-attach all appointment triggers that are missing

-- 1. Trigger to block slots when appointment is created/updated
DROP TRIGGER IF EXISTS on_appointment_blocking ON public.appointments;
CREATE TRIGGER on_appointment_blocking
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_blocking();

-- 2. Trigger to validate no overlapping appointments
DROP TRIGGER IF EXISTS on_validate_appointment_slot ON public.appointments;
CREATE TRIGGER on_validate_appointment_slot
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_new_appointment_slot();

-- 3. Trigger to clean up blocked_slots on appointment delete
DROP TRIGGER IF EXISTS on_appointment_delete ON public.appointments;
CREATE TRIGGER on_appointment_delete
  BEFORE DELETE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_delete();

-- 4. Trigger to create notifications on status/payment changes
DROP TRIGGER IF EXISTS on_appointment_status_change ON public.appointments;
CREATE TRIGGER on_appointment_status_change
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_appointment_notification();

-- 5. Trigger to notify admins on new appointments
DROP TRIGGER IF EXISTS on_new_appointment_notify ON public.appointments;
CREATE TRIGGER on_new_appointment_notify
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_new_appointment();

-- 6. Trigger to add loyalty visit on completion
DROP TRIGGER IF EXISTS on_appointment_complete_loyalty ON public.appointments;
CREATE TRIGGER on_appointment_complete_loyalty
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.add_loyalty_visit_on_completion();

-- 7. Trigger to update guest client stats
DROP TRIGGER IF EXISTS on_appointment_complete_guest_stats ON public.appointments;
CREATE TRIGGER on_appointment_complete_guest_stats
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_client_stats();

-- 8. Profile creation trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
