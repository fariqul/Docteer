import React, { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Staff } from '../../types/database'

interface StaffSelectorProps {
  department: string
  onSelect: (staff: Staff) => void
  onBack?: () => void
}

export const StaffSelector: React.FC<StaffSelectorProps> = ({ department: _department, onSelect, onBack }) => {
  const [search, setSearch] = useState('')
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [filtered, setFiltered] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    fetchStaff()
  }, [])

  useEffect(() => {
    if (search.trim() === '') {
      setFiltered(staffList)
    } else {
      setFiltered(
        staffList.filter((s) =>
          s.name.toLowerCase().includes(search.toLowerCase())
        )
      )
    }
  }, [search, staffList])

  const fetchStaff = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setStaffList(data || [])
    } catch (err) {
      console.error('Failed to fetch staff:', err)
      // Fallback demo data
      setStaffList([
        { id: '1', name: 'Ns. Budi Hartono', role: 'petugas', specialization: '', is_active: true, created_at: '' },
        { id: '2', name: 'Apt. Dewi Lestari', role: 'petugas', specialization: '', is_active: true, created_at: '' },
        { id: '3', name: 'Ns. Rina Marlina', role: 'petugas', specialization: '', is_active: true, created_at: '' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="h-36 w-96 flex items-center justify-center mx-auto mb-6">
            <img src="/logo-docteer.png" alt="Logo Docteer" className="h-full w-full object-contain drop-shadow-sm scale-110" />
          </div>
          <h1 className="text-headline text-surface-800 mb-2">Pilih Petugas</h1>
          <p className="text-surface-500">Ketik nama untuk mencari petugas</p>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari nama petugas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 text-body-lg bg-white border border-surface-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
          />
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-surface-100 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-200 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-surface-200 rounded w-1/2" />
                    <div className="h-3 bg-surface-100 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              Petugas tidak ditemukan
            </div>
          ) : (
            filtered.map((staff) => (
              <button
                key={staff.id}
                onClick={() => onSelect(staff)}
                className="w-full bg-white rounded-xl p-4 border border-surface-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <span className="text-primary-700 font-semibold text-sm">
                      {staff.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-surface-800">{staff.name}</p>
                    <p className="text-sm text-surface-500 capitalize">{staff.role}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="w-full mt-4 py-3 text-surface-500 hover:text-surface-700 transition-colors text-center"
          >
            ← Kembali ke Dashboard
          </button>
        )}
      </div>
    </div>
  )
}
