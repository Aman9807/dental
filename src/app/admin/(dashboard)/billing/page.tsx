import React from 'react'
import { getAdminSupabase } from '@/lib/supabase'
import BillingClient from './BillingClient'
import { AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'Billing & Checkout | Admin Dashboard',
  description: 'Unified billing for medicines and clinical procedures.',
}

export default async function AdminBillingPage() {
  const adminDb = getAdminSupabase()
  let appointments: any[] = []
  let treatments: any[] = []
  let dbConfigured = true

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project')) {
      dbConfigured = false
    } else {
      // 1. Fetch appointments (recent 7 days) that need billing
      const today = new Date()
      const pastWeek = new Date()
      pastWeek.setDate(today.getDate() - 7)
      const pastWeekStr = pastWeek.toISOString().split('T')[0]

      const { data: apptData, error: apptErr } = await adminDb
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          prescription_text,
          prescription_url,
          xray_url,
          temp_mobile_photo,
          patients (id, name, email, mobile),
          doctors (id, name),
          branches (id, name)
        `)
        .gte('appointment_date', pastWeekStr)
        .order('appointment_date', { ascending: false })

      if (apptErr) throw apptErr
      appointments = apptData || []

      // 2. Fetch fixed treatments
      const { data: treatData, error: treatErr } = await adminDb
        .from('treatments')
        .select('*')
        .order('name', { ascending: true })

      if (treatErr) throw treatErr
      treatments = treatData || []
    }
  } catch (err) {
    console.error('Error loading billing initial data:', err)
  }

  if (!dbConfigured) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 border border-slate-200 rounded-3xl text-center bg-white shadow-sm">
        <AlertCircle className="w-12 h-12 text-cyan-600 mx-auto mb-4" />
        <h3 className="text-xl font-serif text-slate-850 mb-2">Supabase Pending Configuration</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Please link your Supabase URL and keys in <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">.env.local</code> to access billing.
        </p>
      </div>
    )
  }

  return (
    <BillingClient 
      initialAppointments={appointments} 
      initialTreatments={treatments} 
    />
  )
}
