-- ==============================================================================
-- PROJECT SHOWCASE 3.0 — TASK 2: SUPER ADMIN PANEL, ADMIN MANAGEMENT & EDITING
-- Migration: 20261118_task2_admin_management_and_editing.sql
-- ==============================================================================

-- 1. Extend admin_audit_logs to capture desk changes and structured audit details
ALTER TABLE public.admin_audit_logs
ADD COLUMN IF NOT EXISTS previous_desk text,
ADD COLUMN IF NOT EXISTS new_desk text,
ADD COLUMN IF NOT EXISTS details jsonb;

-- 2. Ensure indexes exist on admin_audit_logs for actor and target lookups
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_id
ON public.admin_audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_id
ON public.admin_audit_logs (target_admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type
ON public.admin_audit_logs (action_type);

-- 3. Ensure students table has proper foreign key constraint and indexes
CREATE INDEX IF NOT EXISTS idx_students_team_id
ON public.students (team_id);

CREATE INDEX IF NOT EXISTS idx_students_enrollment_no
ON public.students (enrollment_no);

-- 4. Document audit action types
COMMENT ON TABLE public.admin_audit_logs IS 'Immutable audit history of all administrative profile, role, desk, and credential actions.';
