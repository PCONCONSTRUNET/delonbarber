-- Add RLS policy to allow users to create their own package subscriptions
CREATE POLICY "Users can create own packages"
ON public.client_packages
FOR INSERT
WITH CHECK (auth.uid() = user_id);