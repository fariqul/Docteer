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
        'bg-white rounded-2xl border border-surface-200 shadow-card',
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
  <div className={cn('flex items-center justify-between mb-4', className)}>
    <div>
      <h3 className="text-title text-surface-800">{title}</h3>
      {subtitle && <p className="text-sm text-surface-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
)
