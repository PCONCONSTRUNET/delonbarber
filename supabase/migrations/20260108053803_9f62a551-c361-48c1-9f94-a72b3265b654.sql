-- Create blocked_slots table for manual and automatic blocking
CREATE TABLE public.blocked_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date DATE NOT NULL,
  blocked_time TIME WITHOUT TIME ZONE NOT NULL,
  reason TEXT,
  is_manual BOOLEAN NOT NULL DEFAULT true,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(blocked_date, blocked_time)
);

-- Enable RLS
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

-- Admins can manage all blocked slots
CREATE POLICY "Admins can manage blocked slots"
ON public.blocked_slots
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view blocked slots (needed for booking flow)
CREATE POLICY "Anyone can view blocked slots"
ON public.blocked_slots
FOR SELECT
USING (true);

-- Create function to auto-block slots when appointment is confirmed
CREATE OR REPLACE FUNCTION public.handle_appointment_blocking()
RETURNS TRIGGER AS $$
BEGIN
  -- When appointment is confirmed, block the slot
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    INSERT INTO public.blocked_slots (blocked_date, blocked_time, reason, is_manual, appointment_id)
    VALUES (NEW.appointment_date, NEW.appointment_time, 'Agendamento confirmado', false, NEW.id)
    ON CONFLICT (blocked_date, blocked_time) DO UPDATE
    SET reason = 'Agendamento confirmado', is_manual = false, appointment_id = NEW.id;
  END IF;
  
  -- When appointment is cancelled or completed, unblock the slot (only if it was auto-blocked)
  IF NEW.status IN ('cancelled') AND OLD.status = 'confirmed' THEN
    DELETE FROM public.blocked_slots 
    WHERE appointment_id = NEW.id AND is_manual = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-blocking
CREATE TRIGGER on_appointment_status_change
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_blocking();

-- Block existing confirmed appointments
INSERT INTO public.blocked_slots (blocked_date, blocked_time, reason, is_manual, appointment_id)
SELECT appointment_date, appointment_time, 'Agendamento confirmado', false, id
FROM public.appointments
WHERE status = 'confirmed'
ON CONFLICT (blocked_date, blocked_time) DO NOTHING;