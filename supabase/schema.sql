-- Supabase Database Schema for Dental Clinic System (Hazara & Family branches)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    working_hours TEXT,
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

-- Helper Seed Data for branches
INSERT INTO public.branches (name, slug, working_hours) 
VALUES 
('Hazara Dental Store', 'hazara', 'Monday – Saturday: 9:00 AM – 6:00 PM (Closed on Sunday)'),
('Family Dental Store', 'family', 'Monday – Friday: 9:00 AM – 6:00 PM, Saturday: 9:00 AM – 2:00 PM (Sunday Closed)')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, working_hours = EXCLUDED.working_hours;

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

    -- Call Resend API using pg_net
    PERFORM net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer re_Z5UgQKMi_HKGRAo8rzdUHNr21n1KHcf6K'
        ),
        body := jsonb_build_object(
            'from', 'Dental Clinic Booking <onboarding@resend.dev>',
            'to', doctor_record.email,
            'subject', email_subject,
            'html', email_html
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
