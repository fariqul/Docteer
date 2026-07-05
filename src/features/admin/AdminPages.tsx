import React, { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  Edit2,
  Package,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Clock,
  Activity,
  FileText,
  Settings,
} from 'lucide-react'
import { PageLayout } from '../../components/layout'
import { Button, Input, Card, CardHeader, Badge, DataTable, Modal, Select, Textarea } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { formatDate, formatTime, getDepartmentLabel } from '../../lib/utils'
import type { Staff, Medicine, ActivityLog } from '../../types/database'

// ======================== Staff Management ========================
export const StaffManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [formData, setFormData] = useState({ name: '' })

  useEffect(() => { fetchStaff() }, [])

  const fetchStaff = async () => {
    setIsLoading(true)
    try {
      const { data } = await supabase.from('staff').select('*').order('name')
      setStaffList(data || [])
    } catch {
      setStaffList([
        { id: '1', name: 'Ns. Budi Hartono', role: 'petugas', specialization: '', is_active: true, created_at: new Date().toISOString() },
        { id: '2', name: 'Apt. Dewi Lestari', role: 'petugas', specialization: '', is_active: true, created_at: new Date().toISOString() },
        { id: '3', name: 'Ns. Rina Marlina', role: 'petugas', specialization: '', is_active: true, created_at: new Date().toISOString() },
      ])
    } finally { setIsLoading(false) }
  }

  const handleSubmit = async () => {
    try {
      if (editingStaff) {
        await supabase.from('staff').update({ name: formData.name }).eq('id', editingStaff.id)
      } else {
        await supabase.from('staff').insert({ name: formData.name, role: 'petugas', specialization: '', is_active: true })
      }
      setShowForm(false)
      setEditingStaff(null)
      setFormData({ name: '' })
      fetchStaff()
    } catch (err) { console.error(err) }
  }

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff)
    setFormData({ name: staff.name })
    setShowForm(true)
  }

  const handleToggleActive = async (staff: Staff) => {
    await supabase.from('staff').update({ is_active: !staff.is_active }).eq('id', staff.id)
    fetchStaff()
  }

  return (
    <PageLayout title="Kelola Petugas" subtitle="Tambah, edit, dan kelola data petugas">
      <Card>
        <CardHeader
          title={`Total: ${staffList.length} Petugas`}
          action={
            <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={() => { setShowForm(true); setEditingStaff(null); setFormData({ name: '' }) }}>
              Tambah Petugas
            </Button>
          }
        />
        <DataTable
          columns={[
            { key: 'name', header: 'Nama Petugas', render: (s) => <span className="font-semibold">{s.name}</span> },
            { key: 'is_active', header: 'Status', render: (s) => (
              <Badge variant={s.is_active ? 'accent' : 'default'} dot>{s.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
            )},
            { key: 'actions', header: 'Aksi', render: (s) => (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleEdit(s)}><Edit2 size={14} /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleToggleActive(s)}>
                  {s.is_active ? '🚫' : '✅'}
                </Button>
              </div>
            )},
          ]}
          data={staffList}
          keyExtractor={(s) => s.id}
          isLoading={isLoading}
        />
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingStaff ? 'Edit Petugas' : 'Tambah Petugas'}>
        <div className="space-y-4">
          <Input label="Nama Lengkap *" value={formData.name} onChange={(e) => setFormData({ name: e.target.value })} placeholder="Masukkan nama petugas..." required />
          <div className="flex gap-3 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleSubmit} disabled={!formData.name.trim()}>Simpan</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  )
}

