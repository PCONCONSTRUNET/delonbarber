import { supabase } from '@/integrations/supabase/client';

interface SendPushArgs {
  role: 'admin' | 'cliente';
  title: string;
  message: string;
  user_id?: string;
  url?: string;
  data?: Record<string, unknown>;
}

/**
 * Dispara push via edge function send-push (OneSignal).
 * Fire-and-forget: erros são logados mas nunca lançados.
 */
export async function sendPush(args: SendPushArgs): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-push', { body: args });
    if (error) console.error('[sendPush] error:', error);
  } catch (err) {
    console.error('[sendPush] threw:', err);
  }
}
