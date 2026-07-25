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
      className={`${inter.variable} ${jetbrainsMono.variable} flex min-h-screen`}
      style={{
        background: '#f0f6ff',
        fontFamily: 'var(--font-sans), Inter, system-ui, sans-serif',
      }}
    >
      {/* ═══ SIDEBAR (Client Component for active-nav detection) ═══ */}
      <AdminSidebar />

      {/* ═══ MAIN CONTENT ═══ */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          background: 'linear-gradient(160deg, #f0f6ff 0%, #f8fafc 50%, #f0fdf4 100%)',
        }}
      >
        {/* Top header bar */}
        <header
          style={{
            height: 68,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(15,23,42,0.07)',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={14} style={{ color: '#94a3b8' }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.01em',
              }}
            >
              Control Console
            </span>
          </div>
          <Link
            href="/adminstration"
            style={{
              fontSize: 12,
              color: '#64748b',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: 10,
              background: 'rgba(15,23,42,0.04)',
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
