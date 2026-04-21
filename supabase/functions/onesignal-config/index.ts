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
  // Safari Web ID is required for Safari desktop push (and useful as a fallback)
  const safariWebId = Deno.env.get('ONESIGNAL_SAFARI_WEB_ID') ?? 'web.onesignal.auto.45e32f52-047f-48ea-8b6f-5a9d2fcde2db';

  if (!appId) {
    return new Response(
      JSON.stringify({ error: 'ONESIGNAL_APP_ID not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ appId, safariWebId }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
