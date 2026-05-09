-- Drop existing tables if they have the wrong column casing (BE CAREFUL WITH PRODUCTION DATA)
-- Since this is a new feature, dropping usually is fine, or we can just alter.
-- Let's just create a strong recreation script.

DROP TABLE IF EXISTS "public"."tournament_matches";
DROP TABLE IF EXISTS "public"."tournament_stage_teams";
DROP TABLE IF EXISTS "public"."tournament_teams";
DROP TABLE IF EXISTS "public"."tournament_stages";
DROP TABLE IF EXISTS "public"."tournaments";

CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT DEFAULT 'نشطة',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "public"."tournament_stages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tournamentId" UUID NOT NULL REFERENCES "public"."tournaments"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "isGroupStage" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "public"."tournament_teams" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tournamentId" UUID NOT NULL REFERENCES "public"."tournaments"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "isOurTeam" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "public"."tournament_stage_teams" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "stageId" UUID NOT NULL REFERENCES "public"."tournament_stages"("id") ON DELETE CASCADE,
    "teamId" UUID NOT NULL REFERENCES "public"."tournament_teams"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "public"."tournament_matches" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tournamentId" UUID NOT NULL REFERENCES "public"."tournaments"("id") ON DELETE CASCADE,
    "stageId" UUID NOT NULL REFERENCES "public"."tournament_stages"("id") ON DELETE CASCADE,
    "team1Id" UUID NOT NULL REFERENCES "public"."tournament_teams"("id") ON DELETE CASCADE,
    "team2Id" UUID NOT NULL REFERENCES "public"."tournament_teams"("id") ON DELETE CASCADE,
    "team1Score" INTEGER,
    "team2Score" INTEGER,
    "matchDate" TEXT,
    "matchTime" TEXT,
    "status" TEXT DEFAULT 'قادمة',
    "linkedMatchId" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Optional, depending on your setup)
ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_stages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_stage_teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_matches" ENABLE ROW LEVEL SECURITY;

-- If you want everyone to be able to read/write for now:
CREATE POLICY "Enable all for tournaments" ON "public"."tournaments" FOR ALL USING (true);
CREATE POLICY "Enable all for tournament_stages" ON "public"."tournament_stages" FOR ALL USING (true);
CREATE POLICY "Enable all for tournament_teams" ON "public"."tournament_teams" FOR ALL USING (true);
CREATE POLICY "Enable all for tournament_stage_teams" ON "public"."tournament_stage_teams" FOR ALL USING (true);
CREATE POLICY "Enable all for tournament_matches" ON "public"."tournament_matches" FOR ALL USING (true);
