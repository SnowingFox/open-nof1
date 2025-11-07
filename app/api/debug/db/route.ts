export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CountResult = number | { error: string };

export async function GET() {
  const db = process.env.DATABASE_URL ?? '';
  const dbHash = crypto.createHash('sha256').update(db).digest('hex').slice(0, 12);

  const out: { ok: boolean; dbHash: string; tables: Record<string, CountResult> } = {
    ok: true,
    dbHash,
    tables: {},
  };

  try {
    const metrics: CountResult = await prisma.metrics.count().catch((e: unknown) => ({ error: String(e) }));
    const trading: CountResult = await prisma.trading.count().catch((e: unknown) => ({ error: String(e) }));
    const chat: CountResult = await prisma.chat.count().catch((e: unknown) => ({ error: String(e) }));
    out.tables = { Metrics: metrics, Trading: trading, Chat: chat };
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e), dbHash }, { status: 500 });
  }

  return NextResponse.json(out, { status: 200 });
}
