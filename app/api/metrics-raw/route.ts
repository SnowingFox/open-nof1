export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const rows = await prisma.metrics.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return NextResponse.json({ ok: true, count: rows.length, rows }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
