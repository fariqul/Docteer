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

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  showToast: (message: string, type?: Toast['type'], duration?: number) => void
  dismissToast: (id: string) => void
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  showToast: (message, type = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9)
    set((state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
