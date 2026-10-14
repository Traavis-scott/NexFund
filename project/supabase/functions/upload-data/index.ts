import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { parse } from "npm:csv-parse@5.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Access-Control-Max-Age": "86400",
};

interface DataRecord {
  timestamp: string;
  instrument?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function validateRecord(record: Record<string, unknown>): DataRecord {
  const required = ["timestamp", "open", "high", "low", "close", "volume"];
  for (const field of required) {
    if (record[field] === undefined || record[field] === null || record[field] === "") {
      throw new Error(`Champ manquant: ${field}. Colonnes requises: timestamp, open, high, low, close, volume`);
    }
  }

  const open = parseFloat(String(record.open));
  const high = parseFloat(String(record.high));
  const low = parseFloat(String(record.low));
  const close = parseFloat(String(record.close));
  const volume = parseFloat(String(record.volume));

  if ([open, high, low, close].some((v) => isNaN(v) || v <= 0)) {
    throw new Error("Les prix doivent etre des nombres positifs");
  }
  if (isNaN(volume) || volume < 0) {
    throw new Error("Le volume doit etre un nombre positif ou nul");
  }

  const ts = new Date(String(record.timestamp));
  if (isNaN(ts.getTime())) {
    throw new Error("Format de timestamp invalide");
  }

  return {
    timestamp: ts.toISOString(),
    instrument: String(record.instrument || "unknown").slice(0, 50),
    open,
    high,
    low,
    close,
    volume,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const userId = req.headers.get("X-User-Id");

    if (!authHeader || !userId) {
      return new Response(
        JSON.stringify({ error: "Non autorise" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new Error("Fichier non trouve dans la requete");
    }

    const text = await file.text();
    const rawRecords: Record<string, unknown>[] = [];

    if (file.name.endsWith(".csv")) {
      const parser = parse(text, { columns: true, skip_empty_lines: true, cast: true });
      for await (const record of parser) {
        rawRecords.push(record as Record<string, unknown>);
      }
    } else if (file.name.endsWith(".json")) {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Le JSON doit etre un tableau d'enregistrements");
      rawRecords.push(...parsed);
    } else {
      throw new Error("Format de fichier non supporte. Utilisez CSV ou JSON.");
    }

    if (rawRecords.length === 0) {
      throw new Error("Aucun enregistrement trouve dans le fichier");
    }

    if (rawRecords.length > 10000) {
      throw new Error("Trop d'enregistrements (maximum 10000 par fichier)");
    }

    const validatedRecords = rawRecords.map(validateRecord);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { error } = await supabase
      .from("historical_data")
      .insert(
        validatedRecords.map((r) => ({
          user_id: userId,
          instrument: r.instrument,
          timestamp: r.timestamp,
          open_price: r.open,
          high_price: r.high,
          low_price: r.low,
          close_price: r.close,
          volume: r.volume,
        }))
      );

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        count: validatedRecords.length,
        message: `${validatedRecords.length} enregistrements importes avec succes`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
// deploy trigger
