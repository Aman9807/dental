import React from 'react'
import { getAdminSupabase } from '@/lib/supabase'
import FinancesClient from './FinancesClient'
import { AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'Finances & Profits | Admin Dashboard',
  description: 'Track clinic revenues, treatment costs, monthly bills, and helper attendance.',
}

export default async function AdminFinancesPage() {
  const adminDb = getAdminSupabase()
  let branches: any[] = []
  let doctors: any[] = []
  let helperBoys: any[] = []
  let helperAttendance: any[] = []
  let doctorAttendance: any[] = []
  let electricityExpenses: any[] = []
  let extraExpenses: any[] = []
  let appointments: any[] = []
  let dbConfigured = true

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project')) {
      dbConfigured = false
    } else {
      // 1. Fetch Branches
      const { data: branchData } = await adminDb
        .from('branches')
        .select('id, name, slug')
      branches = branchData || []

      // 2. Fetch Doctors
      const { data: docData } = await adminDb
        .from('doctors')
        .select('id, name, slug, compensation_type, fixed_salary, profit_percentage, branch_id')
        .order('name')
      doctors = docData || []

      // 3. Fetch Helper Boys
      const { data: helperData } = await adminDb
        .from('helper_boys')
        .select('id, name, shift_1_rate, shift_2_rate, shift_1_enabled, shift_2_enabled, sunday_enabled, branch_id')
        .order('name')
      helperBoys = helperData || []

      // 4. Fetch Helper Attendance
      const { data: helperAttData } = await adminDb
        .from('helper_attendance')
        .select('helper_boy_id, date, shift, status')
      helperAttendance = helperAttData || []

      // 5. Fetch Doctor Attendance
      const { data: docAttData } = await adminDb
        .from('doctor_attendance')
        .select('doctor_id, date, status')
      doctorAttendance = docAttData || []

      // 6. Fetch Electricity Bills
      const { data: elecData } = await adminDb
        .from('monthly_expenses')
        .select('id, month_year, electricity_bill, branch_id')
      electricityExpenses = elecData || []

      // 7. Fetch Extra Expenses
      const { data: extraData } = await adminDb
        .from('extra_expenses')
        .select('id, amount, note, expense_date, branch_id')
        .order('expense_date', { ascending: false })
      extraExpenses = extraData || []

      // 8. Fetch Appointments with financial columns
      const { data: apptData } = await adminDb
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          amount_charged,
          treatment_cost,
          patients (id, name),
          doctors (id, name, branch_id),
          branches (id, name, slug)
        `)
        .order('appointment_date', { ascending: false })
      appointments = apptData || []
    }
  } catch (error) {
    console.error('Error loading finances data:', error)
  }

  if (!dbConfigured) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center bg-white border border-slate-200 rounded-3xl mt-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Supabase Configuration Required</h3>
        <p className="text-sm text-slate-600 mb-4">
          Please configure the environment variables to access clinic finances.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-serif text-slate-900 font-normal">
          Finances & Profits Ledger
        </h1>
        <p className="text-xs text-slate-400 font-light uppercase tracking-wider">
          Track branches profits, helper attendance, fixed costs, and doctor payroll
        </p>
      </div>

      <FinancesClient
        branches={branches}
        doctors={doctors}
        helperBoys={helperBoys}
        initialHelperAttendance={helperAttendance}
        initialDoctorAttendance={doctorAttendance}
        initialElectricityExpenses={electricityExpenses}
        initialExtraExpenses={extraExpenses}
        initialAppointments={appointments}
      />
    </div>
  )
}
