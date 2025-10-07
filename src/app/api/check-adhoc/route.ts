


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

    const inv = await sql/*sql*/`
      select lower(ing.name) as name, quantity_ml
      from inventory i join ingredients ing on ing.id = i.ingredient_id
    `;
    const stock = new Map(inv.rows.map(r => [String(r.name), Number(r.quantity_ml)]));

    const shortages: Array<{ name: string; need_ml: number; have_ml: number; short_ml: number }> = [];

    for (const raw of items) {
      const key = normName(String(raw.name || ''));
      const perServe = Number(raw.amount_ml);
      if (!key || !Number.isFinite(perServe) || perServe <= 0) {
        return new NextResponse('Invalid ingredient line', { status: 400 });
      }
      const need = perServe * s;
      const have = stock.get(key) ?? 0;
      if (have < need) shortages.push({ name: key, need_ml: need, have_ml: have, short_ml: need - have });
    }

    const ok = shortages.length === 0;
    return NextResponse.json({ ok, recipe_name, serves: s, shortages });
  } catch (e: any) {
    return new NextResponse(e.message ?? 'Bad Request', { status: 400 });
  }
}
