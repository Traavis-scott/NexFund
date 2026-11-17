import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RateLimitOptions {
  maxRequests: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

/**
 * Checks and increments the request count for a user + function pair.
 * Uses the `rate_limits` table as the durable store — edge function
 * instances do not share memory, so an in-memory counter would reset
 * unpredictably and not actually limit anything.
 */
export async function checkRateLimit(
  userId: string,
  functionName: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const now = new Date();
  const windowStart = new Date(now.getTime() - opts.windowSeconds * 1000);

  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, request_count, window_start")
    .eq("user_id", userId)
    .eq("function_name", functionName)
    .maybeSingle();

  const resetIn = Math.ceil(opts.windowSeconds);

  if (!existing) {
    await supabase.from("rate_limits").insert({
      user_id: userId,
      function_name: functionName,
      request_count: 1,
      window_start: now.toISOString(),
    });
    return { allowed: true, remaining: opts.maxRequests - 1, resetIn };
  }

  const rowStart = new Date(existing.window_start);

  if (rowStart < windowStart) {
    await supabase
      .from("rate_limits")
      .update({ request_count: 1, window_start: now.toISOString(), updated_at: now.toISOString() })
      .eq("id", existing.id);
    return { allowed: true, remaining: opts.maxRequests - 1, resetIn };
  }

  if (existing.request_count >= opts.maxRequests) {
    return { allowed: false, remaining: 0, resetIn };
  }

  await supabase
    .from("rate_limits")
    .update({ request_count: existing.request_count + 1, updated_at: now.toISOString() })
    .eq("id", existing.id);

  return {
    allowed: true,
    remaining: opts.maxRequests - existing.request_count - 1,
    resetIn,
  };
}

export function rateLimitResponse(resetIn: number): Response {
  return new Response(
    JSON.stringify({ error: "Trop de requêtes. Réessayez plus tard.", resetIn }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
