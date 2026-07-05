import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '../ui'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-title text-surface-800 mb-2">Terjadi Kesalahan</h2>
            <p className="text-surface-500 mb-6">
              Maaf, terjadi kesalahan yang tidak terduga. Silakan muat ulang halaman.
            </p>
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
              leftIcon={<RefreshCw size={18} />}
            >
              Muat Ulang
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
