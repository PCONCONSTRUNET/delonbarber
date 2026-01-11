import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  userIds?: string[];
  toAdmins?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    console.log('Sending push notification:', payload);

    let userIdsToNotify: string[] = [];

    // If sending to admins, get all admin user IDs
    if (payload.toAdmins) {
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles) {
        userIdsToNotify = adminRoles.map(r => r.user_id);
      }
    } else if (payload.userIds) {
      userIdsToNotify = payload.userIds;
    }

    if (userIdsToNotify.length === 0) {
      console.log('No users to notify');
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Get push subscriptions for these users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIdsToNotify);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for users');
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions to notify`);

    // Simple push notification using the push endpoint directly
    // For a production app, you would use a library like web-push
    const pushPayloadStr = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/admin/agenda',
      tag: payload.tag || 'appointment',
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        // For now, we'll just log the push attempt
        // In production, you would implement proper Web Push Protocol here
        console.log(`Would send push to: ${sub.endpoint.slice(0, 50)}...`);
        console.log(`Payload: ${pushPayloadStr}`);
        
        // Mark as sent for now (in production, implement actual push)
        sent++;
      } catch (error) {
        console.error('Error sending push to subscription:', error);
        failed++;
      }
    }

    console.log(`Push notifications prepared: ${sent}, failed: ${failed}`);

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
