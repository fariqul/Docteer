import React from 'react'
import { cn } from '../../lib/utils'

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  emptyMessage?: string
  isLoading?: boolean
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'Tidak ada data',
  isLoading = false,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-2xl border border-surface-200 overflow-hidden', className)}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left text-label text-surface-500 font-medium">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-surface-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-5 bg-surface-100 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={cn('bg-white rounded-2xl border border-surface-200 p-12 text-center', className)}>
        <p className="text-surface-400 text-body-lg">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('bg-white rounded-2xl border border-surface-200 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-100 bg-surface-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('px-4 py-3 text-left text-label text-surface-500 font-medium', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  'border-b border-surface-50 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-primary-50/50'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-body', col.className)}>
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
