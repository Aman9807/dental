'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAdmin } from '../actions'
import { Shield, Key, AlertCircle, Loader2 } from 'lucide-react'

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
    <div className="flex-1 min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm rounded-3xl p-8 animate-in fade-in duration-300">
        
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-800 border border-slate-200">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif text-slate-900 font-normal">
            Clinic Control Center
          </h1>
          <p className="text-xs text-slate-400 font-light mt-1.5 uppercase tracking-wider">
            Secured Owner Dashboard
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-500">
              Enter Admin Password
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                Authorizing Access...
              </>
            ) : (
              'Enter Admin Dashboard'
            )}
          </button>
        </form>

        <div className="text-center mt-8">
          <button 
            type="button" 
            onClick={() => router.push('/')}
            className="text-xs text-slate-400 hover:text-slate-600 transition"
          >
            ← Return to Clinic Portal Gateway
          </button>
        </div>

      </div>
    </div>
  )
}
