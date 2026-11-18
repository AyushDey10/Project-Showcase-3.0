'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowUpDown,
  X,
  Eye,
  EyeOff,
  Layers,
  Building2,
  Globe,
  Lock,
  Edit,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react'
import { PageContainer } from '@/components/admin/page-container'
import { StatCard } from '@/components/admin/stat-card'
import { StatusBadge } from '@/components/admin/status-badge'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/admin/empty-state'
import { ErrorState } from '@/components/admin/error-state'
import type { AdminProfile } from '@/lib/auth/admin'

export interface AdminUserRecord {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'super_admin'
  desk: 'internal' | 'external' | null
  is_active: boolean
  created_at: string
}

interface AdminUsersProps {
  currentAdmin: AdminProfile
}

export type AdminFilterTab =
  | 'all'
  | 'admin'
  | 'super_admin'
  | 'internal'
  | 'external'
  | 'active'
  | 'inactive'

export function AdminUsers({ currentAdmin }: AdminUsersProps) {
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTab, setFilterTab] = useState<AdminFilterTab>('all')
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Create User Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formRole, setFormRole] = useState<'admin' | 'super_admin'>('admin')
  const [formDesk, setFormDesk] = useState<'internal' | 'external'>('internal')
  const [formActive, setFormActive] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Edit User Modal state
  const [editUser, setEditUser] = useState<AdminUserRecord | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<'admin' | 'super_admin'>('admin')
  const [editDesk, setEditDesk] = useState<'internal' | 'external'>('internal')
  const [editActive, setEditActive] = useState(true)
  const [editReason, setEditReason] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Confirmation dialog state for Quick Actions
  const [targetUser, setTargetUser] = useState<AdminUserRecord | null>(null)
  const [actionType, setActionType] = useState<
    'STATUS_CHANGE' | 'ACCESS_REMOVAL' | null
  >(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to fetch users (${res.status})`)
      }
      const data = await res.json()
      setUsers(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load administrator accounts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const stats = useMemo(() => {
    const total = users.length
    const superAdmins = users.filter((u) => u.role === 'super_admin').length
    const internalAdmins = users.filter((u) => u.role === 'admin' && u.desk === 'internal').length
    const externalAdmins = users.filter((u) => u.role === 'admin' && u.desk === 'external').length
    const active = users.filter((u) => u.is_active).length
    const inactive = total - active
    return { total, superAdmins, internalAdmins, externalAdmins, active, inactive }
  }, [users])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Filter Tab
      if (filterTab === 'admin' && u.role !== 'admin') return false
      if (filterTab === 'super_admin' && u.role !== 'super_admin') return false
      if (filterTab === 'internal' && (u.role !== 'admin' || u.desk !== 'internal')) return false
      if (filterTab === 'external' && (u.role !== 'admin' || u.desk !== 'external')) return false
      if (filterTab === 'active' && !u.is_active) return false
      if (filterTab === 'inactive' && u.is_active) return false

      // 2. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const match =
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.role?.toLowerCase().includes(q) ||
          u.desk?.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [users, filterTab, searchTerm])

  // Open Edit User Modal
  const openEditModal = (u: AdminUserRecord) => {
    setEditUser(u)
    setEditName(u.full_name || '')
    setEditRole(u.role)
    setEditDesk(u.desk === 'external' ? 'external' : 'internal')
    setEditActive(u.is_active)
    setEditReason('')
    setEditError(null)
  }

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setEditError(null)

    if (!editName.trim() || editName.trim().length < 2) {
      setEditError('Full name must be at least 2 characters.')
      return
    }

    if (!editReason.trim()) {
      setEditError('An audit justification is mandatory for administrator updates.')
      return
    }

    setEditLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editUser.id,
          fullName: editName.trim(),
          role: editRole,
          desk: editRole === 'admin' ? editDesk : null,
          isActive: editActive,
          reason: editReason.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update administrator.')
      }

      setFeedback({
        type: 'success',
        message: data.message || `Administrator ${editName.trim()} updated successfully.`,
      })
      setEditUser(null)
      fetchUsers()
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'An error occurred during update.')
    } finally {
      setEditLoading(false)
    }
  }

  // Handle Direct User Creation Form Submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    if (!formName.trim() || formName.trim().length < 2) {
      setCreateError('Please enter a valid full name (at least 2 characters).')
      return
    }

    if (!formEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim())) {
      setCreateError('Please enter a valid email address.')
      return
    }

    if (!formPassword || formPassword.length < 8) {
      setCreateError('Initial password must be at least 8 characters.')
      return
    }

    if (formRole === 'admin' && !formDesk) {
      setCreateError("Please select an assigned desk ('internal' or 'external') for regular admins.")
      return
    }

    setCreateLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formName.trim(),
          email: formEmail.trim(),
          password: formPassword,
          role: formRole,
          desk: formRole === 'admin' ? formDesk : null,
          isActive: formActive,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create administrator account.')
      }

      setFeedback({
        type: 'success',
        message: data.message || `Administrator ${formName.trim()} created successfully.`,
      })
      setCreateModalOpen(false)
      setFormName('')
      setFormEmail('')
      setFormPassword('')
      setFormRole('admin')
      setFormDesk('internal')
      setFormActive(true)
      fetchUsers()
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'An error occurred during account creation.')
    } finally {
      setCreateLoading(false)
    }
  }

  // Handle Confirm Action (Deactivate / Reactivate / Access Removal)
  const handleConfirmAction = async (reason?: string) => {
    if (!targetUser || !actionType) return

    setActionLoading(true)
    setFeedback(null)

    try {
      let payload: Record<string, unknown>

      if (actionType === 'ACCESS_REMOVAL') {
        payload = {
          userId: targetUser.id,
          actionTypeOverride: 'ACCESS_REMOVAL',
          reason,
        }
      } else {
        payload = {
          userId: targetUser.id,
          isActive: !targetUser.is_active,
          reason,
        }
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update administrator account.')
      }

      setFeedback({
        type: 'success',
        message: data.message || 'Administrator account updated successfully.',
      })

      setTargetUser(null)
      setActionType(null)
      fetchUsers()
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update administrator.',
      })
      setTargetUser(null)
      setActionType(null)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <PageContainer
      title="Admin Management"
      description="Manage administrator credentials, desk assignments, and account permissions. Restricted to Super Admins."
      actions={
        <button
          onClick={() => {
            setCreateError(null)
            setCreateModalOpen(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 transition shadow-sm hover:shadow-cyan-500/20"
        >
          <UserPlus className="w-4 h-4" />
          Add Administrator
        </button>
      }
    >
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in slide-in-from-top-1 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards — skeleton tiles until the account list actually arrives */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-busy={loading}>
        {loading && users.length === 0 ? (
          Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={`stat-skeleton-${index}`} lines={1} />
          ))
        ) : (
          <>
            <StatCard
              label="Total Admins"
              value={stats.total}
              iconName="users"
              color="cyan"
              subtext="Configured staff"
            />
            <StatCard
              label="Super Admins"
              value={stats.superAdmins}
              iconName="shieldAlert"
              color="violet"
              subtext="Unrestricted access"
            />
            <StatCard
              label="Internal Desk"
              value={stats.internalAdmins}
              iconName="buildingComplex"
              color="cyan"
              subtext="Bennett University"
            />
            <StatCard
              label="External Desk"
              value={stats.externalAdmins}
              iconName="globe"
              color="amber"
              subtext="Other institutions"
            />
          </>
        )}
      </div>

      {/* Search and Table Container */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm space-y-4">
        {/* Top Controls: Search & Segmented Filter Tabs */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, role, or desk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/40 text-xs font-medium text-slate-300 hover:text-cyan-400 hover:border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/60">
          {(
            [
              { id: 'all', label: `All Admins (${stats.total})` },
              { id: 'super_admin', label: `Super Admins (${stats.superAdmins})` },
              { id: 'admin', label: `Regular Admins (${stats.internalAdmins + stats.externalAdmins})` },
              { id: 'internal', label: `Internal Desk (${stats.internalAdmins})` },
              { id: 'external', label: `External Desk (${stats.externalAdmins})` },
              { id: 'active', label: `Active (${stats.active})` },
              { id: 'inactive', label: `Inactive (${stats.inactive})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterTab === tab.id
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* User Table */}
        {loading && users.length === 0 ? (
          <SkeletonTable columns={6} rows={4} className="border-border/60" />
        ) : error ? (
          <ErrorState
            title="Failed to Load Administrators"
            message={error}
            onRetry={fetchUsers}
          />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No Administrators Found"
            description={
              searchTerm || filterTab !== 'all'
                ? `No accounts matched the current search or filters.`
                : 'No administrator accounts registered yet.'
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase font-medium text-slate-400 border-b border-slate-800/80">
                <tr>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned Desk</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredUsers.map((user) => {
                  const isCurrent = user.id === currentAdmin.id
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-sm font-semibold text-cyan-400 shrink-0">
                            {user.full_name?.charAt(0)?.toUpperCase() || 'A'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-200 flex items-center gap-2">
                              {user.full_name}
                              {isCurrent && (
                                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="font-mono">{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge type="role" role={user.role} />
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge type="desk" desk={user.desk} role={user.role} />
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge type="account" active={user.is_active} />
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>
                            {new Date(user.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Edit Administrator Button */}
                          <button
                            onClick={() => openEditModal(user)}
                            title="Edit Administrator Profile & Permissions"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-700/80 bg-slate-800/40 text-xs font-medium text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* Quick Status Toggle Action */}
                          {!isCurrent && (
                            <button
                              onClick={() => {
                                setTargetUser(user)
                                setActionType('STATUS_CHANGE')
                              }}
                              title={user.is_active ? 'Deactivate account' : 'Reactivate account'}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition ${
                                user.is_active
                                  ? 'border-rose-900/60 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40 hover:border-rose-700/60'
                                  : 'border-emerald-900/60 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-700/60'
                              }`}
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Reactivate</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Safe Access Removal Action */}
                          {!isCurrent && user.is_active && (
                            <button
                              onClick={() => {
                                setTargetUser(user)
                                setActionType('ACCESS_REMOVAL')
                              }}
                              title="Revoke all administrative access safely"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-800 bg-slate-950/60 text-xs font-medium text-slate-400 hover:text-rose-400 hover:border-rose-800/50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="sr-only sm:not-sr-only">Revoke</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Admin Modal */}
      {editUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl shadow-cyan-950/30 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    Edit Administrator
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {editUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditUser(null)}
                disabled={editLoading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Role Tier</span>
                  {editUser.id === currentAdmin.id && (
                    <span className="text-[11px] text-amber-400">
                      Cannot change own role (Self-modification prevented)
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={editUser.id === currentAdmin.id}
                    onClick={() => setEditRole('admin')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 disabled:opacity-50 ${
                      editRole === 'admin'
                        ? 'border-cyan-500/60 bg-cyan-950/30 text-cyan-200'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      Regular Admin
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Scoped to one desk.
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={editUser.id === currentAdmin.id}
                    onClick={() => setEditRole('super_admin')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 disabled:opacity-50 ${
                      editRole === 'super_admin'
                        ? 'border-violet-500/60 bg-violet-950/30 text-violet-200'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <ShieldAlert className="w-3.5 h-3.5 text-violet-400" />
                      Super Admin
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Full access across all desks.
                    </span>
                  </button>
                </div>
              </div>

              {/* Desk Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Assigned Desk</span>
                  {editRole === 'super_admin' && (
                    <span className="text-[11px] text-violet-400 font-normal">
                      N/A — Super Admin has access to all desks
                    </span>
                  )}
                </label>

                {editRole === 'admin' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={editUser.id === currentAdmin.id}
                      onClick={() => setEditDesk('internal')}
                      className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 disabled:opacity-50 ${
                        editDesk === 'internal'
                          ? 'border-cyan-500/60 bg-cyan-950/30 text-cyan-200'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                        Internal Desk
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Bennett University teams only.
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={editUser.id === currentAdmin.id}
                      onClick={() => setEditDesk('external')}
                      className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 disabled:opacity-50 ${
                        editDesk === 'external'
                          ? 'border-amber-500/60 bg-amber-950/30 text-amber-200'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <Globe className="w-3.5 h-3.5 text-amber-400" />
                        External Desk
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Other institutions only.
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-500 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unrestricted desk coverage. Desk is stored as NULL for Super Admins.</span>
                  </div>
                )}
              </div>

              {/* Active Status */}
              <div>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/50 cursor-pointer hover:bg-slate-950 transition">
                  <input
                    type="checkbox"
                    checked={editActive}
                    disabled={editUser.id === currentAdmin.id}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Account Active & Enabled
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Uncheck to immediately suspend administrative sign-in access.
                    </span>
                  </div>
                </label>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Audit Justification (Mandatory)
                </label>
                <textarea
                  required
                  rows={2}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="State the administrative reason for this profile / role / desk change..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  disabled={editLoading}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 disabled:opacity-50 transition"
                >
                  {editLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Add Admin Modal */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl shadow-cyan-950/30 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    Add Administrator
                  </h3>
                  <p className="text-xs text-slate-400">
                    Create credentials directly without requiring email invitations.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                disabled={createLoading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. John Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@bennett.edu.in"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Initial Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  The admin will sign in with this password immediately. Passwords are never logged or stored plaintext.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Role Tier
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormRole('admin')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      formRole === 'admin'
                        ? 'border-cyan-500/60 bg-cyan-950/30 text-cyan-200'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      Regular Admin
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Scoped to one desk (Internal or External).
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormRole('super_admin')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      formRole === 'super_admin'
                        ? 'border-violet-500/60 bg-violet-950/30 text-violet-200'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <ShieldAlert className="w-3.5 h-3.5 text-violet-400" />
                      Super Admin
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Full access across all desks & user administration.
                    </span>
                  </button>
                </div>
              </div>

              {/* Desk Assignment */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Assigned Desk</span>
                  {formRole === 'super_admin' && (
                    <span className="text-[11px] text-violet-400 font-normal">
                      N/A — Super Admin has access to all desks
                    </span>
                  )}
                </label>

                {formRole === 'admin' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormDesk('internal')}
                      className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                        formDesk === 'internal'
                          ? 'border-cyan-500/60 bg-cyan-950/30 text-cyan-200'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                        Internal Desk
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Bennett University teams only.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormDesk('external')}
                      className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                        formDesk === 'external'
                          ? 'border-amber-500/60 bg-amber-950/30 text-amber-200'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <Globe className="w-3.5 h-3.5 text-amber-400" />
                        External Desk
                      </div>
                      <span className="text-[11px] text-slate-400">
                        All other institutions only.
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-500 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unrestricted desk coverage. Super Admins monitor both desks simultaneously.</span>
                  </div>
                )}
              </div>

              {/* Account Permission Status */}
              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/50 cursor-pointer hover:bg-slate-950 transition">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Enable sign-in access immediately
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Uncheck to create in deactivated state (access suspended).
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={createLoading}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 disabled:opacity-50 transition"
                >
                  {createLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      Create Administrator
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Quick Actions (Deactivate / Reactivate / Revoke Access) */}
      {targetUser && actionType && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => {
            setTargetUser(null)
            setActionType(null)
          }}
          onConfirm={handleConfirmAction}
          loading={actionLoading}
          variant="destructive"
          title={
            actionType === 'ACCESS_REMOVAL'
              ? `Revoke Access for ${targetUser.full_name}?`
              : targetUser.is_active
                ? `Deactivate ${targetUser.full_name}?`
                : `Reactivate ${targetUser.full_name}?`
          }
          description={
            actionType === 'ACCESS_REMOVAL'
              ? `This will permanently revoke all administrative privileges for ${targetUser.email} and deactivate their account. Their historical verification actions and audit trail will remain completely intact.`
              : targetUser.is_active
                ? `Deactivating this administrator will revoke all dashboard and verification access immediately.`
                : `Reactivating this administrator will restore their assigned workspace access.`
          }
          confirmText={
            actionType === 'ACCESS_REMOVAL'
              ? 'Revoke Access'
              : targetUser.is_active
                ? 'Deactivate Account'
                : 'Reactivate Account'
          }
          requireReason={true}
          reasonLabel="Audit Explanation (Mandatory)"
          reasonPlaceholder="Enter the administrative justification for this action..."
        />
      )}
    </PageContainer>
  )
}
