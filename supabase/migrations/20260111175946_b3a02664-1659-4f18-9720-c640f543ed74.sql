-- Add lunch break fields to business_hours
ALTER TABLE public.business_hours 
ADD COLUMN lunch_start TIME DEFAULT NULL,
ADD COLUMN lunch_end TIME DEFAULT NULL;

-- Update business hours with the new schedule
-- Sunday (0) - Closed
UPDATE public.business_hours SET is_open = false WHERE day_of_week = 0;

-- Monday (1) - Closed
UPDATE public.business_hours SET is_open = false WHERE day_of_week = 1;

-- Tuesday (2) - 8:00-12:00 and 13:00-15:00
UPDATE public.business_hours SET 
  is_open = true,
  open_time = '08:00:00',
  close_time = '15:00:00',
  lunch_start = '12:00:00',
  lunch_end = '13:00:00'
WHERE day_of_week = 2;

-- Wednesday (3) - 8:00-12:00 and 13:00-15:00
UPDATE public.business_hours SET 
  is_open = true,
  open_time = '08:00:00',
  close_time = '15:00:00',
  lunch_start = '12:00:00',
  lunch_end = '13:00:00'
WHERE day_of_week = 3;

-- Thursday (4) - 8:00-12:00 and 13:00-15:00
UPDATE public.business_hours SET 
  is_open = true,
  open_time = '08:00:00',
  close_time = '15:00:00',
  lunch_start = '12:00:00',
  lunch_end = '13:00:00'
WHERE day_of_week = 4;

-- Friday (5) - 8:00-12:00 and 13:00-15:00
UPDATE public.business_hours SET 
  is_open = true,
  open_time = '08:00:00',
  close_time = '15:00:00',
  lunch_start = '12:00:00',
  lunch_end = '13:00:00'
WHERE day_of_week = 5;

-- Saturday (6) - 7:30-12:00 and 13:30-17:00
UPDATE public.business_hours SET 
  is_open = true,
  open_time = '07:30:00',
  close_time = '17:00:00',
  lunch_start = '12:00:00',
  lunch_end = '13:30:00'
WHERE day_of_week = 6;