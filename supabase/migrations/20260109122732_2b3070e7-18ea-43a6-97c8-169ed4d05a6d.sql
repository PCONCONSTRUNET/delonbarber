-- Função para adicionar visita automaticamente quando agendamento for concluído
CREATE OR REPLACE FUNCTION public.add_loyalty_visit_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  program_record RECORD;
BEGIN
  -- Só processa se o status mudou para 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Para cada programa de fidelidade ativo
    FOR program_record IN 
      SELECT id FROM loyalty_program WHERE is_active = true
    LOOP
      -- Inserir ou atualizar o progresso do cliente
      INSERT INTO loyalty_progress (user_id, program_id, visits_count, last_visit_at)
      VALUES (NEW.user_id, program_record.id, 1, now())
      ON CONFLICT (user_id, program_id) 
      DO UPDATE SET 
        visits_count = loyalty_progress.visits_count + 1,
        last_visit_at = now(),
        updated_at = now();
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para chamar a função quando agendamento for atualizado
CREATE TRIGGER on_appointment_completed_add_loyalty_visit
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION public.add_loyalty_visit_on_completion();