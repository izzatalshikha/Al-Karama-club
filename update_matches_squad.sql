-- اضافة الاعمدة الجديدة لجدول المباريات
ALTER TABLE matches ADD COLUMN IF NOT EXISTS "isFinal" BOOLEAN DEFAULT false;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS "hasExtraTimeAndPenalties" BOOLEAN DEFAULT false;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS "ourPenaltiesScore" TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS "opponentPenaltiesScore" TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS "matchDuration" TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS "halvesCount" TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS "squadSize" TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS "squad" JSONB;

-- اضافة عمود مدة التدريب الذي تم طلبه سابقاً
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS "duration" TEXT;
