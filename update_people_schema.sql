ALTER TABLE people ADD COLUMN IF NOT EXISTS academicDegree TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS coachingCertificate TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS certificates JSONB DEFAULT '[]'::jsonb;
ALTER TABLE people ADD COLUMN IF NOT EXISTS experiences JSONB DEFAULT '[]'::jsonb;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
