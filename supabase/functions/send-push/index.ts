import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
  role: "admin" | "cliente";
  user_id?: string;
  title: string;
  message: string;
  url?: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const REST_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    if (!APP_ID || !REST_KEY) {
      return new Response(
        JSON.stringify({ error: "OneSignal não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as PushRequest;
    if (!body.role || !body.title || !body.message) {
      return new Response(
        JSON.stringify({ error: "role, title e message são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let playerIds: string[] = [];

    if (body.user_id) {
      const { data: subs, error: subsErr } = await supabase
        .from("push_subscriptions")
        .select("player_id")
        .eq("ativo", true)
        .eq("role", body.role)
        .eq("user_id", body.user_id);
      if (subsErr) throw subsErr;
      playerIds = (subs ?? []).map((s) => String(s.player_id).trim()).filter(Boolean);

      if (playerIds.length === 0) {
        const { data: orphans } = await supabase
          .from("push_subscriptions")
          .select("player_id")
          .eq("ativo", true)
          .eq("role", body.role)
          .is("user_id", null);
        playerIds = (orphans ?? []).map((s) => String(s.player_id).trim()).filter(Boolean);
      }
    } else {
      const { data: subs, error: subsErr } = await supabase
        .from("push_subscriptions")
        .select("player_id")
        .eq("ativo", true)
        .eq("role", body.role);
      if (subsErr) throw subsErr;
      playerIds = (subs ?? []).map((s) => String(s.player_id).trim()).filter(Boolean);
    }

    if (playerIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, reason: "Nenhum dispositivo inscrito" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = {
      app_id: APP_ID,
      include_subscription_ids: [...new Set(playerIds)],
      headings: { en: body.title, pt: body.title },
      contents: { en: body.message, pt: body.message },
      url: body.url,
      data: body.data ?? {},
    };

    const resp = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${REST_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await resp.json();

    const invalidIds = result.errors?.invalid_player_ids ?? result.errors?.invalid_subscription_ids ?? [];
    if (invalidIds.length) {
      await supabase
        .from("push_subscriptions")
        .update({ ativo: false })
        .in("player_id", invalidIds);
    }

    return new Response(
      JSON.stringify({ ok: resp.ok, sent: [...new Set(playerIds)].length, result }),
      { status: resp.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-push error:", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
