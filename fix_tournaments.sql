-- تنفيذ هذا السكربت ضروري لإعطاء الصلاحيات وإصلاح مشكلة اختفاء البطولات بعد تحديث الصفحة

GRANT ALL ON TABLE "public"."tournaments" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "public"."tournament_stages" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "public"."tournament_teams" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "public"."tournament_stage_teams" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "public"."tournament_matches" TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS "public"."tournaments" ADD COLUMN IF NOT EXISTS "season" TEXT DEFAULT '2025/2026';
ALTER TABLE IF EXISTS "public"."tournaments" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'دوري';
ALTER TABLE IF EXISTS "public"."tournament_matches" ADD COLUMN IF NOT EXISTS "pitch" TEXT;

-- تعطيل RLS لتجنب المنع المخفي
ALTER TABLE "public"."tournaments" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_stages" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_teams" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_stage_teams" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_matches" DISABLE ROW LEVEL SECURITY;
