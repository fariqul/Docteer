import React, { useState, useEffect } from 'react'
import {
  FlaskConical,
  Save,
} from 'lucide-react'
import { PageLayout } from '../../components/layout'
import { Button, Input, Card, CardHeader, Badge, DataTable } from '../../components/ui'
import { Modal } from '../../components/ui'
import { useAuthStore } from '../../stores'
import { supabase } from '../../lib/supabase'
import { formatTime, getStatusLabel } from '../../lib/utils'
import type { Queue } from '../../types/database'

const labTests = [
  { type: 'gula_darah', label: 'Gula Darah', unit: 'mg/dL', normalRange: '70-100' },
  { type: 'kolesterol', label: 'Kolesterol', unit: 'mg/dL', normalRange: '<200' },
  { type: 'asam_urat', label: 'Asam Urat', unit: 'mg/dL', normalRange: '3.5-7.2' },
  { type: 'spirometri', label: 'Spirometri', unit: '%', normalRange: '>80' },
]

export const Laboratory: React.FC = () => {
  const currentStaff = useAuthStore(s => s.staffByDepartment['lab'])
  const [queueList, setQueueList] = useState<Queue[]>([])
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null)
  const [showLabForm, setShowLabForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [labResults, setLabResults] = useState<Record<string, { result: string; notes: string }>>({})
  const [instructedLabTests, setInstructedLabTests] = useState<string[]>([])
  const [existingLabRows, setExistingLabRows] = useState<any[]>([])
  const [alkesStocks, setAlkesStocks] = useState<any[]>([])


  useEffect(() => {
    fetchQueue()
    fetchStripStocks()
  }, [])

  const fetchStripStocks = async () => {
    try {
      // First ensure categories exist and migrate any uncategorized
      const { data: cats } = await supabase.from('medicine_categories').select('*')
      let alkesCat = cats?.find((c: any) => c.name === 'Alkes')
      let obatCat = cats?.find((c: any) => c.name === 'Obat')

      if (!alkesCat || !obatCat) {
        if (!obatCat) {
          const { data: newObat } = await supabase.from('medicine_categories').insert({ name: 'Obat', description: 'Kategori Obat' }).select().single()
          obatCat = newObat
        }
        if (!alkesCat) {
          const { data: newAlkes } = await supabase.from('medicine_categories').insert({ name: 'Alkes', description: 'Alat Kesehatan / Lab' }).select().single()
          alkesCat = newAlkes
        }
      }

      // Check for uncategorized medicines/alkes
      const { data: uncategorized } = await supabase.from('medicines').select('*').is('category_id', null)
      if (uncategorized && uncategorized.length > 0) {
        for (const m of uncategorized) {
          const name = m.name.toLowerCase()
          const unit = m.unit?.toLowerCase() || ''
          const isAlkes = name.includes('strip') || name.includes('alkes') || unit.includes('pcs') || unit.includes('strip')
          await supabase
            .from('medicines')
            .update({ category_id: isAlkes ? alkesCat.id : obatCat.id })
            .eq('id', m.id)
        }
      }

      const { data } = await supabase
        .from('medicines')
        .select('*, category:medicine_categories(*), batches:medicine_batches(*)')
        .eq('is_active', true)

      if (data) {
        // Filter those under 'Alkes' category
        const alkesItems = data.filter((m: any) => m.category?.name === 'Alkes')
        
        // Sum stock for each alkes
        const alkesWithStock = alkesItems.map((m: any) => {
          const totalStock = m.batches?.reduce((acc: number, b: any) => acc + (b.current_stock || 0), 0) || 0
          return { ...m, total_stock: totalStock }
        })
        
        setAlkesStocks(alkesWithStock)
      }
    } catch (err) {
      console.error('Error fetching strip stocks:', err)
    }
  }

  const deductStripStock = async (testType: string) => {
    try {
      let keyword = ''
      if (testType === 'gula_darah') keyword = 'gula darah'
      else if (testType === 'kolesterol') keyword = 'kolesterol'
      else if (testType === 'asam_urat') keyword = 'asam urat'
      else return

      const { data: meds } = await supabase
        .from('medicines')
        .select('*, category:medicine_categories(*)')
        .ilike('name', `%${keyword}%`)
        .eq('is_active', true)

      if (meds && meds.length > 0) {
        // Filter those under 'Alkes' category
        const alkesMeds = meds.filter((m: any) => m.category?.name === 'Alkes')
        const bestMed = alkesMeds.length > 0 ? alkesMeds[0] : meds[0]

        const medicineId = bestMed.id
        const { data: batches } = await supabase
          .from('medicine_batches')
          .select('*')
          .eq('medicine_id', medicineId)
          .gt('current_stock', 0)
          .order('expired_date', { ascending: true })

        if (batches && batches.length > 0) {
          const batch = batches[0]
          const newQty = Math.max(0, batch.current_stock - 1)
          await supabase
            .from('medicine_batches')
            .update({
              current_stock: newQty,
            })
            .eq('id', batch.id)
        }
      }
    } catch (err) {
      console.error(`Gagal memotong stok strip untuk ${testType}:`, err)
    }
  }

  const fetchQueue = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('queues')
        .select('*, patient:patients(*)')
        .eq('department', 'lab')
        .in('status', ['waiting', 'called', 'in_progress'])
        .order('is_priority', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error
      setQueueList(data || [])
    } catch {
      setQueueList([
        {
          id: '1', visit_id: 'v1', patient_id: 'p1', department: 'lab',
          queue_number: 'L001', status: 'waiting', is_priority: false,
          created_at: new Date().toISOString(),
          patient: { id: 'p1', name: 'Ahmad Slamet', priority_category: 'umum', created_at: '', updated_at: '' } as any,
        },
      ] as Queue[])
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartExam = async (queue: Queue) => {
    setSelectedQueue(queue)
    setLabResults({})
    setInstructedLabTests([])
    setExistingLabRows([])
    setShowLabForm(true)

    try {
      const { data } = await supabase
        .from('laboratory_results')
        .select('*')
        .eq('visit_id', queue.visit_id)
      
      if (data && data.length > 0) {
        setExistingLabRows(data)
        const types = data.map((r: any) => r.test_type)
        setInstructedLabTests(types)
        
        // Pre-fill initial states
        const initialResults: any = {}
        data.forEach((r: any) => {
          initialResults[r.test_type] = {
            result: r.result || '',
            notes: r.notes === 'Rujukan dokter' ? '' : (r.notes || ''),
          }
        })
        setLabResults(initialResults)
      }
    } catch (err) {
      console.error('Failed to fetch existing lab rows:', err)
    }
  }

  const handleLabResultChange = (testType: string, field: 'result' | 'notes', value: string) => {
    setLabResults((prev) => ({
      ...prev,
      [testType]: { ...prev[testType], [field]: value },
    }))
  }

  const handleSubmitResults = async () => {
    if (!selectedQueue) return
    setIsSubmitting(true)

    try {
      // Save lab results
      const entries = Object.entries(labResults).filter(([, v]) => v.result)
      for (const [testType, result] of entries) {
        const testInfo = labTests.find((t) => t.type === testType)
        const existingRecord = existingLabRows.find((r) => r.test_type === testType)

        if (existingRecord) {
          await supabase
            .from('laboratory_results')
            .update({
              result: result.result,
              notes: result.notes,
              examined_by: currentStaff?.id,
              created_at: new Date().toISOString()
            })
            .eq('id', existingRecord.id)
        } else {
          await supabase.from('laboratory_results').insert({
            visit_id: selectedQueue.visit_id,
            test_type: testType,
            result: result.result,
            unit: testInfo?.unit,
            normal_range: testInfo?.normalRange,
            notes: result.notes,
            examined_by: currentStaff?.id,
          })
        }

        // Deduct 1 strip from stock for this test type
        await deductStripStock(testType)
      }

      // Complete queue
      await supabase
        .from('queues')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', selectedQueue.id)

      // Update corresponding Poli queue status to 'back_from_lab'
      await supabase
        .from('queues')
        .update({ status: 'back_from_lab' })
        .eq('visit_id', selectedQueue.visit_id)
        .eq('status', 'referred_to_lab')

      setShowLabForm(false)
      setSelectedQueue(null)
      fetchQueue()
      fetchStripStocks()
    } catch (err) {
      console.error('Submit error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageLayout
      title="Laboratorium"
      subtitle={`Petugas: ${currentStaff?.name || '-'}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Antrean Lab (2/3 width on desktop) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Antrean Lab"
              action={
                <Badge variant="purple" dot pulse={queueList.length > 0}>
                  {queueList.filter((q) => q.status === 'waiting').length} Menunggu
                </Badge>
              }
            />
            <DataTable
              columns={[
                {
                  key: 'queue_number', header: 'No. Antrean', render: (q) => (
                    <span className="font-bold text-lg text-purple-700">{q.queue_number}</span>
                  ),
                },
                { key: 'name', header: 'Nama', render: (q) => q.patient?.name || '-' },
                { key: 'status', header: 'Status', render: (q) => (
                  <Badge variant={q.status === 'waiting' ? 'warning' : 'primary'}>
                    {getStatusLabel(q.status)}
                  </Badge>
                )},
                { key: 'time', header: 'Waktu', render: (q) => formatTime(q.created_at) },
                {
                  key: 'actions', header: 'Aksi', render: (q) => (
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" onClick={() => handleStartExam(q)} leftIcon={<FlaskConical size={14} />}>
                        Input Hasil
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={queueList}
              keyExtractor={(q) => q.id}
              isLoading={isLoading}
              emptyMessage="Tidak ada pasien menunggu lab"
            />
          </Card>
        </div>

        {/* Right Column: Realtime Stok Alkes Lab (1/3 width on desktop) */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader
              title="Stok Alkes Lab"
              action={
                <Badge variant="purple">
                  {alkesStocks.length} Item
                </Badge>
              }
            />
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[70vh] min-h-[300px]">
              {alkesStocks.length === 0 ? (
                <div className="text-center py-8 text-surface-450 italic">
                  <p className="text-sm font-medium">Belum ada alkes terdaftar</p>
                  <p className="text-xs text-surface-400 mt-1">Silakan tambah alkes di menu Kelola Obat/Alkes Admin</p>
                </div>
              ) : (
                alkesStocks.map((alkes) => {
                  const isOut = alkes.total_stock === 0
                  const isLow = alkes.total_stock <= alkes.minimum_stock
                  return (
                    <div key={alkes.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-surface-100 shadow-sm hover:border-purple-200 transition-colors">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-surface-800 text-sm truncate">{alkes.name}</p>
                        <p className="text-[10px] text-surface-400 font-semibold mt-0.5">{alkes.unit}</p>
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full flex-shrink-0 ${
                        isOut ? 'bg-red-100 text-red-700' :
                        isLow ? 'bg-orange-100 text-orange-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {alkes.total_stock} <span className="text-[10px] font-semibold">{alkes.unit}</span>
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>

      </div>

      {/* Lab Results Modal */}
      <Modal isOpen={showLabForm} onClose={() => setShowLabForm(false)} title={`Hasil Lab - ${selectedQueue?.patient?.name}`} size="lg">
        <div className="space-y-6">
          {labTests
            .filter((test: any) => instructedLabTests.length === 0 || instructedLabTests.includes(test.type))
            .map((test: any) => (
            <div key={test.type} className="bg-surface-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-surface-800">{test.label}</h4>
                <span className="text-xs text-surface-400">Normal: {test.normalRange} {test.unit}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder={`Hasil (${test.unit})`}
                  value={labResults[test.type]?.result || ''}
                  onChange={(e) => handleLabResultChange(test.type, 'result', e.target.value)}
                />
                <Input
                  placeholder="Catatan"
                  value={labResults[test.type]?.notes || ''}
                  onChange={(e) => handleLabResultChange(test.type, 'notes', e.target.value)}
                />
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <Button variant="primary" size="lg" className="flex-1" isLoading={isSubmitting} onClick={handleSubmitResults} leftIcon={<Save size={18} />}>
              Simpan Hasil Lab
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setShowLabForm(false)}>Batal</Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  )
}
