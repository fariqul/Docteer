import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Stethoscope,
  ArrowRight,
  Heart,
  Thermometer,
  Activity,
  Wind,
} from 'lucide-react'
import { PageLayout } from '../../components/layout'
import { Button, Input, Card, CardHeader, Badge, DataTable } from '../../components/ui'
import { Modal } from '../../components/ui'
import { useAuthStore } from '../../stores'
import { supabase } from '../../lib/supabase'
import { formatTime, getStatusLabel } from '../../lib/utils'
import type { Queue } from '../../types/database'

const vitalSignsSchema = z.object({
  blood_pressure_systolic: z.string().min(1, 'Sistolik wajib diisi'),
  blood_pressure_diastolic: z.string().min(1, 'Diastolik wajib diisi'),
  pulse: z.string().min(1, 'Nadi wajib diisi'),
  temperature: z.string().min(1, 'Suhu wajib diisi'),
  respiration_rate: z.string().min(1, 'Pernapasan wajib diisi'),
})

type VitalSignsForm = z.infer<typeof vitalSignsSchema>

export const Triage: React.FC = () => {
  const currentStaff = useAuthStore(s => s.staffByDepartment['triage'])
  const [queueList, setQueueList] = useState<Queue[]>([])
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null)
  const [showExamForm, setShowExamForm] = useState(false)
  const [destinations, setDestinations] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [existingVitals, setExistingVitals] = useState<any | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VitalSignsForm>({
    resolver: zodResolver(vitalSignsSchema) as any,
    defaultValues: {
      blood_pressure_systolic: '',
      blood_pressure_diastolic: '',
      pulse: '',
      temperature: '',
      respiration_rate: '',
    },
  })

  useEffect(() => {
    fetchQueue()
  }, [])

  const fetchQueue = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('queues')
        .select('*, patient:patients(*)')
        .eq('department', 'triage')
        .in('status', ['waiting', 'called', 'in_progress'])
        .order('is_priority', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error
      setQueueList(data || [])
    } catch (err) {
      console.error('Fetch queue error:', err)
      setQueueList([])
    } finally {
      setIsLoading(false)
    }
  }



  const handleStartExam = async (queue: Queue) => {
    setSelectedQueue(queue)
    setShowExamForm(true)
    setDestinations([])
    setExistingVitals(null)

    // Fetch existing vital signs (weight/height entered during registration)
    try {
      const { data } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('visit_id', queue.visit_id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        setExistingVitals(data[0])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleDestination = (dest: string) => {
    setDestinations((prev) =>
      prev.includes(dest) ? prev.filter((d) => d !== dest) : [...prev, dest]
    )
  }

  const onSubmitVitals = async (data: VitalSignsForm) => {
    if (!selectedQueue || destinations.length === 0) return
    setIsSubmitting(true)

    try {
      // Update vital signs (we update the existing vital signs that has weight/height, or insert if none)
      if (existingVitals) {
        await supabase
          .from('vital_signs')
          .update({
            blood_pressure_systolic: parseInt(data.blood_pressure_systolic),
            blood_pressure_diastolic: parseInt(data.blood_pressure_diastolic),
            pulse: parseInt(data.pulse),
            temperature: parseFloat(data.temperature),
            respiration_rate: parseInt(data.respiration_rate),
            destinations: destinations,
            examined_by: currentStaff?.id,
          })
          .eq('id', existingVitals.id)
      } else {
        await supabase.from('vital_signs').insert({
          visit_id: selectedQueue.visit_id,
          blood_pressure_systolic: parseInt(data.blood_pressure_systolic),
          blood_pressure_diastolic: parseInt(data.blood_pressure_diastolic),
          pulse: parseInt(data.pulse),
          temperature: parseFloat(data.temperature),
          respiration_rate: parseInt(data.respiration_rate),
          destinations: destinations,
          examined_by: currentStaff?.id,
        })
      }

      // Update current queue status
      await supabase
        .from('queues')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', selectedQueue.id)

      // Create queue entries for destinations
      for (const dest of destinations) {
        const prefix = dest === 'lab' ? 'L' : dest === 'poli_umum' ? 'PU' : 'PG'

        let queueNumber = `${prefix}001`
        try {
          const { data: qn } = await supabase.rpc('generate_queue_number', { p_prefix: prefix })
          if (qn) queueNumber = qn
        } catch { /* use default */ }

        await supabase.from('queues').insert({
          visit_id: selectedQueue.visit_id,
          patient_id: selectedQueue.patient_id,
          department: dest,
          queue_number: queueNumber,
          status: 'waiting',
          is_priority: selectedQueue.is_priority,
        })

        // Queue history
        await supabase.from('queue_histories').insert({
          visit_id: selectedQueue.visit_id,
          from_department: 'triage',
          to_department: dest,
          queue_number: queueNumber,
          transferred_by: currentStaff?.id,
        })
      }

      setShowExamForm(false)
      setSelectedQueue(null)
      reset()
      fetchQueue()
    } catch (err) {
      console.error('Submit error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const waitingCount = queueList.filter((q) => q.status === 'waiting').length

  return (
    <PageLayout
      title="Pemeriksaan Awal (Triage)"
      subtitle={`Petugas: ${currentStaff?.name || '-'} | ${waitingCount} pasien menunggu`}
    >
      <Card className="mb-6">
        <CardHeader
          title="Antrean Pemeriksaan Awal"
          action={
            <Badge variant="warning" dot pulse={waitingCount > 0}>
              {waitingCount} Menunggu
            </Badge>
          }
        />
        <DataTable
          columns={[
            {
              key: 'queue_number', header: 'No. Antrean', render: (q) => (
                <span className="font-bold text-lg text-primary-700">{q.queue_number}</span>
              ),
            },
            { key: 'name', header: 'Nama Pasien', render: (q) => q.patient?.name || '-' },
            { key: 'status', header: 'Status', render: (q) => (
              <Badge variant={q.status === 'called' ? 'primary' : q.status === 'in_progress' ? 'accent' : 'warning'}>
                {getStatusLabel(q.status)}
              </Badge>
            )},
            { key: 'time', header: 'Waktu', render: (q) => formatTime(q.created_at) },
            {
              key: 'actions', header: 'Aksi', render: (q) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" onClick={() => handleStartExam(q)} leftIcon={<Stethoscope size={14} />}>
                    Periksa
                  </Button>
                </div>
              ),
            },
          ]}
          data={queueList}
          keyExtractor={(q) => q.id}
          isLoading={isLoading}
          emptyMessage="Tidak ada pasien menunggu pemeriksaan awal"
        />
      </Card>

      {/* Examination Modal */}
      <Modal
        isOpen={showExamForm}
        onClose={() => setShowExamForm(false)}
        title={`Pemeriksaan Tanda Vital — ${selectedQueue?.patient?.name || ''}`}
        size="lg"
      >
        {/* Read-only Weight & Height from Pendaftaran */}
        {existingVitals && (
          <div className="mb-6 bg-primary-50 border border-primary-100 rounded-xl p-4 flex justify-around text-center">
            <div>
              <p className="text-xs text-primary-600 font-semibold uppercase tracking-wider">Berat Badan (Bb)</p>
              <p className="text-xl font-bold text-primary-800">{existingVitals.weight ? `${existingVitals.weight} kg` : '-'}</p>
            </div>
            <div className="border-l border-primary-200" />
            <div>
              <p className="text-xs text-primary-600 font-semibold uppercase tracking-wider">Tinggi Badan (Tb)</p>
              <p className="text-xl font-bold text-primary-800">{existingVitals.height ? `${existingVitals.height} cm` : '-'}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmitVitals)} className="space-y-6">
          <div>
            <h4 className="text-label text-surface-700 mb-3 flex items-center gap-2 font-bold">
              <Activity size={18} className="text-primary-500" />
              Input Tanda Vital Pasien
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-label text-surface-700 mb-1.5">Tekanan Darah (Tensi) *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Sistolik (e.g. 120)"
                    {...register('blood_pressure_systolic')}
                    className="w-full rounded-xl border border-surface-200 px-3 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary-400"
                    required
                  />
                  <span className="text-surface-400 font-bold">/</span>
                  <input
                    type="number"
                    placeholder="Diastolik (e.g. 80)"
                    {...register('blood_pressure_diastolic')}
                    className="w-full rounded-xl border border-surface-200 px-3 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary-400"
                    required
                  />
                </div>
                {(errors.blood_pressure_systolic || errors.blood_pressure_diastolic) && (
                  <p className="mt-1 text-xs text-red-500">Tensi lengkap wajib diisi</p>
                )}
              </div>

              <Input label="Nadi (bpm) *" type="number" placeholder="Contoh: 80" {...register('pulse')} error={errors.pulse?.message} leftIcon={<Heart size={16} />} />
              <Input label="Suhu (°C) *" type="number" step="0.1" placeholder="Contoh: 36.5" {...register('temperature')} error={errors.temperature?.message} leftIcon={<Thermometer size={16} />} />
              <Input label="Pernapasan (x/menit) *" type="number" placeholder="Contoh: 18" {...register('respiration_rate')} error={errors.respiration_rate?.message} leftIcon={<Wind size={16} />} />
            </div>
          </div>

          {/* Destinations */}
          <div>
            <h4 className="text-label text-surface-700 mb-3 font-bold">Tentukan Tujuan Rujukan *</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'lab', label: 'Laboratorium', color: 'purple' },
                { value: 'poli_umum', label: 'Poli Umum', color: 'green' },
                { value: 'poli_gigi', label: 'Poli Gigi', color: 'cyan' },
              ].map((dest) => (
                <button
                  key={dest.value}
                  type="button"
                  onClick={() => toggleDestination(dest.value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    destinations.includes(dest.value)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-surface-200 text-surface-600 hover:border-primary-300'
                  }`}
                >
                  <p className="font-semibold">{dest.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              disabled={destinations.length === 0}
              leftIcon={<ArrowRight size={18} />}
              className="flex-1"
            >
              Selesai & Rujuk Pasien
            </Button>
            <Button type="button" variant="secondary" size="lg" onClick={() => setShowExamForm(false)}>
              Batal
            </Button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  )
}
