-- Drop duplicate trigger that may cause issues
DROP TRIGGER IF EXISTS on_appointment_blocking ON public.appointments;

-- Clean up orphaned blocked_slots for completed/cancelled appointments
DELETE FROM public.blocked_slots bs
WHERE bs.is_manual = false 
AND bs.appointment_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM public.appointments a 
  WHERE a.id = bs.appointment_id 
  AND a.status IN ('completed', 'cancelled')
);