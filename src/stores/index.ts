import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Staff } from '../types/database'

interface AuthState {
  // Admin auth
  isAdminAuthenticated: boolean
  adminId: string | null
  adminName: string | null

  // Staff identity per department
  staffByDepartment: Record<string, Staff | null>

  // Actions
  setAdminAuth: (id: string, name: string) => void
  clearAdminAuth: () => void
  setStaff: (staff: Staff, department: string) => void
  clearStaff: (department: string) => void
  clearAllStaff: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAdminAuthenticated: false,
      adminId: null,
      adminName: null,
      staffByDepartment: {},

      setAdminAuth: (id, name) =>
        set({ isAdminAuthenticated: true, adminId: id, adminName: name }),

      clearAdminAuth: () =>
        set({
          isAdminAuthenticated: false,
          adminId: null,
          adminName: null,
        }),

      setStaff: (staff, department) =>
        set((state) => ({
          staffByDepartment: {
            ...state.staffByDepartment,
            [department]: staff,
          },
        })),

      clearStaff: (department) =>
        set((state) => ({
          staffByDepartment: {
            ...state.staffByDepartment,
            [department]: null,
          },
        })),

      clearAllStaff: () =>
        set({ staffByDepartment: {} }),
    }),
    {
      name: 'docteer-auth-v2',
    }
  )
)

interface UIState {
  sidebarOpen: boolean
  isOnline: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setOnline: (online: boolean) => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  isOnline: navigator.onLine,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setOnline: (online) => set({ isOnline: online }),
}))
