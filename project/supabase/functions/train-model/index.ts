import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Access-Control-Max-Age": "86400",
};

interface TrainingParameters {
  lookback: number;
  threshold: number;
  stopLoss: number;
  takeProfit: number;
}

interface TrainingRequest {
  strategyId: string;
  parameters: TrainingParameters;
}

interface Candle {
  timestamp: string;
  close_price: number;
  open_price: number;
  high_price: number;
  low_price: number;
}

function runBacktest(data: Candle[], params: TrainingParameters) {
  let trades = 0;
  let wins = 0;
  let totalPL = 0;
  const equity: number[] = [];
  const performanceData: { date: string; value: number }[] = [];

  for (let i = params.lookback; i < data.length - 1; i++) {
    const slice = data.slice(i - params.lookback, i);
    const avgPrice = slice.reduce((sum, d) => sum + Number(d.close_price), 0) / params.lookback;
    const current = Number(data[i].close_price);

    const signal = (current - avgPrice) / avgPrice;

    if (signal > params.threshold) {
      const entry = current;
      const next = Number(data[i + 1].close_price);
      const stopLevel = entry * (1 - params.stopLoss);
      const takeLevel = entry * (1 + params.takeProfit);
      const high = Number(data[i + 1].high_price);
      const low = Number(data[i + 1].low_price);

      let exit = next;
      if (low <= stopLevel) exit = stopLevel;
      else if (high >= takeLevel) exit = takeLevel;

      const pl = ((exit - entry) / entry) * 100;
      totalPL += pl;
      if (pl > 0) wins++;
      trades++;
    }

    equity.push(trades > 0 ? totalPL : 0);
    performanceData.push({
      date: new Date(data[i].timestamp).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "short",
      }),
      value: totalPL,
    });
  }

  const winRate = trades > 0 ? wins / trades : 0;

  let maxDrawdown = 0;
  let peak = -Infinity;
  for (const v of equity) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? ((peak - v) / Math.abs(peak)) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const returns = equity.filter((_, i) => i > 0 && equity[i] !== equity[i - 1]);
  const meanRet = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdDev = returns.length > 0
    ? Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - meanRet, 2), 0) / returns.length)
    : 1;
  const sharpe = stdDev > 0 ? (meanRet / stdDev) * Math.sqrt(252) : 0;

  return {
    win_rate: winRate,
    profit_loss: totalPL,
    sharpe_ratio: sharpe,
    max_drawdown: -maxDrawdown,
    total_trades: trades,
    performance_data: performanceData,
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

    const body: TrainingRequest = await req.json();

    if (!body.strategyId || !body.parameters) {
      throw new Error("strategyId et parameters sont requis");
    }

    const params = body.parameters;
    if (
      typeof params.lookback !== "number" || params.lookback < 1 || params.lookback > 500 ||
      typeof params.threshold !== "number" || params.threshold < 0 ||
      typeof params.stopLoss !== "number" || params.stopLoss < 0 ||
      typeof params.takeProfit !== "number" || params.takeProfit < 0
    ) {
      throw new Error("Parametres invalides");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: historicalData, error: dataError } = await supabase
      .from("historical_data")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: true });

    if (dataError) throw dataError;

    if (!historicalData || historicalData.length < params.lookback + 2) {
      throw new Error("Pas assez de donnees historiques pour l'entrainement");
    }

    const results = runBacktest(historicalData as unknown as Candle[], params);

    const { data: backtest, error: backtestError } = await supabase
      .from("backtest_results")
      .insert({
        strategy_id: body.strategyId,
        user_id: userId,
        start_date: historicalData[0].timestamp,
        end_date: historicalData[historicalData.length - 1].timestamp,
        total_trades: results.total_trades,
        win_rate: results.win_rate,
        profit_loss: results.profit_loss,
        sharpe_ratio: results.sharpe_ratio,
        max_drawdown: results.max_drawdown,
        detailed_results: {
          parameters: params,
          performance_data: results.performance_data,
        },
      })
      .select()
      .single();

    if (backtestError) throw backtestError;

    return new Response(
      JSON.stringify({
        success: true,
        results: {
          ...results,
          id: backtest.id,
          strategy_id: body.strategyId,
        },
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
