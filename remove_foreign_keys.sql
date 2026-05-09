ALTER TABLE "public"."tournament_stages" DROP CONSTRAINT IF EXISTS "tournament_stages_tournamentId_fkey";
ALTER TABLE "public"."tournament_teams" DROP CONSTRAINT IF EXISTS "tournament_teams_tournamentId_fkey";
ALTER TABLE "public"."tournament_stage_teams" DROP CONSTRAINT IF EXISTS "tournament_stage_teams_stageId_fkey";
ALTER TABLE "public"."tournament_stage_teams" DROP CONSTRAINT IF EXISTS "tournament_stage_teams_teamId_fkey";
ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_tournamentId_fkey";
ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_stageId_fkey";
ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_team1Id_fkey";
ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_team2Id_fkey";
