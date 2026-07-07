import React from 'react'
import { cn } from '../../lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  hoverable = false,
  padding = 'md',
}) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-surface-200 shadow-card min-w-0',
        paddings[padding],
        hoverable && 'cursor-pointer hover:shadow-card-hover hover:border-primary-200 transition-all duration-200',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, className }) => (
  <div className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4', className)}>
    <div className="min-w-0 w-full">
      <h3 className="text-title text-surface-800 truncate">{title}</h3>
      {subtitle && <p className="text-sm text-surface-500 mt-0.5 truncate">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">{action}</div>}
  </div>
)
