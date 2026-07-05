import React, { useState, useEffect } from 'react'
import {
  FlaskConical,
  Volume2,
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

  useEffect(() => {
    fetchQueue()
  }, [])

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

  const handleCallPatient = async (queue: Queue) => {
    try {
      await supabase
        .from('queues')
        .update({ status: 'called', called_at: new Date().toISOString() })
        .eq('id', queue.id)
      fetchQueue()
    } catch (err) {
      console.error(err)
    }
  }

  const handleStartExam = (queue: Queue) => {
    setSelectedQueue(queue)
    setLabResults({})
    setShowLabForm(true)
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

      // Complete queue
      await supabase
        .from('queues')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', selectedQueue.id)

      setShowLabForm(false)
      setSelectedQueue(null)
      fetchQueue()
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
                  <Button size="sm" variant="outline" onClick={() => handleCallPatient(q)} leftIcon={<Volume2 size={14} />}>
                    Panggil
                  </Button>
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
          {labTests.map((test) => (
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
