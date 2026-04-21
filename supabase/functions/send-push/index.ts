import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  role: 'admin' | 'cliente';
  user_id?: string;
  title: string;
  message: string;
  url?: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
    const REST_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!APP_ID || !REST_KEY) {
      throw new Error('OneSignal credentials missing');
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const payload: PushPayload = await req.json();
    const { role, user_id, title, message, url, data } = payload;

    if (!role || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'role, title and message are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[send-push] Request:', { role, user_id, title });

    // Fetch active player_ids
    let playerIds: string[] = [];

    if (user_id) {
      // First try: subscriptions linked to this specific user
      const { data: userSubs } = await supabase
        .from('onesignal_subscriptions')
        .select('player_id')
        .eq('ativo', true)
        .eq('role', role)
        .eq('user_id', user_id);

      playerIds = (userSubs || []).map((s) => s.player_id);

      // Fallback: orphan devices of same role (no user_id linked)
      if (playerIds.length === 0) {
        const { data: orphanSubs } = await supabase
          .from('onesignal_subscriptions')
          .select('player_id')
          .eq('ativo', true)
          .eq('role', role)
          .is('user_id', null);
        playerIds = (orphanSubs || []).map((s) => s.player_id);
      }
    } else {
      // No user_id: send to all of role
      const { data: roleSubs } = await supabase
        .from('onesignal_subscriptions')
        .select('player_id')
        .eq('ativo', true)
        .eq('role', role);
      playerIds = (roleSubs || []).map((s) => s.player_id);
    }

    console.log(`[send-push] Found ${playerIds.length} player_ids for role=${role}`);

    if (playerIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No active subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send via OneSignal REST API
    const oneSignalRes = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${REST_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: APP_ID,
        include_player_ids: playerIds,
        headings: { en: title, pt: title },
        contents: { en: message, pt: message },
        url: url || undefined,
        data: data || {},
        web_push_topic: data?.topic as string | undefined,
      }),
    });

    const oneSignalData = await oneSignalRes.json();
    console.log('[send-push] OneSignal response:', oneSignalData);

    // Handle invalid player_ids
    if (oneSignalData.errors?.invalid_player_ids?.length > 0) {
      const invalidIds = oneSignalData.errors.invalid_player_ids;
      console.log(`[send-push] Marking ${invalidIds.length} invalid player_ids as inactive`);
      await supabase
        .from('onesignal_subscriptions')
        .update({ ativo: false })
        .in('player_id', invalidIds);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: playerIds.length,
        recipients: oneSignalData.recipients ?? 0,
        notification_id: oneSignalData.id,
        errors: oneSignalData.errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[send-push] Error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
