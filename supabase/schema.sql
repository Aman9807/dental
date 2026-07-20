-- Supabase Database Schema for Dental Clinic System (Hazara & Family branches)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    working_hours TEXT,
    camera_passcode TEXT DEFAULT '1234',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Doctors Table
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    picture_url TEXT,
    specialty TEXT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    compensation_type TEXT DEFAULT 'fixed' CHECK (compensation_type IN ('fixed', 'percentage')),
    fixed_salary NUMERIC DEFAULT 0,
    profit_percentage NUMERIC DEFAULT 0,
    slug TEXT UNIQUE,
    password TEXT DEFAULT 'doctor123',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT NOT NULL,
    age INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    problem_description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) NOT NULL,
    prescription_text TEXT,
    prescription_url TEXT,
    xray_url TEXT,
    temp_mobile_photo TEXT,
    report_sent_at TIMESTAMPTZ,
    amount_charged NUMERIC DEFAULT 0,
    treatment_cost NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Prevent double booking the same doctor at the same date and time slot
    CONSTRAINT unique_doctor_appointment UNIQUE (doctor_id, appointment_date, appointment_time)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Branches: Anyone can read, only admin can write
CREATE POLICY "Allow public read access to branches" ON public.branches
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to branches" ON public.branches
    FOR ALL TO authenticated USING (true);

-- Doctors: Anyone can read, only admin can write
CREATE POLICY "Allow public read access to doctors" ON public.doctors
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to doctors" ON public.doctors
    FOR ALL TO authenticated USING (true);

-- Patients: Public can insert, read (to check if email exists and for RETURNING id), and update (to update profile details)
CREATE POLICY "Allow public read access to patients" ON public.patients
    FOR SELECT USING (true);

CREATE POLICY "Allow public insertion of patients" ON public.patients
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to patients" ON public.patients
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow admin full access to patients" ON public.patients
    FOR ALL TO authenticated USING (true);

-- Appointments: Insert is public (for booking), select is public (to check booked slots), admin has full access
CREATE POLICY "Allow public insertion of appointments" ON public.appointments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public selection of appointments (to check time slots)" ON public.appointments
    FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to appointments" ON public.appointments
    FOR ALL TO authenticated USING (true);

-- 5. Helper Boys Table
CREATE TABLE IF NOT EXISTS public.helper_boys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    shift_1_rate NUMERIC NOT NULL DEFAULT 0,
    shift_2_rate NUMERIC NOT NULL DEFAULT 0,
    shift_1_enabled BOOLEAN DEFAULT TRUE,
    shift_2_enabled BOOLEAN DEFAULT TRUE,
    sunday_enabled BOOLEAN DEFAULT FALSE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for helper_boys
ALTER TABLE public.helper_boys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to helper_boys" ON public.helper_boys FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to helper_boys" ON public.helper_boys FOR ALL TO authenticated USING (true);

-- 6. Helper Attendance Table
CREATE TABLE IF NOT EXISTS public.helper_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    helper_boy_id UUID REFERENCES public.helper_boys(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    shift INTEGER NOT NULL CHECK (shift IN (1, 2)),
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (helper_boy_id, date, shift)
);

-- Enable RLS for helper_attendance
ALTER TABLE public.helper_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to helper_attendance" ON public.helper_attendance FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to helper_attendance" ON public.helper_attendance FOR ALL TO authenticated USING (true);

-- 7. Doctor Attendance Table
CREATE TABLE IF NOT EXISTS public.doctor_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (doctor_id, date)
);

-- Enable RLS for doctor_attendance
ALTER TABLE public.doctor_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to doctor_attendance" ON public.doctor_attendance FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to doctor_attendance" ON public.doctor_attendance FOR ALL TO authenticated USING (true);

-- 8. Monthly Expenses Table (Electricity)
CREATE TABLE IF NOT EXISTS public.monthly_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_year TEXT NOT NULL, -- e.g. '2026-07'
    electricity_bill NUMERIC DEFAULT 0,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (month_year, branch_id)
);

