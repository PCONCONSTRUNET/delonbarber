-- Add policy to allow reading profiles for public ratings display
-- This allows fetching profile name/avatar for public rating displays
CREATE POLICY "Anyone can view profile names for public features" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM ratings 
    WHERE ratings.user_id = profiles.user_id 
    AND ratings.is_public = true
  )
);