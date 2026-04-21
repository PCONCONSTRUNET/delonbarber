
CREATE TABLE public.onesignal_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cliente')),
  player_id TEXT NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_onesignal_subscriptions_role ON public.onesignal_subscriptions(role) WHERE ativo = true;
CREATE INDEX idx_onesignal_subscriptions_user_id ON public.onesignal_subscriptions(user_id) WHERE ativo = true;

ALTER TABLE public.onesignal_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can insert their own device subscription
CREATE POLICY "Anyone can insert subscriptions"
ON public.onesignal_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Anyone can update their device (matched by player_id from client)
CREATE POLICY "Anyone can update subscriptions"
ON public.onesignal_subscriptions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.onesignal_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all onesignal subscriptions"
ON public.onesignal_subscriptions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete subscriptions
CREATE POLICY "Admins can delete onesignal subscriptions"
ON public.onesignal_subscriptions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_onesignal_subscriptions_updated_at
BEFORE UPDATE ON public.onesignal_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
