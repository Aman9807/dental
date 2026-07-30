import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { JetBrains_Mono, Inter } from 'next/font/google'
import { Sparkles } from 'lucide-react'
import AdminSidebar from './AdminSidebar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('dental_admin_token')

  if (!token || token.value !== 'true') {
    redirect('/admin/login')
  }

  return (
    <div
      className={`${inter.variable} ${jetbrainsMono.variable} flex min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-[#080c14] dark:text-slate-100`}
      style={{
        fontFamily: 'var(--font-sans), Inter, system-ui, sans-serif',
      }}
    >
      {/* ═══ SIDEBAR (Client Component for active-nav/collapse state) ═══ */}
      <AdminSidebar />

      {/* ═══ MAIN CONTENT ═══ */}
      <main
        className="bg-gradient-to-br from-[#f0f6ff] via-[#f8fafc] to-[#f0fdf4] dark:from-[#080c14] dark:via-[#0d1424] dark:to-[#071926] transition-colors duration-300"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Top header bar */}
        <header
          className="bg-white/85 border-b border-slate-200/60 dark:bg-[#121826]/85 dark:border-slate-800/40 transition-colors duration-300"
          style={{
            height: 68,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={14} style={{ color: '#94a3b8' }} />
            <span
              className="text-slate-900 dark:text-slate-200"
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              Control Console
            </span>
          </div>
          <Link
            href="/adminstration"
            className="text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-350 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10"
            style={{
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: 10,
              transition: 'all 0.12s ease',
              letterSpacing: '-0.01em',
            }}
          >
            Visit Gateway →
          </Link>
        </header>

        {/* Page content */}
        <div
          style={{
            flex: 1,
            padding: '28px 32px',
            overflowY: 'auto',
          }}
        >
          {children}
        </div>
      </main>
    </div>
  )
}
