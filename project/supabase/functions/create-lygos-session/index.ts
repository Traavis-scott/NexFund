import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Access-Control-Max-Age": "86400",
};

interface CheckoutRequest {
  email: string;
  tier: string;
  earlyBird?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorise" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, tier, earlyBird }: CheckoutRequest = await req.json();

    if (!email || !tier) {
      throw new Error("email et tier sont requis");
    }

    const normalizedTier = tier.toLowerCase().trim();
    let priceId: string;

    if (normalizedTier === "pro") {
      priceId = earlyBird ? "price_pro_early_bird" : "price_pro_regular";
    } else if (normalizedTier === "essai gratuit" || normalizedTier === "free") {
      priceId = "price_trial";
    } else {
      throw new Error("Tier invalide: " + tier);
    }

    const isTrial = normalizedTier === "essai gratuit" || normalizedTier === "free";

    const response = await fetch("https://api.lygos.io/v1/checkout-sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LYGOS_API_KEY")}`,
      },
      body: JSON.stringify({
        customer_email: email,
        success_url: `${Deno.env.get("CALLBACK_URL")}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("Origin") || ""}/pricing`,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        trial_period_days: isTrial ? 30 : undefined,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erreur Lygos (${response.status}): ${errText}`);
    }

    const session = await response.json();

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
// deploy trigger
