-- ==============================================================================
-- PROJECT SHOWCASE 3.0 — TASK 1: ROLE-BASED ACCESS CONTROL & DESK SEPARATION
-- Migration: 20261117_task1_desk_separation.sql
-- ==============================================================================

-- 1. Ensure admin_profiles table has the desk column
ALTER TABLE public.admin_profiles
ADD COLUMN IF NOT EXISTS desk text;

-- 2. Clean up existing role and desk check constraints
ALTER TABLE public.admin_profiles
DROP CONSTRAINT IF EXISTS check_admin_role;

ALTER TABLE public.admin_profiles
DROP CONSTRAINT IF EXISTS check_admin_desk;

ALTER TABLE public.admin_profiles
DROP CONSTRAINT IF EXISTS check_admin_role_desk;

-- 3. Add strict check constraints:
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

-- 4. Ensure all existing super_admins have desk = NULL
UPDATE public.admin_profiles
SET desk = NULL
WHERE role = 'super_admin';

-- 5. Add index on desk for fast query filtering
CREATE INDEX IF NOT EXISTS idx_admin_profiles_desk
ON public.admin_profiles (desk);

-- 6. Add index on institution in teams table for fast classification
CREATE INDEX IF NOT EXISTS idx_teams_institution
ON public.teams (institution);

-- 7. Document desk separation logic:
--    - Internal desk: Teams where lower(institution) LIKE '%bennett%'
--    - External desk: Teams where lower(institution) NOT LIKE '%bennett%' or institution IS NULL
COMMENT ON COLUMN public.admin_profiles.desk IS 'Assigned desk: internal (Bennett University) or external (all other institutions). NULL for super_admin.';
