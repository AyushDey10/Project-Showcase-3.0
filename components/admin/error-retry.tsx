'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorState } from '@/components/admin/error-state'

/**
 * Error panel for server-rendered sections: "Try Again" re-runs the server
 * component (router.refresh) instead of leaving a dead end.
 */
export function ErrorRetry({
  title,
  message,
}: {
  title?: string
  message: string
}) {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)

  return (
    <ErrorState
      title={title}
      message={message}
      isRetrying={retrying}
      onRetry={() => {
        setRetrying(true)
        router.refresh()
        setTimeout(() => setRetrying(false), 4000)
      }}
    />
  )
}
