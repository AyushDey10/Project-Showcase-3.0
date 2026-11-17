'use client'

import React from 'react'
import {
  LucideIcon,
  Inbox,
  Activity,
  Users,
  Search,
  Shield,
  FileText,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const EMPTY_STATE_ICON_MAP: Record<string, LucideIcon> = {
  inbox: Inbox,
  activity: Activity,
  users: Users,
  search: Search,
  shield: Shield,
  'file-text': FileText,
  filetext: FileText,
  alert: AlertTriangle,
  'alert-triangle': AlertTriangle,
  folder: FolderOpen,
}

export interface EmptyStateProps {
  icon?: LucideIcon
  iconName?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: IconProp,
  iconName,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Icon = iconName
    ? EMPTY_STATE_ICON_MAP[iconName.toLowerCase()] ?? IconProp ?? Inbox
    : IconProp ?? Inbox

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 py-16 px-6 text-center',
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/80 border border-border text-muted-foreground mb-4">
        <Icon className="size-6 stroke-[1.5]" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-foreground tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
