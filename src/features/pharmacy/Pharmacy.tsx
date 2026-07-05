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

export const Pharmacy: React.FC = () => {
  const currentStaff = useAuthStore(s => s.staffByDepartment['pharmacy'])
  const [queues, setQueues] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchPharmacyQueues()
  }, [])

  const fetchPharmacyQueues = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('queues')
        .select(`
          *,
          patient:patients(*),
          visit:patient_visits(
            *,
            prescriptions(
              *,
              items:prescription_items(
                *,
                medicine:medicines(*)
              )
            )
          )
        `)
        .eq('department', 'pharmacy')
        .in('status', ['waiting', 'called', 'in_progress'])
        .order('is_priority', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error
      setQueues(data || [])
    } catch (err) {
      console.error('Fetch pharmacy queues error:', err)
      setQueues([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCallPatient = async (queue: any) => {
    try {
      await supabase
        .from('queues')
        .update({ status: 'called', called_at: new Date().toISOString() })
        .eq('id', queue.id)
      fetchPharmacyQueues()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDispense = async (queue: any) => {
    setIsProcessing(true)
    try {
      const prescriptions = queue.visit?.prescriptions || []
      const rx = prescriptions[0]

      if (rx) {
        // Reduce stock for each item using FEFO logic
        const items = rx.items || []
        for (const item of items) {
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

              // Update both quantity and current_stock
              await supabase
                .from('medicine_batches')
                .update({
                  quantity: newStock,
                  current_stock: newStock
                })
                .eq('id', batch.id)

              // Log transaction
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
            // Fallback
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

        // Update prescription status
        await supabase
          .from('prescriptions')
          .update({ status: 'completed' })
          .eq('id', rx.id)
      }

      // Complete pharmacy queue
      await supabase
        .from('queues')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', queue.id)

      // Complete patient visit
      await supabase
        .from('patient_visits')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', queue.visit_id)

      alert('Kunjungan selesai dan pelayanan obat diproses!')
      fetchPharmacyQueues()
    } catch (err) {
      console.error('Dispense error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrintReceipt = (queue: any) => {
    const rx = queue.visit?.prescriptions?.[0]
    const items = rx?.items || []
    const patientName = queue.patient?.name || 'Pasien'

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
        <div class="flex"><span>Nomor:</span><span class="bold">${queue.queue_number}</span></div>
        <div class="flex"><span>Tanggal:</span><span>${new Date().toLocaleDateString('id-ID')}</span></div>
        <div class="flex"><span>Waktu:</span><span>${new Date().toLocaleTimeString('id-ID')}</span></div>
        <div class="divider"></div>
        <div class="bold">OBAT:</div>
        ${items.length === 0 ? '<div class="center">Tidak Ada Resep Obat</div>' : items.map((item: any) => `
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
          title="Antrean Farmasi & Apotek"
          action={
            <Badge variant="danger" dot pulse={queues.filter((q) => q.status === 'waiting').length > 0}>
              {queues.filter((q) => q.status === 'waiting').length} Pending
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
        ) : queues.length === 0 ? (
          <div className="text-center py-12 text-surface-400">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-body-lg">Belum ada antrean masuk</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queues.map((queue) => {
              const patientName = queue.patient?.name || 'Pasien'
              const rx = queue.visit?.prescriptions?.[0]
              const items = rx?.items || []

              return (
                <div key={queue.id} className="bg-surface-50 rounded-xl p-5 border border-surface-200 hover:border-primary-200 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-primary-700">{queue.queue_number}</span>
                      <div>
                        <p className="font-semibold text-surface-800">{patientName}</p>
                        <p className="text-sm text-surface-500">{formatTime(queue.created_at)}</p>
                      </div>
                    </div>
                    <Badge variant={queue.status === 'waiting' ? 'warning' : queue.status === 'ready' ? 'accent' : 'primary'}>
                      {getStatusLabel(queue.status)}
                    </Badge>
                  </div>

                  {/* Medicine list */}
                  <div className="space-y-2 mb-4">
                    {items.length === 0 ? (
                      <div className="bg-white rounded-lg p-4 text-center border border-dashed border-surface-300">
                        <p className="text-sm text-surface-500 font-medium italic">Tidak Ada Resep (Hanya Konsultasi / Rujukan Selesai)</p>
                      </div>
                    ) : (
                      items.map((item: any) => (
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
                      ))
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleCallPatient(queue)} leftIcon={<Volume2 size={14} />}>
                      Panggil
                    </Button>
                    <Button size="sm" variant="accent" onClick={() => handleDispense(queue)} isLoading={isProcessing} leftIcon={<CheckCircle2 size={14} />}>
                      {items.length === 0 ? 'Selesaikan Antrean' : 'Serahkan Obat'}
                    </Button>
                    {items.length > 0 && (
                      <Button size="sm" variant="secondary" onClick={() => handlePrintReceipt(queue)} leftIcon={<Printer size={14} />}>
                        Cetak Struk
                      </Button>
                    )}
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
