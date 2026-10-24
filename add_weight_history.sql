-- ==============================================================================
-- إضافة دعم سجل قياسات الأوزان المتتابعة للاعبين (Weight History) في جدول people
-- لتتبع الوزن شهرياً ورسم المنحنى البياني والتنبيه عند زيادة أو نقصان الوزن
-- ==============================================================================

-- 1. إضافة عمود weightHistory بصيغة JSONB
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "weightHistory" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "weight_history" JSONB DEFAULT '[]'::jsonb;

-- 2. توثيق العمود
COMMENT ON COLUMN public.people."weightHistory" IS 'سجل تواريخ وقياسات أوزان اللاعب عبر الأشهر وتنبيهات الوزن';
