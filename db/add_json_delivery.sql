-- Add json_answer and delivery_url columns to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS json_answer JSONB;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS delivery_url TEXT;
