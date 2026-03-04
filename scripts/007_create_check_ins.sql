create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  occurred_at timestamptz not null,
  has_purchase boolean not null default false,
  product text not null default '',
  payment_method text,
  amount numeric(10,2),
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.check_ins enable row level security;

create policy "check_ins_select_own" on public.check_ins
  for select using (auth.uid() = user_id);

create policy "check_ins_insert_own" on public.check_ins
  for insert with check (auth.uid() = user_id);

create policy "check_ins_update_own" on public.check_ins
  for update using (auth.uid() = user_id);

create policy "check_ins_delete_own" on public.check_ins
  for delete using (auth.uid() = user_id);
