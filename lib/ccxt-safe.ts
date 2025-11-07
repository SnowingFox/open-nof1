import * as ccxt from "ccxt";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function asRecord(v: unknown): Record<string, unknown> {
  return isRecord(v) ? v : {};
}
function toFiniteNumber(x: unknown): number {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}
function asNumMap(v: unknown): Record<string, number> {
  if (!isRecord(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v)) out[k] = toFiniteNumber(val);
  return out;
}
function asMaybeNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function asMaybeString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

const ZERO_CUR = Object.freeze({ free: 0, used: 0, total: 0 });

const BLANK: {
  info: Record<string, unknown>;
  free: Record<string, number>;
  used: Record<string, number>;
  total: Record<string, number>;
  timestamp?: number;
  datetime?: string;
} = {
  info: {},
  free: {},
  used: {},
  total: {},
  timestamp: undefined,
  datetime: undefined,
};

/**
 * Ensures:
 *  - top-level free/used/total maps always exist (numbers)
 *  - balances[CODE] always exists; if missing, it's {free:0, used:0, total:0}
 *  - preserves any extra fields returned by ccxt
 */
export function wrapExchangeBalance(
  ex: { fetchBalance?: (params?: object) => Promise<unknown> }
) {
  const original = ex.fetchBalance?.bind(ex);
  if (!original) return;

  ex.fetchBalance = (async (params?: object) => {
    try {
      const res = await original(params);

      if (!isRecord(res)) {
        // Return a defensive object w/ proxy for per-code access
        return makeBalancesProxy({ ...BLANK });
      }

      const info = asRecord(res.info);
      const free = asNumMap(res.free);
      const used = asNumMap(res.used);
      const total = asNumMap(res.total);
      const timestamp = asMaybeNumber(res.timestamp);
      const datetime = asMaybeString(res.datetime);

      // Start with original to preserve arbitrary fields ccxt might include
      const base: Record<string, unknown> = {
        ...res,
        info,
        free,
        used,
        total,
        timestamp,
        datetime,
      };

      // Normalize any existing per-code objects, filling missing fields
      const codes = new Set<string>([
        ...Object.keys(free),
        ...Object.keys(used),
        ...Object.keys(total),
      ]);

      for (const code of codes) {
        const existing = asRecord((res as Record<string, unknown>)[code]);
        const cFree = toFiniteNumber(existing.free ?? free[code]);
        const cUsed = toFiniteNumber(existing.used ?? used[code]);
        const cTotal = toFiniteNumber(existing.total ?? total[code]);

        base[code] = {
          ...existing,
          free: cFree,
          used: cUsed,
          total: cTotal,
        };
      }

      // Return a proxy that *always* returns a safe object for balances[CODE]
      return makeBalancesProxy(base);
    } catch {
      return makeBalancesProxy({ ...BLANK });
    }
  }) as typeof ex.fetchBalance;
}

function makeBalancesProxy(obj: Record<string, unknown>): unknown {
  // We only special-case property reads; everything else passes through.
  return new Proxy(obj, {
    get(target, prop, receiver) {
      if (typeof prop !== "string") {
        // symbols/others: default behavior
        return Reflect.get(target, prop, receiver);
      }
      // If prop is a known top-level key, return it.
      if (prop in target) return Reflect.get(target, prop, receiver);

      // Otherwise, treat it like a currency code. If missing, return zeroed.
      const maybeCode = (target as Record<string, unknown>)[prop];
      if (isRecord(maybeCode)) {
        const free = toFiniteNumber(maybeCode.free);
        const used = toFiniteNumber(maybeCode.used);
        const total = toFiniteNumber(maybeCode.total);
        return { ...maybeCode, free, used, total };
      }
      return ZERO_CUR;
    },
  });
}
