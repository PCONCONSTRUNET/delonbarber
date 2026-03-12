
-- Table to track exclusive clients who can book on Saturdays
CREATE TABLE public.exclusive_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.exclusive_clients ENABLE ROW LEVEL SECURITY;

-- Admin can manage exclusive clients
CREATE POLICY "Admins can manage exclusive clients"
  ON public.exclusive_clients
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can check if they are exclusive
CREATE POLICY "Users can check own exclusive status"
  ON public.exclusive_clients
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);
