-- Add check constraint to ensure only valid statuses are used
ALTER TABLE leads
ADD CONSTRAINT check_leads_status 
CHECK (status IN ('new', 'contacted', 'sold', 'rejected'));

-- Create an index on place_id to speed up the NOT IN filtering during search
CREATE INDEX IF NOT EXISTS idx_leads_place_id ON leads(place_id);

-- Optional: Comment to document the statuses
COMMENT ON COLUMN leads.status IS 'Lead status: new, contacted (proposal sent), sold (won), rejected (discarded)';
