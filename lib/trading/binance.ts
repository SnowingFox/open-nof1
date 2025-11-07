// lib/trading/binance.ts
import * as ccxt from "ccxt";
import { wrapExchangeBalance } from "@/lib/ccxt-safe";

const isSandbox = process.env.BINANCE_USE_SANDBOX === "true";

/**
 * One singleton exchange instance.
 * Keep typing light to avoid ccxt edge cases in strict mode.
 */
export const binance = (() => {
  const ex = new ccxt.binance({
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET,
    enableRateLimit: true,
    options: {
      // Use "spot" if your metrics read spot balances. Keep "future" for futures.
      defaultType: (process.env.BINANCE_DEFAULT_TYPE as "spot" | "future") ?? "future",
    },
  });

  // Normalize fetchBalance shape globally
  wrapExchangeBalance(ex as { fetchBalance?: (params?: object) => Promise<unknown> });

  // Toggle sandbox (note: futures testnet differs from prod)
  ex.setSandboxMode(isSandbox);

  return ex;
})();

/**
 * Helper that preserves ccxt’s signature but is safe for callers.
 * Callers can rely on {free, used, total} always being defined objects.
 */
export async function safeFetchBalance(params?: Record<string, unknown>) {
  // If you want to force market per call:
  // return binance.fetchBalance({ type: "spot", ...(params ?? {}) });
  return binance.fetchBalance(params);
}
