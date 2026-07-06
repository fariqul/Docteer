import React, { Suspense, lazy } from 'react'
import { createBrowserRouter, Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from '../components/layout'
import { ConnectionBanner } from '../components/common/ConnectionBanner'
import { ErrorBoundary } from '../components/common/ErrorBoundary'
import { useAuthStore, useUIStore } from '../stores'
import { StaffSelector } from '../components/common/StaffSelector'
import { cn } from '../lib/utils'

// Lazy load feature modules
const Dashboard = lazy(() => import('../features/dashboard/Dashboard').then(m => ({ default: m.Dashboard })))
const Registration = lazy(() => import('../features/registration/Registration').then(m => ({ default: m.Registration })))
const Triage = lazy(() => import('../features/triage/Triage').then(m => ({ default: m.Triage })))
const Laboratory = lazy(() => import('../features/laboratory/Laboratory').then(m => ({ default: m.Laboratory })))
const ClinicModule = lazy(() => import('../features/clinic/Clinic').then(m => ({ default: m.Clinic })))
const Pharmacy = lazy(() => import('../features/pharmacy/Pharmacy').then(m => ({ default: m.Pharmacy })))
const DisplayMonitor = lazy(() => import('../features/display/DisplayMonitor').then(m => ({ default: m.DisplayMonitor })))

// Lazy admin pages
const AdminMonitoring = lazy(() => import('../features/admin/AdminPages').then(m => ({ default: m.AdminMonitoring })))
const StaffManagement = lazy(() => import('../features/admin/AdminPages').then(m => ({ default: m.StaffManagement })))
const MedicineManagement = lazy(() => import('../features/admin/AdminPages').then(m => ({ default: m.MedicineManagement })))
const ActivityLogView = lazy(() => import('../features/admin/AdminPages').then(m => ({ default: m.ActivityLogView })))
const Reports = lazy(() => import('../features/admin/AdminPages').then(m => ({ default: m.Reports })))
const ClinicSettings = lazy(() => import('../features/admin/AdminPages').then(m => ({ default: m.ClinicSettings })))
const DisplaySettingsManager = lazy(() => import('../features/admin/AdminPages').then(m => ({ default: m.DisplaySettingsManager })))

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-surface-500">Memuat...</p>
    </div>
  </div>
)

// Admin route protector wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated } = useAuthStore()
  return isAdminAuthenticated ? <>{children}</> : <Navigate to="/" replace />
}

// Staff route protector wrapper
const StaffProtectedRoute = ({ children, department }: { children: React.ReactNode; department: string }) => {
  const staffByDepartment = useAuthStore(s => s.staffByDepartment)
  const setStaff = useAuthStore(s => s.setStaff)
  const { sidebarOpen } = useUIStore()
  const currentStaff = staffByDepartment[department]

  if (!currentStaff) {
    return (
      <div className={cn('min-h-screen transition-all duration-300', sidebarOpen ? 'lg:ml-64' : 'lg:ml-20')}>
        <StaffSelector
          department={department}
          onSelect={(staff) => setStaff(staff, department)}
        />
      </div>
    )
  }

  return <>{children}</>
}

// Main layout with sidebar
const MainLayout = () => (
  <div className="min-h-screen bg-surface-50">
    <ConnectionBanner />
    <Sidebar />
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  </div>
)

// Display layout (no sidebar)
const DisplayLayout = () => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  </ErrorBoundary>
)

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <Dashboard /> },
      {
        path: '/registration',
        element: (
          <StaffProtectedRoute department="registration">
            <Registration />
          </StaffProtectedRoute>
        ),
      },
      {
        path: '/triage',
        element: (
          <StaffProtectedRoute department="triage">
            <Triage />
          </StaffProtectedRoute>
        ),
      },
      {
        path: '/lab',
        element: (
          <StaffProtectedRoute department="lab">
            <Laboratory />
          </StaffProtectedRoute>
        ),
      },
      {
        path: '/poli-umum',
        element: (
          <Suspense fallback={<PageLoader />}>
            <StaffProtectedRoute department="poli_umum">
              <ClinicModule department="poli_umum" title="Poli Umum" />
            </StaffProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: '/poli-gigi',
        element: (
          <Suspense fallback={<PageLoader />}>
            <StaffProtectedRoute department="poli_gigi">
              <ClinicModule department="poli_gigi" title="Poli Gigi" />
            </StaffProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: '/pharmacy',
        element: (
          <StaffProtectedRoute department="pharmacy">
            <Pharmacy />
          </StaffProtectedRoute>
        ),
      },
      // Protected Admin routes
      {
        path: '/admin/monitoring',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminRoute>
              <AdminMonitoring />
            </AdminRoute>
          </Suspense>
        ),
      },
      {
        path: '/admin/displays',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminRoute>
              <DisplaySettingsManager />
            </AdminRoute>
          </Suspense>
        ),
      },
      {
        path: '/admin/staff',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminRoute>
              <StaffManagement />
            </AdminRoute>
          </Suspense>
        ),
      },
      {
        path: '/admin/medicines',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminRoute>
              <MedicineManagement />
            </AdminRoute>
          </Suspense>
        ),
      },
      {
        path: '/admin/activity-log',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminRoute>
              <ActivityLogView />
            </AdminRoute>
          </Suspense>
        ),
      },
      {
        path: '/admin/reports',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminRoute>
              <Reports />
            </AdminRoute>
          </Suspense>
        ),
      },
      {
        path: '/admin/settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminRoute>
              <ClinicSettings />
            </AdminRoute>
          </Suspense>
        ),
      },
    ],
  },
  {
    element: <DisplayLayout />,
    children: [
      { path: '/display', element: <DisplayMonitor /> },
      { path: '/display/:room', element: <DisplayMonitor /> },
    ],
  },
])
