'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Globe,
  Users,
  Mail,
  Phone,
  GraduationCap,
  ClipboardCheck,
  Fingerprint,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Check,
  History,
  AlertTriangle,
  User,
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Plus,
  X,
  AlertCircle,
  MapPin,
  LayoutGrid,
  Hash,
} from 'lucide-react'
import { PageContainer } from '@/components/admin/page-container'
import { StatusBadge } from '@/components/admin/status-badge'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { LoadingSpinner } from '@/components/admin/loading-state'
import { TeamDetailSkeleton } from '@/components/admin/team-detail-skeleton'
import { ErrorState } from '@/components/admin/error-state'
import { EmptyState } from '@/components/admin/empty-state'
import { cn } from '@/lib/utils'
import type { AdminProfile } from '@/lib/auth/admin'
import { ReportingLocationPopup } from '@/components/admin/reporting-location-popup'
import {
  describeReportingLocationChange,
  fetchTeamReportingLocation,
  formatReportingLocation,
  hasCompleteReportingLocation,
  validateReportingLocation,
  type ReportingLocation,
  type ReportingLocationField,
} from '@/lib/teams/reporting-location'

export interface TeamData {
  id: string
  source_team_id: string
  team_name: string
  institution: string | null
  project_title: string | null
  project_domain: string | null
  faculty_mentor: string | null
  team_size: number | null
  leader_name: string | null
  leader_enrollment_no: string | null
  leader_mobile: string | null
  leader_email: string | null
  panel_number: number | null
  reporting_block: string | null
  table_number: number | null
  created_at?: string
  updated_at?: string
}

export interface StudentData {
  id: string
  team_id: string
  name: string
  enrollment_no: string | null
  mobile: string | null
  email: string | null
  role: string | null
  created_at: string
}

export interface VerificationData {
  reported: boolean
  reported_at: string | null
  reported_by: string | null
  photo_id_checked: boolean
  photo_id_checked_at: string | null
  photo_id_checked_by: string | null
  noc_received: boolean
  noc_received_at: string | null
  noc_received_by: string | null
}

export interface AuditLogData {
  id: string
  event_no: number
  team_id: string
  field_name: 'reported' | 'photo_id_checked' | 'noc_received' | string
  previous_value: boolean
  new_value: boolean
  admin_id: string | null
  admin_email: string | null
  created_at: string
  reverse_log_id: string | null
  reason: string | null
}

export type VerificationField = 'reported' | 'photo_id_checked' | 'noc_received'

interface DialogState {
  isOpen: boolean
  field: VerificationField
  targetValue: boolean
  reverseLogId?: string
  verifiedBy?: string | null
  title: string
  description: string
  variant: 'default' | 'destructive'
  requireReason: boolean
}

function formatDateTime(ts: string | null) {
  if (!ts) return '—'
  const date = new Date(ts)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function ReportingLocationTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number | null | undefined
}) {
  const assigned =
    value !== null && value !== undefined && String(value).trim() !== ''

  return (
    <div className="rounded-xl border border-border/60 bg-background/50 px-4 py-3">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon size={12} />
        {label}
      </span>
      <span
        className={cn(
          'mt-1 block tracking-tight',
          assigned
            ? 'text-2xl font-bold text-foreground'
            : 'text-sm font-semibold text-muted-foreground/60'
        )}
      >
        {assigned ? value : 'Not Assigned'}
      </span>
    </div>
  )
}

const fieldDisplayConfig: Record<
  VerificationField,
  { label: string; icon: React.ElementType; color: string; desc: string }
> = {
  reported: {
    label: 'Reported Status',
    icon: ClipboardCheck,
    color: 'emerald',
    desc: 'Verify that the team has reported in person to the venue.',
  },
  photo_id_checked: {
    label: 'Photo ID Checked',
    icon: Fingerprint,
    color: 'cyan',
    desc: 'Verify that physical student photo ID cards have been inspected.',
  },
  noc_received: {
    label: 'NOC Received',
    icon: FileCheck2,
    color: 'amber',
    desc: 'Verify that the required institutional NOC document is received.',
  },
}

