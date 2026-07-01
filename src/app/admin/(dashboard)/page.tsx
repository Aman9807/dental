import React from 'react'
import { getAdminSupabase } from '@/lib/supabase'
import AppointmentsClient from './AppointmentsClient'
import { AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'Admin Dashboard | Appointments Overview',
  description: 'Master list of clinic appointments.',
}

export default async function AdminDashboardPage() {
  const adminDb = getAdminSupabase()
  let appointments: any[] = []
  let branches: any[] = []
  let dbConfigured = true

  try {
    // Check if supabase keys are placeholders
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project')) {
      dbConfigured = false
    } else {
      // Fetch Branches
      const { data: branchData } = await adminDb
        .from('branches')
        .select('id, name, slug')
      branches = branchData || []

      // Fetch Appointments with joined relations
      const { data: apptData, error: apptError } = await adminDb
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          problem_description,
          status,
          created_at,
          patients (id, name, email, mobile, age),
          doctors (id, name, email, specialty),
          branches (id, name, slug)
        `)
        .order('appointment_date', { ascending: false })

      if (apptError) {
        throw apptError
      }
      appointments = apptData || []
    }
  } catch (error) {
    console.error('Error loading dashboard appointments:', error)
  }

  if (!dbConfigured) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center bg-white border border-slate-200 rounded-3xl mt-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Supabase Configuration Required</h3>
        <p className="text-sm text-slate-600 mb-4">
          Please set your <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and <code>SUPABASE_SERVICE_ROLE_KEY</code> in the <code>.env.local</code> file.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-serif text-slate-900 font-normal">
          Appointments Dashboard
        </h1>
        <p className="text-xs text-slate-400 font-light uppercase tracking-wider">
          Master Appointment Logs across hazara & family branches
        </p>
      </div>

      <AppointmentsClient initialAppointments={appointments} branches={branches} />
    </div>
  )
}
