create index if not exists check_ins_user_id_occurred_at_idx
  on public.check_ins (user_id, occurred_at);
