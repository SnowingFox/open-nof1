import { debugWriteMetrics, debugWriteTrading, debugWriteChat } from "../../../../lib/persistence/debug-write";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { safeFetchBalance } from "@/lib/trading/binance";


type Num = number | string | undefined | null;
type CurrencyMap = Record<string, Num>;

function asNumber(n: Num, fallback = 0): number {
  if (n == null) return fallback;
  const x = typeof n === "string" ? Number(n) : (n as number);
  return Number.isFinite(x) ? x : fallback;
}

function pickUSDT(balance: {
  total?: CurrencyMap;
  free?: CurrencyMap;
  used?: CurrencyMap;
}): { total: number; free: number; used: number } {
  const total = asNumber(balance.total?.USDT, 0);
  const free = asNumber(balance.free?.USDT, 0);
  const used = asNumber(balance.used?.USDT, 0);
  return { total, free, used };
}

export async function GET() {
  await debugWriteMetrics("metrics:3m");
  await debugWriteTrading("BTCUSDT");
  await debugWriteChat("cron 3m");

  await debugWriteMetrics("metrics:3m");
  await debugWriteTrading("BTCUSDT");
  await debugWriteChat("cron 3m");

  const startedAt = Date.now();

  try {
    const balances = (await safeFetchBalance()) as {
      total?: CurrencyMap;
      free?: CurrencyMap;
      used?: CurrencyMap;
    };
    const sampleUSDT = pickUSDT(balances);

    // simple log for cron output
    console.log("cron.3min", { sampleUSDT });

    // TODO: plug your real trading / metrics logic here
    // await runYourStrategy(sampleUSDT);

    const tookMs = Date.now() - startedAt;
  try { await debugWriteMetrics("metrics:3m"); await debugWriteTrading("BTCUSDT"); await debugWriteChat("cron 3m"); } catch (e) { console.error("[CRON 3m] write failed:", e); }
    return NextResponse.json({ ok: true, tookMs, sampleUSDT });
  } catch (err: unknown) {
    const tookMs = Date.now() - startedAt;
    const msg =
      err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
    console.error("3-minutes-run-interval failed:", msg);
  try { await debugWriteMetrics("metrics:3m"); await debugWriteTrading("BTCUSDT"); await debugWriteChat("cron 3m"); } catch (e) { console.error("[CRON 3m] write failed:", e); }
    return NextResponse.json(
      { ok: false, tookMs, error: msg },
      { status: 500 }
    );
  }
}
