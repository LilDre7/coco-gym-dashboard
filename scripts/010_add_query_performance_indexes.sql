-- Run this once in the Supabase SQL Editor after deploying the app.
-- These indexes match the dashboard queries and keep them fast as the gym
-- accumulates members, check-ins and products.

create index if not exists check_ins_user_id_occurred_at_idx
  on public.check_ins (user_id, occurred_at);

create index if not exists members_user_id_created_at_idx
  on public.members (user_id, created_at desc);

create index if not exists store_products_user_id_display_idx
  on public.store_products (user_id, is_active desc, category, name);
