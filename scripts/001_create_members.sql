-- Create members table
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  photo_url text not null default '',
  phone text not null default '',
  discipline text not null default 'gym',
  monthly_fee numeric(10,2) not null default 50,
  start_date date not null default current_date,
  end_date date not null default (current_date + interval '30 days'),
  description text not null default '',
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.members enable row level security;

-- RLS policies: users can only access their own members
create policy "members_select_own" on public.members
  for select using (auth.uid() = user_id);

create policy "members_insert_own" on public.members
  for insert with check (auth.uid() = user_id);

create policy "members_update_own" on public.members
  for update using (auth.uid() = user_id);

create policy "members_delete_own" on public.members
  for delete using (auth.uid() = user_id);
