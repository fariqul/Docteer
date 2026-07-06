import React from 'react'
import { useToastStore } from '../../stores'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info
        let colorClasses = 'bg-blue-50/95 text-blue-800 border-blue-200 shadow-blue-100/50'
        
        if (toast.type === 'success') {
          Icon = CheckCircle2
          colorClasses = 'bg-emerald-50/95 text-emerald-800 border-emerald-200 shadow-emerald-100/50'
        } else if (toast.type === 'error') {
          Icon = XCircle
          colorClasses = 'bg-rose-50/95 text-rose-800 border-rose-200 shadow-rose-100/50'
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle
          colorClasses = 'bg-amber-50/95 text-amber-800 border-amber-200 shadow-amber-100/50'
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-md animate-slide-in transition-all ${colorClasses}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-semibold leading-relaxed">{toast.message}</div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
