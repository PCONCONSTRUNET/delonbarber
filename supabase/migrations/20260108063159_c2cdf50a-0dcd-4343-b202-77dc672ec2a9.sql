-- Remove the old constraint and add a new one that includes 'pending'
ALTER TABLE public.client_packages DROP CONSTRAINT client_packages_status_check;

ALTER TABLE public.client_packages ADD CONSTRAINT client_packages_status_check 
  CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'pending'::text]));