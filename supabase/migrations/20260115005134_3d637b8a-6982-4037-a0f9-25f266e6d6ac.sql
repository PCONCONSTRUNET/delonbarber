-- Create guest_clients table for customers from the public form
CREATE TABLE public.guest_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  total_visits INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  last_visit_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guest_clients ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for the form)
CREATE POLICY "Anyone can create guest clients"
ON public.guest_clients
FOR INSERT
WITH CHECK (true);

-- Allow public select by phone (to check if exists)
CREATE POLICY "Anyone can view guest clients"
ON public.guest_clients
FOR SELECT
USING (true);

-- Allow public update (to update stats)
CREATE POLICY "Anyone can update guest clients"
ON public.guest_clients
FOR UPDATE
USING (true);

-- Admin can delete
CREATE POLICY "Admins can delete guest clients"
ON public.guest_clients
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Add guest_client_id to appointments table
ALTER TABLE public.appointments 
ADD COLUMN guest_client_id UUID REFERENCES public.guest_clients(id);

-- Create index for faster lookups
CREATE INDEX idx_guest_clients_phone ON public.guest_clients(phone);
CREATE INDEX idx_appointments_guest_client ON public.appointments(guest_client_id);

-- Create function to update guest_client stats when appointment is completed
CREATE OR REPLACE FUNCTION public.update_guest_client_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update guest client stats if there's a guest_client_id
    IF NEW.guest_client_id IS NOT NULL THEN
      UPDATE public.guest_clients
      SET 
        total_visits = total_visits + 1,
        total_spent = total_spent + COALESCE(NEW.total_price, 0),
        last_visit_at = now(),
        updated_at = now()
      WHERE id = NEW.guest_client_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER on_appointment_completed_update_guest_stats
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_client_stats();

-- Also trigger on insert if created as completed
CREATE TRIGGER on_appointment_insert_update_guest_stats
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_client_stats();