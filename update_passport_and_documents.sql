-- ==============================================================================
-- كود SQL لإضافة حقول جواز السفر وصور المستندات والوجه الثاني للهوية والشهادات إلى جدول الأشخاص (people)
-- يغطي أسماء الأعمدة بصيغتي camelCase و snake_case لضمان التوافق التام مع Supabase و PostgREST
-- ==============================================================================

-- 1. إضافة حقول بيانات جواز السفر (رقم الجواز، تاريخ الإصدار، تاريخ الانتهاء)
ALTER TABLE people ADD COLUMN IF NOT EXISTS "passportNumber" TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS "passportIssueDate" TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS "passportExpiryDate" TEXT;

-- 2. إضافة حقول صور المستندات المضغوطة (الوجه الأول للهوية / إخراج القيد، الوجه الثاني للهوية، وصورة جواز السفر)
ALTER TABLE people ADD COLUMN IF NOT EXISTS "idCardImage" TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS "idCardBackImage" TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS "passportImage" TEXT;

-- 3. إضافة حقل الشهادات التدريبية بصيغة JSONB / JSON في حال لم يكن موجوداً
ALTER TABLE people ADD COLUMN IF NOT EXISTS certificates JSONB DEFAULT '[]'::jsonb;

-- أعمدة بديلة في حال استخدام snake_case في بعض الاستعلامات
ALTER TABLE people ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS passport_issue_date TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS passport_expiry_date TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS id_card_image TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS id_card_back_image TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS passport_image TEXT;

-- 4. تحديث الكاش البرمجي لواجهة PostgREST / Supabase فوراً للتعرف على الحقول الجديدة
NOTIFY pgrst, 'reload schema';
