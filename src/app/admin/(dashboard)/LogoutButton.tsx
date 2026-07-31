'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logoutAdmin } from '@/app/admin/actions'
import { LogOut, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LogoutButton({ isCollapsed }: { isCollapsed?: boolean }) {
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
    <motion.button
      layout
      onClick={handleLogout}
      disabled={loading}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: isCollapsed ? 0 : 12,
        paddingRight: isCollapsed ? 0 : 12,
        borderRadius: 14,
        fontSize: 12,
        fontWeight: 600,
        overflow: 'hidden',
      }}
      className="bg-white/0 text-rose-400 hover:text-rose-300 hover:bg-white/5 transition-colors focus:outline-none group cursor-pointer"
      title={isCollapsed ? 'Log Out' : undefined}
    >
      <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
        ) : (
          <LogOut className="w-4 h-4 text-rose-400" />
        )}
      </div>
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', marginLeft: 10 }}
          >
            {loading ? 'Logging out...' : 'Log Out'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