export function TeamDetail({
  teamId,
  currentAdmin,
}: {
  teamId: string
  currentAdmin?: AdminProfile
}) {
  const [team, setTeam] = useState<TeamData | null>(null)
  const [students, setStudents] = useState<StudentData[]>([])
  const [verification, setVerification] = useState<VerificationData>({
    reported: false,
    reported_at: null,
    reported_by: null,
    photo_id_checked: false,
    photo_id_checked_at: null,
    photo_id_checked_by: null,
    noc_received: false,
    noc_received_at: null,
    noc_received_by: null,
  })
  const [activity, setActivity] = useState<AuditLogData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action / Dialog state
  const [actionLoading, setActionLoading] = useState(false)
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    field: 'reported',
    targetValue: true,
    title: '',
    description: '',
    variant: 'default',
    requireReason: false,
  })

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const isSuperAdmin = currentAdmin?.role === 'super_admin'

  // Reporting location popup (shown after a successful Reported checkpoint)
  const [locationPopupOpen, setLocationPopupOpen] = useState(false)
  const [locationPopupLoading, setLocationPopupLoading] = useState(false)
  const [locationPopupError, setLocationPopupError] = useState<string | null>(null)
  const [locationPopupLocation, setLocationPopupLocation] =
    useState<ReportingLocation | null>(null)

  // Super Admin reporting-location editor
  const [editLocationOpen, setEditLocationOpen] = useState(false)
  const [locationForm, setLocationForm] = useState({
    panel_number: '',
    reporting_block: '',
    table_number: '',
  })
  const [locationFieldErrors, setLocationFieldErrors] = useState<
    Partial<Record<ReportingLocationField, string>>
  >({})
  const [locationFormError, setLocationFormError] = useState<string | null>(null)
  const [locationConfirmOpen, setLocationConfirmOpen] = useState(false)
  const [pendingLocation, setPendingLocation] = useState<ReportingLocation | null>(null)
  const [locationSaving, setLocationSaving] = useState(false)

  // Edit Team state
  const [editTeamOpen, setEditTeamOpen] = useState(false)
  const [editTeamLoading, setEditTeamLoading] = useState(false)
  const [editTeamError, setEditTeamError] = useState<string | null>(null)
  const [teamForm, setTeamForm] = useState({
    team_name: '',
    institution: '',
    project_title: '',
    project_domain: '',
    faculty_mentor: '',
    team_size: 1,
    leader_name: '',
    leader_enrollment_no: '',
    leader_mobile: '',
    leader_email: '',
  })

  // Add / Edit Student state
  const [studentModalMode, setStudentModalMode] = useState<'add' | 'edit' | null>(null)
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null)
  const [studentFormLoading, setStudentFormLoading] = useState(false)
  const [studentFormError, setStudentFormError] = useState<string | null>(null)
  const [studentForm, setStudentForm] = useState({
    name: '',
    enrollment_no: '',
    role: 'Member',
    email: '',
    mobile: '',
  })

  // Delete Student state
  const [deletingStudent, setDeletingStudent] = useState<StudentData | null>(null)
  const [deleteStudentLoading, setDeleteStudentLoading] = useState(false)

  // Fetch team details from GET /api/admin/teams/[id]
  const fetchTeamDetails = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to load team details.')
      }
      const data = await res.json()
      setTeam(data.team)
      setStudents(data.students ?? [])
      setVerification(data.verification)
      setActivity(data.activity ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading team.')
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchTeamDetails()
  }, [fetchTeamDetails])

  // Team editing handlers
  const handleOpenEditTeam = () => {
    if (!team) return
    setTeamForm({
      team_name: team.team_name || '',
      institution: team.institution || '',
      project_title: team.project_title || '',
      project_domain: team.project_domain || '',
      faculty_mentor: team.faculty_mentor || '',
      team_size: team.team_size || students.length || 1,
      leader_name: team.leader_name || '',
      leader_enrollment_no: team.leader_enrollment_no || '',
      leader_mobile: team.leader_mobile || '',
      leader_email: team.leader_email || '',
    })
    setEditTeamError(null)
    setEditTeamOpen(true)
  }

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditTeamLoading(true)
    setEditTeamError(null)

    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamForm),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update team details.')
      }

      showToast('success', 'Team registration details updated successfully.')
      setEditTeamOpen(false)
      await fetchTeamDetails()
    } catch (err) {
      setEditTeamError(err instanceof Error ? err.message : 'Failed to update team details.')
    } finally {
      setEditTeamLoading(false)
    }
  }

  // Student management handlers
  const handleOpenAddStudent = () => {
    setStudentForm({
      name: '',
      enrollment_no: '',
      role: 'Member',
      email: '',
      mobile: '',
    })
    setEditingStudent(null)
    setStudentFormError(null)
    setStudentModalMode('add')
  }

  const handleOpenEditStudent = (student: StudentData) => {
    setEditingStudent(student)
    setStudentForm({
      name: student.name || '',
      enrollment_no: student.enrollment_no || '',
      role: student.role || 'Member',
      email: student.email || '',
      mobile: student.mobile || '',
    })
    setStudentFormError(null)
    setStudentModalMode('edit')
  }

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setStudentFormLoading(true)
    setStudentFormError(null)

    try {
      if (studentModalMode === 'add') {
        const res = await fetch(`/api/admin/teams/${teamId}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentForm),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to add student.')
        showToast('success', 'Student added to team successfully.')
      } else if (studentModalMode === 'edit' && editingStudent) {
        const res = await fetch(`/api/admin/teams/${teamId}/students`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: editingStudent.id,
            ...studentForm,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update student.')
        showToast('success', 'Student details updated successfully.')
      }

      setStudentModalMode(null)
      setEditingStudent(null)
      await fetchTeamDetails()
    } catch (err) {
      setStudentFormError(err instanceof Error ? err.message : 'Operation failed.')
    } finally {
      setStudentFormLoading(false)
    }
  }

  const handleOpenDeleteStudent = (student: StudentData) => {
    if (students.length <= 1) {
      showToast('error', 'Cannot remove student: A team must always have at least one member.')
      return
    }
    setDeletingStudent(student)
  }

  const handleConfirmDeleteStudent = async () => {
    if (!deletingStudent) return
    setDeleteStudentLoading(true)

    try {
      const res = await fetch(`/api/admin/teams/${teamId}/students`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: deletingStudent.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove student.')

      showToast('success', 'Student removed from team.')
      setDeletingStudent(null)
      await fetchTeamDetails()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove student.')
    } finally {
      setDeleteStudentLoading(false)
    }
  }

  // Find the active verification log entry for a field (to link reversal)
  const findActiveLogForField = (field: VerificationField): AuditLogData | undefined => {
    // Find the latest log for this field where new_value is true
    return activity.find(
      (log) => log.field_name === field && log.new_value === true
    )
  }

  // Open confirmation for Verifying
  const handleInitiateVerify = (field: VerificationField) => {
    const config = fieldDisplayConfig[field]
    setDialogState({
      isOpen: true,
      field,
      targetValue: true,
      title: `Verify ${config.label}`,
      description: `Are you sure you want to verify ${config.label} for ${team?.team_name ?? 'this team'}? This will record your admin identity and timestamp.`,
      variant: 'default',
      requireReason: false,
    })
  }

  // Open confirmation for Reversing
  const handleInitiateReversal = (field: VerificationField) => {
    const config = fieldDisplayConfig[field]
    const verifiedBy = verification[`${field}_by` as keyof VerificationData] as string | null
    const activeLog = findActiveLogForField(field)

    const isOtherAdmin =
      Boolean(verifiedBy) &&
      Boolean(currentAdmin?.email) &&
      verifiedBy?.toLowerCase() !== currentAdmin?.email?.toLowerCase()

    setDialogState({
      isOpen: true,
      field,
      targetValue: false,
      reverseLogId: activeLog?.id,
      verifiedBy,
      title: `Reverse ${config.label}`,
      description: isOtherAdmin
        ? `This status was verified by ${verifiedBy}. Reversing another administrator's action requires a mandatory explanation for the audit log.`
        : `Are you sure you want to reverse the ${config.label} verification for ${team?.team_name ?? 'this team'}?`,
      variant: 'destructive',
      requireReason: isOtherAdmin,
    })
  }

  // Execute verification update via POST /api/admin/verification
  const handleConfirmAction = async (reason?: string) => {
    const actionField = dialogState.field
    const actionValue = dialogState.targetValue
    setActionLoading(true)
    try {
      const payload = {
        teamId,
        fieldName: dialogState.field,
        value: dialogState.targetValue,
        reverseLogId: dialogState.reverseLogId,
        reason: reason || undefined,
      }

      const res = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to update verification status.')
      }

      showToast(
        'success',
        json.message ??
          `${fieldDisplayConfig[dialogState.field].label} ${
            dialogState.targetValue ? 'verified' : 'reversed'
          } successfully.`
      )

      setDialogState((prev) => ({ ...prev, isOpen: false }))
      // Refresh team data to display updated status and audit logs immediately
      await fetchTeamDetails()

      // Only a successful Reported verification opens the location popup.
      if (actionField === 'reported' && actionValue) {
        void openReportingLocationPopup()
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const closeLocationPopup = () => {
    setLocationPopupOpen(false)
    setLocationPopupLoading(false)
    setLocationPopupError(null)
    setLocationPopupLocation(null)
  }

  const openReportingLocationPopup = async () => {
    setLocationPopupOpen(true)
    setLocationPopupLoading(true)
    setLocationPopupError(null)
    setLocationPopupLocation(null)

    try {
      const { location } = await fetchTeamReportingLocation(teamId)
      setLocationPopupLoading(false)
      setLocationPopupLocation(location)
    } catch (err) {
      setLocationPopupLoading(false)
      setLocationPopupError(
        err instanceof Error ? err.message : 'Could not load the reporting location.'
      )
    }
  }

  const handleOpenEditLocation = () => {
    if (!team) return

    setLocationForm({
      panel_number: team.panel_number === null ? '' : String(team.panel_number),
      reporting_block: team.reporting_block ?? '',
      table_number: team.table_number === null ? '' : String(team.table_number),
    })
    setLocationFieldErrors({})
    setLocationFormError(null)
    setEditLocationOpen(true)
  }

  const handleSubmitLocation = (event: React.FormEvent) => {
    event.preventDefault()

    const validation = validateReportingLocation(locationForm)
    if (!validation.ok || !validation.value) {
      setLocationFieldErrors(validation.errors)
      return
    }

    setLocationFieldErrors({})
    setLocationFormError(null)
    setPendingLocation(validation.value)
    setLocationConfirmOpen(true)
  }

  const handleConfirmLocationSave = async () => {
    if (!pendingLocation) return

    setLocationSaving(true)
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/reporting-location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingLocation),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update the reporting location.')
      }

      setLocationConfirmOpen(false)
      setEditLocationOpen(false)
      setPendingLocation(null)
      setTeam((prev) =>
        prev ? { ...prev, ...(data.location ?? pendingLocation) } : prev
      )
      showToast('success', 'Reporting location updated successfully.')
      await fetchTeamDetails()
    } catch (err) {
      setLocationConfirmOpen(false)
      setLocationFormError(
        err instanceof Error ? err.message : 'Failed to update the reporting location.'
      )
    } finally {
      setLocationSaving(false)
    }
  }

  if (loading) {
    return <TeamDetailSkeleton />
  }

  if (error || !team) {
    return (
      <PageContainer
        title="Team Not Found"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Teams', href: '/admin/teams' },
          { label: 'Error' },
        ]}
      >
        <ErrorState
          title="Could not find team"
          message={error || 'The requested team does not exist or has been removed.'}
          onRetry={fetchTeamDetails}
        />
      </PageContainer>
    )
  }

  const isInternal = team.institution?.toLowerCase().includes('bennett') ?? false
  const displayName = team.team_name || team.project_title || `Team ${team.source_team_id}`

  return (
    <PageContainer
      title={displayName}
      description={`Team ID: ${team.source_team_id} · ${team.institution || 'Unknown Institution'}`}
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Teams', href: '/admin/teams' },
        { label: displayName },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/teams"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Directory</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Toast notification */}
        {toast && (
          <div
            className={cn(
              'fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-medium shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-5 duration-200 border',
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30 backdrop-blur-md'
                : 'bg-rose-950/90 text-rose-200 border-rose-500/30 backdrop-blur-md'
            )}
            role="status"
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* 1. Header Information Banner */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
            <div className="flex items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Users className="size-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {displayName}
                  </h1>
                  <span className="font-mono text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/25">
                    {team.source_team_id}
                  </span>
                  <StatusBadge
                    type="category"
                    category={isInternal ? 'internal' : 'external'}
                    size="sm"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    {isInternal ? (
                      <Building2 size={13} className="text-indigo-400" />
                    ) : (
                      <Globe size={13} className="text-rose-400" />
                    )}
                    {team.institution || '—'}
                  </span>
                  {team.project_domain && (
                    <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                      {team.project_domain}
                    </span>
                  )}
                  <span>
                    Team Size: <strong className="text-foreground">{team.team_size ?? students.length} members</strong>
                  </span>
                </div>
              </div>
            </div>
            {isSuperAdmin && (
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={handleOpenEditTeam}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-3.5 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all shadow-sm"
                >
                  <Pencil size={13} />
                  <span>Edit Team Details</span>
                </button>
              </div>
            )}
          </div>

          {/* Project & Leader Details Grid */}
          <div className="grid gap-6 md:grid-cols-2 pt-5">
            {/* Project Info */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Project & Mentor
              </h2>
              <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-2.5">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Project Title</span>
                  <span className="text-sm font-semibold text-foreground block">
                    {team.project_title || 'No project title specified'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Domain</span>
                    <span className="text-xs text-foreground font-medium block">
                      {team.project_domain || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Faculty / Mentor</span>
                    <span className="text-xs text-foreground font-medium block">
                      {team.faculty_mentor || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Leader Info */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Team Leader
              </h2>
              <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Leader Name</span>
                    <span className="text-sm font-semibold text-foreground block">
                      {team.leader_name || '—'}
                    </span>
                  </div>
                  {team.leader_enrollment_no && (
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground block">Enrollment</span>
                      <span className="font-mono text-xs text-cyan-400 font-medium block">
                        {team.leader_enrollment_no}
                      </span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40 text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Email</span>
                    {team.leader_email ? (
                      <a
                        href={`mailto:${team.leader_email}`}
                        className="text-foreground hover:text-cyan-400 transition-colors truncate block flex items-center gap-1"
                      >
                        <Mail size={12} className="text-muted-foreground shrink-0" />
                        <span className="truncate">{team.leader_email}</span>
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Mobile</span>
                    {team.leader_mobile ? (
                      <a
                        href={`tel:${team.leader_mobile}`}
                        className="text-foreground hover:text-cyan-400 transition-colors block flex items-center gap-1 font-mono"
                      >
                        <Phone size={12} className="text-muted-foreground shrink-0" />
                        <span>{team.leader_mobile}</span>
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 1b. Reporting Location */}
        <section
          aria-label="Reporting Location"
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col gap-3 pb-4 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <MapPin className="size-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                  Reporting Location
                </h2>
                <p className="text-xs text-muted-foreground">
                  Where this team must report for evaluation. Volunteers see this when the team is marked Reported.
                </p>
              </div>
            </div>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleOpenEditLocation}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20 shadow-sm"
              >
                <Pencil size={13} />
                <span>Edit Reporting Location</span>
              </button>
            )}
          </div>

          <div className="grid gap-3 pt-4 sm:grid-cols-3">
            <ReportingLocationTile
              icon={LayoutGrid}
              label="Panel Number"
              value={team.panel_number}
            />
            <ReportingLocationTile
              icon={MapPin}
              label="Reporting Block"
              value={team.reporting_block}
            />
            <ReportingLocationTile
              icon={Hash}
              label="Table Number"
              value={team.table_number}
            />
          </div>

          {hasCompleteReportingLocation(team) ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Direct this team to{' '}
              <strong className="text-foreground">{formatReportingLocation(team)}</strong>{' '}
              (Panel {team.panel_number}) for their evaluation.
            </p>
          ) : (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
              <AlertTriangle size={13} />
              Reporting location not assigned. Please contact the Super Admin.
            </p>
          )}
        </section>

        {/* 2. Three Independent Verification Controls */}
        <section aria-label="Verification Checkpoints" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Verification Controls
              </h2>
              <p className="text-xs text-muted-foreground">
                Three independent checkpoints. Modifying one verification status does not affect the other two.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Control A: Reported */}
            <div
              className={cn(
                'rounded-2xl border p-5 space-y-4 transition-all duration-200',
                verification.reported
                  ? 'border-emerald-500/30 bg-emerald-950/10 shadow-sm'
                  : 'border-border bg-card'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                      verification.reported
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    <ClipboardCheck className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Reported</h3>
                    <span className="text-[11px] text-muted-foreground">Venue arrival status</span>
                  </div>
                </div>
                <StatusBadge
                  type="verification"
                  field="reported"
                  verified={verification.reported}
                  size="sm"
                />
              </div>

              <div className="rounded-xl bg-background/50 p-3 text-xs space-y-1.5 border border-border/40">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Status:</span>
                  <span
                    className={cn(
                      'font-semibold',
                      verification.reported ? 'text-emerald-400' : 'text-muted-foreground'
                    )}
                  >
                    {verification.reported ? 'Reported (Present)' : 'Pending Arrival'}
                  </span>
                </div>
                {verification.reported && (
                  <>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Verified By:</span>
                      <span className="text-foreground font-mono truncate max-w-[170px]" title={verification.reported_by ?? ''}>
                        {verification.reported_by || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span className="text-foreground">{formatDateTime(verification.reported_at)}</span>
                    </div>
                  </>
                )}
              </div>

              <div>
                {verification.reported ? (
                  <button
                    type="button"
                    onClick={() => handleInitiateReversal('reported')}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    <span>Reverse Reported Status</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleInitiateVerify('reported')}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-50"
                  >
                    <Check size={14} className="stroke-[2.5]" />
                    <span>Verify Reported</span>
                  </button>
                )}
              </div>
            </div>

            {/* Control B: Photo ID Checked */}
            <div
              className={cn(
                'rounded-2xl border p-5 space-y-4 transition-all duration-200',
                verification.photo_id_checked
                  ? 'border-cyan-500/30 bg-cyan-950/10 shadow-sm'
                  : 'border-border bg-card'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                      verification.photo_id_checked
                        ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                        : 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    <Fingerprint className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Photo ID Checked</h3>
                    <span className="text-[11px] text-muted-foreground">Physical ID card check</span>
                  </div>
                </div>
                <StatusBadge
                  type="verification"
                  field="photo_id_checked"
                  verified={verification.photo_id_checked}
                  size="sm"
                />
              </div>

              <div className="rounded-xl bg-background/50 p-3 text-xs space-y-1.5 border border-border/40">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Status:</span>
                  <span
                    className={cn(
                      'font-semibold',
                      verification.photo_id_checked ? 'text-cyan-400' : 'text-muted-foreground'
                    )}
                  >
                    {verification.photo_id_checked ? 'ID Verified' : 'Pending ID Check'}
                  </span>
                </div>
                {verification.photo_id_checked && (
                  <>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Verified By:</span>
                      <span className="text-foreground font-mono truncate max-w-[170px]" title={verification.photo_id_checked_by ?? ''}>
                        {verification.photo_id_checked_by || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span className="text-foreground">{formatDateTime(verification.photo_id_checked_at)}</span>
                    </div>
                  </>
                )}
              </div>

              <div>
                {verification.photo_id_checked ? (
                  <button
                    type="button"
                    onClick={() => handleInitiateReversal('photo_id_checked')}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    <span>Reverse Photo ID Status</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleInitiateVerify('photo_id_checked')}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 py-2.5 text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-50"
                  >
                    <Check size={14} className="stroke-[2.5]" />
                    <span>Verify Photo ID</span>
                  </button>
                )}
              </div>
            </div>

            {/* Control C: NOC Received */}
            <div
              className={cn(
                'rounded-2xl border p-5 space-y-4 transition-all duration-200',
                verification.noc_received
                  ? 'border-amber-500/30 bg-amber-950/10 shadow-sm'
                  : 'border-border bg-card'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                      verification.noc_received
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    <FileCheck2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">NOC Received</h3>
                    <span className="text-[11px] text-muted-foreground">College clearance form</span>
                  </div>
                </div>
                <StatusBadge
                  type="verification"
                  field="noc_received"
                  verified={verification.noc_received}
                  size="sm"
                />
              </div>

              <div className="rounded-xl bg-background/50 p-3 text-xs space-y-1.5 border border-border/40">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Status:</span>
                  <span
                    className={cn(
                      'font-semibold',
                      verification.noc_received ? 'text-amber-400' : 'text-muted-foreground'
                    )}
                  >
                    {verification.noc_received ? 'NOC Cleared' : 'Pending NOC'}
                  </span>
                </div>
                {verification.noc_received && (
                  <>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Verified By:</span>
                      <span className="text-foreground font-mono truncate max-w-[170px]" title={verification.noc_received_by ?? ''}>
                        {verification.noc_received_by || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span className="text-foreground">{formatDateTime(verification.noc_received_at)}</span>
                    </div>
                  </>
                )}
              </div>

              <div>
                {verification.noc_received ? (
                  <button
                    type="button"
                    onClick={() => handleInitiateReversal('noc_received')}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    <span>Reverse NOC Status</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleInitiateVerify('noc_received')}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 py-2.5 text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-50"
                  >
                    <Check size={14} className="stroke-[2.5]" />
                    <span>Verify NOC</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Student/Member List */}
        <section aria-label="Student Members List" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Team Members ({students.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Registered students associated with this team project.
              </p>
            </div>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleOpenAddStudent}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-white transition-all shadow-sm"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            {students.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Users}
                  title="No Members Recorded"
                  description="No individual student members are registered for this team in the database."
                />
                {isSuperAdmin && (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={handleOpenAddStudent}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-white transition-all shadow-sm"
                    >
                      <Plus size={14} className="stroke-[2.5]" />
                      <span>Add First Member</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3.5 w-12 text-center">#</th>
                      <th className="px-4 py-3.5">Student Name</th>
                      <th className="px-4 py-3.5">Enrollment Number</th>
                      <th className="px-4 py-3.5">Role</th>
                      <th className="px-4 py-3.5">Email Address</th>
                      <th className="px-4 py-3.5">Mobile Number</th>
                      {isSuperAdmin && <th className="px-4 py-3.5 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {students.map((student, idx) => {
                      const isLeader =
                        student.role?.toLowerCase() === 'leader' ||
                        student.name?.toLowerCase() === team.leader_name?.toLowerCase()

                      return (
                        <tr key={student.id} className="transition-colors hover:bg-muted/30">
                          <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground text-center">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-sm">
                                {student.name}
                              </span>
                              {isLeader && (
                                <span className="rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400 border border-cyan-500/25">
                                  Leader
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                            {student.enrollment_no || '—'}
                          </td>
                          <td className="px-4 py-3.5 capitalize text-xs">
                            <span
                              className={cn(
                                'rounded-md px-2 py-0.5 font-medium',
                                isLeader
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {student.role || (isLeader ? 'Leader' : 'Member')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            {student.email ? (
                              <a
                                href={`mailto:${student.email}`}
                                className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                              >
                                <Mail size={12} className="text-muted-foreground/60 shrink-0" />
                                <span>{student.email}</span>
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                            {student.mobile ? (
                              <a
                                href={`tel:${student.mobile}`}
                                className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                              >
                                <Phone size={12} className="text-muted-foreground/60 shrink-0" />
                                <span>{student.mobile}</span>
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          {isSuperAdmin && (
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditStudent(student)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition"
                                  title="Edit member details"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteStudent(student)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition"
                                  title="Remove member"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* 4. Verification History Audit Trail */}
        <section aria-label="Verification Audit History" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <History size={16} />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Verification History
                </h2>
                <p className="text-xs text-muted-foreground">
                  Permanent audit log of all verification and reversal actions performed for this team.
                </p>
              </div>
            </div>

            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground border border-border">
              {activity.length} {activity.length === 1 ? 'event' : 'events'} recorded
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            {activity.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={History}
                  title="No History Recorded"
                  description="No verification or reversal events have been logged for this team yet."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3.5 w-16 text-center">Event</th>
                      <th className="px-4 py-3.5">Verification Checkpoint</th>
                      <th className="px-4 py-3.5">Action</th>
                      <th className="px-4 py-3.5">Admin Identity</th>
                      <th className="px-4 py-3.5">Date & Time</th>
                      <th className="px-4 py-3.5">Audit Reason / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {activity.map((log) => {
                      const isVerified = Boolean(log.new_value)
                      const isLocationUpdate = log.field_name === 'reporting_location'
                      const fieldCfg = fieldDisplayConfig[log.field_name as VerificationField]
                      const checkpointLabel = isLocationUpdate
                        ? 'Reporting Location'
                        : fieldCfg
                        ? fieldCfg.label
                        : log.field_name

                      return (
                        <tr key={log.event_no} className="transition-colors hover:bg-muted/30">
                          <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground text-center">
                            #{log.event_no}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-xs text-foreground">
                              {checkpointLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {isLocationUpdate ? (
                              <StatusBadge variant="info" size="sm">
                                Location Updated
                              </StatusBadge>
                            ) : (
                              <StatusBadge
                                type="action"
                                action={isVerified ? 'verified' : 'reversed'}
                                size="sm"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-foreground">
                            {log.admin_email || 'System'}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="px-4 py-3.5 text-xs max-w-xs">
                            {log.reason ? (
                              <span className="italic text-rose-300/90 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 block truncate">
                                {log.reason}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Confirmation Dialog with Reason Support */}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        onClose={() => setDialogState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        title={dialogState.title}
        description={dialogState.description}
        confirmText={dialogState.targetValue ? 'Confirm Verification' : 'Confirm Reversal'}
        variant={dialogState.variant}
        loading={actionLoading}
        requireReason={dialogState.requireReason}
        reasonLabel="Reversal Reason"
        reasonPlaceholder="State why you are reversing this status..."
      />

      {/* Edit Team Details Modal */}
      {editTeamOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Edit Team Details
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Team ID: {team.source_team_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTeamOpen(false)}
                disabled={editTeamLoading}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editTeamError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{editTeamError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={teamForm.team_name}
                    onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Institution *
                  </label>
                  <input
                    type="text"
                    required
                    value={teamForm.institution}
                    onChange={(e) => setTeamForm({ ...teamForm, institution: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Bennett University = Internal; other = External
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={teamForm.project_title}
                    onChange={(e) => setTeamForm({ ...teamForm, project_title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Project Domain
                  </label>
                  <input
                    type="text"
                    value={teamForm.project_domain}
                    onChange={(e) => setTeamForm({ ...teamForm, project_domain: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Faculty / Mentor
                  </label>
                  <input
                    type="text"
                    value={teamForm.faculty_mentor}
                    onChange={(e) => setTeamForm({ ...teamForm, faculty_mentor: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Team Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={teamForm.team_size}
                    onChange={(e) => setTeamForm({ ...teamForm, team_size: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Team Leader Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Leader Name
                    </label>
                    <input
                      type="text"
                      value={teamForm.leader_name}
                      onChange={(e) => setTeamForm({ ...teamForm, leader_name: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Leader Enrollment Number
                    </label>
                    <input
                      type="text"
                      value={teamForm.leader_enrollment_no}
                      onChange={(e) => setTeamForm({ ...teamForm, leader_enrollment_no: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-mono text-foreground focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Leader Email
                    </label>
                    <input
                      type="email"
                      value={teamForm.leader_email}
                      onChange={(e) => setTeamForm({ ...teamForm, leader_email: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Leader Mobile
                    </label>
                    <input
                      type="tel"
                      value={teamForm.leader_mobile}
                      onChange={(e) => setTeamForm({ ...teamForm, leader_mobile: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-mono text-foreground focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditTeamOpen(false)}
                  disabled={editTeamLoading}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editTeamLoading}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {editTeamLoading ? <LoadingSpinner size={14} className="text-white" /> : <Check size={14} />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Reporting Location Modal (Super Admin only) */}
      {editLocationOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-location-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="edit-location-title"
                    className="text-base font-semibold text-foreground"
                  >
                    Edit Reporting Location
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Team ID: {team.source_team_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditLocationOpen(false)}
                disabled={locationSaving}
                aria-label="Close edit reporting location"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {locationFormError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{locationFormError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitLocation} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reporting-panel-number"
                    className="block text-xs font-medium text-foreground mb-1"
                  >
                    Panel Number *
                  </label>
                  <input
                    id="reporting-panel-number"
                    type="number"
                    min={1}
                    max={99}
                    step={1}
                    required
                    value={locationForm.panel_number}
                    onChange={(e) =>
                      setLocationForm({ ...locationForm, panel_number: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-emerald-500"
                  />
                  {locationFieldErrors.panel_number && (
                    <p className="mt-1 text-[11px] text-rose-400">
                      {locationFieldErrors.panel_number}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="reporting-table-number"
                    className="block text-xs font-medium text-foreground mb-1"
                  >
                    Table Number *
                  </label>
                  <input
                    id="reporting-table-number"
                    type="number"
                    min={1}
                    max={999}
                    step={1}
                    required
                    value={locationForm.table_number}
                    onChange={(e) =>
                      setLocationForm({ ...locationForm, table_number: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-emerald-500"
                  />
                  {locationFieldErrors.table_number && (
                    <p className="mt-1 text-[11px] text-rose-400">
                      {locationFieldErrors.table_number}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="reporting-block"
                  className="block text-xs font-medium text-foreground mb-1"
                >
                  Reporting Block *
                </label>
                <input
                  id="reporting-block"
                  type="text"
                  required
                  maxLength={1}
                  value={locationForm.reporting_block}
                  onChange={(e) =>
                    setLocationForm({
                      ...locationForm,
                      reporting_block: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g. A"
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-mono uppercase text-foreground focus:outline-none focus:border-emerald-500"
                />
                {locationFieldErrors.reporting_block && (
                  <p className="mt-1 text-[11px] text-rose-400">
                    {locationFieldErrors.reporting_block}
                  </p>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Only these three reporting-location fields are saved. Team name, project
                details, verification checkpoints and attendance status are not modified.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditLocationOpen(false)}
                  disabled={locationSaving}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={locationSaving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  <Check size={14} />
                  <span>Review & Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Reporting Location Change */}
      <ConfirmDialog
        isOpen={locationConfirmOpen}
        onClose={() => setLocationConfirmOpen(false)}
        onConfirm={handleConfirmLocationSave}
        title="Save Reporting Location"
        description={
          pendingLocation
            ? `Update the reporting location for ${displayName}? ${describeReportingLocationChange(
                {
                  panel_number: team.panel_number ?? null,
                  reporting_block: team.reporting_block ?? null,
                  table_number: team.table_number ?? null,
                },
                pendingLocation
              )}. Only the reporting location will change.`
            : ''
        }
        confirmText="Save Location"
        variant="warning"
        loading={locationSaving}
      />

      {/* Add / Edit Student Modal */}
      {studentModalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  {studentModalMode === 'add' ? <Plus className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {studentModalMode === 'add' ? 'Add Team Member' : 'Edit Member Details'}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Team: {displayName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentModalMode(null)}
                disabled={studentFormLoading}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {studentFormError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{studentFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Student Name *
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Enrollment Number *
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.enrollment_no}
                  onChange={(e) => setStudentForm({ ...studentForm, enrollment_no: e.target.value })}
                  placeholder="e.g. E21CSEU001"
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-mono text-foreground focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Role
                </label>
                <select
                  value={studentForm.role}
                  onChange={(e) => setStudentForm({ ...studentForm, role: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-cyan-500"
                >
                  <option value="Member">Member</option>
                  <option value="Leader">Leader</option>
                  <option value="Presenter">Presenter</option>
                  <option value="Researcher">Researcher</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  placeholder="e.g. student@example.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={studentForm.mobile}
                  onChange={(e) => setStudentForm({ ...studentForm, mobile: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-mono text-foreground focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setStudentModalMode(null)}
                  disabled={studentFormLoading}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={studentFormLoading}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {studentFormLoading ? <LoadingSpinner size={14} className="text-white" /> : <Check size={14} />}
                  <span>{studentModalMode === 'add' ? 'Add Member' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reporting Location Popup (after a successful Reported checkpoint) */}
      <ReportingLocationPopup
        isOpen={locationPopupOpen}
        loading={locationPopupLoading}
        error={locationPopupError}
        team={team}
        location={locationPopupLocation}
        onClose={closeLocationPopup}
      />

      {/* Delete Member Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingStudent)}
        onClose={() => setDeletingStudent(null)}
        onConfirm={handleConfirmDeleteStudent}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${deletingStudent?.name} (${deletingStudent?.enrollment_no || 'No enrollment'}) from this team?`}
        confirmText="Remove Member"
        variant="destructive"
        loading={deleteStudentLoading}
      />
    </PageContainer>
  )
}
