-- Tabela de inscrições push (nova)
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  role TEXT NOT NULL,
  player_id TEXT NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read push subs" ON public.push_subscriptions
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert push subs" ON public.push_subscriptions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update push subs" ON public.push_subscriptions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete push subs" ON public.push_subscriptions
  FOR DELETE TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_push_subs_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_push_subs_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_push_subs_updated_at();