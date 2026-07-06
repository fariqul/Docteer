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
  const [stripStocks, setStripStocks] = useState<Record<string, number>>({
    gula_darah: 0,
    kolesterol: 0,
    asam_urat: 0,
  })

  useEffect(() => {
    fetchQueue()
    fetchStripStocks()
  }, [])

  const fetchStripStocks = async () => {
    try {
      const { data } = await supabase
        .from('medicines')
        .select('*, batches:medicine_batches(*)')
        .eq('is_active', true)
        .or('name.ilike.%strip gula darah%,name.ilike.%strip kolesterol%,name.ilike.%strip asam urat%')

      if (data) {
        const stocks = { gula_darah: 0, kolesterol: 0, asam_urat: 0 }
        data.forEach((m: any) => {
          const totalStock = m.batches?.reduce((acc: number, b: any) => acc + (b.quantity || 0), 0) || 0
          const name = m.name.toLowerCase()
          if (name.includes('gula darah') || name.includes('sugar')) {
            stocks.gula_darah = totalStock
          } else if (name.includes('kolesterol') || name.includes('cholesterol')) {
            stocks.kolesterol = totalStock
          } else if (name.includes('asam urat') || name.includes('uric')) {
            stocks.asam_urat = totalStock
          }
        })
        setStripStocks(stocks)
      }
    } catch (err) {
      console.error('Error fetching strip stocks:', err)
    }
  }

  const deductStripStock = async (testType: string) => {
    try {
      let searchPattern = ''
      if (testType === 'gula_darah') searchPattern = 'strip gula darah'
      else if (testType === 'kolesterol') searchPattern = 'strip kolesterol'
      else if (testType === 'asam_urat') searchPattern = 'strip asam urat'
      else return

      const { data: meds } = await supabase
        .from('medicines')
        .select('id')
        .ilike('name', `%${searchPattern}%`)
        .eq('is_active', true)
        .limit(1)

      if (meds && meds.length > 0) {
        const medicineId = meds[0].id
        const { data: batches } = await supabase
          .from('medicine_batches')
          .select('*')
          .eq('medicine_id', medicineId)
          .gt('quantity', 0)
          .order('expired_date', { ascending: true })

        if (batches && batches.length > 0) {
          const batch = batches[0]
          const newQty = Math.max(0, batch.quantity - 1)
          await supabase
            .from('medicine_batches')
            .update({
              quantity: newQty,
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
      {/* Strip Stocks Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { key: 'gula_darah', label: 'Stok Strip Gula Darah', color: 'text-sky-600', bg: 'bg-sky-50/50 border-sky-100' },
          { key: 'kolesterol', label: 'Stok Strip Kolesterol', color: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-100' },
          { key: 'asam_urat', label: 'Stok Strip Asam Urat', color: 'text-violet-600', bg: 'bg-violet-50/50 border-violet-100' },
        ].map((item) => {
          const stock = stripStocks[item.key] || 0
          return (
            <div key={item.key} className={`border rounded-2xl p-4 flex items-center justify-between bg-white shadow-sm ${item.bg}`}>
              <div>
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider">{item.label}</p>
                <p className={`text-2xl font-black mt-1 ${item.color}`}>{stock} <span className="text-xs font-semibold text-surface-400">pcs</span></p>
              </div>
              <FlaskConical className={`w-8 h-8 opacity-45 ${item.color}`} />
            </div>
          )
        })}
      </div>

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
              <div className="grid grid-cols-2 gap-3">
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
