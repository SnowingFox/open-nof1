export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  const rows = await prisma.trading.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  return NextResponse.json({ ok: true, count: rows.length, rows });
}
