-- ============================================================
-- FEATURE: Auto mark as paid when completed
-- Data: 2026-08-07
-- Problema: Barbeiro precisa marcar pedidos como pagos manualmente
--   quando conclui o atendimento (ou quando o sistema conclui).
-- Solução: Trigger na tabela appointments que seta 
--   payment_status = 'paid' sempre que status for para 'completed'.
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_appointment_paid_when_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se o status mudou para 'completed' (seja no INSERT ou UPDATE)
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    NEW.payment_status := 'paid';
    NEW.payment_date := COALESCE(NEW.payment_date, CURRENT_TIMESTAMP);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE UPDATE OR INSERT
DROP TRIGGER IF EXISTS trg_mark_paid_when_completed ON public.appointments;

CREATE TRIGGER trg_mark_paid_when_completed
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_appointment_paid_when_completed();
