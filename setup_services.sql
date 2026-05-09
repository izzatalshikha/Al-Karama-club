CREATE TABLE IF NOT EXISTS services_directory (
    id UUID PRIMARY KEY,
    category TEXT NOT NULL,
    governorate TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    description TEXT,
    features TEXT
);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration TEXT;
