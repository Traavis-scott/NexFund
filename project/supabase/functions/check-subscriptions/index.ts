import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: subscriptions, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .lt("current_period_end", new Date().toISOString());

    if (error) throw error;

    let updated = 0;
    for (const subscription of subscriptions) {
      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          cancel_at_period_end: true,
          current_period_end: null,
        })
        .eq("id", subscription.id);

      if (updateError) {
        console.error(`Erreur abonnement ${subscription.id}:`, updateError.message);
      } else {
        updated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${updated} abonnement(s) mis a jour`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
