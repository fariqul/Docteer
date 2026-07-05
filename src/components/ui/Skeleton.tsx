import React from 'react'
import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circle' | 'rect' | 'card'
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'text' }) => {
  const variants = {
    text: 'h-4 w-3/4 rounded',
    circle: 'h-10 w-10 rounded-full',
    rect: 'h-20 w-full rounded-xl',
    card: 'h-32 w-full rounded-2xl',
  }

  return (
    <div className={cn('bg-surface-200 animate-pulse', variants[variant], className)} />
  )
}

export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-3">
    <Skeleton className="h-5 w-1/3" />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-1/2' : 'w-full')} />
    ))}
  </div>
)

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
  <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
    <div className="border-b border-surface-100 bg-surface-50 px-4 py-3 flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="border-b border-surface-50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
)
