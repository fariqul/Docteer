import React, { useState, useEffect } from 'react'
import {
  HeartPulse,
  Volume2,
  Save,
  FileText,
  Pill,
  Trash2,
  FlaskConical,
  FileSpreadsheet,
} from 'lucide-react'
import { PageLayout } from '../../components/layout'
import { Button, Input, Card, CardHeader, Badge, DataTable } from '../../components/ui'
import { Modal } from '../../components/ui'
import { useAuthStore } from '../../stores'
import { supabase } from '../../lib/supabase'
import { formatTime, getStatusLabel, generateVoiceText } from '../../lib/utils'
import type { Queue, Medicine } from '../../types/database'

interface PrescriptionItemInput {
  medicine_id: string
  medicine_name: string
  quantity: number
  dosage: string
  frequency: string
  duration: string
}

interface ClinicProps {
  department: 'poli_umum' | 'poli_gigi'
  title: string
}

export const Clinic: React.FC<ClinicProps> = ({ department, title }) => {
  const currentStaff = useAuthStore(s => s.staffByDepartment[department])
  const [queueList, setQueueList] = useState<Queue[]>([])
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null)
  const [showExamForm, setShowExamForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Patient detailed vitals & history states
  const [patientDetail, setPatientDetail] = useState<any | null>(null)
  const [patientVitals, setPatientVitals] = useState<any | null>(null)

  // Diagnosis form
  const [diagnosis, setDiagnosis] = useState('')
  const [icd10, setIcd10] = useState('')
  const [procedure, setProcedure] = useState('')
  const [notes, setNotes] = useState('')

  // Prescription
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemInput[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [medicineSearch, setMedicineSearch] = useState('')

  // Refer back to lab
  const [referToLab, setReferToLab] = useState(false)

  useEffect(() => {
    fetchQueue()
    fetchMedicines()
  }, [])

  const fetchQueue = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('queues')
        .select('*, patient:patients(*)')
        .eq('department', department)
        .in('status', ['waiting', 'called', 'in_progress'])
        .order('is_priority', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error
      setQueueList(data || [])
    } catch {
      setQueueList([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMedicines = async () => {
    try {
      const { data } = await supabase
        .from('medicines')
        .select('*, batches:medicine_batches(*)')
        .eq('is_active', true)
        .order('name')
      
      // Calculate total stock for each medicine
      const medsWithStock = data?.map((m: any) => {
        const totalStock = m.batches?.reduce((acc: number, b: any) => acc + b.current_stock, 0) || 0
        return { ...m, total_stock: totalStock }
      }) || []
      
      setMedicines(medsWithStock)
    } catch {
      setMedicines([])
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

    if ('speechSynthesis' in window) {
      const text = generateVoiceText(queue.queue_number, queue.patient?.name || '', department)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'id-ID'
      utterance.rate = 0.9
      speechSynthesis.speak(utterance)
    }
  }

  const handleStartExam = async (queue: Queue) => {
    setSelectedQueue(queue)
    setShowExamForm(true)
    setDiagnosis('')
    setIcd10('')
    setProcedure('')
    setNotes('')
    setPrescriptionItems([])
    setReferToLab(false)
    setPatientDetail(null)
    setPatientVitals(null)

    // 1. Fetch Patient details (Riwayat, Alergi)
    try {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('id', queue.patient_id)
        .single()
      if (data) setPatientDetail(data)
    } catch (err) {
      console.error(err)
    }

    // 2. Fetch Vitals (Bb, Tb, Tensi, Nadi, Suhu, Pernapasan)
    try {
      const { data } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('visit_id', queue.visit_id)
        .order('created_at', { ascending: false })
      if (data && data.length > 0) {
        setPatientVitals(data[0])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const addPrescriptionItem = (medicine: any) => {
    if (prescriptionItems.find((p) => p.medicine_id === medicine.id)) return
    if (medicine.total_stock <= 0) {
      alert('Stok obat habis!')
      return
    }

    setPrescriptionItems((prev) => [
      ...prev,
      {
        medicine_id: medicine.id,
        medicine_name: medicine.name,
        quantity: 1,
        dosage: '1 tablet',
        frequency: '3x sehari',
        duration: '3 hari',
      },
    ])
    setMedicineSearch('')
  }

  const removePrescriptionItem = (medicineId: string) => {
    setPrescriptionItems((prev) => prev.filter((p) => p.medicine_id !== medicineId))
  }

  const updatePrescriptionItem = (medicineId: string, field: keyof PrescriptionItemInput, value: string | number) => {
    setPrescriptionItems((prev) =>
      prev.map((p) => (p.medicine_id === medicineId ? { ...p, [field]: value } : p))
    )
  }

  const handleSubmit = async () => {
    if (!selectedQueue || !diagnosis) return
    setIsSubmitting(true)

    try {
      // Save diagnosis
      await supabase.from('diagnoses').insert({
        visit_id: selectedQueue.visit_id,
        diagnosis,
        icd10_code: icd10 || null,
        notes: notes || null,
        department,
        diagnosed_by: currentStaff?.id,
      })

      // Save procedure if any
      if (procedure) {
        await supabase.from('procedures').insert({
          visit_id: selectedQueue.visit_id,
          procedure_name: procedure,
          performed_by: currentStaff?.id,
        })
      }

      // Save prescription
      if (prescriptionItems.length > 0) {
        const { data: rx } = await supabase
          .from('prescriptions')
          .insert({
            visit_id: selectedQueue.visit_id,
            prescribed_by: currentStaff?.id,
            status: 'pending',
          })
          .select()
          .single()

        if (rx) {
          for (const item of prescriptionItems) {
            await supabase.from('prescription_items').insert({
              prescription_id: rx.id,
              medicine_id: item.medicine_id,
              quantity: item.quantity,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
            })
          }

          // Create pharmacy queue
          let queueNumber = 'F001'
          try {
            const { data: qn } = await supabase.rpc('generate_queue_number', { p_prefix: 'F' })
            if (qn) queueNumber = qn
          } catch { /* use default */ }

          await supabase.from('queues').insert({
            visit_id: selectedQueue.visit_id,
            patient_id: selectedQueue.patient_id,
            department: 'pharmacy',
            queue_number: queueNumber,
            status: 'waiting',
          })

          await supabase.from('queue_histories').insert({
            visit_id: selectedQueue.visit_id,
            from_department: department,
            to_department: 'pharmacy',
            queue_number: queueNumber,
            transferred_by: currentStaff?.id,
          })
        }
      }

      // Refer to lab (non-linear flow / new instruction to lab with new queue number)
      if (referToLab) {
        let labQueueNumber = 'L001'
        try {
          const { data: qn } = await supabase.rpc('generate_queue_number', { p_prefix: 'L' })
          if (qn) labQueueNumber = qn
        } catch { /* use default */ }

        await supabase.from('queues').insert({
          visit_id: selectedQueue.visit_id,
          patient_id: selectedQueue.patient_id,
          department: 'lab',
          queue_number: labQueueNumber,
          status: 'waiting',
        })

        await supabase.from('queue_histories').insert({
          visit_id: selectedQueue.visit_id,
          from_department: department,
          to_department: 'lab',
          queue_number: labQueueNumber,
          transferred_by: currentStaff?.id,
          notes: 'Instruksi lab dari dokter di Poli',
        })
      }

      // Complete current queue
      await supabase
        .from('queues')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', selectedQueue.id)

      setShowExamForm(false)
      setSelectedQueue(null)
      fetchQueue()
    } catch (err) {
      console.error('Submit error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredMedicines = medicineSearch
    ? medicines.filter((m) => m.name.toLowerCase().includes(medicineSearch.toLowerCase()))
    : []

  return (
    <PageLayout title={title} subtitle={`Petugas: ${currentStaff?.name || '-'}`}>
      <Card>
        <CardHeader
          title="Antrean Pasien"
          action={
            <Badge variant={department === 'poli_umum' ? 'accent' : 'info'} dot pulse={queueList.length > 0}>
              {queueList.filter((q) => q.status === 'waiting').length} Menunggu
            </Badge>
          }
        />
        <DataTable
          columns={[
            { key: 'queue_number', header: 'No. Antrean', render: (q) => (
              <span className="font-bold text-lg text-accent-700">{q.queue_number}</span>
            )},
            { key: 'name', header: 'Nama Pasien', render: (q) => q.patient?.name || '-' },
            { key: 'status', header: 'Status', render: (q) => (
              <Badge variant={q.status === 'waiting' ? 'warning' : 'primary'}>{getStatusLabel(q.status)}</Badge>
            )},
            { key: 'time', header: 'Waktu Masuk', render: (q) => formatTime(q.created_at) },
            { key: 'actions', header: 'Aksi', render: (q) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleCallPatient(q)} leftIcon={<Volume2 size={14} />}>Panggil</Button>
                <Button size="sm" variant="primary" onClick={() => handleStartExam(q)} leftIcon={<HeartPulse size={14} />}>Periksa</Button>
              </div>
            )},
          ]}
          data={queueList}
          keyExtractor={(q) => q.id}
          isLoading={isLoading}
          emptyMessage={`Tidak ada pasien menunggu di ${title}`}
        />
      </Card>

      {/* Exam Modal */}
      <Modal isOpen={showExamForm} onClose={() => setShowExamForm(false)} title={`Pemeriksaan Dokter — ${selectedQueue?.patient?.name}`} size="xl">
        <div className="space-y-6">
          {/* Patient Overview: Bb, Tb, Tensi, Nadi, Suhu, Pernapasan, Keluhan, Riwayat, Alergi */}
          <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 space-y-4">
            <h4 className="font-bold text-surface-800 border-b border-surface-200 pb-2 text-sm uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-primary-500" />
              Informasi Medis Pasien
            </h4>
            
            {/* Row 1: Vitals */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 text-center">
              <div className="bg-white p-3 rounded-xl border border-surface-100">
                <p className="text-xs text-surface-500 font-medium">Bb (Weight)</p>
                <p className="text-base font-bold text-surface-800">{patientVitals?.weight ? `${patientVitals.weight} kg` : '-'}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-surface-100">
                <p className="text-xs text-surface-500 font-medium">Tb (Height)</p>
                <p className="text-base font-bold text-surface-800">{patientVitals?.height ? `${patientVitals.height} cm` : '-'}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-surface-100 col-span-2 sm:col-span-1">
                <p className="text-xs text-surface-500 font-medium">Tensi</p>
                <p className="text-base font-bold text-surface-800">
                  {patientVitals?.blood_pressure_systolic && patientVitals?.blood_pressure_diastolic
                    ? `${patientVitals.blood_pressure_systolic}/${patientVitals.blood_pressure_diastolic}`
                    : '-'}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-surface-100">
                <p className="text-xs text-surface-500 font-medium">Nadi</p>
                <p className="text-base font-bold text-surface-800">{patientVitals?.pulse ? `${patientVitals.pulse} bpm` : '-'}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-surface-100">
                <p className="text-xs text-surface-500 font-medium">Suhu</p>
                <p className="text-base font-bold text-surface-800">{patientVitals?.temperature ? `${patientVitals.temperature} °C` : '-'}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-surface-100">
                <p className="text-xs text-surface-500 font-medium">Pernapasan</p>
                <p className="text-base font-bold text-surface-800">{patientVitals?.respiration_rate ? `${patientVitals.respiration_rate} x/m` : '-'}</p>
              </div>
            </div>

            {/* Row 2: Keluhan, Riwayat, Alergi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-white p-4 rounded-xl border border-surface-100">
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Keluhan Utama</p>
                <p className="text-sm text-surface-700 whitespace-pre-line">{patientVitals?.complaint || '-'}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-surface-100">
                <p className="text-xs text-surface-500 font-bold uppercase tracking-wider mb-1">Riwayat Penyakit</p>
                <p className="text-sm text-surface-700 whitespace-pre-line">{patientDetail?.medical_history || '-'}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-surface-100 bg-red-50/30 border-red-100">
                <p className="text-xs text-red-600 font-bold uppercase tracking-wider mb-1">Alergi Obat</p>
                <p className="text-sm text-red-700 font-medium whitespace-pre-line">{patientDetail?.allergies || 'Tidak Ada'}</p>
              </div>
            </div>
          </div>

          {/* Form: Diagnosis */}
          <div>
            <h4 className="text-label text-surface-700 mb-3 flex items-center gap-2 font-bold">
              <FileText size={18} className="text-primary-500" />
              Input Diagnosa & Tindakan
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Diagnosa Utama *" placeholder="Masukkan hasil diagnosa..." value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} required />
              <Input label="Kode ICD-10 (Opsional)" placeholder="Contoh: A00.0" value={icd10} onChange={(e) => setIcd10(e.target.value)} />
            </div>
          </div>

          {/* Form: Action/Tindakan */}
          <Input label="Tindakan Medis (Opsional)" placeholder="Tuliskan tindakan medis yang diberikan..." value={procedure} onChange={(e) => setProcedure(e.target.value)} />

          {/* Form: Doctor Notes */}
          <div>
            <label className="block text-label text-surface-700 mb-1.5">Catatan Tambahan (Opsional)</label>
            <textarea
              placeholder="Tambahkan catatan khusus..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-surface-200 px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              rows={2}
            />
          </div>

          {/* Form: Realtime Prescription */}
          <div>
            <h4 className="text-label text-surface-700 mb-3 flex items-center gap-2 font-bold">
              <Pill size={18} className="text-accent-500" />
              Resep Obat (Terintegrasi Realtime)
            </h4>
            <div className="relative mb-3">
              <Input
                placeholder="Cari obat dari stok klinik..."
                value={medicineSearch}
                onChange={(e) => setMedicineSearch(e.target.value)}
              />
              {filteredMedicines.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-surface-200 rounded-xl shadow-lg mt-1 max-h-[200px] overflow-y-auto">
                  {filteredMedicines.map((m: any) => (
                    <button
                      key={m.id}
                      onClick={() => addPrescriptionItem(m)}
                      className="w-full px-4 py-3 text-left hover:bg-primary-50 transition-colors flex justify-between items-center"
                    >
                      <span className="font-medium text-surface-800">{m.name}</span>
                      <span className="text-xs bg-surface-100 text-surface-600 px-2 py-1 rounded-full">
                        Stok: {m.total_stock} {m.unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {prescriptionItems.length > 0 && (
              <div className="space-y-3">
                {prescriptionItems.map((item) => {
                  const med = medicines.find(m => m.id === item.medicine_id) as any
                  return (
                    <div key={item.medicine_id} className="bg-surface-50 rounded-xl p-4 border border-surface-100">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-surface-800">{item.medicine_name}</p>
                        <button onClick={() => removePrescriptionItem(item.medicine_id)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Input
                            placeholder="Jumlah"
                            type="number"
                            min="1"
                            max={med ? String(med.total_stock) : undefined}
                            value={item.quantity}
                            onChange={(e) => updatePrescriptionItem(item.medicine_id, 'quantity', parseInt(e.target.value) || 1)}
                          />
                          {med && item.quantity > med.total_stock && (
                            <p className="text-xs text-red-500 mt-1">Melebihi stok ({med.total_stock})</p>
                          )}
                        </div>
                        <Input placeholder="Dosis (1 tab)" value={item.dosage} onChange={(e) => updatePrescriptionItem(item.medicine_id, 'dosage', e.target.value)} />
                        <Input placeholder="Frekuensi (3x sehari)" value={item.frequency} onChange={(e) => updatePrescriptionItem(item.medicine_id, 'frequency', e.target.value)} />
                        <Input placeholder="Durasi (3 hari)" value={item.duration} onChange={(e) => updatePrescriptionItem(item.medicine_id, 'duration', e.target.value)} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Form: Rujuk Balik / Instruksi Lab */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={referToLab}
                onChange={(e) => setReferToLab(e.target.checked)}
                className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <p className="font-semibold text-amber-800 flex items-center gap-2">
                  <FlaskConical size={16} /> Kirim Instruksi ke Laboratorium
                </p>
                <p className="text-sm text-amber-600">Buat nomor antrean rujukan Lab baru untuk pasien ini</p>
              </div>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="primary" size="lg" className="flex-1 text-base py-3" isLoading={isSubmitting} onClick={handleSubmit} disabled={!diagnosis} leftIcon={<Save size={18} />}>
              Simpan & Rujuk ke Apotek
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setShowExamForm(false)}>Batal</Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  )
}
