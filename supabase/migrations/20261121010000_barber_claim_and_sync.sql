-- ============================================================================
-- Auto-vinculação segura de conta de barbeiro no login + sincronização de e-mails
-- Idempotente: seguro caso a migration anterior já tenha sido executada.
-- ============================================================================

-- 1. Backfill: se houver barbeiro ativo com email cadastrado mas user_id ainda NULL,
-- vincula com a conta existente em auth.users e confirma o e-mail para login imediato.
DO $$
DECLARE
  rec RECORD;
  v_uid UUID;
BEGIN
  FOR rec IN
    SELECT id, name, phone, avatar_url, lower(trim(email)) AS clean_email
    FROM public.barbers
    WHERE user_id IS NULL
      AND email IS NOT NULL
      AND trim(email) <> ''
  LOOP
    SELECT id INTO v_uid
    FROM auth.users
    WHERE lower(email) = rec.clean_email
    LIMIT 1;

    IF v_uid IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.barbers WHERE user_id = v_uid AND id <> rec.id
    ) THEN
      BEGIN
        UPDATE auth.users
        SET email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE id = v_uid;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      INSERT INTO public.profiles (user_id, name, phone, avatar_url)
      VALUES (v_uid, rec.name, rec.phone, rec.avatar_url)
      ON CONFLICT (user_id) DO NOTHING;

      UPDATE public.barbers
      SET user_id = v_uid,
          email = rec.clean_email,
          updated_at = now()
      WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- 2. RPC segura: ao logar no Painel do Barbeiro (/barber/login), se o user_id ainda estiver NULL
-- mas o e-mail verificado do usuário bater com public.barbers.email, vincula automaticamente.
CREATE OR REPLACE FUNCTION public.claim_my_barber_account()
RETURNS SETOF public.barbers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_target_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Já vinculado por user_id
  IF EXISTS (SELECT 1 FROM public.barbers WHERE user_id = v_uid) THEN
    RETURN QUERY
    SELECT * FROM public.barbers WHERE user_id = v_uid LIMIT 1;
    RETURN;
  END IF;

  -- E-mail confirmado em auth.users
  SELECT lower(email) INTO v_email
  FROM auth.users
  WHERE id = v_uid
    AND email_confirmed_at IS NOT NULL;

  IF v_email IS NOT NULL AND v_email <> '' THEN
    SELECT id INTO v_target_id
    FROM public.barbers
    WHERE user_id IS NULL
      AND is_active = true
      AND lower(trim(email)) = v_email
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_target_id IS NOT NULL THEN
      UPDATE public.barbers
      SET user_id = v_uid,
          email = v_email,
          updated_at = now()
      WHERE id = v_target_id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT * FROM public.barbers WHERE user_id = v_uid LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_my_barber_account() TO authenticated;
