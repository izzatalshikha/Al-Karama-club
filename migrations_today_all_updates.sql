-- ==============================================================================
-- نادي الكرامة الرياضي - نظام النسر (Eagle OS)
-- سكربت التحديثات الآمن لقاعدة بيانات Supabase (بدون أي عمليات حذف أو تعديل مدمّر)
-- 1. جدول الأفراد (people): هاتف الطوارئ، القياسات، الجوازات، والشهادات
-- 2. جدول الطبابة والإصابات (injuries): بروتوكول RTP والأشعة وسجل الجلسات
-- 3. جدول حسابات النظام (app_users): حقل الفئات المقيدة
-- 4. تفعيل سياسات الوصول الآمنة وتحديث كاش المخطط (Schema Cache Reload)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. تحديث جدول الأفراد واللاعبين والكوادر (people)
-- ------------------------------------------------------------------------------

-- هاتف الطوارئ (بصيغتي التسمية لضمان التوافق الكامل)
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "emergencyPhone" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS emergency_phone TEXT;

-- البيانات الطبية والبدنية وقياسات اللاعبين
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "bloodType" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "preferredFoot" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "shoeSize" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "clothesSize" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "weightHistory" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS weight_history JSONB DEFAULT '[]'::jsonb;

-- بيانات الأكاديمية والتجهيزات الرياضية
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "isAcademyPlayer" BOOLEAN DEFAULT false;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "receivedKit" BOOLEAN DEFAULT false;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "kitAmount" NUMERIC DEFAULT 0;

-- بيانات ووثائق جوازات السفر
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "passportNumber" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "passportIssueDate" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS passport_issue_date TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "passportExpiryDate" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS passport_expiry_date TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "passportImage" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS passport_image TEXT;

-- بطاقات الهوية الشخصية والصور السحابية
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "idCardImage" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS id_card_image TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "idCardBackImage" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS id_card_back_image TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS photo TEXT;

-- شهادات وخبرات الكوادر والمدربين
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "coachingCertificate" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "academicDegree" TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS certificates JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS experiences JSONB DEFAULT '[]'::jsonb;

-- المواسم الرياضية
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS season TEXT DEFAULT '2025/2026';
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS seasons TEXT[] DEFAULT ARRAY['2025/2026'];

-- ------------------------------------------------------------------------------
-- 2. جدول وأعمدة قسم الطبابة والمركز الطبي (injuries)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.injuries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "personId" UUID NOT NULL,
    type TEXT NOT NULL,
    location TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'خفيفة',
    "startDate" TEXT NOT NULL,
    "expectedReturn" TEXT,
    status TEXT NOT NULL DEFAULT 'تأهيل',
    notes TEXT
);

-- الأعمدة المتقدمة لبروتوكول العودة للملاعب (RTP) والأشعة والجلسات العلاجية
ALTER TABLE public.injuries ADD COLUMN IF NOT EXISTS "rtpStage" TEXT DEFAULT 'clinic';
ALTER TABLE public.injuries ADD COLUMN IF NOT EXISTS mechanism TEXT DEFAULT 'non_contact';
ALTER TABLE public.injuries ADD COLUMN IF NOT EXISTS "imagingUrls" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.injuries ADD COLUMN IF NOT EXISTS "imagingType" TEXT DEFAULT 'MRI';
ALTER TABLE public.injuries ADD COLUMN IF NOT EXISTS "doctorNotesToCoach" TEXT;
ALTER TABLE public.injuries ADD COLUMN IF NOT EXISTS "bodyZone" TEXT;
ALTER TABLE public.injuries ADD COLUMN IF NOT EXISTS "treatmentsLog" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.injuries ADD COLUMN IF NOT EXISTS category TEXT;

-- ------------------------------------------------------------------------------
-- 3. تحديث جدول حسابات وصلاحيات النظام (app_users)
-- ------------------------------------------------------------------------------

ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS "restrictedCategory" TEXT;

-- ------------------------------------------------------------------------------
-- 4. تفعيل أمان مستوى الصف (RLS) وإضافة السياسات فقط إذا لم تكن موجودة مسبقاً
-- ------------------------------------------------------------------------------

ALTER TABLE public.injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'injuries' AND policyname = 'injuries_all_policy'
  ) THEN
    CREATE POLICY "injuries_all_policy" ON public.injuries FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'people' AND policyname = 'people_all_policy'
  ) THEN
    CREATE POLICY "people_all_policy" ON public.people FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. تحديث كاش مخطط قاعدة البيانات فوراً (Schema Cache Reload)
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
