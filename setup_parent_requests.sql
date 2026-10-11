-- Create parent_requests table
CREATE TABLE IF NOT EXISTS parent_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "personId" UUID REFERENCES people(id) ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "date" TEXT,
    "status" TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE parent_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (managers, staff, etc.)
CREATE POLICY "Enable all for authenticated users on parent_requests" 
ON parent_requests FOR ALL 
USING (true) WITH CHECK (true);
