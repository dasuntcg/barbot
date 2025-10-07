import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { normName, parsePosNumber } from '@/lib/util';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = normName(String(body.name || ''));
    const quantity_ml = parsePosNumber(body.quantity_ml);
    const type = body.type ? String(body.type) : 'other';
    const abv = body.abv != null ? Number(body.abv) : 0;

    if (!name) return new NextResponse('Missing name', { status: 400 });

    const ing = await sql/*sql*/`
      insert into ingredients (name, type, abv)
      values (${name}, ${type}, ${abv})
      on conflict (name) do update set type = excluded.type, abv = excluded.abv
      returning id
    `;
    const id = ing.rows[0].id;

    await sql/*sql*/`
      insert into inventory (ingredient_id, quantity_ml)
      values (${id}, ${quantity_ml})
      on conflict (ingredient_id) do update
        set quantity_ml = inventory.quantity_ml + excluded.quantity_ml,
            updated_at = now()
    `;

    await sql/*sql*/`
      insert into inventory_txn (ingredient_id, delta_ml, reason)
      values (${id}, ${quantity_ml}, 'restock')
    `;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e.message ?? 'Bad Request', { status: 400 });
  }
}
