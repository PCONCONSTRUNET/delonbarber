-- Add INSERT policy for users to register their own package usage
CREATE POLICY "Users can register own package usage" 
ON public.client_package_usage 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_packages cp 
    WHERE cp.id = client_package_id 
    AND cp.user_id = auth.uid()
  )
);