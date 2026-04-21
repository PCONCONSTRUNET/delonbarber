const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  // 🔑 Configure ONESIGNAL_APP_ID nos secrets da Supabase
  const appId = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
  return new Response(
    JSON.stringify({ appId }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
});
