-- ==============================================================================
-- سكربت شامل وتصحيحي لقاعدة بيانات نادي الكرامة (Supabase PostgreSQL)
-- تم إعداده خصيصاً لحل خطأ: invalid input syntax for type numeric: "false"
-- وإضافة كافة خانات وبيانات اللاعبين والكادر (قياس الحذاء، الملابس، زمرة الدم، هاتف الطوارئ، إلخ)
-- ==============================================================================

-- 1. إصلاح نوع عمود receivedKit (تحويله من numeric إلى boolean ليتطابق مع واجهة النظام)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' AND column_name = 'receivedKit' AND data_type != 'boolean'
    ) THEN
        ALTER TABLE public.people ALTER COLUMN "receivedKit" DROP DEFAULT;
        ALTER TABLE public.people ALTER COLUMN "receivedKit" TYPE boolean 
        USING CASE 
            WHEN "receivedKit"::text = '1' OR "receivedKit"::text ILIKE 'true' THEN true 
            ELSE false 
        END;
        ALTER TABLE public.people ALTER COLUMN "receivedKit" SET DEFAULT false;
    ELSE
        ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "receivedKit" boolean DEFAULT false;
    END IF;
END $$;

-- 2. تصحيح الحقول الرقمية التي قد تسبب مشاكل عند إدخال نصوص أو قيم فارغة
-- تحويل subscriptionAmount و height و weight لتقبل نصوص أو قيماً فارغة دون أخطاء
DO $$
BEGIN
    -- تحويل subscriptionAmount إلى text إن كان numeric لتفادي خطأ الإدخال النصي الفارغ
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' AND column_name = 'subscriptionAmount' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.people ALTER COLUMN "subscriptionAmount" TYPE text USING "subscriptionAmount"::text;
    ELSE
        ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "subscriptionAmount" text;
    END IF;

    -- تحويل height إلى text إن وجد كـ numeric
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' AND column_name = 'height' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.people ALTER COLUMN "height" TYPE text USING "height"::text;
    ELSE
        ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "height" text;
    END IF;

    -- تحويل weight إلى text إن وجد كـ numeric
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' AND column_name = 'weight' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.people ALTER COLUMN "weight" TYPE text USING "weight"::text;
    ELSE
        ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "weight" text;
    END IF;
    -- تحويل subscriptionMonth إلى text إن وجد كـ numeric
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' AND column_name = 'subscriptionMonth' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.people ALTER COLUMN "subscriptionMonth" TYPE text USING "subscriptionMonth"::text;
    ELSE
        ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "subscriptionMonth" text;
    END IF;

    -- تحويل contractDuration إلى text إن وجد كـ numeric
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' AND column_name = 'contractDuration' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.people ALTER COLUMN "contractDuration" TYPE text USING "contractDuration"::text;
    ELSE
        ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "contractDuration" text;
    END IF;

    -- تحويل contractValue إلى text إن وجد كـ numeric
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' AND column_name = 'contractValue' AND data_type != 'text'
    ) THEN
        ALTER TABLE public.people ALTER COLUMN "contractValue" TYPE text USING "contractValue"::text;
    ELSE
        ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "contractValue" text;
    END IF;
END $$;

-- 3. إضافة كافة الخانات والمقاييس الشخصية والبدنية الجديدة
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "bloodType" text;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "shoeSize" text;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "clothesSize" text;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "preferredFoot" text;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "emergencyPhone" text;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "isAcademyPlayer" boolean DEFAULT false;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "kitAmount" text;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "registrationDate" text;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "jobTitle" text;

-- 4. خانات المواسم الرياضية والمشاركات (إصلاح عمود seasons ليكون jsonb بدلاً من numeric)
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "season" text DEFAULT '2025/2026';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' AND column_name = 'seasons' AND data_type != 'jsonb'
    ) THEN
        ALTER TABLE public.people DROP COLUMN "seasons" CASCADE;
        ALTER TABLE public.people ADD COLUMN "seasons" jsonb DEFAULT '["2025/2026"]'::jsonb;
    ELSE
        ALTER TABLE public.people ADD COLUMN IF NOT EXISTS "seasons" jsonb DEFAULT '["2025/2026"]'::jsonb;
    END IF;
END $$;

-- 5. السماح بترك أي خانة فارغة دون أخطاء (إلغاء قيود NOT NULL عن كافة الأعمدة باستثناء المعرّف)
DO $$
DECLARE
    col_rec RECORD;
BEGIN
    FOR col_rec IN 
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'people' AND column_name NOT IN ('id')
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.people ALTER COLUMN %I DROP NOT NULL', col_rec.column_name);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- 6. جدول الجلسات والمباريات والبطولات لتأكيد وجود حقل الموسم ومرحلة ومباريات الدوري
ALTER TABLE IF EXISTS public.sessions ADD COLUMN IF NOT EXISTS "season" text DEFAULT '2026/2027';
ALTER TABLE IF EXISTS public.matches ADD COLUMN IF NOT EXISTS "season" text DEFAULT '2026/2027';
ALTER TABLE IF EXISTS public.tournaments ADD COLUMN IF NOT EXISTS "season" text DEFAULT '2026/2027';
ALTER TABLE IF EXISTS public.tournaments ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'دوري';

-- إضافة خانات الجولة (الأسبوع) ومرحلة الذهاب/الإياب لمباريات البطولات
ALTER TABLE IF EXISTS public.tournament_matches ADD COLUMN IF NOT EXISTS "round" integer DEFAULT 1;
ALTER TABLE IF EXISTS public.tournament_matches ADD COLUMN IF NOT EXISTS "leg" text DEFAULT 'ذهاب';
ALTER TABLE IF EXISTS public.tournament_matches ADD COLUMN IF NOT EXISTS "pitch" text;

-- 7. تحديث الحقول المنطقية القديمة لتأخذ قيم افتراضية آمنة في حال كانت فارغة (دون المساس بمواسم اللاعبين)
UPDATE public.people SET "receivedKit" = false WHERE "receivedKit" IS NULL;
UPDATE public.people SET "isAcademyPlayer" = false WHERE "isAcademyPlayer" IS NULL;

-- 8. إعادة تحميل كاش PostgREST في Supabase فوراً لتطبيق التغييرات
NOTIFY pgrst, 'reload schema';
