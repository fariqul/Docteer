import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserPlus,
  Stethoscope,
  FlaskConical,
  HeartPulse,
  Pill,
  Monitor,
} from 'lucide-react'
import { Card } from '../../components/ui'
import { Badge } from '../../components/ui'
import { useAuthStore, useUIStore } from '../../stores'
import { StaffSelector } from '../../components/common/StaffSelector'
import { getGreeting, cn } from '../../lib/utils'
import type { Staff } from '../../types/database'

interface ModuleCard {
  id: string
  name: string
  department: string
  description: string
  icon: React.ReactNode
  gradient: string
  iconBg: string
  route: string
  waitingCount?: number
}

const moduleCards: ModuleCard[] = [
  {
    id: 'registration',
    name: 'Pendaftaran',
    department: 'registration',
    description: 'Daftarkan pasien baru dan kelola data pasien',
    icon: <UserPlus size={32} />,
    gradient: 'from-primary-500 to-primary-600',
    iconBg: 'bg-primary-400/20',
    route: '/registration',
  },
  {
    id: 'triage',
    name: 'Pemeriksaan Awal',
    department: 'triage',
    description: 'Pemeriksaan vital signs dan triase pasien',
    icon: <Stethoscope size={32} />,
    gradient: 'from-amber-500 to-amber-600',
    iconBg: 'bg-amber-400/20',
    route: '/triage',
  },
  {
    id: 'lab',
    name: 'Laboratorium',
    department: 'lab',
    description: 'Input hasil pemeriksaan laboratorium',
    icon: <FlaskConical size={32} />,
    gradient: 'from-purple-500 to-purple-600',
    iconBg: 'bg-purple-400/20',
    route: '/lab',
  },
  {
    id: 'poli-umum',
    name: 'Poli Umum',
    department: 'poli_umum',
    description: 'Pemeriksaan dan diagnosa dokter umum',
    icon: <HeartPulse size={32} />,
    gradient: 'from-accent-500 to-accent-600',
    iconBg: 'bg-accent-400/20',
    route: '/poli-umum',
  },
  {
    id: 'poli-gigi',
    name: 'Poli Gigi',
    department: 'poli_gigi',
    description: 'Pemeriksaan dan tindakan dokter gigi',
    icon: <HeartPulse size={32} />,
    gradient: 'from-cyan-500 to-cyan-600',
    iconBg: 'bg-cyan-400/20',
    route: '/poli-gigi',
  },
  {
    id: 'pharmacy',
    name: 'Farmasi',
    department: 'pharmacy',
    description: 'Siapkan dan serahkan obat kepada pasien',
    icon: <Pill size={32} />,
    gradient: 'from-rose-500 to-rose-600',
    iconBg: 'bg-rose-400/20',
    route: '/pharmacy',
  },
]

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { setStaff } = useAuthStore()
  const { sidebarOpen } = useUIStore()
  const [selectedModule, setSelectedModule] = useState<ModuleCard | null>(null)

  const handleModuleClick = (module: ModuleCard) => {
    setSelectedModule(module)
  }

  const handleStaffSelect = (staff: Staff) => {
    if (selectedModule) {
      setStaff(staff, selectedModule.department)
      navigate(selectedModule.route)
    }
  }

  // Show staff selector if a module is selected
  if (selectedModule) {
    return (
      <StaffSelector
        department={selectedModule.department}
        onSelect={handleStaffSelect}
        onBack={() => setSelectedModule(null)}
      />
    )
  }

  return (
    <div className={cn('min-h-screen bg-surface-50 transition-all duration-300', sidebarOpen ? 'lg:ml-64' : 'lg:ml-20')}>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                <div className="h-20 w-64 bg-white rounded-2xl flex items-center justify-center p-3 shadow-md">
                  <img src="/logo-docteer.png" alt="Logo Docteer" className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-primary-100 text-body-lg font-medium">Sistem Informasi Klinik & Antrean Realtime</p>
                </div>
              </div>
              <h2 className="text-headline text-white/90 mb-1">{getGreeting()}</h2>
              <p className="text-primary-100 text-body-lg">
                Pilih modul untuk memulai. Klik card lalu pilih nama petugas.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 text-center">
                <p className="text-3xl font-bold">0</p>
                <p className="text-xs text-primary-200">Pasien Hari Ini</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 text-center">
                <p className="text-3xl font-bold">0</p>
                <p className="text-xs text-primary-200">Menunggu</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 text-center">
                <p className="text-3xl font-bold">0</p>
                <p className="text-xs text-primary-200">Selesai</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div className="max-w-7xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {moduleCards.map((module) => (
            <button
              key={module.id}
              onClick={() => handleModuleClick(module)}
              className="group text-left"
            >
              <div className={`bg-gradient-to-br ${module.gradient} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`${module.iconBg} rounded-xl p-3`}>
                    {module.icon}
                  </div>
                  {module.waitingCount !== undefined && module.waitingCount > 0 && (
                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                      {module.waitingCount} menunggu
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-1">{module.name}</h3>
                <p className="text-sm text-white/80">{module.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h3 className="text-title text-surface-800 mb-4">Status Ruangan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {moduleCards.map((module) => (
            <Card key={module.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full bg-surface-300`} />
                <div>
                  <p className="font-medium text-surface-800">{module.name}</p>
                  <p className="text-sm text-surface-500">Belum ada petugas</p>
                </div>
              </div>
              <Badge variant="default" size="sm">Offline</Badge>
            </Card>
          ))}
        </div>
      </div>

      {/* Display Monitor Links */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <h3 className="text-title text-surface-800 mb-4">Display Monitor</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Tensi', path: '/display/tensi' },
            { label: 'Lab', path: '/display/lab' },
            { label: 'Poli Umum', path: '/display/poli-umum' },
            { label: 'Poli Gigi', path: '/display/poli-gigi' },
            { label: 'Farmasi', path: '/display/farmasi' },
          ].map((display) => (
            <button
              key={display.path}
              onClick={() => window.open(display.path, '_blank')}
              className="bg-white border border-surface-200 rounded-xl p-4 hover:border-primary-300 hover:bg-primary-50 transition-all text-center group"
            >
              <Monitor size={24} className="mx-auto mb-2 text-surface-400 group-hover:text-primary-500" />
              <p className="text-sm font-medium text-surface-700 group-hover:text-primary-700">{display.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
