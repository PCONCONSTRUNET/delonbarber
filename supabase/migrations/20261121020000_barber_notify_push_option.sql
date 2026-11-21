-- ============================================================================
-- Opção de Notificação Push por Barbeiro (novo ou existente)
-- Idempotente: pode rodar isolado mesmo após a migration multi-barbeiros anterior.
-- ============================================================================

-- 1. Coluna notify_push em public.barbers (padrão: true)
ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS notify_push BOOLEAN NOT NULL DEFAULT true;

-- 2. RPC para o próprio barbeiro ligar/desligar o recebimento de Push de novos agendamentos
CREATE OR REPLACE FUNCTION public.toggle_my_barber_notify_push(p_enabled BOOLEAN DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status BOOLEAN;
BEGIN
  UPDATE public.barbers
  SET notify_push = COALESCE(p_enabled, NOT notify_push),
      updated_at = now()
  WHERE user_id = auth.uid()
    AND is_active = true
  RETURNING notify_push INTO v_new_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barbeiro não encontrado para o usuário logado';
  END IF;

  RETURN v_new_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_my_barber_notify_push(BOOLEAN) TO authenticated;

-- 3. Atualiza trigger send_push_on_new_appointment() para respeitar barbers.notify_push
-- e enviar para /barber/agenda quando o agendamento for do barbeiro.
CREATE OR REPLACE FUNCTION public.send_push_on_new_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_name       TEXT;
  barber_name       TEXT;
  barber_uid        UUID;
  barber_push       BOOLEAN;
  apt_time          TEXT;
  apt_date          TEXT;
  msg_text          TEXT;
  request_id        BIGINT;
  function_url      TEXT;
  anon_key          TEXT;
BEGIN
  IF NEW.guest_name IS NOT NULL AND trim(NEW.guest_name) <> '' THEN
    client_name := NEW.guest_name;
  ELSE
    SELECT name INTO client_name FROM public.profiles WHERE user_id = NEW.user_id;
    IF client_name IS NULL OR trim(client_name) = '' THEN
      client_name := 'Novo cliente';
    END IF;
  END IF;

  SELECT b.name, b.user_id, COALESCE(b.notify_push, true)
  INTO barber_name, barber_uid, barber_push
  FROM public.barbers b
  WHERE b.id = NEW.barber_id;

  apt_time := to_char(NEW.appointment_time::time, 'HH24:MI');
  apt_date := to_char(NEW.appointment_date, 'DD/MM/YYYY');
  msg_text := client_name || ' agendou'
    || COALESCE(' com ' || barber_name, '')
    || ' para ' || apt_date || ' às ' || apt_time;

  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push';
  anon_key := current_setting('app.settings.anon_key', true);

  IF function_url IS NULL OR function_url = '/functions/v1/send-push' OR anon_key IS NULL OR anon_key = '' THEN
    function_url := 'https://etfujmuzwzzhztucqbek.supabase.co/functions/v1/send-push';
    anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJldGZ1am11end6emh6dHVjcWJlayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY3ODIwNzU0LCJleHAiOjIwODMzOTY3NTR9.J0EQtBMyiVchphMa3OijiPjr7j3l44oFlMPkfXAFYo0';
  END IF;

  -- Push para Admins
  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
    ),
    body := jsonb_build_object(
      'role', 'admin',
      'title', '📅 Novo Agendamento',
      'message', msg_text,
      'url', '/admin/agenda',
      'data', jsonb_build_object('appointment_id', NEW.id, 'barber_id', NEW.barber_id)
    ),
    timeout_milliseconds := 5000
  ) INTO request_id;

  -- Push exclusivo para o Barbeiro escolhido quando notify_push estiver ativo (e não for admin para evitar duplicata)
  IF barber_uid IS NOT NULL
     AND COALESCE(barber_push, true) IS TRUE
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur WHERE ur.user_id = barber_uid AND ur.role = 'admin'
     )
  THEN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key,
        'apikey', anon_key
      ),
      body := jsonb_build_object(
        'role', 'barber',
        'user_id', barber_uid,
        'title', '📅 Novo Agendamento para Você',
        'message', msg_text,
        'url', '/barber/agenda',
        'data', jsonb_build_object('appointment_id', NEW.id, 'barber_id', NEW.barber_id)
      ),
      timeout_milliseconds := 5000
    ) INTO request_id;
  END IF;

  RETURN NEW;
END;
$$;
