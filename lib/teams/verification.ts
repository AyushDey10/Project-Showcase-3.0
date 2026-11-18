/**
 * Single source of truth for the verification workflow.
 *
 * Workflow (order matters and is enforced consistently across the UI, APIs and
 * Google Sheets exports):
 *
 *   External teams (3 checkpoints): NOC Verification → Identity (ID Card) → Reported
 *   Internal teams (2 checkpoints): Identity (ID Card) → Reported
 *
 * Internal = institution contains "Bennett" (see lib/teams/classification).
 * NOC is never required — and never verifiable — for internal teams.
 *
 * Display labels are new; database column names (reported, photo_id_checked,
 * noc_received) are unchanged so no migration or data rewrite is needed.
 */

import { isInternalInstitution } from './classification'

export type VerificationField = 'reported' | 'photo_id_checked' | 'noc_received'

export interface VerificationValues {
  reported: boolean
  photo_id_checked: boolean
  noc_received: boolean
}

export interface CheckpointDefinition {
  field: VerificationField
  /** Full display label used in headings, dialogs and exports. */
  label: string
  /** Compact label used in dense tables/badges. */
  shortLabel: string
  description: string
}

export const CHECKPOINT_LABELS: Record<VerificationField, string> = {
  reported: 'Reported',
  photo_id_checked: 'Identity (ID Card)',
  noc_received: 'NOC Verification',
}

export const CHECKPOINT_SHORT_LABELS: Record<VerificationField, string> = {
  reported: 'Reported',
  photo_id_checked: 'Identity',
  noc_received: 'NOC',
}

export const NOC_CHECKPOINT: CheckpointDefinition = {
  field: 'noc_received',
  label: 'NOC Verification',
  shortLabel: 'NOC',
  description: 'Verify the college NOC (No Objection Certificate) has been received.',
}

export const IDENTITY_CHECKPOINT: CheckpointDefinition = {
  field: 'photo_id_checked',
  label: 'Identity (ID Card)',
  shortLabel: 'Identity',
  description: 'Verify physical student photo ID cards have been inspected.',
}

export const REPORTED_CHECKPOINT: CheckpointDefinition = {
  field: 'reported',
  label: 'Reported',
  shortLabel: 'Reported',
  description: 'Verify the team has reported in person at the venue.',
}

/** External workflow order. */
export const EXTERNAL_CHECKPOINTS: CheckpointDefinition[] = [
  NOC_CHECKPOINT,
  IDENTITY_CHECKPOINT,
  REPORTED_CHECKPOINT,
]

/** Internal workflow order (NOC not required). */
export const INTERNAL_CHECKPOINTS: CheckpointDefinition[] = [
  IDENTITY_CHECKPOINT,
  REPORTED_CHECKPOINT,
]

export function getCheckpointsForInstitution(
  institution: string | null | undefined
): CheckpointDefinition[] {
  return isInternalInstitution(institution) ? INTERNAL_CHECKPOINTS : EXTERNAL_CHECKPOINTS
}

/** NOC only applies to external teams. */
export function isCheckpointApplicable(
  institution: string | null | undefined,
  field: VerificationField
): boolean {
  if (field === 'noc_received') return !isInternalInstitution(institution)
  return true
}

export type CheckpointStatus = 'not_started' | 'in_progress' | 'completed'

export const CHECKPOINT_STATUS_LABELS: Record<CheckpointStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
}

export interface CheckpointProgress {
  completed: number
  total: number
  status: CheckpointStatus
  percent: number
}

/**
 * Completion logic:
 * - Internal: Identity + Reported = Completed (2/2), one = In Progress, none = Not Started.
 * - External: all three = Completed (3/3), one or two = In Progress, none = Not Started.
 *
 * NOC values stored for internal teams are ignored so legacy rows cannot inflate
 * internal completion counts.
 */
export function getCheckpointProgress(
  institution: string | null | undefined,
  values: Partial<VerificationValues> | null | undefined
): CheckpointProgress {
  const checkpoints = getCheckpointsForInstitution(institution)
  const completed = checkpoints.reduce(
    (count, checkpoint) => count + (values?.[checkpoint.field] ? 1 : 0),
    0
  )
  const total = checkpoints.length
  const status: CheckpointStatus =
    completed === 0 ? 'not_started' : completed >= total ? 'completed' : 'in_progress'

  return {
    completed,
    total,
    status,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

export function getCheckpointStatusLabel(
  institution: string | null | undefined,
  values: Partial<VerificationValues> | null | undefined
): string {
  return CHECKPOINT_STATUS_LABELS[getCheckpointProgress(institution, values).status]
}

/**
 * Value shown for a single checkpoint: Verified / Pending / Not Required.
 */
export function getCheckpointValueLabel(
  institution: string | null | undefined,
  field: VerificationField,
  verified: boolean
): string {
  if (!isCheckpointApplicable(institution, field)) return 'Not Required'
  return verified ? 'Verified' : 'Pending'
}
