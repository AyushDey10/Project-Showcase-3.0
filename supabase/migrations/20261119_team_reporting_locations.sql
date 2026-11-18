-- ==============================================================================
-- PROJECT SHOWCASE 3.0 — TEAM REPORTING LOCATIONS (PANEL / BLOCK / TABLE)
-- File: supabase/migrations/20261119_team_reporting_locations.sql
-- ==============================================================================
-- Adds the on-site reporting location for each team. These are the only team
-- fields written by the registration-sheet import; names, project titles,
-- institutions and verification state are untouched.
--
-- Run in the Supabase SQL Editor (or `supabase db push`) before importing.
-- Idempotent: safe to run more than once.
-- ==============================================================================

BEGIN;

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS panel_number integer,
  ADD COLUMN IF NOT EXISTS reporting_block text,
  ADD COLUMN IF NOT EXISTS table_number integer;

COMMENT ON COLUMN public.teams.panel_number
  IS 'Evaluation panel the team reports to (1-10), from the registration sheet Panel column.';

COMMENT ON COLUMN public.teams.reporting_block
  IS 'Physical block letter (A-J) assigned to the team, from the registration sheet Block column.';

COMMENT ON COLUMN public.teams.table_number
  IS 'Reporting table number within the block, from the registration sheet Table column.';

-- Location lookups: "who is at block C / table 34", panel rosters, etc.
CREATE INDEX IF NOT EXISTS idx_teams_reporting_location
ON public.teams (panel_number, reporting_block, table_number);

COMMIT;