// ======================== Medicine Management ========================
export const MedicineManagement: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', unit: 'tablet', price: 0, minimum_stock: 10 })

  // Batch states
  const [selectedMedicineForBatches, setSelectedMedicineForBatches] = useState<any | null>(null)
  const [batchesList, setBatchesList] = useState<any[]>([])
  const [showBatchesModal, setShowBatchesModal] = useState(false)
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [editingBatch, setEditingBatch] = useState<any | null>(null)
  const [batchFormData, setBatchFormData] = useState({ batch_number: '', expired_date: '', current_stock: 0 })

  useEffect(() => { fetchMedicines() }, [])

  const fetchMedicines = async () => {
    setIsLoading(true)
    try {
      const { data } = await supabase.from('medicines').select('*, batches:medicine_batches(*)').eq('is_active', true).order('name')
      setMedicines(data as any || [])
    } catch {
      setMedicines([
        { id: '1', name: 'Paracetamol 500mg', unit: 'tablet', price: 500, minimum_stock: 10, is_active: true, created_at: '', total_stock: 200 },
        { id: '2', name: 'Amoxicillin 500mg', unit: 'kapsul', price: 1000, minimum_stock: 10, is_active: true, created_at: '', total_stock: 150 },
        { id: '3', name: 'Omeprazole 20mg', unit: 'kapsul', price: 1500, minimum_stock: 10, is_active: true, created_at: '', total_stock: 5 },
        { id: '4', name: 'Vitamin C 500mg', unit: 'tablet', price: 300, minimum_stock: 10, is_active: true, created_at: '', total_stock: 0 },
      ] as Medicine[])
    } finally { setIsLoading(false) }
  }

  const fetchBatches = async (medicineId: string) => {
    try {
      const { data } = await supabase
        .from('medicine_batches')
        .select('*')
        .eq('medicine_id', medicineId)
        .order('expired_date', { ascending: true })
      setBatchesList(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleManageStok = (medicine: any) => {
    setSelectedMedicineForBatches(medicine)
    fetchBatches(medicine.id)
    setShowBatchesModal(true)
  }

  const handleOpenAddBatch = () => {
    setEditingBatch(null)
    setBatchFormData({ batch_number: '', expired_date: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0], current_stock: 100 })
    setShowBatchForm(true)
  }

  const handleOpenEditBatch = (batch: any) => {
    setEditingBatch(batch)
    setBatchFormData({
      batch_number: batch.batch_number,
      expired_date: batch.expired_date,
      current_stock: batch.quantity ?? batch.current_stock ?? 0
    })
    setShowBatchForm(true)
  }

  const handleSaveBatch = async () => {
    if (!selectedMedicineForBatches) return
    try {
      let res;
      if (editingBatch) {
        res = await supabase
          .from('medicine_batches')
          .update({
            batch_number: batchFormData.batch_number,
            expired_date: batchFormData.expired_date,
            quantity: batchFormData.current_stock,
            current_stock: batchFormData.current_stock
          })
          .eq('id', editingBatch.id)
      } else {
        res = await supabase
          .from('medicine_batches')
          .insert({
            medicine_id: selectedMedicineForBatches.id,
            batch_number: batchFormData.batch_number,
            expired_date: batchFormData.expired_date,
            quantity: batchFormData.current_stock,
            current_stock: batchFormData.current_stock
          })
      }

      if (res.error) {
        throw new Error(res.error.message)
      }

      setShowBatchForm(false)
      setEditingBatch(null)
      fetchBatches(selectedMedicineForBatches.id)
      fetchMedicines()
    } catch (err: any) {
      console.error(err)
      alert(`Gagal menyimpan batch: ${err.message || err}`)
    }
  }

  const handleSubmit = async () => {
    try {
      const { error } = await supabase.from('medicines').insert({ ...formData, is_active: true })
      if (error) throw error
      setShowForm(false)
      setFormData({ name: '', unit: 'tablet', price: 0, minimum_stock: 10 })
      fetchMedicines()
    } catch (err: any) {
      console.error(err)
      alert(`Gagal menambah obat: ${err.message || err}`)
    }
  }

  return (
    <PageLayout title="Kelola Obat" subtitle="Manajemen stok obat dan batch">
      <Card>
        <CardHeader
          title={`Total: ${medicines.length} Obat`}
          action={
            <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={() => setShowForm(true)}>
              Tambah Obat
            </Button>
          }
        />
        <DataTable
          columns={[
            { key: 'name', header: 'Nama Obat', render: (m) => <span className="font-semibold">{m.name}</span> },
            { key: 'unit', header: 'Satuan' },
            { key: 'stock', header: 'Stok', render: (m) => {
              const stock = (m as any).batches?.reduce((s: number, b: any) => s + (b.quantity ?? 0), 0) ?? 0
              return (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{stock}</span>
                  {stock === 0 && <Badge variant="danger" dot pulse>Habis</Badge>}
                  {stock > 0 && stock <= m.minimum_stock && <Badge variant="warning" dot>Menipis</Badge>}
                </div>
              )
            }},
            { key: 'minimum_stock', header: 'Min. Stok' },
            { key: 'price', header: 'Harga', render: (m) => `Rp ${m.price.toLocaleString()}` },
            { key: 'actions', header: 'Aksi', render: (m) => (
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={() => handleManageStok(m)}>
                  Kelola Stok
                </Button>
              </div>
            )},
          ]}
          data={medicines}
          keyExtractor={(m) => m.id}
          isLoading={isLoading}
        />
      </Card>

      {/* Main Medicine Add Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Tambah Obat">
        <div className="space-y-4">
          <Input label="Nama Obat *" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
          <Select label="Satuan *" value={formData.unit} onChange={(e) => setFormData(p => ({ ...p, unit: e.target.value }))} options={[
            { value: 'tablet', label: 'Tablet' }, { value: 'kapsul', label: 'Kapsul' },
            { value: 'sirup', label: 'Sirup (ml)' }, { value: 'salep', label: 'Salep (tube)' },
            { value: 'injeksi', label: 'Injeksi (ampul)' },
          ]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Harga (Rp)" type="number" value={formData.price} onChange={(e) => setFormData(p => ({ ...p, price: parseInt(e.target.value) || 0 }))} />
            <Input label="Min. Stok" type="number" value={formData.minimum_stock} onChange={(e) => setFormData(p => ({ ...p, minimum_stock: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleSubmit}>Simpan</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
          </div>
        </div>
      </Modal>

      {/* Batches Management Modal */}
      <Modal isOpen={showBatchesModal} onClose={() => setShowBatchesModal(false)} title={`Kelola Stok & Batch — ${selectedMedicineForBatches?.name}`} size="lg">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-surface-500">Stok obat diatur per batch expired date untuk mendukung FEFO</p>
            <Button size="sm" variant="primary" leftIcon={<Plus size={14} />} onClick={handleOpenAddBatch}>
              Tambah Batch Baru
            </Button>
          </div>

          <DataTable
            columns={[
              { key: 'batch_number', header: 'No. Batch', render: (b) => <span className="font-semibold font-mono">{b.batch_number}</span> },
              { key: 'expired_date', header: 'Tgl. Expired', render: (b) => formatDate(b.expired_date) },
              { key: 'quantity', header: 'Stok Saat Ini', render: (b) => <span className="font-bold">{b.quantity}</span> },
              { key: 'actions', header: 'Aksi', render: (b) => (
                <Button size="sm" variant="outline" onClick={() => handleOpenEditBatch(b)}>
                  Edit Stok
                </Button>
              )}
            ]}
            data={batchesList}
            keyExtractor={(b) => b.id}
            emptyMessage="Belum ada batch stok untuk obat ini"
          />

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowBatchesModal(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Batch Form Modal */}
      <Modal isOpen={showBatchForm} onClose={() => setShowBatchForm(false)} title={editingBatch ? 'Edit Stok Batch' : 'Tambah Batch Stok Baru'}>
        <div className="space-y-4">
          <Input label="Nomor Batch *" value={batchFormData.batch_number} onChange={(e) => setBatchFormData(p => ({ ...p, batch_number: e.target.value }))} placeholder="Contoh: B01" />
          <Input label="Tanggal Expired *" type="date" value={batchFormData.expired_date} onChange={(e) => setBatchFormData(p => ({ ...p, expired_date: e.target.value }))} />
          <Input label="Jumlah Stok *" type="number" value={batchFormData.current_stock} onChange={(e) => setBatchFormData(p => ({ ...p, current_stock: parseInt(e.target.value) || 0 }))} />

          <div className="flex gap-3 pt-2">
            <Button variant="primary" className="flex-1" onClick={handleSaveBatch}>Simpan</Button>
            <Button variant="secondary" onClick={() => setShowBatchForm(false)}>Batal</Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  )
}

// ======================== Activity Log ========================
export const ActivityLogView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { fetchLogs() }, [])

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const { data } = await supabase
        .from('activity_logs')
        .select('*, staff:staff(*), patient:patients(*)')
        .order('created_at', { ascending: false })
        .limit(100)
      setLogs(data as any || [])
    } catch {
      setLogs([
        { id: '1', module: 'registration', action: 'create_patient', created_at: new Date().toISOString(), staff: { name: 'Ns. Budi' } as any, patient: { name: 'Ahmad Slamet' } as any } as any,
        { id: '2', module: 'triage', action: 'vital_signs', created_at: new Date().toISOString(), staff: { name: 'Ns. Budi' } as any, patient: { name: 'Ahmad Slamet' } as any } as any,
        { id: '3', module: 'pharmacy', action: 'dispense', created_at: new Date().toISOString(), staff: { name: 'Apt. Dewi' } as any, patient: { name: 'Siti Nurhaliza' } as any } as any,
      ])
    } finally { setIsLoading(false) }
  }

  return (
    <PageLayout title="Activity Log" subtitle="Riwayat semua aktivitas sistem (read-only)">
      <Card>
        <DataTable
          columns={[
            { key: 'created_at', header: 'Waktu', render: (l) => (
              <div>
                <p className="text-sm">{formatDate(l.created_at)}</p>
                <p className="text-xs text-surface-400">{formatTime(l.created_at)}</p>
              </div>
            )},
            { key: 'staff', header: 'Petugas', render: (l) => l.staff?.name || '-' },
            { key: 'module', header: 'Modul', render: (l) => (
              <Badge variant="primary" size="sm">{getDepartmentLabel(l.module) || l.module}</Badge>
            )},
            { key: 'action', header: 'Aksi', render: (l) => l.action },
            { key: 'patient', header: 'Pasien', render: (l) => l.patient?.name || '-' },
          ]}
          data={logs}
          keyExtractor={(l) => l.id}
          isLoading={isLoading}
          emptyMessage="Belum ada aktivitas tercatat"
        />
      </Card>
    </PageLayout>
  )
}

