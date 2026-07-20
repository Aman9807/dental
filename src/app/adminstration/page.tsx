import React from 'react'
import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase'
import { Shield, Users, Camera, ArrowRight, Sparkles, Stethoscope } from 'lucide-react'

export const metadata = {
  title: 'Administration Directory | Dental Clinics',
  description: 'Centralized access portal for clinic administration, doctor portals, and mobile diagnostics.',
}

export default async function AdministrationDirectoryPage() {
  const adminDb = getAdminSupabase()
  let doctors: any[] = []
  
  try {
    const { data } = await adminDb
      .from('doctors')
      .select('id, name, slug, specialty')
      .order('name', { ascending: true })
    doctors = data || []
  } catch (err) {
    console.error('Error fetching doctors for gateway:', err)
  }

  return (
    <div className="flex-1 flex flex-col justify-between min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* Dynamic Visual Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900/60 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-200 transition-colors font-medium flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 rotate-180 text-cyan-500" />
            Home Website
          </Link>
          <span className="text-md font-serif text-slate-100 flex items-center gap-2">
            Dental Clinics <span className="text-cyan-500 font-sans text-xs uppercase tracking-widest font-semibold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">Portal</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-20 flex flex-col items-center justify-center relative z-10 w-full">
        
        {/* Banner Callout */}
        <div className="text-center max-w-xl mx-auto mb-16 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-[10px] font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Clinic Directory Gate
          </span>
          <h1 className="text-4xl md:text-5xl font-serif font-normal text-slate-100 tracking-tight leading-tight">
            Centralized Clinic <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400">
              Administration Gateway
            </span>
          </h1>
          <p className="text-sm text-slate-400 font-light leading-relaxed max-w-md mx-auto">
            Access secure administrative tools, view practitioner check-in panels, and register inventory. Authorization credentials required.
          </p>
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
          
          {/* Card 1: Admin Panel */}
          <div className="group relative bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/80 rounded-3xl p-8 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between shadow-2xl hover:shadow-cyan-500/5 cursor-pointer">
            <div className="space-y-6">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">Admin Dashboard</h3>
                <p className="text-xs text-slate-400 mt-2 font-light leading-relaxed">
                  Manage clinic bookings, payroll ledger, branches, doctors, procedures, and financials in real-time.
                </p>
              </div>
            </div>
            
            <Link 
              href="/admin"
              className="mt-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/10 transition-all"
            >
              Enter Admin Portal
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Card 2: Doctor Portals */}
          <div className="group relative bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/80 rounded-3xl p-8 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between shadow-2xl hover:shadow-teal-500/5">
            <div className="space-y-6">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center text-teal-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-200 group-hover:text-teal-400 transition-colors">Doctor Dashboards</h3>
                <p className="text-xs text-slate-400 mt-2 font-light leading-relaxed">
                  Select your practitioner gateway and enter your secure access passcode.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-2">
              {doctors.length === 0 ? (
                <p className="text-[10px] text-slate-500 font-light text-center py-4">No doctors registered yet.</p>
              ) : (
                doctors.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/doctor/${doc.slug}`}
                    className="flex justify-between items-center px-4 py-2.5 bg-slate-950/60 hover:bg-slate-800/40 border border-slate-800/50 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition duration-200"
                  >
                    <span className="flex items-center gap-1.5">
                      <Stethoscope className="w-3 h-3 text-teal-500" />
                      Dr. {doc.name}
                    </span>
                    <span className="text-[9px] text-slate-500 font-light uppercase tracking-wider">{doc.specialty}</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Card 3: Mobile Capture Utility */}
          <div className="group relative bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/80 rounded-3xl p-8 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between shadow-2xl hover:shadow-emerald-500/5 cursor-pointer">
            <div className="space-y-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">Prescription Capture</h3>
                <p className="text-xs text-slate-400 mt-2 font-light leading-relaxed">
                  Upload prescription documents and scan inventory barcodes directly using mobile device cameras.
                </p>
              </div>
            </div>

            <Link 
              href="/admin/capture"
              className="mt-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/10 transition-all"
            >
              Open Camera Link
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 py-8 bg-slate-950/40 text-center relative z-10">
        <p className="text-[10px] text-slate-500 font-light">© 2026 Dental Clinics. Restricted administrative directory portal.</p>
      </footer>

    </div>
  )
}
