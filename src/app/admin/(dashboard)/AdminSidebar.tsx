'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Settings, ShieldAlert,
  Sparkles, CircleDollarSign, Receipt, MessageSquare,
  ChevronRight, ChevronLeft, Sun, Moon
} from 'lucide-react'
import LogoutButton from './LogoutButton'
import DentalLogo from '@/components/DentalLogo'
import { useTheme } from '@/components/ThemeContext'

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
  const { theme, toggleTheme } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed') === 'true'
    setIsCollapsed(saved)
    setMounted(true)
  }, [])

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const handleToggleCollapse = () => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem('admin_sidebar_collapsed', String(nextState))
  }

  // To prevent layout shift on first mount
  const sidebarWidth = mounted ? (isCollapsed ? 80 : 256) : 256

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      style={{
        background: 'linear-gradient(170deg, #0c1a17 0%, #152d28 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        borderRight: '1px solid rgba(255,255,255,0.05)',
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
          background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
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
            padding: isCollapsed ? '0 10px' : '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                background: 'linear-gradient(135deg, #10b981, #0d9488)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
                flexShrink: 0,
              }}
            >
              <DentalLogo size={22} />
            </div>
            <AnimatePresence initial={false} mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 'auto' }}
                  exit={{ opacity: 0, x: -10, width: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                    Clinic Admin
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    Control Panel
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={handleToggleCollapse}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  borderRadius: '8px',
                  padding: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                className="hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft size={15} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Collapsed Expand Trigger */}
        {isCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <button
              onClick={handleToggleCollapse}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              className="hover:bg-white/10 hover:text-white"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ x: isCollapsed ? 0 : 3 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: isCollapsed ? 0 : 10,
                    padding: isCollapsed ? '10px 0' : '10px 12px',
                    borderRadius: 14,
                    cursor: 'pointer',
                    background: active ? item.bg : 'transparent',
                    transition: 'background 0.12s ease',
                  }}
                  title={isCollapsed ? item.label : undefined}
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

                  {/* Label (High contrast text color fix) */}
                  {/* Label (High contrast text color fix) */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          fontSize: 12.5,
                          fontWeight: active ? 700 : 500,
                          color: active ? '#0f172a' : 'rgba(255,255,255,0.45)',
                          flex: 1,
                          zIndex: 1,
                          letterSpacing: active ? '-0.01em' : '0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                        }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {!isCollapsed && active && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.7, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        style={{ zIndex: 1 }}
                      >
                        <ChevronRight size={12} style={{ color: item.color }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            )
          })}
        </nav>
      </div>

      <div>
        {/* Theme Toggle Button */}
        <div style={{ padding: isCollapsed ? '0 10px' : '0 10px', marginBottom: 8 }}>
          <button
            onClick={toggleTheme}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: 14,
              padding: isCollapsed ? '10px 0' : '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: 10,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            className="hover:bg-white/10 hover:text-white"
            title={isCollapsed ? 'Toggle Theme' : undefined}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} style={{ color: '#fbbf24' }} />
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
                    >
                      Light Mode
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <>
                <Moon size={15} style={{ color: '#a5f3fc' }} />
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
                    >
                      Dark Mode
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: isCollapsed ? '12px 0 16px' : '12px 10px 16px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <LogoutButton isCollapsed={isCollapsed} />
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <ShieldAlert size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Secure Admin Session
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}
