-- ==============================================================================
-- PROJECT SHOWCASE 3.0 — REPORTING LOCATION MANAGEMENT (AUDIT TRAIL)
-- File: supabase/migrations/20261120_reporting_location_management.sql
-- ==============================================================================
-- The reporting location itself already exists and is populated:
--   public.teams.panel_number, public.teams.reporting_block, public.teams.table_number
-- (see 20261119_team_reporting_locations.sql). This migration only extends the
-- existing verification_audit_logs table so Super Admin location corrections are
-- recorded in the same immutable event log as attendance checkpoints.
--
-- What it changes:
--   1. Widen verification_audit_logs_field_name_check to allow 'reporting_location'
--      (all previously allowed values are kept).
--   2. Widen verification_audit_logs_action_type_check to allow
--      'reporting_location_updated' (all previously allowed values are kept).
--   3. Add the nullable structured payload column verification_audit_logs.details.
--   4. Make audit history append-only for every API role: UPDATE, DELETE and
--      TRUNCATE are revoked from PUBLIC, anon, authenticated and service_role.
--      service_role keeps exactly SELECT and INSERT (the server routes read and
--      append audit rows, never rewrite them).
--
-- No existing audit row is modified or deleted. Idempotent: safe to re-run.
-- Run in the Supabase SQL Editor (or `supabase db push`).
-- ==============================================================================

BEGIN;

-- 1. Allow the reporting location as an audited field.
ALTER TABLE public.verification_audit_logs
  DROP CONSTRAINT IF EXISTS verification_audit_logs_field_name_check;

ALTER TABLE public.verification_audit_logs
  ADD CONSTRAINT verification_audit_logs_field_name_check
  CHECK (
    field_name IN (
      'reported',
      'photo_id_checked',
      'noc_received',
      'reporting_location'
    )
  );

-- 2. Allow the reporting-location action type.
ALTER TABLE public.verification_audit_logs
  DROP CONSTRAINT IF EXISTS verification_audit_logs_action_type_check;

ALTER TABLE public.verification_audit_logs
  ADD CONSTRAINT verification_audit_logs_action_type_check
  CHECK (
    action_type IN (
      'VERIFY',
      'REVERSE',
      'UNVERIFY',
      'reporting_location_updated'
    )
  );

-- 3. Structured previous / new values for the location change.
ALTER TABLE public.verification_audit_logs
  ADD COLUMN IF NOT EXISTS details jsonb;

COMMENT ON COLUMN public.verification_audit_logs.details
  IS 'Structured audit payload. For reporting_location_updated: team name, source team ID, and previous/new panel_number, reporting_block and table_number.';

-- 4. Audit history is append-only. Service-role server routes may read and
--    append rows; no role (including service_role) can rewrite or delete
--    history through PostgREST.
REVOKE UPDATE, DELETE, TRUNCATE ON public.verification_audit_logs
  FROM PUBLIC, anon, authenticated, service_role;

-- Re-assert the only privileges the application needs on this table.
GRANT SELECT, INSERT ON public.verification_audit_logs TO service_role;

COMMIT;
