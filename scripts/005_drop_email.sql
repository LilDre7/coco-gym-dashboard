-- Drop email column from members table
ALTER TABLE public.members
  DROP COLUMN IF EXISTS email;
