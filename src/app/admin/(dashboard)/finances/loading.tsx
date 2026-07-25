import React from 'react'
import { SkeletonBlock } from '@/components/AdminSkeleton'

export default function FinancesLoading() {
  return (
    <>
      <div className="nav-progress-bar" />
      <div className="space-y-8" style={{ fontFamily: 'var(--font-sans, Inter), sans-serif' }}>
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <SkeletonBlock width="170px" height="24px" />
            <SkeletonBlock width="290px" height="12px" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock width="100px" height="38px" className="rounded-xl" />
            <SkeletonBlock width="110px" height="38px" className="rounded-xl" />
          </div>
        </div>

        {/* Tab filters */}
        <div className="flex gap-2">
          {[120, 100, 110, 80, 90, 75].map((w, i) => (
            <SkeletonBlock key={i} width={`${w}px`} height="34px" className="rounded-xl" />
          ))}
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="clay" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SkeletonBlock width="70px" height="10px" />
              <SkeletonBlock width="100px" height="24px" />
              <SkeletonBlock width="120px" height="10px" />
            </div>
          ))}
        </div>

        {/* Large Analytics Card */}
        <div className="clay" style={{ padding: 24 }}>
          <div className="flex justify-between items-center mb-6">
            <SkeletonBlock width="180px" height="16px" />
            <SkeletonBlock width="100px" height="28px" className="rounded-xl" />
          </div>
          <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 16, padding: '0 20px' }}>
            {[40, 70, 50, 90, 60, 80, 45, 75, 95, 55, 65, 85].map((h, i) => (
              <SkeletonBlock key={i} width="100%" height={`${h}%`} className="rounded-t-lg" />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
