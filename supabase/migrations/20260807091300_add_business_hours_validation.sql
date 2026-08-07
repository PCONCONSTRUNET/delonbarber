-- ============================================================
-- FIX: Adicionar validação de Business Hours no Backend
-- Data: 2026-08-07
-- Problema: Clientes com a tela desatualizada conseguiam
--   agendar no horário de intervalo ou com loja fechada.
-- Solução: Incluir validação do expediente e intervalo de almoço
--   dentro da trigger `validate_appointment_no_conflict`.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_appointment_no_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_start       TIME;
  new_end         TIME;
  conflicting     RECORD;
  day_of_week_int INTEGER;
  bh              RECORD;
BEGIN
  -- Só valida agendamentos ativos (pending ou confirmed)
  IF NEW.status NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  new_start := NEW.appointment_time::TIME;
  new_end   := new_start + (COALESCE(NEW.total_duration, 30) * INTERVAL '1 minute');

  -- 1. Validar Business Hours e Intervalo de Almoço
  day_of_week_int := EXTRACT(DOW FROM NEW.appointment_date::DATE);
  
  SELECT * INTO bh FROM public.business_hours WHERE day_of_week = day_of_week_int;
  
  IF NOT FOUND OR bh.is_open = false THEN
    RAISE EXCEPTION 'SLOT_BLOCKED: O estabelecimento está fechado neste dia.';
  END IF;

  -- Verificar horário de expediente
  IF new_start < bh.open_time::TIME OR new_end > bh.close_time::TIME THEN
    RAISE EXCEPTION 'SLOT_BLOCKED: O horário solicitado (%) está fora do horário de expediente (fechamento às %).', 
      NEW.appointment_time, bh.close_time;
  END IF;

  -- Verificar intervalo de almoço
  IF bh.lunch_start IS NOT NULL AND bh.lunch_end IS NOT NULL THEN
    -- Condição de sobreposição com o intervalo:
    -- Inicio do agendamento < Fim do intervalo E Fim do agendamento > Inicio do intervalo
    IF new_start < bh.lunch_end::TIME AND new_end > bh.lunch_start::TIME THEN
      RAISE EXCEPTION 'SLOT_BLOCKED: Horário indisponível devido ao intervalo de almoço (das % às %).', 
        bh.lunch_start, bh.lunch_end;
    END IF;
  END IF;

  -- 2. Busca qualquer agendamento que se sobreponha no mesmo dia
  -- Condição de overlap: A.start < B.end  AND  B.start < A.end
  SELECT
    a.id,
    a.appointment_time,
    a.total_duration,
    COALESCE(g.name, p.full_name, 'cliente') AS client_name
  INTO conflicting
  FROM public.appointments a
  LEFT JOIN public.profiles p ON a.user_id = p.user_id
  LEFT JOIN (
    SELECT id, guest_name AS name FROM public.appointments WHERE guest_name IS NOT NULL
  ) g ON g.id = a.id
  WHERE a.appointment_date = NEW.appointment_date
    AND a.status IN ('pending', 'confirmed')
    AND a.id != NEW.id          -- não comparar consigo mesmo (UPDATE)
    -- Overlap: novo.start < existente.end  AND  existente.start < novo.end
    AND new_start < (a.appointment_time::TIME + (COALESCE(a.total_duration, 30) * INTERVAL '1 minute'))
    AND a.appointment_time::TIME < new_end
  LIMIT 1;

  IF conflicting.id IS NOT NULL THEN
    RAISE EXCEPTION
      'SLOT_CONFLICT: Horário % já está ocupado até % (agendamento de %)',
      NEW.appointment_time,
      (conflicting.appointment_time::TIME + (COALESCE(conflicting.total_duration, 30) * INTERVAL '1 minute'))::TEXT,
      conflicting.client_name;
  END IF;

  -- 3. Verificar bloqueios manuais no range do novo agendamento
  IF EXISTS (
    SELECT 1 FROM public.blocked_slots bs
    WHERE bs.blocked_date = NEW.appointment_date
      AND bs.is_manual = true
      -- slot manual está dentro do range do novo agendamento
      AND bs.blocked_time >= new_start
      AND bs.blocked_time < new_end
  ) THEN
    RAISE EXCEPTION
      'SLOT_BLOCKED: O horário % contém um bloqueio manual pelo administrador',
      NEW.appointment_time;
  END IF;

  RETURN NEW;
END;
$$;
