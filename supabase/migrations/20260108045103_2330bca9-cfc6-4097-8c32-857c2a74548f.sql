-- Allow admins to delete appointments
CREATE POLICY "Admins can delete appointments" ON public.appointments
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete appointment_services
CREATE POLICY "Admins can delete appointment services" ON public.appointment_services
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));