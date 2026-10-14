import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Lygos-Signature",
  "Access-Control-Max-Age": "86400",
};

async function verifyLygosSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  const secret = Deno.env.get("LYGOS_WEBHOOK_SECRET");
  if (!secret) {
    console.error("LYGOS_WEBHOOK_SECRET not configured");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = signature.match(/[\da-f]{2}/gi);
    if (!sigBytes) return false;

    const signatureBuffer = new Uint8Array(sigBytes.map((x) => parseInt(x, 16)));
    const payloadBuffer = encoder.encode(payload);

    return await crypto.subtle.verify("HMAC", key, signatureBuffer, payloadBuffer);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("Lygos-Signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawBody = await req.text();

    const isValid = await verifyLygosSignature(rawBody, signature);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type;
    const customerEmail = event.data?.object?.customer_email;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (eventType === "checkout.session.completed" && customerEmail) {
      const { data: userId, error: userError } = await supabase
        .rpc("get_user_id_by_email", { user_email: customerEmail });

      if (userError || !userId) {
        throw new Error("User not found for email: " + customerEmail);
      }

      const periodEnd = event.data.object.current_period_end;
      const { error: subscriptionError } = await supabase
        .from("user_subscriptions")
        .update({
          stripe_customer_id: event.data.object.customer ?? null,
          stripe_subscription_id: event.data.object.subscription ?? null,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
          cancel_at_period_end: false,
          tier: "pro",
        })
        .eq("user_id", userId);

      if (subscriptionError) throw subscriptionError;
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
// deploy trigger
