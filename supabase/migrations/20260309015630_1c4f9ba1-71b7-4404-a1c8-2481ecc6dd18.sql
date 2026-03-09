
CREATE OR REPLACE FUNCTION public.auto_complete_appointments()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  completed_count integer;
BEGIN
  UPDATE appointments
  SET status = 'completed',
      payment_status = 'paid',
      payment_date = COALESCE(payment_date, now()),
      updated_at = now()
  WHERE status = 'confirmed'
    AND (
      -- Past days: auto-complete all confirmed appointments from previous days
      appointment_date < CURRENT_DATE
      OR (
        -- Today: auto-complete if appointment time + duration has passed
        appointment_date = CURRENT_DATE
        AND (
          (EXTRACT(HOUR FROM appointment_time) * 60 + EXTRACT(MINUTE FROM appointment_time)) + COALESCE(total_duration, 30)
        ) <= (EXTRACT(HOUR FROM CURRENT_TIME) * 60 + EXTRACT(MINUTE FROM CURRENT_TIME))
      )
    );
  
  GET DIAGNOSTICS completed_count = ROW_COUNT;
  RETURN completed_count;
END;
$function$;
