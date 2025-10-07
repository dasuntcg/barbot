import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
export const runtime = 'nodejs';

export async function GET() {
  const { rows } = await sql/*sql*/`
    select i.ingredient_id, ing.name, ing.type, ing.abv, i.quantity_ml
    from inventory i join ingredients ing on ing.id = i.ingredient_id
    order by lower(ing.name)
  `;
  return NextResponse.json(rows);
}
