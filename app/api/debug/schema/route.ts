export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export async function GET() {
  const dmmf = Prisma.dmmf;

  const enums = Object.fromEntries(
    (dmmf.datamodel.enums || []).map(e => [e.name, e.values.map(v => v.name)])
  );

  const modelsWanted = new Set(['Metrics', 'Trading', 'Chat']);
  const models = Object.fromEntries(
    dmmf.datamodel.models
      .filter(m => modelsWanted.has(m.name))
      .map(m => [
        m.name,
        m.fields.map(f => ({
          name: f.name,
          type: typeof f.type === 'string' ? f.type : 'object',
          isRequired: f.isRequired === true && f.isScalar && !f.hasDefaultValue && !f.isId,
          isEnum: f.kind === 'enum',
          hasDefault: !!f.hasDefaultValue,
          isId: !!f.isId,
          isList: !!f.isList,
          isScalar: !!f.isScalar,
        })),
      ])
  );

  return NextResponse.json({ ok: true, enums, models }, { status: 200 });
}
