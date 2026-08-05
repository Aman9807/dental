import React from 'react'
import { getAdminSupabase } from '@/lib/supabase'
import DoctorFinancePageClient from './DoctorFinancePageClient'
import { AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Doctor Salary Calculation Details | Admin Dashboard',
  description: 'Detailed payroll breakdown including gross charges, absent grosses, helper salaries and branch operating deductions.'
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ month?: string }>
}

export default async function DoctorFinancePage({ params, searchParams }: PageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const id = resolvedParams.id
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
    // 1. Fetch Doctor first to get their branch_id
    const { data: docData } = await adminDb
      .from('doctors')
      .select('*, branches(id, name, slug)')
      .eq('id', id)
      .single()

    if (docData) {
      doctor = {
        ...docData,
        branches: Array.isArray(docData.branches) ? docData.branches[0] : docData.branches
      }

      // 2. Fetch parallel branch data based on the doctor's branch_id
      const branchIdFilter = doctor.branch_id

      const [
        helperRes,
        helperAttRes,
        doctorAttRes,
        elecRes,
        extraRes,
        apptRes
      ] = await Promise.all([
        branchIdFilter ? adminDb.from('helper_boys').select('*').eq('branch_id', branchIdFilter) : Promise.resolve({ data: [], error: null }),
        adminDb.from('helper_attendance').select('*'),
        adminDb.from('doctor_attendance').select('*').eq('doctor_id', id),
        branchIdFilter ? adminDb.from('monthly_expenses').select('*').eq('branch_id', branchIdFilter) : Promise.resolve({ data: [], error: null }),
        branchIdFilter ? adminDb.from('extra_expenses').select('*').eq('branch_id', branchIdFilter) : Promise.resolve({ data: [], error: null }),
        branchIdFilter ? adminDb.from('appointments').select(`
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
        `).eq('branch_id', branchIdFilter) : Promise.resolve({ data: [], error: null })
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
    console.error('Error loading doctor detail finances:', error)
  }

  if (!isLoaded || !doctor) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center bg-white border border-slate-200 rounded-3xl mt-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Doctor Profile Not Found</h3>
        <p className="text-sm text-slate-600 mb-4">
          Unable to retrieve payroll information for the requested doctor ID.
        </p>
      </div>
    )
  }

  return (
    <DoctorFinancePageClient
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
