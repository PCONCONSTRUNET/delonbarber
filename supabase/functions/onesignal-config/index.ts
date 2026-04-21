import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const appId = Deno.env.get('ONESIGNAL_APP_ID');

  if (!appId) {
    return new Response(
      JSON.stringify({ error: 'ONESIGNAL_APP_ID not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ appId }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
