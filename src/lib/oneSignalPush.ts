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
 * Sends a push notification via OneSignal edge function.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function sendPush(args: SendPushArgs): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-push', { body: args });
    if (error) console.error('[sendPush] error:', error);
  } catch (err) {
    console.error('[sendPush] threw:', err);
  }
}

export const notifyAdmin = (title: string, message: string, url?: string) =>
  sendPush({ role: 'admin', title, message, url });

export const notifyClient = (user_id: string, title: string, message: string, url?: string) =>
  sendPush({ role: 'cliente', user_id, title, message, url });
