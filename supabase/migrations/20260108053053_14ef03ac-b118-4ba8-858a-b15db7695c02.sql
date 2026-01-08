-- Add column to mark services as subscribers-only
ALTER TABLE public.services 
ADD COLUMN subscribers_only boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.services.subscribers_only IS 'When true, this service is only visible to users with active packages';