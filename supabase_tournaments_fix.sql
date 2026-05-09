-- اضافة عمود isGroupStage المفقود في جدول tournament_stages
ALTER TABLE tournament_stages ADD COLUMN IF NOT EXISTS "isGroupStage" BOOLEAN DEFAULT false;

-- إذا لم تقم بإنشاء الجداول الأخرى الخاصة بالبطولات بالشكل الصحيح بعد، يرجى تحديثها ليكون لديها جميع الحقول.

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'نشطة';
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS "isOurTeam" BOOLEAN DEFAULT false;
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS "matchDate" TEXT;
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS "matchTime" TEXT;
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS "linkedMatchId" TEXT;
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'قادمة';
