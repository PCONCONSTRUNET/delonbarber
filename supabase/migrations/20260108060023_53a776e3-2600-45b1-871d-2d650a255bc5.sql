-- Add guest client fields for appointments created via WhatsApp AI
ALTER TABLE public.appointments 
ADD COLUMN guest_name TEXT,
ADD COLUMN guest_phone TEXT;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.appointments.guest_name IS 'Name of guest client (for appointments created without user registration)';
COMMENT ON COLUMN public.appointments.guest_phone IS 'Phone of guest client (for appointments created without user registration)';