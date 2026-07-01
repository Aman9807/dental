import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, Users, Settings, LogOut, ShieldAlert 
} from 'lucide-react'
import LogoutButton from './LogoutButton'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('dental_admin_token')

  // Protect the dashboard routes
  if (!token || token.value !== 'true') {
    redirect('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 sticky top-0 h-screen">
        <div>
          {/* Logo Brand */}
          <div className="h-16 border-b border-slate-200/80 px-6 flex items-center gap-2 bg-slate-50/50">
            <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center text-white">
              <span className="font-serif font-bold text-sm">D</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800 leading-tight">Clinic Admin</span>
              <span className="text-[10px] text-slate-400 font-light uppercase tracking-wider">Control Panel</span>
            </div>
          </div>

          {/* Links */}
          <nav className="p-4 space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition text-sm font-medium"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              Appointments
            </Link>

            <Link
              href="/admin/doctors"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition text-sm font-medium"
            >
              <Users className="w-4 h-4 text-slate-400" />
              Manage Doctors
            </Link>

            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition text-sm font-medium"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Settings
            </Link>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200/80">
          <LogoutButton />
          
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400 font-light">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-300" />
            <span>Secure Admin Session</span>
          </div>
        </div>
      </aside>

      {/* Main dashboard content */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Header bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-slate-800">
            Control Console
          </h2>
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition"
            >
              Visit Gateway Page →
            </Link>
          </div>
        </header>

        {/* Content canvas */}
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>

    </div>
  )
}
