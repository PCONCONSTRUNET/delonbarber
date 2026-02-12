-- Add 'no_show' to appointment_status enum
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'no_show';
