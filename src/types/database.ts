// Database types - mirrors Supabase schema
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Profile>
      }
      staff: {
        Row: Staff
        Insert: Omit<Staff, 'id' | 'created_at'>
        Update: Partial<Staff>
      }
      patients: {
        Row: Patient
        Insert: Omit<Patient, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Patient>
      }
      patient_visits: {
        Row: PatientVisit
        Insert: Omit<PatientVisit, 'id' | 'created_at'>
        Update: Partial<PatientVisit>
      }
      queues: {
        Row: Queue
        Insert: Omit<Queue, 'id' | 'created_at'>
        Update: Partial<Queue>
      }
      queue_histories: {
        Row: QueueHistory
        Insert: Omit<QueueHistory, 'id' | 'created_at'>
        Update: Partial<QueueHistory>
      }
      vital_signs: {
        Row: VitalSign
        Insert: Omit<VitalSign, 'id' | 'created_at'>
        Update: Partial<VitalSign>
      }
      laboratory_results: {
        Row: LabResult
        Insert: Omit<LabResult, 'id' | 'created_at'>
        Update: Partial<LabResult>
      }
      diagnoses: {
        Row: Diagnosis
        Insert: Omit<Diagnosis, 'id' | 'created_at'>
        Update: Partial<Diagnosis>
      }
      procedures: {
        Row: Procedure
        Insert: Omit<Procedure, 'id' | 'created_at'>
        Update: Partial<Procedure>
      }
      prescriptions: {
        Row: Prescription
        Insert: Omit<Prescription, 'id' | 'created_at'>
        Update: Partial<Prescription>
      }
      prescription_items: {
        Row: PrescriptionItem
        Insert: Omit<PrescriptionItem, 'id'>
        Update: Partial<PrescriptionItem>
      }
      medicines: {
        Row: Medicine
        Insert: Omit<Medicine, 'id' | 'created_at'>
        Update: Partial<Medicine>
      }
      medicine_categories: {
        Row: MedicineCategory
        Insert: Omit<MedicineCategory, 'id' | 'created_at'>
        Update: Partial<MedicineCategory>
      }
      medicine_batches: {
        Row: MedicineBatch
        Insert: Omit<MedicineBatch, 'id' | 'created_at'>
        Update: Partial<MedicineBatch>
      }
      medicine_transactions: {
        Row: MedicineTransaction
        Insert: Omit<MedicineTransaction, 'id' | 'created_at'>
        Update: Partial<MedicineTransaction>
      }
      activity_logs: {
        Row: ActivityLog
        Insert: Omit<ActivityLog, 'id' | 'created_at'>
        Update: never
      }
      system_settings: {
        Row: SystemSetting
        Insert: Omit<SystemSetting, 'id'>
        Update: Partial<SystemSetting>
      }
      staff_shifts: {
        Row: StaffShift
        Insert: Omit<StaffShift, 'id' | 'created_at'>
        Update: Partial<StaffShift>
      }
      running_texts: {
        Row: RunningText
        Insert: Omit<RunningText, 'id' | 'created_at'>
        Update: Partial<RunningText>
      }
      queue_counters: {
        Row: QueueCounter
        Insert: Omit<QueueCounter, 'id'>
        Update: Partial<QueueCounter>
      }
    }
    Functions: {
      generate_queue_number: {
        Args: { p_prefix: string; p_date?: string }
        Returns: string
      }
    }
  }
}

export interface Profile {
  id: string
  full_name: string
  role: string
  created_at: string
}

export interface Staff {
  id: string
  name: string
  role: string
  specialization?: string
  is_active: boolean
  created_at: string
}

export interface Patient {
  id: string
  nik?: string
  name: string
  date_of_birth?: string
  gender?: 'L' | 'P'
  phone?: string
  address?: string
  patient_type?: string
  priority_category: 'umum' | 'lansia' | 'ibu_hamil' | 'disabilitas'
  created_at: string
  updated_at: string
}

export interface PatientVisit {
  id: string
  patient_id: string
  visit_date: string
  queue_number: string
  complaint?: string
  status: string
  is_priority: boolean
  registered_by?: string
  created_at: string
  completed_at?: string
  // Joined
  patient?: Patient
}