-- Enable RLS for monthly_expenses
ALTER TABLE public.monthly_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to monthly_expenses" ON public.monthly_expenses FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to monthly_expenses" ON public.monthly_expenses FOR ALL TO authenticated USING (true);

-- 9. Extra Expenses Table
CREATE TABLE IF NOT EXISTS public.extra_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC NOT NULL,
    note TEXT NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for extra_expenses
ALTER TABLE public.extra_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to extra_expenses" ON public.extra_expenses FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to extra_expenses" ON public.extra_expenses FOR ALL TO authenticated USING (true);

-- Helper Seed Data for branches (no static IDs to prevent foreign key issues)
INSERT INTO public.branches (name, slug, working_hours) 
VALUES 
('Hazara Dental Clinic', 'hazara', 'Monday – Saturday: 9:00 AM – 6:00 PM (Closed on Sunday)'),
('Family Dental Clinic', 'family', 'Monday – Friday: 9:00 AM – 6:00 PM, Saturday: 9:00 AM – 2:00 PM (Sunday Closed)')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, working_hours = EXCLUDED.working_hours;

-- Seed Default Dentists to prevent empty drop-downs and redirect errors on resets
INSERT INTO public.doctors (name, email, specialty, branch_id, compensation_type, fixed_salary, profit_percentage, slug, password)
VALUES
('Aman', 'aman@dental.com', 'Orthodontics', (SELECT id FROM public.branches WHERE slug = 'hazara'), 'percentage', 0, 20, 'aman', 'aman123'),
('Faisal', 'faisal@dental.com', 'General Dentist', (SELECT id FROM public.branches WHERE slug = 'hazara'), 'fixed', 60000, 0, 'faisal', 'faisal123'),
('Sarah', 'sarah@dental.com', 'Pediatric Dentist', (SELECT id FROM public.branches WHERE slug = 'family'), 'percentage', 0, 25, 'sarah', 'sarah123')
ON CONFLICT (slug) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON public.appointments (appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_branch ON public.appointments (branch_id);
CREATE INDEX IF NOT EXISTS idx_doctors_branch ON public.doctors (branch_id);

-- 5. Automatic Email Trigger using pg_net (Resend integration)
-- Enable the HTTP client extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to handle formatting and dispatching email via Resend
CREATE OR REPLACE FUNCTION public.send_appointment_email_trigger()
RETURNS TRIGGER AS $$
DECLARE
    patient_record RECORD;
    doctor_record RECORD;
    branch_record RECORD;
    email_subject TEXT;
    email_html TEXT;
    problem_text TEXT;
BEGIN
    -- Fetch patient details
    SELECT name, age, mobile, email INTO patient_record FROM public.patients WHERE id = NEW.patient_id;
    -- Fetch doctor details
    SELECT name, email INTO doctor_record FROM public.doctors WHERE id = NEW.doctor_id;
    -- Fetch branch details
    SELECT name INTO branch_record FROM public.branches WHERE id = NEW.branch_id;

    -- Format subject
    email_subject := '[Booking Alert] New Patient Appointment - ' || branch_record.name;

    -- Format problem description
    problem_text := COALESCE(NULLIF(TRIM(NEW.problem_description), ''), 'No problem description provided.');

    -- Format HTML
    email_html := '
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
        <h2 style="color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-top: 0;">New Appointment Details</h2>
        <p style="font-size: 16px; line-height: 1.5;">Hello Dr. <strong>' || doctor_record.name || '</strong>,</p>
        <p style="font-size: 14px; color: #4b5563; margin-bottom: 20px;">A new appointment has been scheduled for you at <strong>' || branch_record.name || '</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; width: 30%;">Patient Name:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">' || patient_record.name || '</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Age:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">' || patient_record.age || ' years old</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Mobile:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">' || patient_record.mobile || '</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Email:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;"><a href="mailto:' || patient_record.email || '">' || patient_record.email || '</a></td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Date:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">' || NEW.appointment_date || '</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Time:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">' || NEW.appointment_time || '</td>
          </tr>
        </table>

        <div style="background-color: #f0fdfa; border-left: 4px solid #0f766e; padding: 15px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
          <h4 style="margin: 0 0 8px 0; color: #0f766e; font-size: 14px; font-weight: bold;">Problem Description:</h4>
          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #374151; font-style: italic;">"' || problem_text || '"</p>
        </div>

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          This is an automated notification from the clinic dashboard. Please do not reply directly to this email.
        </p>
      </div>
    ';

    -- Call Brevo API using pg_net
    PERFORM net.http_post(
        url := 'https://api.brevo.com/v3/smtp/email',
        headers := jsonb_build_object(
            'accept', 'application/json',
            'content-type', 'application/json',
            'api-key', 'YOUR_BREVO_API_KEY'
        ),
        body := jsonb_build_object(
            'sender', jsonb_build_object(
                'name', branch_record.name,
                'email', 'dental@flynx.site'
            ),
            'to', jsonb_build_array(
                jsonb_build_object(
                    'email', doctor_record.email,
                    'name', doctor_record.name
                )
            ),
            'subject', email_subject,
            'htmlContent', email_html
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
CREATE OR REPLACE TRIGGER on_appointment_created
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.send_appointment_email_trigger();

-- 6. Create Time Slots Table
CREATE TABLE IF NOT EXISTS public.time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_value TIME NOT NULL UNIQUE,
    time_label TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

-- Allow public read access to time slots
CREATE POLICY "Allow public read access to time_slots" ON public.time_slots
    FOR SELECT USING (true);

-- Allow admin full access to time slots
CREATE POLICY "Allow admin full access to time_slots" ON public.time_slots
    FOR ALL TO authenticated USING (true);

-- Seed with default time slots
INSERT INTO public.time_slots (time_value, time_label) VALUES
('09:00:00', '09:00 AM'),
('10:00:00', '10:00 AM'),
('11:00:00', '11:00 AM'),
('12:00:00', '12:00 PM'),
('14:00:00', '02:00 PM'),
('15:00:00', '03:00 PM'),
('16:00:00', '04:00 PM'),
('17:00:00', '05:00 PM')
ON CONFLICT (time_value) DO NOTHING;

-- 7. Create Supabase Storage Bucket for Patient Reports & Prescriptions
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for storage.objects
CREATE POLICY "Allow public read access to reports bucket" ON storage.objects
    FOR SELECT USING (bucket_id = 'reports');

CREATE POLICY "Allow admin service-role full access to reports bucket" ON storage.objects
    FOR ALL USING (bucket_id = 'reports');

-- 8. Add active capture ticket column to branches table (using plain UUID to avoid query ambiguity in PostgREST)
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS active_capture_appointment_id UUID;
ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS branches_active_capture_appointment_id_fkey;

-- 9. Create Billing and Treatment Tables (Medicines are stored in TiDB Cloud)
CREATE TABLE IF NOT EXISTS public.treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount_percentage NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('medicine', 'treatment', 'custom')),
    medicine_id VARCHAR(36), -- References TiDB Cloud medicines(id)
    treatment_id UUID REFERENCES public.treatments(id) ON DELETE SET NULL,
    custom_name TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total_price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for new tables
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Allow public read access (necessary for frontend booking/lookup)
CREATE POLICY "Allow public read access to treatments" ON public.treatments FOR SELECT USING (true);
CREATE POLICY "Allow public read access to invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Allow public read access to invoice_items" ON public.invoice_items FOR SELECT USING (true);

-- Allow public/admin write access
CREATE POLICY "Allow public insert to invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to invoice_items" ON public.invoice_items FOR INSERT WITH CHECK (true);

-- Allow admin full access
CREATE POLICY "Allow admin full access to treatments" ON public.treatments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin full access to invoices" ON public.invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin full access to invoice_items" ON public.invoice_items FOR ALL TO authenticated USING (true);

-- Seed default treatments
INSERT INTO public.treatments (name, price) VALUES
('Teeth Cleaning', 1500),
('Tooth Extraction', 2500),
('Dental Filling', 2000),
('Root Canal Therapy', 8500),
('Dental Crown', 12000),
('Teeth Whitening', 15000)
ON CONFLICT (name) DO NOTHING;


