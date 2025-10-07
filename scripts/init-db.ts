// scripts/init-db.ts
import { sql } from '@vercel/postgres';

async function main() {
  await sql/*sql*/`
    create table if not exists ingredients (
      id uuid primary key default gen_random_uuid(),
      name text unique not null,
      type text default 'other',
      abv numeric default 0,
      default_unit text default 'ml'
    );
  `;

  await sql/*sql*/`
    create table if not exists inventory (
      ingredient_id uuid primary key references ingredients(id) on delete cascade,
      quantity_ml numeric not null default 0,
      updated_at timestamptz not null default now()
    );
  `;

  await sql/*sql*/`
    create table if not exists inventory_txn (
      id uuid primary key default gen_random_uuid(),
      ingredient_id uuid references ingredients(id) on delete set null,
      delta_ml numeric not null,
      reason text,
      meta jsonb default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
  `;

  await sql/*sql*/`
    create index if not exists idx_inventory_txn_created_at
    on inventory_txn(created_at desc);
  `;

  console.log('DB init done ✅');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
