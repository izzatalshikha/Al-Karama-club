-- ==============================================================
-- سكربت تحديث جدول الكوادر واللاعبين (people) في Supabase
-- لتثبيت الشهادات التدريبية وصورها والخبرات السابقة والتحصيل العلمي
-- ==============================================================

-- 1. إضافة عمود الشهادات التدريبية كـ JSONB لتخزين الاسم، التاريخ، وصورة الوثيقة المضغوطة
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "certificates" JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.people."certificates" IS 'قائمة الشهادات التدريبية والرخص الرسمية للكادر مع التواريخ وصور الوثائق المضغوطة';

-- 2. إضافة عمود الخبرات السابقة كـ JSONB لتخزين محطات العمل السابقة والأندية والمناصب
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "experiences" JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.people."experiences" IS 'قائمة الخبرات ومحطات العمل السابقة والأندية والمنتخبات والمناصب الوظيفية';

-- 3. إضافة عمود التحصيل العلمي والمؤهل الدراسي الأكاديمي
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "academicDegree" TEXT;
COMMENT ON COLUMN public.people."academicDegree" IS 'المؤهل العلمي أو الشهادة الأكاديمية للكادر';

-- 4. إضافة عمود الرخصة التدريبية الرئيسية
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "coachingCertificate" TEXT;
COMMENT ON COLUMN public.people."coachingCertificate" IS 'الشهادة أو الرخصة التدريبية الأساسية المعتمدة للكادر';

-- 5. التأكد من وجود عمود الصورة الشخصية الرسمية
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "photo" TEXT;
COMMENT ON COLUMN public.people."photo" IS 'الصورة الشخصية الرسمية للاعب أو عضو الكادر الفني والإداري';

-- 6. التأكد من وجود أعمدة الوثائق الثبوتية وجواز السفر
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "passportNumber" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "passportIssueDate" DATE;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "passportExpiryDate" DATE;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "idCardImage" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "idCardBackImage" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "passportImage" TEXT;

-- 7. تحديث كاش PostgREST في Supabase فوراً
NOTIFY pgrst, 'reload schema';
