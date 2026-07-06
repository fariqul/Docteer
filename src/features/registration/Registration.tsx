import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  UserPlus,
  Users,
  CheckCircle2,
  Weight,
  Ruler,
} from 'lucide-react'
import { PageLayout } from '../../components/layout'
import { Button, Input, Textarea, Card, CardHeader, Badge, DataTable } from '../../components/ui'
import { useAuthStore, useToastStore } from '../../stores'
import { supabase } from '../../lib/supabase'
import { formatTime, getStatusLabel } from '../../lib/utils'
import type { Patient, PatientVisit } from '../../types/database'

const patientSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  age: z.string().min(1, 'Umur wajib diisi'),
  address: z.string().min(2, 'Alamat wajib diisi'),
  weight: z.string().optional(),
  height: z.string().optional(),
  complaint: z.string().min(1, 'Keluhan wajib diisi'),
  medical_history: z.string().optional(),
  allergies: z.string().optional(),
})

type PatientFormData = z.infer<typeof patientSchema>

export const Registration: React.FC = () => {
  const currentStaff = useAuthStore(s => s.staffByDepartment['registration'])
  const [activeTab, setActiveTab] = useState<'register' | 'list'>('register')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastQueueNumber, setLastQueueNumber] = useState('')
  const [todayVisits, setTodayVisits] = useState<(PatientVisit & { patient?: Patient })[]>([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema) as any,
    defaultValues: {
      name: '',
      age: '',
      address: '',
      weight: '',
      height: '',
      complaint: '',
      medical_history: '',
      allergies: '',
    },
  })

  const fetchTodayVisits = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('patient_visits')
        .select('*, patient:patients(*)')
        .eq('visit_date', today)
        .order('created_at', { ascending: false })
      setTodayVisits(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  React.useEffect(() => {
    fetchTodayVisits()
  }, [activeTab])

  const onSubmit = async (data: PatientFormData) => {
    setIsSubmitting(true)

    try {
      // 1. Create Patient
      // We store age as date_of_birth calculated from age or we can store age directly if we add it to the schema.
      // To keep it simple, we calculate a rough date_of_birth: CurrentYear - Age-01-01
      const birthYear = new Date().getFullYear() - parseInt(data.age)
      const dateOfBirth = `${birthYear}-01-01`

      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({
          name: data.name,
          date_of_birth: dateOfBirth,
          address: data.address,
          medical_history: data.medical_history || '',
          allergies: data.allergies || '',
        })
        .select()
        .single()

      if (patientError) throw patientError
      const patientId = newPatient.id

      // 2. Generate queue number via DB function
      let queueNumber = 'T001' // Default prefix for Pemeriksaan Awal
      try {
        const { data: qn, error: qnError } = await supabase.rpc('generate_queue_number', {
          p_prefix: 'T',
        })
        if (qnError) throw qnError
        queueNumber = qn
      } catch {
        const count = todayVisits.length + 1
        queueNumber = `T${String(count).padStart(3, '0')}`
      }

      // 3. Create Visit
      const { data: newVisit, error: visitError } = await supabase
        .from('patient_visits')
        .insert({
          patient_id: patientId,
          queue_number: queueNumber,
          complaint: data.complaint,
          status: 'waiting_triage',
          registered_by: currentStaff?.id,
        })
        .select()
        .single()

      if (visitError) throw visitError

      // 4. Create initial Vital Sign with BB/TB
      await supabase.from('vital_signs').insert({
        visit_id: newVisit.id,
        weight: data.weight ? parseFloat(data.weight) : null,
        height: data.height ? parseFloat(data.height) : null,
        complaint: data.complaint,
        examined_by: currentStaff?.id,
      })

      // 5. Create queue entry for Triage (Pemeriksaan Awal)
      await supabase.from('queues').insert({
        visit_id: newVisit.id,
        patient_id: patientId,
        department: 'triage',
        queue_number: queueNumber,
        status: 'waiting',
      })

      // Log activity
      await supabase.from('activity_logs').insert({
        staff_id: currentStaff?.id,
        module: 'registration',
        action: 'create_patient',
        patient_id: patientId,
        details: { queue_number: queueNumber },
      })

      setLastQueueNumber(queueNumber)
      setShowSuccess(true)
      useToastStore.getState().showToast(`Pasien "${data.name}" berhasil didaftarkan dengan nomor antrean ${queueNumber}!`, 'success')
      reset()
      setTimeout(() => setShowSuccess(false), 5000)
    } catch (err: any) {
      console.error('Registration error:', err)
      useToastStore.getState().showToast(`Gagal mendaftarkan pasien: ${err.message || err}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageLayout
      title="Pendaftaran Pasien"
      subtitle={`Petugas: ${currentStaff?.name || '-'}`}
      actions={
        <div className="flex gap-2">
          <Button variant={activeTab === 'register' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('register')} leftIcon={<UserPlus size={16} />}>
            Daftar Baru
          </Button>
          <Button variant={activeTab === 'list' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('list')} leftIcon={<Users size={16} />}>
            Daftar Hari Ini
          </Button>
        </div>
      }
    >
      {showSuccess && (
        <div className="mb-6 bg-accent-50 border border-accent-200 rounded-2xl p-4 flex items-center gap-4 animate-slide-up">
          <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="text-accent-600" size={24} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-accent-800">Pendaftaran Berhasil!</p>
            <p className="text-sm text-accent-600">
              Pasien terdaftar di antrean Pemeriksaan Awal dengan nomor: <span className="font-bold text-lg">{lastQueueNumber}</span>
            </p>
          </div>
          <Button variant="accent" size="sm" onClick={() => setShowSuccess(false)}>Tutup</Button>
        </div>
      )}

      {activeTab === 'register' ? (
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader title="Form Pendaftaran Pasien" subtitle="Masukkan data pasien untuk memulai pelayanan" />
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nama Lengkap *" placeholder="Masukkan nama lengkap..." {...register('name')} error={errors.name?.message} />
                <Input label="Umur (Tahun) *" type="number" placeholder="Contoh: 25" {...register('age')} error={errors.age?.message} />
              </div>

              <Input label="Alamat Lengkap *" placeholder="Masukkan alamat..." {...register('address')} error={errors.address?.message} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Berat Badan (Bb) - kg" type="number" step="0.1" placeholder="Contoh: 60" {...register('weight')} leftIcon={<Weight size={18} />} />
                <Input label="Tinggi Badan (Tb) - cm" type="number" step="0.1" placeholder="Contoh: 165" {...register('height')} leftIcon={<Ruler size={18} />} />
              </div>

              <Textarea label="Keluhan Utama *" placeholder="Tuliskan keluhan yang dirasakan pasien..." {...register('complaint')} error={errors.complaint?.message} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Textarea label="Riwayat Penyakit" placeholder="Contoh: Hipertensi, Asma..." {...register('medical_history')} />
                <Textarea label="Alergi Obat" placeholder="Contoh: Alergi Penicillin..." {...register('allergies')} />
              </div>

              <div className="pt-4 flex gap-2">
                <Button type="submit" variant="primary" size="lg" className="flex-1 text-base py-3" isLoading={isSubmitting}>
                  Daftarkan Pasien & Mulai Antrean
                </Button>
                <Button type="button" variant="secondary" size="lg" onClick={() => reset()}>
                  Reset
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader title="Pasien Terdaftar Hari Ini" subtitle={`Total: ${todayVisits.length} pasien`} />
          <DataTable
            columns={[
              { key: 'queue_number', header: 'No. Antrean', render: (v: PatientVisit & { patient?: Patient }) => <span className="font-bold text-primary-700">{v.queue_number}</span> },
              { key: 'name', header: 'Nama Pasien', render: (v: PatientVisit & { patient?: Patient }) => v.patient?.name || '-' },
              { key: 'age', header: 'Umur', render: (v: PatientVisit & { patient?: Patient }) => {
                if (!v.patient?.date_of_birth) return '-'
                const birthYear = new Date(v.patient.date_of_birth).getFullYear()
                const currentYear = new Date().getFullYear()
                return `${currentYear - birthYear} Tahun`
              }},
              { key: 'address', header: 'Alamat', render: (v: PatientVisit & { patient?: Patient }) => v.patient?.address || '-' },
              { key: 'complaint', header: 'Keluhan', render: (v: PatientVisit & { patient?: Patient }) => <span className="text-sm text-surface-600 truncate max-w-[200px] block">{v.complaint || '-'}</span> },
              { key: 'status', header: 'Status', render: (v: PatientVisit & { patient?: Patient }) => <Badge variant={v.status === 'completed' ? 'accent' : 'warning'}>{getStatusLabel(v.status)}</Badge> },
              { key: 'created_at', header: 'Waktu Daftar', render: (v: PatientVisit & { patient?: Patient }) => formatTime(v.created_at) },
            ]}
            data={todayVisits}
            keyExtractor={(v) => v.id}
            emptyMessage="Belum ada pasien terdaftar hari ini"
          />
        </Card>
      )}
    </PageLayout>
  )
}
