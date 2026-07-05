import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getDepartmentLabel } from '../../lib/utils'
import type { Queue } from '../../types/database'

const departmentMap: Record<string, string> = {
  tensi: 'triage',
  lab: 'lab',
  'poli-umum': 'poli_umum',
  'poli-gigi': 'poli_gigi',
  farmasi: 'pharmacy',
}

export const DisplayMonitor: React.FC = () => {
  const { room } = useParams<{ room: string }>()
  const department = departmentMap[room || ''] || 'triage'
  const [currentQueue, setCurrentQueue] = useState<Queue | null>(null)
  const [waitingList, setWaitingList] = useState<Queue[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  
  // Custom display settings states
  const [displayTitle, setDisplayTitle] = useState('')
  const [customBgColor, setCustomBgColor] = useState('')
  const [runningText, setRunningText] = useState('Selamat datang di Docteer Clinic — Bakti Sosial Puskesmas oleh Mahasiswa Kedokteran')

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Online/Offline
  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Fetch queue data and screen configuration
  useEffect(() => {
    fetchQueueData()
    fetchDisplaySettings()

    // Supabase Realtime subscription
    const channel = supabase
      .channel(`display-${department}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queues', filter: `department=eq.${department}` },
        () => {
          fetchQueueData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'display_settings', filter: `department=eq.${department}` },
        () => {
          fetchDisplaySettings()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'running_texts', filter: `department=eq.${department}` },
        () => {
          fetchDisplaySettings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [department])

  const fetchDisplaySettings = async () => {
    try {
      const { data: display } = await supabase
        .from('display_settings')
        .select('*')
        .eq('department', department)
        .maybeSingle()

      if (display) {
        if (display.logo_url) setDisplayTitle(display.logo_url)
        if (display.background_color) setCustomBgColor(display.background_color)
      }

      const { data: running } = await supabase
        .from('running_texts')
        .select('*')
        .eq('department', department)
        .eq('is_active', true)
        .maybeSingle()

      if (running) {
        setRunningText(running.text)
      }
    } catch (err) {
      console.error('Failed to load screen settings:', err)
    }
  }

  const fetchQueueData = async () => {
    try {
      // Get called/in_progress (current)
      const { data: current } = await supabase
        .from('queues')
        .select('*, patient:patients(*)')
        .eq('department', department)
        .in('status', ['called', 'in_progress'])
        .order('called_at', { ascending: false })
        .limit(1)

      if (current && current.length > 0) {
        setCurrentQueue(current[0])
      } else {
        setCurrentQueue(null)
      }

      // Get waiting list
      const { data: waiting } = await supabase
        .from('queues')
        .select('*, patient:patients(*)')
        .eq('department', department)
        .eq('status', 'waiting')
        .order('is_priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(5)

      setWaitingList(waiting || [])
    } catch {
      // Fallback demo data
      setCurrentQueue(null)
      setWaitingList([])
    }
  }

  const timeString = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateString = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Fallback styling gradient if no custom background color is configured
  const bgStyles = customBgColor
    ? { backgroundColor: customBgColor }
    : { backgroundImage: 'linear-gradient(to bottom right, var(--tw-gradient-stops))' }

  return (
    <div
      className="min-h-screen text-white flex flex-col overflow-hidden from-primary-800 via-primary-900 to-surface-900"
      style={bgStyles}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 bg-black/20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">D</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{displayTitle || 'Docteer'}</h1>
            <p className="text-primary-200 text-sm">{getDepartmentLabel(department)}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi size={20} className="text-accent-400" />
            ) : (
              <WifiOff size={20} className="text-red-400" />
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums">{timeString}</p>
            <p className="text-primary-200 text-sm">{dateString}</p>
          </div>
        </div>
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="bg-red-600/80 px-4 py-2 text-center flex items-center justify-center gap-2">
          <AlertTriangle size={16} />
          <span className="text-sm font-medium">Koneksi terputus — Menunggu sinkronisasi ulang</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex px-8 py-6 gap-8">
        {/* Current Number - Large Display */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-primary-300 text-lg font-medium mb-2 uppercase tracking-wider">Nomor Dipanggil</p>
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl px-16 py-12 border border-white/20 shadow-xl">
            <p className="text-[10rem] font-extrabold leading-none tabular-nums text-white">
              {currentQueue?.queue_number || '---'}
            </p>
          </div>
          <div className="mt-6 text-center">
            <p className="text-3xl font-semibold text-white/95">
              {currentQueue?.patient?.name || '-'}
            </p>
          </div>
        </div>

        {/* Waiting List */}
        <div className="w-80 flex flex-col">
          <p className="text-primary-300 text-sm font-medium mb-3 uppercase tracking-wider">Antrean Berikutnya</p>
          <div className="flex-1 space-y-3">
            {waitingList.length === 0 ? (
              <div className="bg-white/5 rounded-2xl p-6 text-center">
                <p className="text-primary-300">Tidak ada antrean</p>
              </div>
            ) : (
              waitingList.map((q, index) => (
                <div
                  key={q.id}
                  className={`bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/10 transition-all ${
                    index === 0 ? 'scale-105 shadow-lg border-white/30 bg-white/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-white">
                      {q.queue_number}
                    </span>
                    <span className="text-sm text-primary-200">{q.patient?.name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Running Text */}
      <div className="bg-black/30 px-4 py-3 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap">
          <span className="text-primary-200 text-sm font-medium">
            {runningText} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; {runningText}
          </span>
        </div>
      </div>
    </div>
  )
}
