-- Add unique constraint on user_id for push_subscriptions to allow upsert
ALTER TABLE public.push_subscriptions 
ADD CONSTRAINT push_subscriptions_user_id_key UNIQUE (user_id);