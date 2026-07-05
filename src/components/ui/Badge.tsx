import React from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'accent' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
  dot?: boolean
  pulse?: boolean
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  pulse = false,
  className,
}) => {
  const variants = {
    default: 'bg-surface-100 text-surface-600',
    primary: 'bg-primary-100 text-primary-700',
    accent: 'bg-accent-100 text-accent-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-cyan-100 text-cyan-700',
    purple: 'bg-purple-100 text-purple-700',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                variant === 'danger' ? 'bg-red-400' : variant === 'warning' ? 'bg-amber-400' : 'bg-primary-400'
              )}
            />
          )}
          <span
            className={cn(
              'relative inline-flex rounded-full h-2 w-2',
              variant === 'danger' ? 'bg-red-500' : variant === 'warning' ? 'bg-amber-500' : variant === 'accent' ? 'bg-accent-500' : 'bg-primary-500'
            )}
          />
        </span>
      )}
      {children}
    </span>
  )
}
