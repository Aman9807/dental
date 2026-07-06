'use client'

import React, { useState } from 'react'
import { loginDoctor } from '@/app/admin/actions'
import { Sparkles, ShieldCheck, Loader2, AlertCircle } from 'lucide-react'

interface DoctorLoginProps {
  doctorName: string
  doctorSlug: string
}

export default function DoctorLogin({ doctorName, doctorSlug }: DoctorLoginProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await loginDoctor(doctorSlug, password)
      if (res.success) {
        window.location.reload()
      } else {
        setError(res.error || 'Authentication failed.')
      }
    } catch (err) {
      console.error(err)
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-sm p-8 space-y-6 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif text-slate-900 font-normal">
            Dr. {doctorName}
          </h2>
          <p className="text-xs text-slate-400 font-light uppercase tracking-wider">
            Dentist Portal Login
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">Security Password</label>
            <input
              type="password"
              required
              placeholder="Enter your doctor portal password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow shadow-slate-900/10 flex items-center justify-center gap-1.5 transition"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Unlock Portal
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 font-light">
          This portal is secure. Only authorized dentists can access medical logs.
        </div>

      </div>
    </div>
  )
}
