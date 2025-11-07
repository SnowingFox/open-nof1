export type MaybeBalance = {
  total?: Record<string, unknown>;
  free?: Record<string, unknown>;
  used?: Record<string, unknown>;
};

type BalanceMaps = Record<string, number>;

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Ensure balance maps exist and any missing asset keys return 0. */
export function withSafeBalance<T extends { balance?: MaybeBalance }>(obj: T): T {
  const zero = new Proxy<BalanceMaps>({} as BalanceMaps, {
    get: (t, p: string | symbol) =>
      typeof p === "string" && p in t ? (t as BalanceMaps)[p] : 0,
  });

  const b: MaybeBalance = obj?.balance ?? {};

  const toNumMap = (m?: Record<string, unknown>): BalanceMaps => {
    if (!m) return zero;
    const out: BalanceMaps = {};
    for (const k of Object.keys(m)) out[k] = toNumber(m[k]);
    return new Proxy<BalanceMaps>(out, {
      get: (t, p: string | symbol) =>
        typeof p === "string" && p in t ? t[p] : 0,
    });
  };

  const safe = {
    ...b,
    total: toNumMap(b.total),
    free:  toNumMap(b.free),
    used:  toNumMap(b.used),
  };

  return { ...(obj as T), balance: safe };
}
