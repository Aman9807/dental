'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logoutAdmin } from '@/app/admin/actions'
import { LogOut, Loader2 } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await logoutAdmin()
      router.refresh()
      router.push('/admin/login')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50/50 transition text-sm font-medium focus:outline-none"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
      ) : (
        <LogOut className="w-4 h-4 text-rose-400" />
      )}
      <span>{loading ? 'Logging out...' : 'Log Out'}</span>
    </button>
  )
}
