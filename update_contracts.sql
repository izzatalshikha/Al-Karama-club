-- تحديث جدول اللاعبين (People) لضمان توفر حقول بداية العقد ونهاية العقد
-- الرجاء تنفيذ هذا السكربت في قاعدة بيانات Supabase إذا كنت تستخدم Supabase

ALTER TABLE IF EXISTS "public"."people" 
ADD COLUMN IF NOT EXISTS "contractStart" TEXT,
ADD COLUMN IF NOT EXISTS "contractEnd" TEXT;

-- تحديث الصلاحيات
GRANT ALL ON TABLE "public"."people" TO anon, authenticated, service_role;
