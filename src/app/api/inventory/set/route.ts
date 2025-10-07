import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { normName, parseNonNegNumber } from '@/lib/util';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = normName(String(body.name || ''));
    const quantity_ml = parseNonNegNumber(body.quantity_ml);
    if (!name) return new NextResponse('Missing name', { status: 400 });

    const ing = await sql/*sql*/`
      insert into ingredients (name) values (${name})
      on conflict (name) do update set name = excluded.name
      returning id
    `;
    const id = ing.rows[0].id;

    const cur = await sql/*sql*/`select quantity_ml from inventory where ingredient_id=${id}`;
    const current = Number(cur.rows[0]?.quantity_ml ?? 0);
    const delta = quantity_ml - current;

    await sql/*sql*/`
      insert into inventory (ingredient_id, quantity_ml)
      values (${id}, ${quantity_ml})
      on conflict (ingredient_id) do update
        set quantity_ml = ${quantity_ml}, updated_at = now()
    `;

    if (delta !== 0) {
      await sql/*sql*/`
        insert into inventory_txn (ingredient_id, delta_ml, reason)
        values (${id}, ${delta}, 'manual')
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e.message ?? 'Bad Request', { status: 400 });
  }
}
