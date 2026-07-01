-- Supabase Database Schema for Dental Clinic System (Hazara & Family branches)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
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

-- Patients: Insert is public (for booking), read/write requires auth
CREATE POLICY "Allow public insertion of patients" ON public.patients
    FOR INSERT WITH CHECK (true);

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
INSERT INTO public.branches (name, slug) 
VALUES 
('Hazara Dental Store', 'hazara'),
('Family Dental Store', 'family')
ON CONFLICT (slug) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON public.appointments (appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_branch ON public.appointments (branch_id);
CREATE INDEX IF NOT EXISTS idx_doctors_branch ON public.doctors (branch_id);
