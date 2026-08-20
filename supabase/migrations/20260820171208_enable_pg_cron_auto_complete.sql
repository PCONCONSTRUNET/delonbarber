-- 1. Enable pg_cron extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 2. Schedule the auto_complete_appointments function to run every minute
SELECT cron.schedule(
  'auto_complete_appointments_job', -- name of the cron job
  '* * * * *',                      -- cron schedule (every minute)
  'SELECT public.auto_complete_appointments();' -- command to run
);
