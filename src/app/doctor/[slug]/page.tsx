import React from 'react'
import { getAdminSupabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import DoctorLogin from './DoctorLogin'
import DoctorClient from './DoctorClient'
import { AlertCircle } from 'lucide-react'

interface DoctorPageProps {
  params: Promise<{ slug: string }>
}

export default async function DoctorPortalPage({ params }: DoctorPageProps) {
  const { slug } = await params
  const adminDb = getAdminSupabase()
  const cookieStore = await cookies()
  const token = cookieStore.get('dental_doctor_token')

  // 1. Fetch Doctor details by slug
  const { data: doctor, error: docError } = await adminDb
    .from('doctors')
    .select(`
      id,
      name,
      email,
      specialty,
      picture_url,
      branch_id,
      compensation_type,
      fixed_salary,
      profit_percentage,
      slug,
      branches (id, name, slug)
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (docError || !doctor) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center bg-white border border-slate-200 rounded-3xl mt-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Dentist Not Found</h3>
        <p className="text-sm text-slate-600 mb-4">
          The requested doctor portal page at <code>/doctor/{slug}</code> does not exist in our system.
        </p>
      </div>
    )
  }

  // 2. Check Authentication
  const isAuthenticated = token && token.value === slug

  if (!isAuthenticated) {
    return <DoctorLogin doctorName={doctor.name} doctorSlug={doctor.slug} />
  }

  // 3. Fetch Doctor Dashboard baseline data
  
  // Appointments for this doctor
  const { data: apptData } = await adminDb
    .from('appointments')
    .select(`
      id,
      appointment_date,
      appointment_time,
      problem_description,
      status,
      prescription_text,
      prescription_url,
      xray_url,
      temp_mobile_photo,
      report_sent_at,
      created_at,
      patients (id, name, email, mobile, age),
      branches (id, name, slug)
    `)
    .eq('doctor_id', doctor.id)
    .order('appointment_date', { ascending: false })

  // Time slots for booking offline appointments
  const { data: timeSlots } = await adminDb
    .from('time_slots')
    .select('*')
    .order('time_value')

  // Helper boys for doctor's branch (used to compute branch expenses if percentage doctor)
  const { data: helperBoys } = await adminDb
    .from('helper_boys')
    .select('*')
    .eq('branch_id', doctor.branch_id)

  // Helper attendance logs for current year
  const { data: helperAttendance } = await adminDb
    .from('helper_attendance')
    .select('*')

  // Doctor attendance logs (absences)
  const { data: doctorAttendance } = await adminDb
    .from('doctor_attendance')
    .select('*')
    .eq('doctor_id', doctor.id)

  // Electricity expenses for doctor's branch
  const { data: electricityExpenses } = await adminDb
    .from('monthly_expenses')
    .select('*')
    .eq('branch_id', doctor.branch_id)

  // Extra expenses for doctor's branch
  const { data: extraExpenses } = await adminDb
    .from('extra_expenses')
    .select('*')
    .eq('branch_id', doctor.branch_id)

  // All appointments for this doctor's branch (to calculate branch profit for percentage commission)
  const { data: branchAppointments } = await adminDb
    .from('appointments')
    .select('id, amount_charged, treatment_cost, appointment_date, branch_id')
    .eq('branch_id', doctor.branch_id)

  const formattedDoctor = {
    ...doctor,
    branches: Array.isArray(doctor.branches) ? doctor.branches[0] : doctor.branches
  } as any

  // Map appointments to extract nested relations correctly
  const formattedAppts = (apptData || []).map(appt => ({
    ...appt,
    patients: Array.isArray(appt.patients) ? appt.patients[0] : appt.patients,
    branches: Array.isArray(appt.branches) ? appt.branches[0] : appt.branches
  })) as any[]

  return (
    <DoctorClient
      doctor={formattedDoctor}
      initialAppointments={formattedAppts}
      timeSlots={timeSlots || []}
      helperBoys={helperBoys || []}
      helperAttendance={helperAttendance || []}
      doctorAttendance={doctorAttendance || []}
      electricityExpenses={electricityExpenses || []}
      extraExpenses={extraExpenses || []}
      branchAppointments={branchAppointments || []}
    />
  )
}
