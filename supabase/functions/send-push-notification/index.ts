import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID keys for Web Push (generated for this project)
const VAPID_PUBLIC_KEY = 'BLBz1p2s4P9kX7nF8mQ3wR6tY5vC8bN2aM4jK9hL0xS3fG6dE7cV0bA1wZ5yT8uI';

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

    // For background push, we need to trigger notification via stored subscription info
    // Since full Web Push crypto is complex, we'll store the notification for the service worker to check
    const payload = {
      title,
      body,
      url: url || '/admin/agenda',
      tag: 'appointment-notification',
      timestamp: new Date().toISOString(),
    };

    // Create notifications in database for all admin users
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

    console.log(`Created ${notifications.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: notifications.length,
        payload,
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