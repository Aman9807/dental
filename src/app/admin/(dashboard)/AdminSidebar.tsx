'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Settings, ShieldAlert,
  Sparkles, CircleDollarSign, Receipt, MessageSquare,
  ChevronRight
} from 'lucide-react'
import LogoutButton from './LogoutButton'
import DentalLogo from '@/components/DentalLogo'

const NAV_ITEMS = [
  { href: '/admin',           icon: LayoutDashboard, label: 'Appointments',         color: '#0891b2', bg: '#ecfeff' },
  { href: '/admin/doctors',   icon: Users,           label: 'Manage Doctors',       color: '#7c3aed', bg: '#f5f3ff' },
  { href: '/admin/billing',   icon: Receipt,         label: 'Billing & Checkout',   color: '#059669', bg: '#ecfdf5' },
  { href: '/admin/finances',  icon: CircleDollarSign,label: 'Finances & Profits',   color: '#d97706', bg: '#fffbeb' },
  { href: '/admin/messaging', icon: MessageSquare,   label: 'Messaging & Campaigns',color: '#e11d48', bg: '#fff1f2' },
  { href: '/admin/settings',  icon: Settings,        label: 'Settings',             color: '#475569', bg: '#f8fafc' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside
      style={{
        width: 256,
        background: 'linear-gradient(170deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 180,
          height: 180,
          background: 'radial-gradient(circle, rgba(8,145,178,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: -40,
          width: 140,
          height: 140,
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div
          style={{
            height: 68,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              background: 'linear-gradient(135deg, #0891b2, #0d9488)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(8,145,178,0.4)',
              flexShrink: 0,
            }}
          >
            <DentalLogo size={22} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
              Clinic Admin
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Control Panel
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 14,
                    cursor: 'pointer',
                    background: active ? item.bg : 'transparent',
                    transition: 'background 0.12s ease',
                  }}
                >
                  {/* Active sliding background */}
                  {active && (
                    <motion.div
                      layoutId="nav-active-bg"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: item.bg,
                        borderRadius: 14,
                        opacity: 0.15,
                      }}
                    />
                  )}

                  {/* Active left accent */}
                  <AnimatePresence>
                    {active && (
                      <motion.div
                        key={`accent-${item.href}`}
                        initial={{ scaleY: 0, opacity: 0 }}
                        animate={{ scaleY: 1, opacity: 1 }}
                        exit={{ scaleY: 0, opacity: 0 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '20%',
                          bottom: '20%',
                          width: 3,
                          background: item.color,
                          borderRadius: '0 4px 4px 0',
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon container */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: active ? item.color : 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.12s ease',
                      boxShadow: active ? `0 4px 12px ${item.color}40` : 'none',
                      zIndex: 1,
                    }}
                  >
                    <item.icon
                      size={15}
                      style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.35)' }}
                    />
                  </div>

                  {/* Label */}
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: active ? 700 : 500,
                      color: active ? '#ffffff' : 'rgba(255,255,255,0.45)',
                      flex: 1,
                      zIndex: 1,
                      letterSpacing: active ? '-0.01em' : '0',
                      transition: 'color 0.12s ease',
                    }}
                  >
                    {item.label}
                  </span>

                  {active && (
                    <ChevronRight size={12} style={{ color: item.color, zIndex: 1, opacity: 0.7 }} />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '12px 10px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <LogoutButton />
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ShieldAlert size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
            Secure Admin Session
          </span>
        </div>
      </div>
    </aside>
  )
}
