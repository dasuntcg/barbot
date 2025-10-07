import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { normName } from '@/lib/util';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { recipe_name, serves = 1, items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return new NextResponse('Invalid items', { status: 400 });
    }
    const s = Number(serves) || 1;
    if (s < 1) return new NextResponse('Invalid serves', { status: 400 });

    const names = items.map((i: any) => normName(String(i.name || '')));
    if (names.some(n => !n)) return new NextResponse('Invalid ingredient name', { status: 400 });

    const { rows: ingRows } = await sql/*sql*/`
      select id, lower(name) as name
      from ingredients
      where lower(name) = any(${names}::text[])
    `;
    const nameToId = new Map(ingRows.map(r => [String(r.name), String(r.id)]));
    const unknown = names.filter(n => !nameToId.has(n));
    if (unknown.length) {
      return new NextResponse(`Unknown ingredients: ${unknown.join(', ')}`, { status: 400 });
    }

    await sql.begin(async (tx) => {
      for (const raw of items) {
        const key = normName(String(raw.name));
        const perServe = Number(raw.amount_ml);
        const need = perServe * s;
        const ingId = nameToId.get(key)!;

        const cur = await tx/*sql*/`select quantity_ml from inventory where ingredient_id=${ingId}`;
        const have = Number(cur.rows[0]?.quantity_ml ?? 0);
        if (have < need) throw new Error(`Insufficient ${key}: need ${need}ml, have ${have}ml`);
      }

      for (const raw of items) {
        const key = normName(String(raw.name));
        const perServe = Number(raw.amount_ml);
        const need = perServe * s;
        const ingId = nameToId.get(key)!;

        await tx/*sql*/`
          update inventory
          set quantity_ml = quantity_ml - ${need}, updated_at = now()
          where ingredient_id = ${ingId}
        `;
        await tx/*sql*/`
          insert into inventory_txn (ingredient_id, delta_ml, reason, meta)
          values (${ ingId }, ${ -need }, ${ 'make:' + (recipe_name || 'adhoc') }, ${ JSON.stringify({ recipe_name, serves: s }) }::jsonb)
        `;
      }
    });

    return NextResponse.json({ ok: true, recipe_name, serves: s });
  } catch (e: any) {
    return new NextResponse(e.message ?? 'Bad Request', { status: 400 });
  }
}
