-- ================================================
-- Docteer - Sistem Informasi Klinik & Antrian Pasien
-- Initial Database Schema Migration
-- ================================================

-- 1. Staff (Petugas - tanpa password)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  specialization TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nik TEXT UNIQUE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('L', 'P')),
  phone TEXT,
  address TEXT,
  patient_type TEXT,
  priority_category TEXT DEFAULT 'umum'
    CHECK (priority_category IN ('umum','lansia','ibu_hamil','disabilitas')),
  medical_history TEXT,
  allergies TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Patient Visits
CREATE TABLE IF NOT EXISTS patient_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  visit_date DATE DEFAULT CURRENT_DATE,
  queue_number TEXT NOT NULL,
  complaint TEXT,
  status TEXT DEFAULT 'waiting_triage',
  is_priority BOOLEAN DEFAULT false,
  registered_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 4. Queues
CREATE TABLE IF NOT EXISTS queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES patient_visits(id),
  patient_id UUID REFERENCES patients(id),
  department TEXT NOT NULL,
  queue_number TEXT NOT NULL,
  status TEXT DEFAULT 'waiting',
  is_priority BOOLEAN DEFAULT false,
  called_by UUID REFERENCES staff(id),
  called_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Queue Histories
CREATE TABLE IF NOT EXISTS queue_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES patient_visits(id),
  from_department TEXT,
  to_department TEXT NOT NULL,
  queue_number TEXT,
  transferred_by UUID REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Queue Calls
CREATE TABLE IF NOT EXISTS queue_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES queues(id),
  called_by UUID REFERENCES staff(id),
  called_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Vital Signs
CREATE TABLE IF NOT EXISTS vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES patient_visits(id),
  weight DECIMAL,
  height DECIMAL,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  pulse INTEGER,
  temperature DECIMAL,
  saturation INTEGER,
  respiration_rate INTEGER,
  complaint TEXT,
  destinations TEXT[],
  examined_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Laboratory Results
CREATE TABLE IF NOT EXISTS laboratory_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES patient_visits(id),
  test_type TEXT NOT NULL,
  result TEXT,
  unit TEXT,
  normal_range TEXT,
  notes TEXT,
  examined_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Diagnoses
CREATE TABLE IF NOT EXISTS diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES patient_visits(id),
  diagnosis TEXT NOT NULL,
  icd10_code TEXT,
  notes TEXT,
  department TEXT,
  diagnosed_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Procedures
CREATE TABLE IF NOT EXISTS procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES patient_visits(id),
  procedure_name TEXT NOT NULL,
  notes TEXT,
  performed_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Medicine Categories
CREATE TABLE IF NOT EXISTS medicine_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Medicines
CREATE TABLE IF NOT EXISTS medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES medicine_categories(id),
  price DECIMAL DEFAULT 0,
  unit TEXT NOT NULL,
  minimum_stock INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Medicine Batches
CREATE TABLE IF NOT EXISTS medicine_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID REFERENCES medicines(id),
  batch_number TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  current_stock INTEGER NOT NULL,
  expired_date DATE NOT NULL,
  received_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES patient_visits(id),
  prescribed_by UUID REFERENCES staff(id),
  status TEXT DEFAULT 'pending',
  dispensed_by UUID REFERENCES staff(id),
  dispensed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Prescription Items
CREATE TABLE IF NOT EXISTS prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id),
  medicine_id UUID REFERENCES medicines(id),
  quantity INTEGER NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  notes TEXT
);

-- 16. Medicine Transactions
CREATE TABLE IF NOT EXISTS medicine_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID REFERENCES medicines(id),
  batch_id UUID REFERENCES medicine_batches(id),
  prescription_item_id UUID REFERENCES prescription_items(id),
  transaction_type TEXT CHECK (transaction_type IN ('in','out','adjustment')),
  quantity INTEGER NOT NULL,
  notes TEXT,
  performed_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. Activity Logs (Immutable)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id),
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  patient_id UUID REFERENCES patients(id),
  visit_id UUID REFERENCES patient_visits(id),
  details JSONB,
  device TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 19. Display Settings
CREATE TABLE IF NOT EXISTS display_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  background_color TEXT,
  text_color TEXT,
  font_size TEXT DEFAULT 'large',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 20. Running Texts
CREATE TABLE IF NOT EXISTS running_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT,
  text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 21. Reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  date_range JSONB,
  generated_by UUID REFERENCES staff(id),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 22. Backup Logs
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  size_bytes BIGINT,
  status TEXT DEFAULT 'completed',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 23. Staff Shifts
CREATE TABLE IF NOT EXISTS staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id),
  department TEXT NOT NULL,
  clock_in TIMESTAMPTZ DEFAULT now(),
  clock_out TIMESTAMPTZ,
  total_patients INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 24. Staff Permissions
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id),
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, permission)
);

