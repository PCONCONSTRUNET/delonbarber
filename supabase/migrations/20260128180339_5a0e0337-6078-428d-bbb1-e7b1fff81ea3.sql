-- Insert missing profiles for users that don't have one
INSERT INTO public.profiles (user_id, name)
SELECT au.id, COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1))
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;