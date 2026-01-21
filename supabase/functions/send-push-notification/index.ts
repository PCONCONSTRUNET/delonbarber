import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "web-push";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid VAPID keys (P-256 curve)
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = 'mailto:lucaspereirabn10@gmail.com';

// Configure web-push with VAPID details
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { title, body, url, targetUserId, targetRole } = await req.json();

    console.log('Sending push notification:', { title, body, targetRole });

    // Get all subscriptions for target users
    let query = supabase.from('push_subscriptions').select('*');
    
    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    } else if (targetRole === 'admin') {
      // Get all admin user IDs
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map((r: { user_id: string }) => r.user_id);
        query = query.in('user_id', adminIds);
      }
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`);

    const payload = JSON.stringify({
      title: title || 'Barbearia Alan Delon',
      body: body || '',
      url: url || '/admin/agenda',
      tag: 'appointment-notification',
      timestamp: new Date().toISOString(),
    });

    // Send real push notifications to all subscriptions
    const pushPromises = (subscriptions || []).map(async (sub: { endpoint: string; p256dh: string; auth: string; user_id: string }) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, payload);
        console.log(`Push sent to user ${sub.user_id}`);
        return { success: true, userId: sub.user_id };
      } catch (pushError: unknown) {
        const err = pushError as { statusCode?: number; message?: string };
        console.error(`Failed to send push to ${sub.user_id}:`, err);
        
        // If subscription is expired/invalid, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
          console.log(`Removed expired subscription for user ${sub.user_id}`);
        }
        
        return { success: false, userId: sub.user_id, error: err.message || 'Unknown error' };
      }
    });

    const results = await Promise.all(pushPromises);
    const successCount = results.filter(r => r.success).length;

    // Also create notifications in database as fallback
    const notifications = (subscriptions || []).map((sub: { user_id: string }) => ({
      user_id: sub.user_id,
      title,
      message: body,
      type: 'info',
      is_read: false,
    }));

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);
      
      if (insertError) {
        console.error('Error inserting notifications:', insertError);
      }
    }

    console.log(`Push notifications sent: ${successCount}/${subscriptions?.length || 0}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pushSent: successCount,
        total: subscriptions?.length || 0,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
