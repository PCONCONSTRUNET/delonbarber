-- Drop existing restrictive policies for public access
DROP POLICY IF EXISTS "Allow public guest appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public insert appointment services" ON public.appointment_services;
DROP POLICY IF EXISTS "Allow public insert blocked slots" ON public.blocked_slots;

-- Create PERMISSIVE policies (default behavior) for public guest access
CREATE POLICY "Public guest appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  guest_name IS NOT NULL 
  AND guest_phone IS NOT NULL 
  AND guest_name <> '' 
  AND guest_phone <> ''
);

CREATE POLICY "Public insert appointment services"
ON public.appointment_services
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_services.appointment_id
    AND a.guest_name IS NOT NULL
    AND a.guest_phone IS NOT NULL
  )
);

CREATE POLICY "Public insert blocked slots for appointments"
ON public.blocked_slots
FOR INSERT
TO anon, authenticated
WITH CHECK (is_manual = false);