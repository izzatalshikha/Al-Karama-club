-- Make sure our columns exist
ALTER TABLE IF EXISTS "public"."tournaments" ADD COLUMN IF NOT EXISTS "season" TEXT DEFAULT '2025/2026';
ALTER TABLE IF EXISTS "public"."tournaments" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'دوري';

-- Disable RLS for now to ensure data can be saved and read by everyone
ALTER TABLE "public"."tournaments" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_stages" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_teams" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_stage_teams" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_matches" DISABLE ROW LEVEL SECURITY;

-- If RLS was disabled, the policies are ignored. But just in case:
DROP POLICY IF EXISTS "Enable all for tournaments" ON "public"."tournaments";
DROP POLICY IF EXISTS "Enable all for tournament_stages" ON "public"."tournament_stages";
DROP POLICY IF EXISTS "Enable all for tournament_teams" ON "public"."tournament_teams";
DROP POLICY IF EXISTS "Enable all for tournament_stage_teams" ON "public"."tournament_stage_teams";
DROP POLICY IF EXISTS "Enable all for tournament_matches" ON "public"."tournament_matches";