-- 25. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- Queue Counter (Atomic)
-- ========================
CREATE TABLE IF NOT EXISTS queue_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix TEXT NOT NULL,
  counter_date DATE NOT NULL,
  current_value INTEGER DEFAULT 1,
  UNIQUE(prefix, counter_date)
);

-- Atomic queue number generator
CREATE OR REPLACE FUNCTION generate_queue_number(p_prefix TEXT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
DECLARE
  v_counter INTEGER;
  v_result TEXT;
BEGIN
  INSERT INTO queue_counters (prefix, counter_date, current_value)
  VALUES (p_prefix, p_date, 1)
  ON CONFLICT (prefix, counter_date)
  DO UPDATE SET current_value = queue_counters.current_value + 1
  RETURNING current_value INTO v_counter;

  v_result := p_prefix || LPAD(v_counter::TEXT, 3, '0');
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ========================
-- Indexes
-- ========================
CREATE INDEX IF NOT EXISTS idx_patients_nik ON patients(nik);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patient_visits_date ON patient_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_patient_visits_patient ON patient_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_queues_department ON queues(department);
CREATE INDEX IF NOT EXISTS idx_queues_status ON queues(status);
CREATE INDEX IF NOT EXISTS idx_queues_visit ON queues(visit_id);
CREATE INDEX IF NOT EXISTS idx_queue_histories_visit ON queue_histories(visit_id);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_medicine ON medicine_batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_expired ON medicine_batches(expired_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_visit ON prescriptions(visit_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff ON staff_shifts(staff_id);

-- ========================
-- RLS (Row Level Security)
-- ========================
-- Activity logs: immutable (no UPDATE/DELETE)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT USING (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE queues;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE prescriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE medicine_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE patient_visits;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;

-- ========================
-- Seed Data
-- ========================

-- Default staff
INSERT INTO staff (name, role, specialization) VALUES
  ('dr. Ahmad Fajar', 'dokter', 'umum'),
  ('dr. Sarah Putri, drg.', 'dokter', 'gigi'),
  ('Ns. Budi Hartono, S.Kep', 'perawat', 'triage'),
  ('Apt. Dewi Lestari, S.Farm', 'apoteker', 'farmasi'),
  ('Ns. Rina Marlina, S.Kep', 'perawat', 'lab')
ON CONFLICT DO NOTHING;

-- Default medicine categories
INSERT INTO medicine_categories (name, description) VALUES
  ('Analgesik', 'Pereda nyeri'),
  ('Antibiotik', 'Obat infeksi bakteri'),
  ('Antasida', 'Obat lambung'),
  ('Vitamin', 'Suplemen vitamin'),
  ('Antihistamin', 'Obat alergi')
ON CONFLICT (name) DO NOTHING;

-- Default medicines
INSERT INTO medicines (name, unit, price, minimum_stock) VALUES
  ('Paracetamol 500mg', 'tablet', 500, 50),
  ('Amoxicillin 500mg', 'kapsul', 1000, 30),
  ('Omeprazole 20mg', 'kapsul', 1500, 20),
  ('Vitamin C 500mg', 'tablet', 300, 50),
  ('Antasida Doen', 'tablet', 200, 30),
  ('Ibuprofen 400mg', 'tablet', 800, 30),
  ('CTM 4mg', 'tablet', 200, 50),
  ('Ambroxol 30mg', 'tablet', 500, 30),
  ('Metformin 500mg', 'tablet', 600, 20),
  ('Amlodipine 5mg', 'tablet', 1200, 20)
ON CONFLICT DO NOTHING;

-- Default system settings
INSERT INTO system_settings (key, value) VALUES
  ('clinic_name', '"Docteer Clinic"'),
  ('clinic_address', '"Puskesmas - Bakti Sosial Mahasiswa Kedokteran"'),
  ('expired_alert_days', '30'),
  ('timezone', '"Asia/Jakarta"')
ON CONFLICT (key) DO NOTHING;

-- Default running text
INSERT INTO running_texts (text, is_active) VALUES
  ('Selamat datang di Docteer Clinic — Bakti Sosial Puskesmas oleh Mahasiswa Kedokteran — Layanan gratis untuk masyarakat — Terima kasih atas partisipasi Anda', true);

-- Disable RLS on all tables to allow public CRUD operations from anon client
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE patient_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE queues DISABLE ROW LEVEL SECURITY;
ALTER TABLE queue_histories DISABLE ROW LEVEL SECURITY;
ALTER TABLE queue_calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE vital_signs DISABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses DISABLE ROW LEVEL SECURITY;
ALTER TABLE procedures DISABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE medicines DISABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE display_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE running_texts DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE backup_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE queue_counters DISABLE ROW LEVEL SECURITY;
