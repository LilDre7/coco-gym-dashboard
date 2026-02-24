-- Add optional profile photo URL for members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS photo_url text NOT NULL DEFAULT '';
