-- Migration: Avanço automático de ciclo sequencial quando semana passa sem agendamento
-- Roda diariamente às 00:05 BRT via pg_cron

-- --- Função principal ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.advance_sequential_cycles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_client_package RECORD;
  v_usage_count    INTEGER;
  v_active_svc_ids uuid[];
  v_week_start     date;
  v_week_end       date;
  v_has_usage      BOOLEAN;
  v_svc_id         uuid;
BEGIN
  -- Semana anterior (segunda a domingo, fuso BRT)
  v_week_start := (date_trunc('week', (now() AT TIME ZONE 'America/Sao_Paulo')) - INTERVAL '7 days')::date;
  v_week_end   := v_week_start + 6;

  -- Percorre todos os pacotes sequenciais ativos
  FOR v_client_package IN
    SELECT cp.id AS client_package_id,
           cp.package_id,
           cp.user_id
    FROM   client_packages cp
    JOIN   packages        p ON p.id = cp.package_id
    WHERE  cp.status  = 'active'
    AND    cp.end_date >= current_date
    AND    p.type     = 'sequential'
  LOOP

    -- Conta usos totais: appointments distintos + skips (sem appointment_id)
    SELECT
      COUNT(DISTINCT appointment_id) FILTER (WHERE appointment_id IS NOT NULL)
      + COUNT(*) FILTER (WHERE appointment_id IS NULL)
    INTO v_usage_count
    FROM client_package_usage
    WHERE client_package_id = v_client_package.client_package_id;

    -- Determina os serviços do ciclo ativo (índice = usage_count % total_grupos)
    WITH grouped AS (
      SELECT sequence_order,
             array_agg(service_id ORDER BY service_id) AS service_ids,
             dense_rank() OVER (ORDER BY sequence_order) - 1 AS grp_index
      FROM   package_cycles
      WHERE  package_id = v_client_package.package_id
      GROUP  BY sequence_order
    ),
    total AS (
      SELECT COUNT(DISTINCT sequence_order) AS total_groups
      FROM   package_cycles
      WHERE  package_id = v_client_package.package_id
    )
    SELECT g.service_ids
    INTO   v_active_svc_ids
    FROM   grouped g, total t
    WHERE  g.grp_index = (v_usage_count % t.total_groups)
    LIMIT  1;

    IF v_active_svc_ids IS NULL OR array_length(v_active_svc_ids, 1) IS NULL THEN
      CONTINUE;
    END IF;

    -- Verifica se houve agendamento real na semana passada para esse ciclo
    SELECT EXISTS (
      SELECT 1
      FROM   client_package_usage u
      WHERE  u.client_package_id = v_client_package.client_package_id
      AND    u.service_id        = ANY(v_active_svc_ids)
      AND    u.appointment_id    IS NOT NULL
      AND    (u.used_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN v_week_start AND v_week_end
    ) INTO v_has_usage;

    -- Se NÃO houve uso real ? insere skip para avançar o ponteiro
    IF NOT v_has_usage THEN
      -- Evita duplicatas
      IF NOT EXISTS (
        SELECT 1
        FROM   client_package_usage
        WHERE  client_package_id = v_client_package.client_package_id
        AND    service_id        = ANY(v_active_svc_ids)
        AND    appointment_id    IS NULL
        AND    (used_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN v_week_start AND v_week_end
      ) THEN
        FOREACH v_svc_id IN ARRAY v_active_svc_ids
        LOOP
          INSERT INTO client_package_usage (client_package_id, service_id, appointment_id, used_at)
          VALUES (
            v_client_package.client_package_id,
            v_svc_id,
            NULL,
            (v_week_end::timestamp AT TIME ZONE 'America/Sao_Paulo') + INTERVAL '23 hours 59 minutes'
          );
        END LOOP;

        RAISE LOG 'advance_sequential_cycles: skip para client_package_id=% services=% semana=%',
          v_client_package.client_package_id, v_active_svc_ids, v_week_start;
      END IF;
    END IF;

  END LOOP;
END;
$func$;

-- --- Agendamento via pg_cron ---------------------------------------------------
DO $$
BEGIN
  -- Remove job anterior se existir (idempotência)
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'advance_sequential_cycles_job') THEN
    PERFORM cron.unschedule('advance_sequential_cycles_job');
  END IF;
END $$;

-- 03:05 UTC = 00:05 BRT (UTC-3)
SELECT cron.schedule(
  'advance_sequential_cycles_job',
  '5 3 * * *',
  'SELECT public.advance_sequential_cycles();'
);
