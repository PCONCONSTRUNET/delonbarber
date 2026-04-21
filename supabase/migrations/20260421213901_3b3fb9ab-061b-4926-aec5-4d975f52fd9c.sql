-- Recriar o trigger que cria profile automaticamente ao registrar usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: criar profiles para usuários que não têm
INSERT INTO public.profiles (user_id, name, phone)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)),
  COALESCE(u.raw_user_meta_data->>'phone', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;