'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageContainerProps {
  children: React.ReactNode
  title?: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

export function PageContainer({
  children,
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageContainerProps) {
  const hasHeader = Boolean(title || description || breadcrumbs || actions)

  return (
    <div className={cn('space-y-6', className)}>
      {hasHeader && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-5">
          <div className="space-y-1.5 min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Link
                  href="/admin"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Home className="size-3.5" />
                  <span className="sr-only">Admin</span>
                </Link>
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1
                  return (
                    <React.Fragment key={crumb.label + idx}>
                      <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
                      {crumb.href && !isLast ? (
                        <Link
                          href={crumb.href}
                          className="hover:text-foreground transition-colors truncate max-w-[200px]"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className={cn('truncate max-w-[240px]', isLast ? 'text-foreground font-medium' : '')}>
                          {crumb.label}
                        </span>
                      )}
                    </React.Fragment>
                  )
                })}
              </nav>
            )}

            {title && (
              <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">
                {title}
              </h1>
            )}

            {description && (
              <p className="text-sm text-muted-foreground max-w-3xl">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              {actions}
            </div>
          )}
        </div>
      )}

      <div>{children}</div>
    </div>
  )
}
