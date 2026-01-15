-- Drop existing restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Public can create guest appointments" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can create guest appointments" ON public.appointments;

-- Create PERMISSIVE policy for anonymous guest appointments
CREATE POLICY "Allow public guest appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  guest_name IS NOT NULL 
  AND guest_phone IS NOT NULL
  AND guest_name != ''
  AND guest_phone != ''
);

-- Fix appointment_services policy too
DROP POLICY IF EXISTS "Anyone can insert services for guest appointments" ON public.appointment_services;

CREATE POLICY "Allow public insert appointment services"
ON public.appointment_services
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments 
    WHERE appointments.id = appointment_services.appointment_id 
    AND appointments.guest_name IS NOT NULL 
    AND appointments.guest_phone IS NOT NULL
  )
);

-- Fix blocked_slots policy
DROP POLICY IF EXISTS "Anyone can create blocked slots for guest appointments" ON public.blocked_slots;

CREATE POLICY "Allow public insert blocked slots"
ON public.blocked_slots
FOR INSERT
TO anon, authenticated
WITH CHECK (is_manual = false);