// ======================== Admin Monitoring ========================
export const AdminMonitoring: React.FC = () => {
  const [statsData, setStatsData] = useState<{
    todayPatients: number
    waiting: number
    inProgress: number
    completed: number
    menipis: number
    habis: number
    poliUmum: number
    poliGigi: number
    topMedicines: { name: string; count: number }[]
  }>({
    todayPatients: 0,
    waiting: 0,
    inProgress: 0,
    completed: 0,
    menipis: 0,
    habis: 0,
    poliUmum: 0,
    poliGigi: 0,
    topMedicines: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      // 1. Pasien hari ini
      const { count: todayPatients } = await supabase
        .from('patient_visits')
        .select('*', { count: 'exact', head: true })
        .eq('visit_date', today)

      // 2. Menunggu, Dilayani, Selesai
      const { count: waiting } = await supabase
        .from('queues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting')

      const { count: inProgress } = await supabase
        .from('queues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress')

      const { count: completed } = await supabase
        .from('queues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', `${today}T00:00:00Z`)

      // 3. Obat Menipis & Habis
      const { data: meds } = await supabase
        .from('medicines')
        .select('*, batches:medicine_batches(*)')
        .eq('is_active', true)

      let menipis = 0
      let habis = 0
      if (meds) {
        meds.forEach((m: any) => {
          const stock = m.batches?.reduce((acc: number, b: any) => acc + b.current_stock, 0) || 0
          if (stock === 0) habis++
          else if (stock <= m.minimum_stock) menipis++
        })
      }

      // 4. Poli Terpadat
      const { count: poliUmum } = await supabase
        .from('queues')
        .select('*', { count: 'exact', head: true })
        .eq('department', 'poli_umum')
        .gte('created_at', `${today}T00:00:00Z`)

      const { count: poliGigi } = await supabase
        .from('queues')
        .select('*', { count: 'exact', head: true })
        .eq('department', 'poli_gigi')
        .gte('created_at', `${today}T00:00:00Z`)

      // 5. Obat Terbanyak Digunakan
      const { data: txs } = await supabase
        .from('medicine_transactions')
        .select('quantity, medicine:medicines(name)')
        .eq('transaction_type', 'out')

      const usage: Record<string, number> = {}
      if (txs) {
        txs.forEach((tx: any) => {
          const name = tx.medicine?.name || 'Obat'
          usage[name] = (usage[name] || 0) + tx.quantity
        })
      }
      const topMedicines = Object.entries(usage)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      setStatsData({
        todayPatients: todayPatients || 0,
        waiting: waiting || 0,
        inProgress: inProgress || 0,
        completed: completed || 0,
        menipis,
        habis,
        poliUmum: poliUmum || 0,
        poliGigi: poliGigi || 0,
        topMedicines,
      })
    } catch (err) {
      console.error('Failed to fetch statistics:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const stats = [
    { label: 'Pasien Hari Ini', value: String(statsData.todayPatients), icon: <Users size={24} />, color: 'from-primary-500 to-primary-600' },
    { label: 'Menunggu', value: String(statsData.waiting), icon: <Clock size={24} />, color: 'from-amber-500 to-amber-600' },
    { label: 'Dilayani', value: String(statsData.inProgress), icon: <Activity size={24} />, color: 'from-accent-500 to-accent-600' },
    { label: 'Selesai Hari Ini', value: String(statsData.completed), icon: <TrendingUp size={24} />, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Obat Menipis', value: String(statsData.menipis), icon: <AlertTriangle size={24} />, color: 'from-orange-500 to-orange-600' },
    { label: 'Obat Habis', value: String(statsData.habis), icon: <Package size={24} />, color: 'from-red-500 to-red-600' },
  ]

  const totalPoli = (statsData.poliUmum + statsData.poliGigi) || 1
  const pctUmum = Math.round((statsData.poliUmum / totalPoli) * 100)
  const pctGigi = Math.round((statsData.poliGigi / totalPoli) * 100)

  if (isLoading) {
    return (
      <PageLayout title="Monitoring & Statistik" subtitle="Memuat data statistik...">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-surface-200 rounded-2xl p-5 animate-pulse h-28" />
          ))}
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Monitoring & Statistik" subtitle="Dashboard monitoring realtime">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 text-white shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <div className="bg-white/20 rounded-lg p-2">{stat.icon}</div>
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-white/80 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Poli Terpadat Hari Ini" />
          <div className="space-y-3">
            {[
              { name: 'Poli Umum', count: statsData.poliUmum, pct: pctUmum },
              { name: 'Poli Gigi', count: statsData.poliGigi, pct: pctGigi },
            ].map((poli) => (
              <div key={poli.name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{poli.name}</span>
                    <span className="text-sm text-surface-500">{poli.count} pasien</span>
                  </div>
                  <div className="w-full bg-surface-100 rounded-full h-2.5">
                    <div className="bg-primary-500 h-2.5 rounded-full transition-all" style={{ width: `${poli.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Obat Terbanyak Digunakan" />
          <div className="space-y-3">
            {statsData.topMedicines.length === 0 ? (
              <p className="text-sm text-surface-400 py-4 text-center">Belum ada transaksi obat</p>
            ) : (
              statsData.topMedicines.map((med, i) => (
                <div key={med.name} className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span className="text-sm font-medium">{med.name}</span>
                  </div>
                  <Badge variant="primary" size="sm">{med.count} unit</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </PageLayout>
  )
}

// ======================== Reports ========================
export const Reports: React.FC = () => (
  <PageLayout title="Laporan" subtitle="Export dan cetak laporan">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[
        { title: 'Laporan Harian', desc: 'Ringkasan pasien dan obat hari ini', icon: <FileText size={32} />, type: 'daily' },
        { title: 'Export Excel', desc: 'Data mentah per tabel', icon: <BarChart3 size={32} />, type: 'excel' },
        { title: 'Backup Data', desc: 'Backup database klinik', icon: <Settings size={32} />, type: 'backup' },
      ].map((report) => (
        <Card key={report.type} hoverable onClick={() => alert(`Export ${report.type} - Coming soon!`)}>
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-600">
              {report.icon}
            </div>
            <h3 className="text-title mb-1">{report.title}</h3>
            <p className="text-sm text-surface-500">{report.desc}</p>
          </div>
        </Card>
      ))}
    </div>
  </PageLayout>
)

// ======================== Settings ========================
export const ClinicSettings: React.FC = () => (
  <PageLayout title="Pengaturan Klinik" subtitle="Konfigurasi sistem Docteer">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader title="Informasi Klinik" />
        <div className="space-y-4">
          <Input label="Nama Klinik" defaultValue="Docteer Clinic" />
          <Input label="Alamat" defaultValue="Puskesmas - Bakti Sosial" />
          <Input label="No. Telepon" defaultValue="021-0000000" />
          <Button variant="primary">Simpan</Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="Pengaturan Stok" />
        <div className="space-y-4">
          <Input label="Alert Expired (hari)" type="number" defaultValue="30" hint="Batch obat yang expired kurang dari X hari akan diberi alert" />
          <Input label="Minimum Stok Default" type="number" defaultValue="10" />
          <Button variant="primary">Simpan</Button>
        </div>
      </Card>
    </div>
  </PageLayout>
)

// ======================== Display Settings Manager ========================
export const DisplaySettingsManager: React.FC = () => {
  const screens = [
    { key: 'triage', label: 'Layar Pemeriksaan Awal (Tensi)', path: '/display/tensi' },
    { key: 'lab', label: 'Layar Laboratorium', path: '/display/lab' },
    { key: 'poli_umum', label: 'Layar Poli Umum', path: '/display/poli-umum' },
    { key: 'poli_gigi', label: 'Layar Poli Gigi', path: '/display/poli-gigi' },
    { key: 'pharmacy', label: 'Layar Farmasi (Apotek)', path: '/display/farmasi' },
  ]

  const [selectedScreen, setSelectedScreen] = useState<any | null>(null)
  const [screenTitle, setScreenTitle] = useState('')
  const [runningText, setRunningText] = useState('')
  const [bgColor, setBgColor] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleConfigure = async (screen: any) => {
    setSelectedScreen(screen)
    setScreenTitle(screen.label)
    setRunningText('Selamat datang di Docteer Clinic — Bakti Sosial Puskesmas')
    setBgColor('#1e1b4b')

    try {
      const { data: displayData } = await supabase
        .from('display_settings')
        .select('*')
        .eq('department', screen.key)
        .maybeSingle()

      if (displayData) {
        if (displayData.logo_url) setScreenTitle(displayData.logo_url)
        if (displayData.background_color) setBgColor(displayData.background_color)
      }

      const { data: txtData } = await supabase
        .from('running_texts')
        .select('*')
        .eq('department', screen.key)
        .eq('is_active', true)
        .maybeSingle()

      if (txtData) {
        setRunningText(txtData.text)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveSettings = async () => {
    if (!selectedScreen) return
    setIsSaving(true)

    try {
      const { data: existingDisplay } = await supabase
        .from('display_settings')
        .select('*')
        .eq('department', selectedScreen.key)
        .maybeSingle()

      if (existingDisplay) {
        await supabase
          .from('display_settings')
          .update({
            logo_url: screenTitle,
            background_color: bgColor,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDisplay.id)
      } else {
        await supabase
          .from('display_settings')
          .insert({
            department: selectedScreen.key,
            logo_url: screenTitle,
            background_color: bgColor
          })
      }

      const { data: existingTxt } = await supabase
        .from('running_texts')
        .select('*')
        .eq('department', selectedScreen.key)
        .maybeSingle()

      if (existingTxt) {
        await supabase
          .from('running_texts')
          .update({
            text: runningText,
            is_active: true
          })
          .eq('id', existingTxt.id)
      } else {
        await supabase
          .from('running_texts')
          .insert({
            department: selectedScreen.key,
            text: runningText,
            is_active: true
          })
      }

      alert('Pengaturan layar berhasil disimpan!')
      setSelectedScreen(null)
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan pengaturan')
    } finally {
      setIsSaving(false)
    }
  }

  const getAbsoluteUrl = (path: string) => {
    return `${window.location.origin}${path}`
  }

  const handleCopyLink = (path: string) => {
    navigator.clipboard.writeText(getAbsoluteUrl(path))
    alert('Link disalin ke clipboard!')
  }

  return (
    <PageLayout title="Manajemen Layar TV" subtitle="Daftar URL dan kustomisasi layar monitor per ruangan">
      <div className="grid grid-cols-1 gap-6">
        {screens.map((screen) => (
          <Card key={screen.key} className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-surface-800">{screen.label}</h3>
                <p className="text-sm text-primary-600 font-mono select-all bg-surface-100 px-2 py-1 rounded mt-1 break-all">
                  {getAbsoluteUrl(screen.path)}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={() => handleCopyLink(screen.path)}>
                  Salin Link
                </Button>
                <Button variant="secondary" size="sm" onClick={() => window.open(screen.path, '_blank')}>
                  Buka di TV
                </Button>
                <Button variant="primary" size="sm" onClick={() => handleConfigure(screen)}>
                  Pengaturan
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={!!selectedScreen}
        onClose={() => setSelectedScreen(null)}
        title={`Konfigurasi Layar — ${selectedScreen?.label}`}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Judul Layar TV"
            value={screenTitle}
            onChange={(e) => setScreenTitle(e.target.value)}
            placeholder="Contoh: Antrean Poli Umum"
          />
          <Textarea
            label="Teks Berjalan (Running Text)"
            value={runningText}
            onChange={(e) => setRunningText(e.target.value)}
            placeholder="Tuliskan pesan sambutan atau info info klinik..."
          />
          <div>
            <label className="block text-label text-surface-700 mb-1.5">Warna Latar Layar TV</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-10 h-10 border border-surface-200 rounded cursor-pointer"
              />
              <Input
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                placeholder="#1e1b4b"
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="secondary" onClick={() => setSelectedScreen(null)}>
              Batal
            </Button>
            <Button variant="primary" isLoading={isSaving} onClick={handleSaveSettings}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  )
}

