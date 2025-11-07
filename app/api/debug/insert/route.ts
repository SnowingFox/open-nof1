export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function POST() {
  const out: Array<{ table: string; ok: boolean; error?: string }> = [];

  try {
    await prisma.metrics.create({ data: { name: 'diagnostic:metrics', model: 'Deepseek' as any } });
    out.push({ table: 'Metrics', ok: true });
  } catch (e) {
    out.push({ table: 'Metrics', ok: false, error: String(e) });
  }

  try {
    await prisma.trading.create({ data: { symbol: 'BTC' as any, opeartion: 'Buy' as any } });
    out.push({ table: 'Trading', ok: true });
  } catch (e) {
    out.push({ table: 'Trading', ok: false, error: String(e) });
  }

  try {
    await prisma.chat.create({ data: { reasoning: 'diagnostic:chat', userPrompt: 'hello world' } });
    out.push({ table: 'Chat', ok: true });
  } catch (e) {
    out.push({ table: 'Chat', ok: false, error: String(e) });
  }

  return NextResponse.json({ ok: true, attempts: out });
}
