import { debugWriteMetrics, debugWriteTrading, debugWriteChat } from "../../../../lib/persistence/debug-write";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { safeFetchBalance } from "@/lib/trading/binance";


type Num = number | string | undefined | null;
type CurrencyMap = Record<string, Num>;

function asNumber(n: Num, fallback = 0): number {
  if (n == null) return fallback;
  const v = typeof n === "string" ? Number(n) : (n as number);
  return Number.isFinite(v) ? v : fallback;
}

function pickUSDT(balance: {
  total?: CurrencyMap;
  free?: CurrencyMap;
  used?: CurrencyMap;
}) {
  return {
    total: asNumber(balance.total?.USDT, 0),
    free: asNumber(balance.free?.USDT, 0),
    used: asNumber(balance.used?.USDT, 0),
  };
}

export async function GET() {
  await debugWriteMetrics("metrics:20s");
  await debugWriteTrading("BTCUSDT");
  await debugWriteChat("cron 20s");

  await debugWriteMetrics("metrics:20s");
  await debugWriteTrading("BTCUSDT");
  await debugWriteChat("cron 20s");

  const startedAt = Date.now();

  try {
    const res = (await safeFetchBalance()) as {
      total?: CurrencyMap;
      free?: CurrencyMap;
      used?: CurrencyMap;
    };

    const usdt = pickUSDT(res);

    // Example: emit lightweight metrics logs
    console.log("cron.metrics(20s)", {
      usdt,
      timestamp: new Date().toISOString(),
    });

    // TODO: push to your metrics sink or DB here if needed

  try { await debugWriteMetrics("metrics:20s"); await debugWriteTrading("BTCUSDT"); await debugWriteChat("cron 20s"); } catch (e) { console.error("[CRON 20s] write failed:", e); }
    return NextResponse.json({
      ok: true,
      tookMs: Date.now() - startedAt,
      usdt,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
    console.error("20-seconds-metrics-interval failed:", msg);
  try { await debugWriteMetrics("metrics:20s"); await debugWriteTrading("BTCUSDT"); await debugWriteChat("cron 20s"); } catch (e) { console.error("[CRON 20s] write failed:", e); }
    return NextResponse.json(
      { ok: false, tookMs: Date.now() - startedAt, error: msg },
      { status: 500 }
    );
  }
}
