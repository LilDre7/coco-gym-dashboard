-- Add currency column to members table (USD or CRC - Costa Rican Colones)
alter table public.members
  add column if not exists currency text not null default 'CRC';
