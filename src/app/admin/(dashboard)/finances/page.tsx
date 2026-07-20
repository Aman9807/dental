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
      // Fetch all financial resources in parallel
      const [
        branchRes,
        docRes,
        helperRes,
        helperAttRes,
        doctorAttRes,
        elecRes,
        extraRes,
        apptRes
      ] = await Promise.all([
        adminDb.from('branches').select('id, name, slug'),
        adminDb.from('doctors').select('id, name, slug, compensation_type, fixed_salary, profit_percentage, branch_id').order('name'),
        adminDb.from('helper_boys').select('id, name, shift_1_rate, shift_2_rate, shift_1_enabled, shift_2_enabled, sunday_enabled, branch_id').order('name'),
        adminDb.from('helper_attendance').select('helper_boy_id, date, shift, status'),
        adminDb.from('doctor_attendance').select('doctor_id, date, status'),
        adminDb.from('monthly_expenses').select('id, month_year, electricity_bill, branch_id'),
        adminDb.from('extra_expenses').select('id, amount, note, expense_date, branch_id').order('expense_date', { ascending: false }),
        adminDb.from('appointments').select(`
          id,
          appointment_date,
          appointment_time,
          status,
          patients (id, name),
          doctors (id, name, branch_id),
          branches (id, name, slug),
          invoices (
            id,
            total,
            subtotal,
            discount_percentage,
            invoice_items (
              id,
              item_type,
              quantity,
              unit_price,
              unit_cost,
              total_price
            )
          )
        `).order('appointment_date', { ascending: false })
      ])

      branches = branchRes.data || []
      doctors = docRes.data || []
      helperBoys = helperRes.data || []
      helperAttendance = helperAttRes.data || []
      doctorAttendance = doctorAttRes.data || []
      electricityExpenses = elecRes.data || []
      extraExpenses = extraRes.data || []
      appointments = apptRes.data || []
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
