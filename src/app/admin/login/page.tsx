'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAdmin } from '../actions'
import { Shield, Key, AlertCircle, Loader2, Sparkles } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await loginAdmin(password)
      if (res.success) {
        router.refresh()
        router.push('/admin')
      } else {
        setError(res.error || 'Incorrect passcode')
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center px-6 py-12 font-sans relative overflow-hidden">
      
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-cyan-50/20 to-slate-100 -z-10" />
      <div className="fixed blob blob-teal w-80 h-80 -top-20 -right-20 animate-blob -z-10" style={{ opacity: 0.08 }} />
      <div className="fixed blob blob-teal w-60 h-60 -bottom-20 -left-20 animate-blob -z-10" style={{ animationDelay: '4s', opacity: 0.06 }} />
      
      {/* Floating particles */}
      <div className="fixed top-20 left-[20%] w-2 h-2 rounded-full bg-cyan-300/20 animate-float -z-10" />
      <div className="fixed top-40 right-[25%] w-3 h-3 rounded-full bg-slate-300/20 animate-float -z-10" style={{ animationDelay: '2s' }} />
      <div className="fixed bottom-40 left-[35%] w-2 h-2 rounded-full bg-teal-300/15 animate-float -z-10" style={{ animationDelay: '4s' }} />

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-2xl shadow-slate-200/40 rounded-3xl p-10 animate-scale-in relative">
        
        {/* Header Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/20 animate-fade-in-down">
            <Shield className="w-7 h-7" />
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-serif text-slate-900 font-normal animate-fade-in-up delay-100">
            Clinic Control Center
          </h1>
          <p className="text-xs text-slate-400 font-light mt-2 uppercase tracking-[0.2em] animate-fade-in-up delay-200">
            Secured Owner Dashboard
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50/80 border border-rose-100 text-rose-800 text-xs rounded-2xl flex items-start gap-2.5 animate-fade-in-up">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up delay-300">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Admin Password
            </label>
            <div className="relative group">
              <Key className="absolute left-4 top-3.5 w-4 h-4 text-slate-300 group-focus-within:text-slate-500 transition-colors duration-200" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all duration-200 bg-white/80 hover:border-slate-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-slate-900/15 hover:shadow-2xl hover:shadow-slate-900/25 hover:-translate-y-0.5 btn-shimmer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                Authorizing Access...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Enter Admin Dashboard
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-10 animate-fade-in delay-500">
          <button 
            type="button" 
            onClick={() => router.push('/')}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors duration-200 link-underline"
          >
            ← Return to Clinic Portal Gateway
          </button>
        </div>

      </div>
    </div>
  )
}
