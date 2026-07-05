import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  UserPlus,
  Stethoscope,
  FlaskConical,
  HeartPulse,
  Pill,
  Monitor,
  Settings,
  LogOut,
  Menu,
  X,
  ClipboardList,
  Users,
  Activity,
  Lock,
  Unlock,
  Tv,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore, useUIStore } from '../../stores'
import { Modal, Input, Button } from '../ui'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  badge?: number
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
  { label: 'Pendaftaran', path: '/registration', icon: <UserPlus size={20} /> },
  { label: 'Pemeriksaan Awal', path: '/triage', icon: <Stethoscope size={20} /> },
  { label: 'Laboratorium', path: '/lab', icon: <FlaskConical size={20} /> },
  { label: 'Poli Umum', path: '/poli-umum', icon: <HeartPulse size={20} /> },
  { label: 'Poli Gigi', path: '/poli-gigi', icon: <HeartPulse size={20} /> },
  { label: 'Farmasi', path: '/pharmacy', icon: <Pill size={20} /> },
]

const adminNavItems: NavItem[] = [
  { label: 'Monitoring', path: '/admin/monitoring', icon: <Monitor size={20} /> },
  { label: 'Layar TV', path: '/admin/displays', icon: <Tv size={20} /> },
  { label: 'Petugas', path: '/admin/staff', icon: <Users size={20} /> },
  { label: 'Obat', path: '/admin/medicines', icon: <Pill size={20} /> },
  { label: 'Activity Log', path: '/admin/activity-log', icon: <Activity size={20} /> },
  { label: 'Laporan', path: '/admin/reports', icon: <ClipboardList size={20} /> },
  { label: 'Pengaturan', path: '/admin/settings', icon: <Settings size={20} /> },
]

