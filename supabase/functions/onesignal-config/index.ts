const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Remove aspas, vírgulas e espaços que possam ter sido salvos por engano no secret
function sanitize(v: string): string {
  return v.trim().replace(/^["'`,\s]+|["'`,\s]+$/g, "");
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const raw = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
  const appId = sanitize(raw);
  return new Response(
    JSON.stringify({ appId }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
});
