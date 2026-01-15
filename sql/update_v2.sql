-- Add place_id column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS place_id text;

-- Make place_id unique to prevent duplicate leads
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_place_id_key;
ALTER TABLE public.leads ADD CONSTRAINT leads_place_id_key UNIQUE (place_id);

-- Ensure generated_assets also tracks place_id if useful, but leads is the priority
-- (Optional) Add status check constraint if desired, but sticking to text is flexible for MVP.
-- Existing statuses: 'new', 'contacted', 'closed'. New requirement: 'new', 'contacted', 'sold'.
-- 'sold' and 'closed' are similar, but we'll use 'sold' as requested.
