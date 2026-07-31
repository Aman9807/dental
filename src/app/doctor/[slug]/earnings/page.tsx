import React from 'react'
import { getAdminSupabase } from '@/lib/supabase'
import DoctorPortalEarningsClient from './DoctorPortalEarningsClient'
import { AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Doctor Portal Salary Calculation Details | Dental Clinic',
  description: 'Detailed payroll breakdown including gross charges, absent grosses, helper salaries and branch operating deductions.'
}

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ month?: string }>
}

export default async function DoctorPortalEarningsPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const slug = resolvedParams.slug
  const monthParam = resolvedSearchParams.month

  const adminDb = getAdminSupabase()
  let doctor: any = null
  let helperBoys: any[] = []
  let helperAttendance: any[] = []
  let doctorAttendance: any[] = []
  let electricityExpenses: any[] = []
  let extraExpenses: any[] = []
  let branchAppointments: any[] = []
  let isLoaded = false

  try {
    // 1. Fetch Doctor by slug
    const { data: docData } = await adminDb
      .from('doctors')
      .select('*, branches(id, name, slug)')
      .eq('slug', slug)
      .single()

    if (docData) {
      doctor = {
        ...docData,
        branches: Array.isArray(docData.branches) ? docData.branches[0] : docData.branches
      }

      // 2. Fetch parallel branch data based on the doctor's branch_id
      const [
        helperRes,
        helperAttRes,
        doctorAttRes,
        elecRes,
        extraRes,
        apptRes
      ] = await Promise.all([
        adminDb.from('helper_boys').select('*').eq('branch_id', doctor.branch_id),
        adminDb.from('helper_attendance').select('*'),
        adminDb.from('doctor_attendance').select('*').eq('doctor_id', doctor.id),
        adminDb.from('monthly_expenses').select('*').eq('branch_id', doctor.branch_id),
        adminDb.from('extra_expenses').select('*').eq('branch_id', doctor.branch_id),
        adminDb.from('appointments').select(`
          id,
          appointment_date,
          appointment_time,
          status,
          branch_id,
          doctor_id,
          invoices (
            id,
            total,
            subtotal,
            discount_percentage,
            treatment_discount_percentage,
            medicine_discount_percentage,
            invoice_items (
              id,
              item_type,
              custom_name,
              quantity,
              unit_price,
              unit_cost,
              total_price
            )
          )
        `).eq('branch_id', doctor.branch_id)
      ])

      helperBoys = helperRes.data || []
      helperAttendance = helperAttRes.data || []
      doctorAttendance = doctorAttRes.data || []
      electricityExpenses = elecRes.data || []
      extraExpenses = extraRes.data || []
      branchAppointments = apptRes.data || []
      isLoaded = true
    }
  } catch (error) {
    console.error('Error loading doctor portal earnings page data:', error)
  }

  if (!isLoaded || !doctor) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center bg-white border border-slate-200 rounded-3xl mt-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Doctor Profile Not Found</h3>
        <p className="text-sm text-slate-600 mb-4">
          Unable to retrieve payroll information for the requested doctor slug.
        </p>
      </div>
    )
  }

  return (
    <DoctorPortalEarningsClient
      doctor={doctor}
      helperBoys={helperBoys}
      helperAttendance={helperAttendance}
      doctorAttendance={doctorAttendance}
      electricityExpenses={electricityExpenses}
      extraExpenses={extraExpenses}
      branchAppointments={branchAppointments}
      monthParam={monthParam}
    />
  )
}
