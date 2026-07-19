import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, Users, Settings, ShieldAlert, Sparkles, CircleDollarSign, Receipt
} from 'lucide-react'
import LogoutButton from './LogoutButton'

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
    <div className="flex bg-slate-50 min-h-screen font-sans">
      
      {/* ═══ SIDEBAR ═══ */}
      <aside className="w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex flex-col justify-between shrink-0 sticky top-0 h-screen">
        <div>
          {/* Logo */}
          <div className="h-16 border-b border-white/5 px-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <span className="font-serif font-bold text-sm">D</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white leading-tight">Clinic Admin</span>
              <span className="text-[10px] text-slate-400 font-light uppercase tracking-[0.15em]">Control Panel</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1 mt-2">
            {[
              { href: '/admin', icon: LayoutDashboard, label: 'Appointments' },
              { href: '/admin/doctors', icon: Users, label: 'Manage Doctors' },
              { href: '/admin/billing', icon: Receipt, label: 'Billing & Checkout' },
              { href: '/admin/finances', icon: CircleDollarSign, label: 'Finances & Profits' },
              { href: '/admin/settings', icon: Settings, label: 'Settings' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 text-sm font-medium"
              >
                <item.icon className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors duration-200" />
                <span className="group-hover:translate-x-0.5 transition-transform duration-200">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <LogoutButton />
          
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-[10px] text-slate-500 font-light">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
            <span>Secure Admin Session</span>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
        
        {/* Header */}
        <header className="h-16 glass border-b border-slate-200/60 px-8 flex items-center justify-between shrink-0 sticky top-0 z-40">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-slate-400" />
            Control Console
          </h2>
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors duration-200 link-underline"
            >
              Visit Gateway Page →
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto animate-fade-in">
          {children}
        </div>
      </main>

    </div>
  )
}
