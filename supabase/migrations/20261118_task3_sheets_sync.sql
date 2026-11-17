-- ==============================================================================
-- PROJECT SHOWCASE 3.0 — TASK 3: GOOGLE SHEETS SYNCHRONIZATION QUEUE & STATE
-- ==============================================================================

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

-- Initialize default state records
INSERT INTO public.sheets_sync_state (key, value, updated_at)
VALUES 
  ('spreadsheet_config', '{"spreadsheet_id": "1B0qfyQh2LDP0c_KeErYI1mNFYbjcjBGTCO200dXXtsE", "title": "Project Showcase 3.0 Attendance"}'::jsonb, now()),
  ('sync_summary', '{"last_full_sync": null, "last_successful_sync": null, "total_synced_teams": 0, "total_synced_students": 0, "status": "idle"}'::jsonb, now())
ON CONFLICT (key) DO NOTHING;
