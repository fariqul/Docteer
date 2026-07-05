import React, { useState, useEffect } from 'react'
import {
  Volume2,
  CheckCircle2,
  Printer,
  Package,
} from 'lucide-react'
import { PageLayout } from '../../components/layout'
import { Button, Card, CardHeader, Badge } from '../../components/ui'
import { useAuthStore } from '../../stores'
import { supabase } from '../../lib/supabase'
import { formatTime, getStatusLabel } from '../../lib/utils'
import type { Prescription } from '../../types/database'

export const Pharmacy: React.FC = () => {
  const currentStaff = useAuthStore(s => s.staffByDepartment['pharmacy'])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchPrescriptions()
  }, [])

  const fetchPrescriptions = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          visit:patient_visits(*, patient:patients(*)),
          items:prescription_items(*, medicine:medicines(*))
        `)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: true })

      if (error) throw error
      setPrescriptions(data || [])
    } catch {
      // Demo data
      setPrescriptions([
        {
          id: 'rx1',
          visit_id: 'v1',
          status: 'pending',
          created_at: new Date().toISOString(),
          visit: {
            id: 'v1', patient_id: 'p1', visit_date: new Date().toISOString().split('T')[0],
            queue_number: 'F001', status: 'active', is_priority: false, created_at: '',
            patient: { id: 'p1', name: 'Ahmad Slamet', priority_category: 'umum', created_at: '', updated_at: '' },
          },
          items: [
            { id: 'i1', prescription_id: 'rx1', medicine_id: 'm1', quantity: 10, dosage: '1 tablet', frequency: '3x sehari', duration: '3 hari', medicine: { id: 'm1', name: 'Paracetamol 500mg', unit: 'tablet', price: 500, minimum_stock: 10, is_active: true, created_at: '' } },
            { id: 'i2', prescription_id: 'rx1', medicine_id: 'm4', quantity: 10, dosage: '1 tablet', frequency: '1x sehari', duration: '10 hari', medicine: { id: 'm4', name: 'Vitamin C 500mg', unit: 'tablet', price: 300, minimum_stock: 10, is_active: true, created_at: '' } },
          ],
        } as any,
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCallPatient = async (rx: Prescription) => {
    try {
      const { data: queues } = await supabase
        .from('queues')
        .select('*')
        .eq('visit_id', rx.visit_id)
        .eq('department', 'pharmacy')
        .limit(1)

      if (queues && queues.length > 0) {
        await supabase
          .from('queues')
          .update({ status: 'called', called_at: new Date().toISOString() })
          .eq('id', queues[0].id)
      }
      fetchPrescriptions()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDispense = async (rx: Prescription) => {
    setIsProcessing(true)
    try {
      // Update prescription status
      await supabase
        .from('prescriptions')
        .update({
          status: 'dispensed',
          dispensed_by: currentStaff?.id,
          dispensed_at: new Date().toISOString(),
        })
        .eq('id', rx.id)

      // Reduce stock for each item using FEFO logic
      const items = (rx as any).items || []
      for (const item of items) {
        // 1. Fetch active batches for this medicine ordered by expired_date ASC (FEFO)
        const { data: batches } = await supabase
          .from('medicine_batches')
          .select('*')
          .eq('medicine_id', item.medicine_id)
          .gt('quantity', 0)
          .order('expired_date', { ascending: true })

        let remainingQty = item.quantity

        if (batches && batches.length > 0) {
          for (const batch of batches) {
            if (remainingQty <= 0) break

            const deductQty = Math.min(batch.quantity, remainingQty)
            const newStock = batch.quantity - deductQty

            // 2. Update the batch's current stock
            await supabase
              .from('medicine_batches')
              .update({
                quantity: newStock,
                current_stock: newStock
              })
              .eq('id', batch.id)

            // 3. Log the medicine transaction for this specific batch
            await supabase.from('medicine_transactions').insert({
              medicine_id: item.medicine_id,
              batch_id: batch.id,
              prescription_item_id: item.id,
              transaction_type: 'out',
              quantity: deductQty,
              performed_by: currentStaff?.id,
              notes: `Dispensed batch ${batch.batch_number} for prescription ${rx.id}`,
            })

            remainingQty -= deductQty
          }
        } else {
          // Fallback: If no batches found (e.g. initial setup without batches), log transaction without batch
          await supabase.from('medicine_transactions').insert({
            medicine_id: item.medicine_id,
            prescription_item_id: item.id,
            transaction_type: 'out',
            quantity: item.quantity,
            performed_by: currentStaff?.id,
            notes: `Dispensed (no batch found) for prescription ${rx.id}`,
          })
        }
      }

      // Complete pharmacy queue
      const { data: queues } = await supabase
        .from('queues')
        .select('*')
        .eq('visit_id', rx.visit_id)
        .eq('department', 'pharmacy')
        .in('status', ['waiting', 'called', 'in_progress'])
        .limit(1)

      if (queues && queues.length > 0) {
        await supabase
          .from('queues')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', queues[0].id)
      }

      // Complete visit
      await supabase
        .from('patient_visits')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', rx.visit_id)

      fetchPrescriptions()
    } catch (err) {
      console.error('Dispense error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrintReceipt = (rx: Prescription) => {
    const items = (rx as any).items || []
    const patientName = (rx as any).visit?.patient?.name || 'Pasien'

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk Obat</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body { font-family: 'Courier New', monospace; font-size: 10px; width: 58mm; margin: 0; padding: 2mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .item { margin: 3px 0; }
          .flex { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="center bold">DOCTEER CLINIC</div>
        <div class="center">Bakti Sosial Puskesmas</div>
        <div class="divider"></div>
        <div class="flex"><span>Pasien:</span><span class="bold">${patientName}</span></div>
        <div class="flex"><span>Tanggal:</span><span>${new Date().toLocaleDateString('id-ID')}</span></div>
        <div class="flex"><span>Waktu:</span><span>${new Date().toLocaleTimeString('id-ID')}</span></div>
        <div class="divider"></div>
        <div class="bold">OBAT:</div>
        ${items.map((item: any) => `
          <div class="item">
            <div class="bold">${item.medicine?.name || '-'}</div>
            <div>${item.dosage || ''} - ${item.frequency || ''}</div>
            <div>Jumlah: ${item.quantity} ${item.medicine?.unit || ''}</div>
            <div>Durasi: ${item.duration || '-'}</div>
          </div>
        `).join('<div class="divider"></div>')}
        <div class="divider"></div>
        <div class="center">** GRATIS - BAKTI SOSIAL **</div>
        <div class="center" style="margin-top:4px;">Semoga lekas sembuh!</div>
        <div class="center" style="margin-top:8px; font-size:8px;">Dicetak oleh: ${currentStaff?.name || '-'}</div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank', 'width=300,height=600')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    }
  }

  return (
    <PageLayout title="Farmasi" subtitle={`Petugas: ${currentStaff?.name || '-'}`}>
      <Card>
        <CardHeader
          title="Resep Obat"
          action={
            <Badge variant="danger" dot pulse={prescriptions.filter((r) => r.status === 'pending').length > 0}>
              {prescriptions.filter((r) => r.status === 'pending').length} Pending
            </Badge>
          }
        />

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-50 rounded-xl p-4 animate-pulse">
                <div className="h-5 bg-surface-200 rounded w-1/3 mb-3" />
                <div className="h-4 bg-surface-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-12 text-surface-400">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-body-lg">Belum ada resep masuk</p>
          </div>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((rx) => {
              const visit = (rx as any).visit
              const items = (rx as any).items || []
              const patientName = visit?.patient?.name || 'Pasien'
              const queueNum = visit?.queue_number || '-'

              return (
                <div key={rx.id} className="bg-surface-50 rounded-xl p-5 border border-surface-200 hover:border-primary-200 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-primary-700">{queueNum}</span>
                      <div>
                        <p className="font-semibold text-surface-800">{patientName}</p>
                        <p className="text-sm text-surface-500">{formatTime(rx.created_at)}</p>
                      </div>
                    </div>
                    <Badge variant={rx.status === 'pending' ? 'warning' : rx.status === 'ready' ? 'accent' : 'primary'}>
                      {getStatusLabel(rx.status)}
                    </Badge>
                  </div>

                  {/* Medicine list */}
                  <div className="space-y-2 mb-4">
                    {items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                        <div>
                          <p className="font-medium text-surface-800">{item.medicine?.name}</p>
                          <p className="text-sm text-surface-500">
                            {item.dosage} - {item.frequency} - {item.duration}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{item.quantity}</p>
                          <p className="text-xs text-surface-400">{item.medicine?.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleCallPatient(rx)} leftIcon={<Volume2 size={14} />}>
                      Panggil
                    </Button>
                    <Button size="sm" variant="accent" onClick={() => handleDispense(rx)} isLoading={isProcessing} leftIcon={<CheckCircle2 size={14} />}>
                      Serahkan Obat
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handlePrintReceipt(rx)} leftIcon={<Printer size={14} />}>
                      Cetak Struk
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </PageLayout>
  )
}
