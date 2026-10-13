-- ========================================================
-- إعادة ضبط مواسم اللاعبين وإلغاء الترفيع الجماعي إلى 2026/2027
-- ========================================================

-- 1. إعادة تعيين موسم ومواسم كافة اللاعبين إلى موسم 2025/2026 فقط
-- (حتى لا يتم ترفيع أي لاعب إلا باختيارك اليدوي لاحقاً)
UPDATE public.people
SET 
  "season" = '2025/2026',
  "seasons" = '["2025/2026"]'::jsonb
WHERE "role" = 'لاعب';

-- 2. تعديل القيمة الافتراضية للعمود في جدول people ليكون الافتراضي هو 2025/2026
ALTER TABLE public.people ALTER COLUMN "season" SET DEFAULT '2025/2026';
ALTER TABLE public.people ALTER COLUMN "seasons" SET DEFAULT '["2025/2026"]'::jsonb;

-- 3. تحديث جدول الجلسات والبطولات والمباريات لضمان دعم أعمدة الأسبوع والمرحلة
ALTER TABLE IF EXISTS public.tournament_matches ADD COLUMN IF NOT EXISTS "round" integer DEFAULT 1;
ALTER TABLE IF EXISTS public.tournament_matches ADD COLUMN IF NOT EXISTS "leg" text DEFAULT 'ذهاب';
ALTER TABLE IF EXISTS public.tournament_matches ADD COLUMN IF NOT EXISTS "pitch" text;

-- 4. إعادة تحميل الكاش في Supabase PostgREST
NOTIFY pgrst, 'reload schema';
