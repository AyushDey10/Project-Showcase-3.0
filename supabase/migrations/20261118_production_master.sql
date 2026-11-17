-- ==============================================================================
-- PROJECT SHOWCASE 3.0 — PRODUCTION MASTER MIGRATION BUNDLE
-- File: supabase/migrations/20261118_production_master.sql
-- ==============================================================================
-- Run this script in the Supabase SQL Editor of your target production database.
-- It executes idempotently (IF NOT EXISTS / DROP CONSTRAINT IF EXISTS).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. TASK 1: ROLE-BASED ACCESS CONTROL & DESK SEPARATION
-- ------------------------------------------------------------------------------

-- Ensure admin_profiles table has the desk column
ALTER TABLE public.admin_profiles
ADD COLUMN IF NOT EXISTS desk text;

-- Clean up existing role and desk check constraints
ALTER TABLE public.admin_profiles
DROP CONSTRAINT IF EXISTS check_admin_role;

ALTER TABLE public.admin_profiles
DROP CONSTRAINT IF EXISTS check_admin_desk;

ALTER TABLE public.admin_profiles
DROP CONSTRAINT IF EXISTS check_admin_role_desk;

-- Add strict check constraints:
--    - Role must be either 'admin' or 'super_admin'
--    - Desk must be either 'internal', 'external', or NULL
--    - If role is 'super_admin', desk MUST be NULL
--    - If role is 'admin', desk MUST be either 'internal' or 'external'
ALTER TABLE public.admin_profiles
ADD CONSTRAINT check_admin_role
CHECK (role IN ('admin', 'super_admin'));

ALTER TABLE public.admin_profiles
ADD CONSTRAINT check_admin_desk
CHECK (desk IN ('internal', 'external') OR desk IS NULL);

ALTER TABLE public.admin_profiles
ADD CONSTRAINT check_admin_role_desk
CHECK (
  (role = 'super_admin' AND desk IS NULL) OR
  (role = 'admin' AND desk IN ('internal', 'external'))
);

-- Ensure all existing super_admins have desk = NULL
UPDATE public.admin_profiles
SET desk = NULL
WHERE role = 'super_admin';

-- Index on desk for fast query filtering
CREATE INDEX IF NOT EXISTS idx_admin_profiles_desk
ON public.admin_profiles (desk);

-- Index on institution in teams table for fast classification
CREATE INDEX IF NOT EXISTS idx_teams_institution
ON public.teams (institution);

COMMENT ON COLUMN public.admin_profiles.desk IS 'Assigned desk: internal (Bennett University) or external (all other institutions). NULL for super_admin.';

-- ------------------------------------------------------------------------------
-- 2. TASK 2: SUPER ADMIN PANEL, AUDIT LOGGING & COMPONENT INDEXES
-- ------------------------------------------------------------------------------

-- Extend admin_audit_logs to capture desk changes and structured audit details
ALTER TABLE public.admin_audit_logs
ADD COLUMN IF NOT EXISTS previous_desk text,
ADD COLUMN IF NOT EXISTS new_desk text,
ADD COLUMN IF NOT EXISTS details jsonb;

-- Indexes on admin_audit_logs for actor and target lookups
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_id
ON public.admin_audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_id
ON public.admin_audit_logs (target_admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type
ON public.admin_audit_logs (action_type);

-- Ensure students table has proper indexes
CREATE INDEX IF NOT EXISTS idx_students_team_id
ON public.students (team_id);

CREATE INDEX IF NOT EXISTS idx_students_enrollment_no
ON public.students (enrollment_no);

COMMENT ON TABLE public.admin_audit_logs IS 'Immutable audit history of all administrative profile, role, desk, and credential actions.';

-- ------------------------------------------------------------------------------
-- 3. TASK 3: GOOGLE SHEETS SYNCHRONIZATION QUEUE & STATE TABLES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sheets_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'team', 'student', 'verification', 'full_sync'
  entity_id text,            -- team UUID, student UUID, or null
  action text NOT NULL,       -- 'UPSERT', 'DELETE', 'FULL_SYNC'
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.sheets_sync_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Performance indexes for queue processing and status queries
CREATE INDEX IF NOT EXISTS idx_sheets_sync_queue_status ON public.sheets_sync_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sheets_sync_queue_entity ON public.sheets_sync_queue(entity_type, entity_id);

-- Initialize default state records if missing
INSERT INTO public.sheets_sync_state (key, value, updated_at)
VALUES 
  ('spreadsheet_config', '{"spreadsheet_id": "1B0qfyQh2LDP0c_KeErYI1mNFYbjcjBGTCO200dXXtsE", "title": "Project Showcase 3.0 Attendance"}'::jsonb, now()),
  ('sync_summary', '{"last_full_sync": null, "last_successful_sync": null, "total_synced_teams": 0, "total_synced_students": 0, "status": "idle"}'::jsonb, now())
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. RLS POLICIES & PERMISSIONS FOR NEW TABLES
-- ------------------------------------------------------------------------------

ALTER TABLE public.sheets_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheets_sync_state ENABLE ROW LEVEL SECURITY;

-- Deny all public access to sync queue and state
DROP POLICY IF EXISTS "Deny public access on sheets_sync_queue" ON public.sheets_sync_queue;
CREATE POLICY "Deny public access on sheets_sync_queue" ON public.sheets_sync_queue FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny public access on sheets_sync_state" ON public.sheets_sync_state;
CREATE POLICY "Deny public access on sheets_sync_state" ON public.sheets_sync_state FOR ALL USING (false);

-- Grant service role full access
GRANT ALL ON public.sheets_sync_queue TO service_role;
GRANT ALL ON public.sheets_sync_state TO service_role;

COMMIT;
