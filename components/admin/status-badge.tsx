'use client'

import React from 'react'
import {
  Check,
  X,
  Shield,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Building2,
  Globe,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusBadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'violet'
  | 'cyan'
  | 'neutral'

export type StatusBadgeSize = 'sm' | 'md' | 'lg'

interface BaseStatusBadgeProps {
  className?: string
  size?: StatusBadgeSize
  dot?: boolean
  children?: React.ReactNode
}

interface GenericStatusBadgeProps extends BaseStatusBadgeProps {
  type?: 'generic'
  variant?: StatusBadgeVariant
  icon?: React.ReactNode
}

interface VerificationBadgeProps extends BaseStatusBadgeProps {
  type: 'verification'
  field: 'reported' | 'photo_id_checked' | 'noc_received'
  verified: boolean
  label?: string
  /** Renders "Not Required" instead of a Pending state (e.g. NOC for internal teams). */
  notRequired?: boolean
}

interface RoleBadgeProps extends BaseStatusBadgeProps {
  type: 'role'
  role: 'admin' | 'super_admin' | string
}

interface DeskBadgeProps extends BaseStatusBadgeProps {
  type: 'desk'
  desk?: 'internal' | 'external' | string | null
  role?: 'admin' | 'super_admin' | string
}

interface AccountStatusBadgeProps extends BaseStatusBadgeProps {
  type: 'account'
  active: boolean
}

interface CategoryBadgeProps extends BaseStatusBadgeProps {
  type: 'category'
  category?: 'internal' | 'external' | string | null
}

interface ActionBadgeProps extends BaseStatusBadgeProps {
  type: 'action'
  action: 'verified' | 'reversed' | 'role_change' | 'reactivate' | 'deactivate' | 'desk_change' | string
}

export type StatusBadgeProps =
  | GenericStatusBadgeProps
  | VerificationBadgeProps
  | RoleBadgeProps
  | DeskBadgeProps
  | AccountStatusBadgeProps
  | CategoryBadgeProps
  | ActionBadgeProps

const variantClasses: Record<StatusBadgeVariant, { container: string; dot: string; icon: string }> = {
  success: {
    container: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15',
    dot: 'bg-emerald-400',
    icon: 'text-emerald-400',
  },
  warning: {
    container: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15',
    dot: 'bg-amber-400',
    icon: 'text-amber-400',
  },
  error: {
    container: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/15',
    dot: 'bg-rose-400',
    icon: 'text-rose-400',
  },
  info: {
    container: 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/15',
    dot: 'bg-sky-400',
    icon: 'text-sky-400',
  },
  cyan: {
    container: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/15',
    dot: 'bg-cyan-400',
    icon: 'text-cyan-400',
  },
  violet: {
    container: 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/15',
    dot: 'bg-violet-400',
    icon: 'text-violet-400',
  },
  neutral: {
    container: 'bg-muted/60 text-muted-foreground border-border hover:bg-muted',
    dot: 'bg-muted-foreground',
    icon: 'text-muted-foreground',
  },
}

const sizeClasses: Record<StatusBadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] gap-1.5',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
}

export function StatusBadge(props: StatusBadgeProps) {
  const { size = 'md', dot = false, className } = props

  // Resolve config based on badge type
  let variant: StatusBadgeVariant = 'neutral'
  let label: React.ReactNode = props.children
  let icon: React.ReactNode = null

  if (props.type === 'verification') {
    const fieldNames: Record<string, string> = {
      reported: 'Reported',
      photo_id_checked: 'Identity (ID Card)',
      noc_received: 'NOC Verification',
    }
    const defaultLabel = fieldNames[props.field] ?? props.field
    if (props.notRequired) {
      variant = 'neutral'
      label = 'Not Required'
      icon = <AlertCircle className="size-3 shrink-0" />
    } else if (props.verified) {
      variant = 'success'
      label = props.label ?? defaultLabel
      icon = <Check className="size-3 shrink-0 stroke-[2.5]" />
    } else {
      variant = 'neutral'
      label = props.label ?? `Pending ${defaultLabel}`
      icon = <X className="size-3 shrink-0 opacity-60" />
    }
  } else if (props.type === 'role') {
    if (props.role === 'super_admin') {
      variant = 'violet'
      label = 'Super Admin'
      icon = <ShieldCheck className="size-3 shrink-0" />
    } else {
      variant = 'cyan'
      label = 'Admin'
      icon = <Shield className="size-3 shrink-0" />
    }
  } else if (props.type === 'desk') {
    if (props.role === 'super_admin') {
      variant = 'success'
      label = 'All Desks'
      icon = <Layers className="size-3 shrink-0" />
    } else if (props.desk === 'internal') {
      variant = 'cyan'
      label = 'Internal Desk'
      icon = <Building2 className="size-3 shrink-0" />
    } else if (props.desk === 'external') {
      variant = 'violet'
      label = 'External Desk'
      icon = <Globe className="size-3 shrink-0" />
    } else {
      variant = 'neutral'
      label = 'Unassigned'
      icon = <AlertCircle className="size-3 shrink-0" />
    }
  } else if (props.type === 'account') {
    if (props.active) {
      variant = 'success'
      label = 'Active'
      icon = <UserCheck className="size-3 shrink-0" />
    } else {
      variant = 'error'
      label = 'Deactivated'
      icon = <AlertCircle className="size-3 shrink-0" />
    }
  } else if (props.type === 'category') {
    const category = (props.category ?? '').toLowerCase()

    if (!category) {
      variant = 'neutral'
      label = 'Unclassified'
      icon = <AlertCircle className="size-3 shrink-0" />
    } else if (
      category.includes('internal') ||
      category.includes('bennett')
    ) {
      variant = 'cyan'
      label = 'Internal'
      icon = <Building2 className="size-3 shrink-0" />
    } else {
      variant = 'violet'
      label = 'External'
      icon = <Globe className="size-3 shrink-0" />
    }
  } else if (props.type === 'action') {
    const actionKey = props.action.toLowerCase()
    if (actionKey === 'verified' || actionKey === 'reactivate') {
      variant = 'success'
      label = actionKey === 'verified' ? 'Verified' : 'Reactivated'
      icon = <Check className="size-3 shrink-0 stroke-[2.5]" />
    } else if (actionKey === 'reversed' || actionKey === 'deactivate') {
      variant = 'error'
      label = actionKey === 'reversed' ? 'Reversed' : 'Deactivated'
      icon = <X className="size-3 shrink-0" />
    } else if (actionKey === 'role_change') {
      variant = 'violet'
      label = 'Role Changed'
      icon = <Shield className="size-3 shrink-0" />
    } else if (actionKey === 'desk_change') {
      variant = 'cyan'
      label = 'Desk Changed'
      icon = <Layers className="size-3 shrink-0" />
    } else {
      variant = 'info'
      label = props.action
    }
  } else {
    variant = props.variant ?? 'neutral'
    icon = props.icon ?? null
  }

  const vConfig = variantClasses[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium tracking-wide border transition-colors select-none',
        vConfig.container,
        sizeClasses[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn('size-1.5 rounded-full shrink-0', vConfig.dot)}
          aria-hidden="true"
        />
      )}
      {icon && <span className={cn('inline-flex shrink-0', vConfig.icon)}>{icon}</span>}
      <span className="truncate">{label}</span>
    </span>
  )
}
