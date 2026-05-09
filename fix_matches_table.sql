-- اضافة عمود isHome لجدول المباريات
ALTER TABLE matches ADD COLUMN IF NOT EXISTS "isHome" BOOLEAN DEFAULT true;
