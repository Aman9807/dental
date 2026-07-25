import React from 'react'
import { SkeletonBlock } from '@/components/AdminSkeleton'

export default function AppointmentsLoading() {
  return (
    <>
      <div className="nav-progress-bar" />
      <div className="space-y-8" style={{ fontFamily: 'var(--font-sans, Inter), sans-serif' }}>
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <SkeletonBlock width="180px" height="24px" />
            <SkeletonBlock width="300px" height="12px" />
          </div>
          <SkeletonBlock width="120px" height="38px" className="rounded-xl" />
        </div>

        {/* Tab filters */}
        <div className="flex gap-2">
          {[100, 80, 120, 90].map((w, i) => (
            <SkeletonBlock key={i} width={`${w}px`} height="34px" className="rounded-xl" />
          ))}
        </div>

        {/* Layout split: List on Left, Detail on Right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
          {/* Left panel: Appointments List */}
          <div className="clay" style={{ padding: 24 }}>
            <div className="flex justify-between items-center mb-6">
              <SkeletonBlock width="160px" height="16px" />
              <SkeletonBlock width="100px" height="28px" className="rounded-xl" />
            </div>
            
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock width="36px" height="36px" className="rounded-xl" />
                    <div className="space-y-2">
                      <SkeletonBlock width="120px" height="14px" />
                      <SkeletonBlock width="80px" height="10px" />
                    </div>
                  </div>
                  <SkeletonBlock width="60px" height="22px" className="rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Details Card */}
          <div className="clay" style={{ padding: 24, height: 'fit-content' }}>
            <SkeletonBlock width="120px" height="16px" className="mb-4" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SkeletonBlock width="48px" height="48px" className="rounded-full" />
                <div className="space-y-2">
                  <SkeletonBlock width="140px" height="14px" />
                  <SkeletonBlock width="100px" height="10px" />
                </div>
              </div>
              <hr className="border-slate-100" />
              <div className="space-y-3">
                <SkeletonBlock width="100%" height="40px" className="rounded-xl" />
                <SkeletonBlock width="100%" height="40px" className="rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
