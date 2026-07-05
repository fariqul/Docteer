export function cn(...inputs: (string | undefined | null | false | 0 | Record<string, boolean>)[]) {
  return inputs
    .flatMap((input) => {
      if (!input) return []
      if (typeof input === 'string') return [input]
      return Object.entries(input)
        .filter(([, value]) => value)
        .map(([key]) => key)
    })
    .join(' ')
}

export function calculateAge(dateOfBirth: string | Date): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export function isElderly(dateOfBirth: string | Date): boolean {
  return calculateAge(dateOfBirth) >= 60
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' | 'datetime' = 'short'): string {
  const d = new Date(date)
  const options: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
    datetime: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  }
  return d.toLocaleDateString('id-ID', options[format])
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat Pagi'
  if (hour < 15) return 'Selamat Siang'
  if (hour < 18) return 'Selamat Sore'
  return 'Selamat Malam'
}

export function generateVoiceText(queueNumber: string, patientName: string, department: string): string {
  const deptNames: Record<string, string> = {
    triage: 'ruang pemeriksaan awal',
    lab: 'laboratorium',
    poli_umum: 'Poli Umum',
    poli_gigi: 'Poli Gigi',
    pharmacy: 'farmasi',
  }
  const deptName = deptNames[department] || department
  return `Nomor ${queueNumber} atas nama ${patientName} dipersilakan menuju ${deptName}.`
}

export function getDepartmentLabel(department: string): string {
  const labels: Record<string, string> = {
    registration: 'Pendaftaran',
    triage: 'Pemeriksaan Awal',
    lab: 'Laboratorium',
    poli_umum: 'Poli Umum',
    poli_gigi: 'Poli Gigi',
    pharmacy: 'Farmasi',
  }
  return labels[department] || department
}

export function getDepartmentColor(department: string): string {
  const colors: Record<string, string> = {
    registration: 'bg-primary-100 text-primary-700',
    triage: 'bg-amber-100 text-amber-700',
    lab: 'bg-purple-100 text-purple-700',
    poli_umum: 'bg-accent-100 text-accent-700',
    poli_gigi: 'bg-cyan-100 text-cyan-700',
    pharmacy: 'bg-rose-100 text-rose-700',
  }
  return colors[department] || 'bg-surface-100 text-surface-700'
}

export function getQueuePrefix(department: string): string {
  const prefixes: Record<string, string> = {
    registration: 'A',
    triage: 'T',
    lab: 'L',
    poli_umum: 'PU',
    poli_gigi: 'PG',
    pharmacy: 'F',
  }
  return prefixes[department] || 'X'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    waiting: 'Menunggu',
    waiting_triage: 'Menunggu Pemeriksaan',
    called: 'Dipanggil',
    in_progress: 'Sedang Dilayani',
    completed: 'Selesai',
    skipped: 'Dilewati',
    pending: 'Pending',
    preparing: 'Disiapkan',
    ready: 'Siap',
    dispensed: 'Diserahkan',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    waiting: 'bg-amber-100 text-amber-700',
    waiting_triage: 'bg-amber-100 text-amber-700',
    called: 'bg-primary-100 text-primary-700',
    in_progress: 'bg-accent-100 text-accent-700',
    completed: 'bg-surface-100 text-surface-600',
    skipped: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    preparing: 'bg-primary-100 text-primary-700',
    ready: 'bg-accent-100 text-accent-700',
    dispensed: 'bg-surface-100 text-surface-600',
  }
  return colors[status] || 'bg-surface-100 text-surface-700'
}

export function getPriorityLabel(category: string): string {
  const labels: Record<string, string> = {
    umum: 'Umum',
    lansia: 'Lansia',
    ibu_hamil: 'Ibu Hamil',
    disabilitas: 'Disabilitas',
  }
  return labels[category] || category
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}
