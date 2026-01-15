-- Allow anyone to read admin user_id for guest appointments
CREATE POLICY "Anyone can view admin roles"
ON public.user_roles
FOR SELECT
USING (role = 'admin');