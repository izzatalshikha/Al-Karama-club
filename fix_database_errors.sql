-- 1. تحديث الأعمدة الجديدة (الشهادات والخبرات وما إلى ذلك) لتجنب أخطاء JSONB
ALTER TABLE people ADD COLUMN IF NOT EXISTS academicDegree TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS coachingCertificate TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS certificates JSONB DEFAULT '[]'::jsonb;
ALTER TABLE people ADD COLUMN IF NOT EXISTS experiences JSONB DEFAULT '[]'::jsonb;

-- 2. إزالة قيود الأدوار القديمة
ALTER TABLE IF EXISTS people DROP CONSTRAINT IF EXISTS people_role_check;
ALTER TABLE IF EXISTS app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE IF EXISTS app_users DROP CONSTRAINT IF EXISTS users_role_check;

-- 3. إعادة إضافة قيد أدوار الكوادر واللاعبين يشمل "مدرب"
ALTER TABLE IF EXISTS people ADD CONSTRAINT people_role_check CHECK (
  role IN ('لاعب', 'مدير', 'مدرب', 'مساعد مدرب', 'مدرب حراس', 'مدرب لياقة', 'إداري', 'طبيب', 'معالج', 'منسق إعلامي', 'مرافق')
);

-- 4. إعادة إضافة قيد أدوار المستخدمين للتطبيق
ALTER TABLE IF EXISTS app_users ADD CONSTRAINT app_users_role_check CHECK (
  role IN ('مدير', 'إداري فئة', 'مشاهد', 'أمين مستودع', 'مسؤول تجهيزات', 'معالج')
);

-- 5. تحديث الكاش لقاعدة البيانات حتى لا يظهر خطأ Schema Cache
NOTIFY pgrst, 'reload schema';
