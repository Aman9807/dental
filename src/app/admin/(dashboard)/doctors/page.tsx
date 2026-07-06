import React from 'react'
import { getAdminSupabase } from '@/lib/supabase'
import DoctorsClient from './DoctorsClient'
import { AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'Doctor Management | Admin Dashboard',
  description: 'Manage clinic dentists and branch assignments.',
}

export default async function AdminDoctorsPage() {
  const adminDb = getAdminSupabase()
  let doctors: any[] = []
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

      // Fetch Doctors with branch relations
      const { data: doctorsData, error: docError } = await adminDb
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
          password,
          branches (id, name, slug)
        `)
        .order('created_at', { ascending: false })

      if (docError) throw docError
      doctors = doctorsData || []
    }
  } catch (error) {
    console.error('Error loading doctors dashboard:', error)
  }

  if (!dbConfigured) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center bg-white border border-slate-200 rounded-3xl mt-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Supabase Configuration Required</h3>
        <p className="text-sm text-slate-600 mb-4">
          Please configure the environment variables to manage clinic doctors.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-serif text-slate-900 font-normal">
          Doctor Management
        </h1>
        <p className="text-xs text-slate-400 font-light uppercase tracking-wider">
          Add, Edit, or Remove clinic doctors and assign branches
        </p>
      </div>

      <DoctorsClient initialDoctors={doctors} branches={branches} />
    </div>
  )
}
