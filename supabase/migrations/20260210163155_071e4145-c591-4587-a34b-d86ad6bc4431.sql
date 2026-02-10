
-- Create a function that auto-completes appointments whose time + duration has passed
CREATE OR REPLACE FUNCTION public.auto_complete_appointments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  completed_count integer;
BEGIN
  UPDATE appointments
  SET status = 'completed',
      updated_at = now()
  WHERE status = 'confirmed'
    AND appointment_date < CURRENT_DATE
    OR (
      status = 'confirmed'
      AND appointment_date = CURRENT_DATE
      AND (
        (EXTRACT(HOUR FROM appointment_time) * 60 + EXTRACT(MINUTE FROM appointment_time)) + COALESCE(total_duration, 30)
      ) <= (EXTRACT(HOUR FROM CURRENT_TIME) * 60 + EXTRACT(MINUTE FROM CURRENT_TIME))
    );
  
  GET DIAGNOSTICS completed_count = ROW_COUNT;
  RETURN completed_count;
END;
$$;
