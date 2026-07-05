import React from 'react'
import { useEffect } from 'react'
import { useUIStore } from '../../stores'

export const ConnectionBanner: React.FC = () => {
  const { isOnline, setOnline } = useUIStore()

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  if (isOnline) return null

  return (
    <div className="connection-banner offline" role="alert">
      <div className="flex items-center justify-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="font-semibold">Koneksi Terputus</span>
        <span>— Data disimpan sementara secara lokal dan akan disinkronkan otomatis saat koneksi kembali.</span>
      </div>
    </div>
  )
}
