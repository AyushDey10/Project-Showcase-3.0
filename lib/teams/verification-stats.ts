/**
 * Shared verification statistics.
 *
 * Completion rules (see lib/teams/verification.ts):
 *   internal (Bennett): Identity + Reported              → 2 required checkpoints
 *   external:            NOC + Identity + Reported        → 3 required checkpoints
 *
 * NOC values stored against internal teams are ignored so legacy rows cannot
 * inflate or deflate the new completion counts.
 */

import { isInternalInstitution } from './classification'

export interface StatsTeam {
  id: string
  institution: string | null
}

export interface StatsVerification {
  team_id: string
  reported: boolean | null
  photo_id_checked: boolean | null
  noc_received: boolean | null
}

export interface ClassStats {
  total: number
  requiredCheckpoints: number
  reported: number
  photoId: number
  noc: number
  fullyVerified: number
  percent: number
}

export interface VerificationStats {
  totalTeams: number
  reportedCount: number
  photoIdCount: number
  nocCount: number
  fullyVerifiedCount: number
  completedCheckpoints: number
  requiredCheckpoints: number
  progress: {
    overall: number
    fullyVerified: number
    reported: number
    photoId: number
    noc: number
  }
  internal: ClassStats
  external: ClassStats
}

const percent = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0

export function computeVerificationStats(
  teams: StatsTeam[],
  verifications: StatsVerification[]
): VerificationStats {
  const vMap = new Map(verifications.map((v) => [v.team_id, v]))

  let reportedCount = 0
  let photoIdCount = 0
  let nocCount = 0
  let fullyVerifiedCount = 0
  let completedCheckpoints = 0

  let internalTotal = 0
  let internalReported = 0
  let internalPhotoId = 0
  let internalFullyVerified = 0

  let externalTotal = 0
  let externalReported = 0
  let externalPhotoId = 0
  let externalNoc = 0
  let externalFullyVerified = 0

  for (const team of teams) {
    const verification = vMap.get(team.id)
    const reported = Boolean(verification?.reported)
    const identity = Boolean(verification?.photo_id_checked)
    const internal = isInternalInstitution(team.institution)
    // NOC only counts for external teams.
    const noc = !internal && Boolean(verification?.noc_received)

    if (reported) reportedCount++
    if (identity) photoIdCount++
    if (noc) nocCount++

    const completed = (reported ? 1 : 0) + (identity ? 1 : 0) + (noc ? 1 : 0)
    completedCheckpoints += completed

    if (internal) {
      internalTotal++
      if (reported) internalReported++
      if (identity) internalPhotoId++
      if (reported && identity) {
        internalFullyVerified++
        fullyVerifiedCount++
      }
    } else {
      externalTotal++
      if (reported) externalReported++
      if (identity) externalPhotoId++
      if (noc) externalNoc++
      if (reported && identity && noc) {
        externalFullyVerified++
        fullyVerifiedCount++
      }
    }
  }

  const totalTeams = teams.length
  const requiredCheckpoints = internalTotal * 2 + externalTotal * 3

  return {
    totalTeams,
    reportedCount,
    photoIdCount,
    nocCount,
    fullyVerifiedCount,
    completedCheckpoints,
    requiredCheckpoints,
    progress: {
      overall: percent(completedCheckpoints, requiredCheckpoints),
      fullyVerified: percent(fullyVerifiedCount, totalTeams),
      reported: percent(reportedCount, totalTeams),
      photoId: percent(photoIdCount, totalTeams),
      noc: percent(nocCount, externalTotal),
    },
    internal: {
      total: internalTotal,
      requiredCheckpoints: 2,
      reported: internalReported,
      photoId: internalPhotoId,
      noc: 0,
      fullyVerified: internalFullyVerified,
      percent: percent(internalFullyVerified, internalTotal),
    },
    external: {
      total: externalTotal,
      requiredCheckpoints: 3,
      reported: externalReported,
      photoId: externalPhotoId,
      noc: externalNoc,
      fullyVerified: externalFullyVerified,
      percent: percent(externalFullyVerified, externalTotal),
    },
  }
}
