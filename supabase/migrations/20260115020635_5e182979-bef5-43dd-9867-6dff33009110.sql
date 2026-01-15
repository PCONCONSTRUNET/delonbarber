-- Drop the existing policy and recreate with correct logic
DROP POLICY IF EXISTS "Anyone can create guest appointments" ON public.appointments;

-- Create a simpler policy that allows inserts when guest fields are provided
CREATE POLICY "Public can create guest appointments"
ON public.appointments
FOR INSERT
WITH CHECK (
  guest_name IS NOT NULL 
  AND guest_phone IS NOT NULL
  AND guest_name != ''
  AND guest_phone != ''
);