export interface Queue {
  id: string
  visit_id: string
  patient_id: string
  department: string
  queue_number: string
  status: 'waiting' | 'called' | 'in_progress' | 'completed' | 'skipped' | 'referred_to_lab' | 'back_from_lab'
  is_priority: boolean
  called_by?: string
  called_at?: string
  started_at?: string
  completed_at?: string
  created_at: string
  // Joined
  patient?: Patient
  visit?: PatientVisit
  staff?: Staff
}

export interface QueueHistory {
  id: string
  visit_id: string
  from_department?: string
  to_department: string
  queue_number?: string
  transferred_by?: string
  notes?: string
  created_at: string
  // Joined
  staff?: Staff
}

export interface VitalSign {
  id: string
  visit_id: string
  weight?: number
  height?: number
  blood_pressure_systolic?: number
  blood_pressure_diastolic?: number
  pulse?: number
  temperature?: number
  saturation?: number
  complaint?: string
  destinations?: string[]
  examined_by?: string
  created_at: string
}

export interface LabResult {
  id: string
  visit_id: string
  test_type: 'gula_darah' | 'kolesterol' | 'asam_urat' | 'spirometri'
  result?: string
  unit?: string
  normal_range?: string
  notes?: string
  examined_by?: string
  created_at: string
}

export interface Diagnosis {
  id: string
  visit_id: string
  diagnosis: string
  icd10_code?: string
  notes?: string
  department?: string
  diagnosed_by?: string
  created_at: string
}

export interface Procedure {
  id: string
  visit_id: string
  procedure_name: string
  notes?: string
  performed_by?: string
  created_at: string
}

export interface Prescription {
  id: string
  visit_id: string
  prescribed_by?: string
  status: 'pending' | 'preparing' | 'ready' | 'dispensed'
  dispensed_by?: string
  dispensed_at?: string
  notes?: string
  created_at: string
  // Joined
  items?: PrescriptionItem[]
  patient?: Patient
  visit?: PatientVisit
}

export interface PrescriptionItem {
  id: string
  prescription_id: string
  medicine_id: string
  quantity: number
  dosage?: string
  frequency?: string
  duration?: string
  notes?: string
  // Joined
  medicine?: Medicine
}

export interface Medicine {
  id: string
  name: string
  category_id?: string
  price: number
  unit: string
  minimum_stock: number
  is_active: boolean
  created_at: string
  // Joined
  category?: MedicineCategory
  batches?: MedicineBatch[]
  total_stock?: number
}

export interface MedicineCategory {
  id: string
  name: string
  description?: string
  created_at: string
}

export interface MedicineBatch {
  id: string
  medicine_id: string
  batch_number: string
  quantity: number
  current_stock: number
  expired_date: string
  received_date: string
  created_at: string
}

export interface MedicineTransaction {
  id: string
  medicine_id: string
  batch_id?: string
  prescription_item_id?: string
  transaction_type: 'in' | 'out' | 'adjustment'
  quantity: number
  notes?: string
  performed_by?: string
  created_at: string
}

export interface ActivityLog {
  id: string
  staff_id?: string
  module: string
  action: string
  patient_id?: string
  visit_id?: string
  details?: Record<string, unknown>
  device?: string
  ip_address?: string
  created_at: string
  // Joined
  staff?: Staff
  patient?: Patient
}

export interface SystemSetting {
  id: string
  key: string
  value: Record<string, unknown>
  updated_at: string
}

export interface StaffShift {
  id: string
  staff_id: string
  department: string
  clock_in: string
  clock_out?: string
  total_patients: number
  created_at: string
  // Joined
  staff?: Staff
}

export interface RunningText {
  id: string
  department?: string
  text: string
  is_active: boolean
  created_at: string
}

export interface QueueCounter {
  id: string
  prefix: string
  counter_date: string
  current_value: number
}

// UI-specific types
export interface DepartmentCard {
  id: string
  name: string
  department: string
  icon: string
  color: string
  bgColor: string
  route: string
}

export interface QueueDisplay {
  currentNumber: string
  currentPatientName: string
  nextNumbers: string[]
  department: string
  timestamp: string
}
