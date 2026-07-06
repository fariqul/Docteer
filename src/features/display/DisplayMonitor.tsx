import React, { useState, useEffect, useRef } from 'react'
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { generateVoiceText } from '../../lib/utils'
import type { Queue } from '../../types/database'

interface DepartmentData {
  currentQueue: Queue | null
  waitingList: Queue[]
}

export const DisplayMonitor: React.FC = () => {
  const [poliUmum, setPoliUmum] = useState<DepartmentData>({ currentQueue: null, waitingList: [] })
  const [poliGigi, setPoliGigi] = useState<DepartmentData>({ currentQueue: null, waitingList: [] })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [runningText, setRunningText] = useState('Baksos Mahasiswa Kedokteran UMI Makassar')
  const [customBgColor, setCustomBgColor] = useState('')

  const lastCalledUmumRef = useRef<string | null>(null)
  const lastCalledGigiRef = useRef<string | null>(null)

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

  // Voice call
  const playVoiceCall = (queueNumber: string, patientName: string, department: string) => {
    if ('speechSynthesis' in window) {
      console.log('Playing voice call for:', queueNumber, patientName, department)
      speechSynthesis.cancel()
      const text = generateVoiceText(queueNumber, patientName, department)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'id-ID'
      utterance.rate = 0.9
      speechSynthesis.speak(utterance)
    }
  }

  // Fetch queue data for a specific department
  const fetchDeptQueue = async (dept: string): Promise<DepartmentData> => {
    try {
      const { data: current } = await supabase
        .from('queues')
        .select('*, patient:patients(*)')
        .eq('department', dept)
        .in('status', ['called', 'in_progress'])
        .order('called_at', { ascending: false })
        .limit(1)

      const { data: waiting } = await supabase
        .from('queues')
        .select('*, patient:patients(*)')
        .eq('department', dept)
        .eq('status', 'waiting')
        .order('is_priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(5)

      return {
        currentQueue: current && current.length > 0 ? current[0] : null,
        waitingList: waiting || [],
      }
    } catch {
      return { currentQueue: null, waitingList: [] }
    }
  }

  const fetchAllQueues = async () => {
    const [umum, gigi] = await Promise.all([
      fetchDeptQueue('poli_umum'),
      fetchDeptQueue('poli_gigi'),
    ])

    // Voice call for Poli Umum
    if (umum.currentQueue && umum.currentQueue.status === 'called' && umum.currentQueue.called_at !== lastCalledUmumRef.current) {
      lastCalledUmumRef.current = umum.currentQueue.called_at ?? null
      playVoiceCall(umum.currentQueue.queue_number, umum.currentQueue.patient?.name || '', 'poli_umum')
    }

    // Voice call for Poli Gigi (queue after umum finishes speaking)
    if (gigi.currentQueue && gigi.currentQueue.status === 'called' && gigi.currentQueue.called_at !== lastCalledGigiRef.current) {
      lastCalledGigiRef.current = gigi.currentQueue.called_at ?? null
      // Small delay so calls don't overlap
      setTimeout(() => {
        playVoiceCall(gigi.currentQueue!.queue_number, gigi.currentQueue!.patient?.name || '', 'poli_gigi')
      }, 500)
    }

    setPoliUmum(umum)
    setPoliGigi(gigi)
  }

  const fetchDisplaySettings = async () => {
    try {
      // Use poli_umum settings as the primary display settings
      const { data: display } = await supabase
        .from('display_settings')
        .select('*')
        .eq('department', 'poli_umum')
        .maybeSingle()

      if (display?.background_color) {
        setCustomBgColor(display.background_color)
      }

      const { data: running } = await supabase
        .from('running_texts')
        .select('*')
        .eq('department', 'poli_umum')
        .eq('is_active', true)
        .maybeSingle()

      if (running) {
        setRunningText(running.text)
      }
    } catch (err) {
      console.error('Failed to load screen settings:', err)
    }
  }

  // Realtime subscriptions
  useEffect(() => {
    fetchAllQueues()
    fetchDisplaySettings()

    const channel = supabase
      .channel('display-channel-unified')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queues' },
        (payload: any) => {
          const newRec = payload.new as any
          const oldRec = payload.old as any
          if (
            (newRec && (newRec.department === 'poli_umum' || newRec.department === 'poli_gigi')) ||
            (oldRec && (oldRec.department === 'poli_umum' || oldRec.department === 'poli_gigi'))
          ) {
            fetchAllQueues()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'display_settings' },
        () => fetchDisplaySettings()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'running_texts' },
        () => fetchDisplaySettings()
      )
      .subscribe((status: any) => {
        console.log('Realtime subscription status for unified display:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const timeString = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateString = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const bgStyles = customBgColor
    ? { backgroundColor: customBgColor }
    : { backgroundImage: 'linear-gradient(to bottom right, var(--tw-gradient-stops))' }

  // Render a single department panel
  const renderDepartmentPanel = (label: string, color: string, borderColor: string, data: DepartmentData) => (
    <div className="flex-1 flex flex-col">
      {/* Department Header */}
      <div className={`${color} rounded-t-2xl px-6 py-4 text-center`}>
        <h2 className="text-2xl font-extrabold text-white tracking-wide uppercase">{label}</h2>
      </div>

      {/* Current Called Number */}
      <div className={`flex-1 flex flex-col items-center justify-center bg-white/5 backdrop-blur-sm border-x-2 ${borderColor} px-6 py-8`}>
        <p className="text-primary-300 text-sm font-semibold mb-2 uppercase tracking-widest">Nomor Dipanggil</p>
        <div className={`bg-white/10 backdrop-blur-sm rounded-2xl px-12 py-8 border-2 ${borderColor} shadow-xl mb-4`}>
          <p className="text-[7rem] font-extrabold leading-none tabular-nums text-white">
            {data.currentQueue?.queue_number || '---'}
          </p>
        </div>
        <p className="text-2xl font-semibold text-white/90">
          {data.currentQueue?.patient?.name || '-'}
        </p>
      </div>

      {/* Waiting List */}
      <div className={`bg-black/20 backdrop-blur-sm rounded-b-2xl border-x-2 border-b-2 ${borderColor} px-4 py-4`}>
        <p className="text-primary-300 text-xs font-semibold mb-3 uppercase tracking-widest text-center">
          Antrean Menunggu ({data.waitingList.length})
        </p>
        <div className="space-y-2">
          {data.waitingList.length === 0 ? (
            <p className="text-center text-primary-300/60 text-sm py-2 italic">Tidak ada antrean</p>
          ) : (
            data.waitingList.slice(0, 4).map((q, i) => (
              <div
                key={q.id}
                className={`flex items-center justify-between rounded-lg px-4 py-2.5 transition-all ${
                  i === 0
                    ? 'bg-white/15 border border-white/20 shadow-sm'
                    : 'bg-white/5 border border-white/5'
                }`}
              >
                <span className="text-lg font-bold text-white">{q.queue_number}</span>
                <span className="text-sm text-primary-200 truncate ml-3">{q.patient?.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="min-h-screen text-white flex flex-col overflow-hidden from-primary-800 via-primary-900 to-surface-900"
      style={bgStyles}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-black/20">
        <div className="flex items-center gap-5">
          <div className="h-16 w-52 bg-white rounded-2xl flex items-center justify-center p-2 shadow-md flex-shrink-0">
            <img src="/logo-docteer.png" alt="Logo Docteer" className="h-full w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Layar Antrean Poli</h1>
            <p className="text-primary-200 text-sm font-medium">Sistem Informasi Antrean Realtime</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi size={18} className="text-accent-400" />
            ) : (
              <WifiOff size={18} className="text-red-400" />
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">{timeString}</p>
            <p className="text-primary-200 text-xs">{dateString}</p>
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

      {/* Main Content: Two Department Panels Side by Side */}
      <div className="flex-1 flex px-6 py-5 gap-6">
        {renderDepartmentPanel(
          'Poli Umum',
          'bg-gradient-to-r from-blue-600 to-blue-700',
          'border-blue-500/40',
          poliUmum
        )}
        {renderDepartmentPanel(
          'Poli Gigi',
          'bg-gradient-to-r from-teal-600 to-teal-700',
          'border-teal-500/40',
          poliGigi
        )}
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
