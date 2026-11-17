'use client'

import React from 'react'
import {
  LucideIcon,
  TrendingUp,
  TrendingDown,
  Users,
  GraduationCap,
  ClipboardCheck,
  Fingerprint,
  FileCheck2,
  Building2,
  Globe,
  ShieldAlert,
  UserCheck,
  UserX,
  Activity,
  Layers,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatCardColor = 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate'

export type StatCardIconName =
  | 'users'
  | 'graduation-cap'
  | 'graduationCap'
  | 'clipboard-check'
  | 'clipboardCheck'
  | 'fingerprint'
  | 'fingerprint-pattern'
  | 'fingerprintPattern'
  | 'file-check'
  | 'file-check-2'
  | 'fileCheck'
  | 'fileCheck2'
  | 'fileCheckCorner'
  | 'building'
  | 'building-2'
  | 'building2'
  | 'buildingComplex'
  | 'globe'
  | 'shield-alert'
  | 'shieldAlert'
  | 'user-check'
  | 'userCheck'
  | 'user-x'
  | 'userX'
  | 'activity'
  | string

const STAT_CARD_ICONS: Record<string, LucideIcon> = {
  users: Users,
  'graduation-cap': GraduationCap,
  graduationcap: GraduationCap,
  'clipboard-check': ClipboardCheck,
  clipboardcheck: ClipboardCheck,
  fingerprint: Fingerprint,
  'fingerprint-pattern': Fingerprint,
  fingerprintpattern: Fingerprint,
  'file-check': FileCheck2,
  'file-check-2': FileCheck2,
  filecheck: FileCheck2,
  filecheck2: FileCheck2,
  filecheckcorner: FileCheck2,
  building: Building2,
  'building-2': Building2,
  building2: Building2,
  buildingcomplex: Building2,
  globe: Globe,
  'shield-alert': ShieldAlert,
  shieldalert: ShieldAlert,
  'user-check': UserCheck,
  usercheck: UserCheck,
  'user-x': UserX,
  userx: UserX,
  activity: Activity,
  layers: Layers,
  default: HelpCircle,
}

export interface StatCardProps {
  label: string
  value: number | string
  subtext?: string
  icon?: LucideIcon
  iconName?: StatCardIconName
  color?: StatCardColor
  trend?: {
    value: string
    isPositive?: boolean
    label?: string
  }
  loading?: boolean
  className?: string
  onClick?: () => void
}

const colorStyles: Record<
  StatCardColor,
  {
    iconWrapper: string
    iconColor: string
    accentGlow: string
  }
> = {
  cyan: {
    iconWrapper: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    iconColor: 'text-cyan-400',
    accentGlow: 'hover:border-cyan-500/30',
  },
  violet: {
    iconWrapper: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    iconColor: 'text-violet-400',
    accentGlow: 'hover:border-violet-500/30',
  },
  emerald: {
    iconWrapper: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    iconColor: 'text-emerald-400',
    accentGlow: 'hover:border-emerald-500/30',
  },
  amber: {
    iconWrapper: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    iconColor: 'text-amber-400',
    accentGlow: 'hover:border-amber-500/30',
  },
  rose: {
    iconWrapper: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    iconColor: 'text-rose-400',
    accentGlow: 'hover:border-rose-500/30',
  },
  indigo: {
    iconWrapper: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    iconColor: 'text-indigo-400',
    accentGlow: 'hover:border-indigo-500/30',
  },
  slate: {
    iconWrapper: 'bg-muted/80 text-foreground border border-border',
    iconColor: 'text-muted-foreground',
    accentGlow: 'hover:border-border/80',
  },
}

export function StatCard({
  label,
  value,
  subtext,
  icon: IconProp,
  iconName,
  color = 'cyan',
  trend,
  loading = false,
  className,
  onClick,
}: StatCardProps) {
  const styles = colorStyles[color]
  const Icon = iconName
    ? STAT_CARD_ICONS[iconName.toLowerCase()] ?? IconProp
    : IconProp

  if (loading) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border bg-card p-5 animate-pulse',
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="size-10 rounded-xl bg-muted" />
          <div className="h-4 w-12 rounded bg-muted" />
        </div>
        <div className="h-8 w-24 rounded bg-muted mb-2" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>
    )
  }

  const isClickable = Boolean(onClick)

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-200',
        styles.accentGlow,
        isClickable && 'cursor-pointer hover:bg-card/80 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        {Icon && (
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105',
              styles.iconWrapper
            )}
          >
            <Icon className={cn('size-5', styles.iconColor)} aria-hidden="true" />
          </div>
        )}
        {trend && (
          <div
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
              trend.isPositive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-rose-500/10 text-rose-400'
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            <span>{trend.value}</span>
          </div>
        )}
      </div>

      <div className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      <div className="mt-1 text-sm font-medium text-foreground/90">{label}</div>

      {subtext && (
        <div className="mt-1 text-xs text-muted-foreground">{subtext}</div>
      )}
    </div>
  )
}
