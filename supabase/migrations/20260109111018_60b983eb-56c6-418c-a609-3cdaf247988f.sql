-- Add weekly_limit column to package_benefits table
-- This controls how many times a benefit can be used per week
ALTER TABLE public.package_benefits 
ADD COLUMN weekly_limit integer DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN public.package_benefits.weekly_limit IS 'Maximum uses per week for this benefit. NULL means no weekly limit (only total quantity limit applies).';