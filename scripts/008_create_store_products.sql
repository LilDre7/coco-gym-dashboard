create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default '',
  price numeric(10,2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.store_products enable row level security;

create policy "store_products_select_own" on public.store_products
  for select using (auth.uid() = user_id);

create policy "store_products_insert_own" on public.store_products
  for insert with check (auth.uid() = user_id);

create policy "store_products_update_own" on public.store_products
  for update using (auth.uid() = user_id);

create policy "store_products_delete_own" on public.store_products
  for delete using (auth.uid() = user_id);
