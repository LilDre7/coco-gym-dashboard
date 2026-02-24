-- Add is_active column to members table (default true for all existing members)
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