const getDepartmentFromPath = (path: string): string | null => {
  if (path.startsWith('/registration')) return 'registration'
  if (path.startsWith('/triage')) return 'triage'
  if (path.startsWith('/lab')) return 'lab'
  if (path.startsWith('/poli-umum')) return 'poli_umum'
  if (path.startsWith('/poli-gigi')) return 'poli_gigi'
  if (path.startsWith('/pharmacy')) return 'pharmacy'
  return null
}

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    staffByDepartment,
    clearStaff,
    clearAllStaff,
    isAdminAuthenticated,
    setAdminAuth,
    clearAdminAuth,
  } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()

  const dept = getDepartmentFromPath(location.pathname)
  const currentStaff = dept ? staffByDepartment[dept] : null

  // Admin lock/password modal
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')

  const handleLogoutStaff = () => {
    if (dept) {
      clearStaff(dept)
    }
    navigate('/')
  }

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Standard secure-enough password for local Baksos event clinic
    if (adminPassword === 'admin123') {
      setAdminAuth('admin-id', 'Administrator')
      clearAllStaff() // Clear all staff sessions on admin login
      setShowAdminModal(false)
      setAdminPassword('')
      setAdminError('')
      navigate('/admin/monitoring')
    } else {
      setAdminError('Password salah!')
    }
  }

  const handleAdminLogout = () => {
    clearAdminAuth()
    navigate('/')
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen bg-white border-r border-surface-200 transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20',
          !sidebarOpen && 'overflow-hidden lg:overflow-visible'
        )}
      >
        {/* Logo */}
        <div className="flex flex-col items-center justify-center px-4 py-6 border-b border-surface-100 bg-white">
          <div className={cn("h-16 w-full flex items-center justify-center", !sidebarOpen && "h-10")}>
            <img src="/logo-docteer.png" alt="Logo Docteer" className="h-full w-auto object-contain" />
          </div>
          {sidebarOpen && (
            <p className="text-[10px] font-bold text-surface-400 mt-2 tracking-wider uppercase">Sistem Klinik & Antrean</p>
          )}
        </div>

        {/* Staff info */}
        {currentStaff && dept && sidebarOpen && (
          <div className="px-4 py-3 border-b border-surface-100 bg-primary-50/50 animate-fade-in">
            <p className="text-xs text-surface-500">Petugas Aktif</p>
            <p className="font-semibold text-sm text-surface-800 truncate">{currentStaff.name}</p>
            <p className="text-xs text-primary-600 capitalize">{dept.replace('_', ' ')}</p>
          </div>
        )}

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {isAdminAuthenticated ? (
            <>
              <p className={cn('text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2', sidebarOpen ? 'px-3' : 'text-center')}>
                {sidebarOpen ? 'Admin Panel' : '•'}
              </p>
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-surface-600 hover:bg-surface-100 hover:text-surface-800',
                      !sidebarOpen && 'justify-center'
                    )}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </>
          ) : (
            <>
              <p className={cn('text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2', sidebarOpen ? 'px-3' : 'text-center')}>
                {sidebarOpen ? 'Menu Utama' : '•'}
              </p>
              {mainNavItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-surface-600 hover:bg-surface-100 hover:text-surface-800',
                      !sidebarOpen && 'justify-center'
                    )}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                )
              })}

              <div className="my-4 border-t border-surface-100" />
              <button
                onClick={() => setShowAdminModal(true)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-surface-600 hover:bg-surface-100 hover:text-surface-800 transition-all',
                  !sidebarOpen && 'justify-center'
                )}
                title={!sidebarOpen ? 'Akses Admin' : undefined}
              >
                <Lock size={20} className="text-surface-400" />
                {sidebarOpen && <span>Akses Admin</span>}
              </button>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-surface-100 space-y-1">
          {isAdminAuthenticated && (
            <button
              onClick={handleAdminLogout}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-amber-600 hover:bg-amber-50 transition-all',
                !sidebarOpen && 'justify-center'
              )}
              title={!sidebarOpen ? 'Keluar Admin' : undefined}
            >
              <Unlock size={20} />
              {sidebarOpen && <span>Keluar Admin</span>}
            </button>
          )}
          
          {currentStaff && (
            <button
              onClick={handleLogoutStaff}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-surface-500 hover:bg-red-50 hover:text-red-600 transition-all',
                !sidebarOpen && 'justify-center'
              )}
              title={!sidebarOpen ? 'Keluar Petugas' : undefined}
            >
              <LogOut size={20} />
              {sidebarOpen && <span>Keluar Petugas</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Admin Password Modal */}
      <Modal
        isOpen={showAdminModal}
        onClose={() => {
          setShowAdminModal(false)
          setAdminPassword('')
          setAdminError('')
        }}
        title="Akses Administrator"
        size="sm"
      >
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <p className="text-sm text-surface-500">
            Halaman admin dilindungi sandi. Gunakan password default: <span className="font-mono bg-surface-100 px-1 py-0.5 rounded">admin123</span>
          </p>
          <Input
            label="Password Admin"
            type="password"
            placeholder="Masukkan password admin..."
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            error={adminError}
            required
            autoFocus
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAdminModal(false)
                setAdminPassword('')
                setAdminError('')
              }}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Masuk
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export const Header: React.FC<{ title?: string; subtitle?: string; actions?: React.ReactNode }> = ({
  title,
  subtitle,
  actions,
}) => {
  const location = useLocation()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { staffByDepartment } = useAuthStore()
  const dept = getDepartmentFromPath(location.pathname)
  const currentStaff = dept ? staffByDepartment[dept] : null

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-surface-100">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl hover:bg-surface-100 text-surface-500 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {title && (
            <div>
              <h1 className="text-title text-surface-800">{title}</h1>
              {subtitle && <p className="text-sm text-surface-500">{subtitle}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          {currentStaff && (
            <div className="flex items-center gap-2 pl-3 border-l border-surface-200">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-semibold text-xs">
                  {currentStaff.name.charAt(0)}
                </span>
              </div>
              <span className="text-sm font-medium text-surface-700 hidden sm:block">
                {currentStaff.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

interface PageLayoutProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  fullWidth?: boolean
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  subtitle,
  actions,
  children,
  fullWidth = false,
}) => {
  const { sidebarOpen } = useUIStore()

  return (
    <div className={cn('min-h-screen transition-all duration-300', sidebarOpen ? 'lg:ml-64' : 'lg:ml-20')}>
      <Header title={title} subtitle={subtitle} actions={actions} />
      <main className={cn('p-6', !fullWidth && 'max-w-7xl mx-auto')}>
        {children}
      </main>
    </div>
  )
}
