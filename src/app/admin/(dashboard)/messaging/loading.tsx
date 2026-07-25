import React from 'react'
import { SkeletonBlock } from '@/components/AdminSkeleton'

export default function MessagingLoading() {
  return (
    <>
      <div className="nav-progress-bar" />
      <div className="space-y-8" style={{ fontFamily: 'var(--font-sans, Inter), sans-serif' }}>
        {/* Header */}
        <div className="space-y-2">
          <SkeletonBlock width="180px" height="24px" />
          <SkeletonBlock width="320px" height="12px" />
        </div>

        {/* Messaging Split Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 24 }}>
          {/* Left Panel: Logs/Templates */}
          <div className="clay" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SkeletonBlock width="140px" height="16px" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between">
                    <SkeletonBlock width="90px" height="12px" />
                    <SkeletonBlock width="40px" height="10px" />
                  </div>
                  <SkeletonBlock width="100%" height="24px" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Campaign Composer */}
          <div className="clay" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SkeletonBlock width="160px" height="16px" />
            <SkeletonBlock width="100%" height="40px" className="rounded-xl" />
            <SkeletonBlock width="100%" height="120px" className="rounded-2xl" />
            <div className="flex justify-end">
              <SkeletonBlock width="120px" height="38px" className="rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
