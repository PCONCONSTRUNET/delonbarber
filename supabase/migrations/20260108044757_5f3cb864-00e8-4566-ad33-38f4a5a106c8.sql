-- Enable realtime for appointments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;