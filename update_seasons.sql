-- إضافة الأعمدة اللازمة لفصل المواسم وأنواع البطولات

-- جدول الجلسات التدريبية
ALTER TABLE IF EXISTS sessions ADD COLUMN IF NOT EXISTS season TEXT DEFAULT '2025/2026';

-- جدول المباريات
ALTER TABLE IF EXISTS matches ADD COLUMN IF NOT EXISTS season TEXT DEFAULT '2025/2026';

-- جدول البطولات
ALTER TABLE IF EXISTS tournaments ADD COLUMN IF NOT EXISTS season TEXT DEFAULT '2025/2026';
ALTER TABLE IF EXISTS tournaments ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'دوري';

-- تحديث السجلات القديمة لتأخذ قيم الموسم الافتراضية
UPDATE sessions SET season = '2025/2026' WHERE season IS NULL OR season = '';
UPDATE matches SET season = '2025/2026' WHERE season IS NULL OR season = '';
UPDATE tournaments SET season = '2025/2026' WHERE season IS NULL OR season = '';
UPDATE tournaments SET type = 'دوري' WHERE type IS NULL OR type = '';
