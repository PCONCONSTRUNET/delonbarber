-- Allow anyone to create appointments via the public form (with guest fields)
CREATE POLICY "Anyone can create guest appointments"
ON public.appointments
FOR INSERT
WITH CHECK (guest_name IS NOT NULL AND guest_phone IS NOT NULL);

-- Allow anyone to insert appointment services for guest appointments
CREATE POLICY "Anyone can insert services for guest appointments"
ON public.appointment_services
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_services.appointment_id
    AND appointments.guest_name IS NOT NULL
    AND appointments.guest_phone IS NOT NULL
  )
);

-- Allow anyone to create blocked slots for appointments (via the public form)
CREATE POLICY "Anyone can create blocked slots for guest appointments"
ON public.blocked_slots
FOR INSERT
WITH CHECK (is_manual = false);