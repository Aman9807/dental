import React from 'react'
import { SkeletonBlock } from '@/components/AdminSkeleton'

export default function SettingsLoading() {
  return (
    <>
      <div className="nav-progress-bar" />
      <div className="space-y-8" style={{ fontFamily: 'var(--font-sans, Inter), sans-serif' }}>
        {/* Header */}
        <div className="space-y-2">
          <SkeletonBlock width="120px" height="24px" />
          <SkeletonBlock width="240px" height="12px" />
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2">
          {[90, 110, 80].map((w, i) => (
            <SkeletonBlock key={i} width={`${w}px`} height="34px" className="rounded-xl" />
          ))}
        </div>

        {/* Settings panels grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="clay" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="flex items-center gap-2">
                <SkeletonBlock width="20px" height="20px" className="rounded-full" />
                <SkeletonBlock width="140px" height="16px" />
              </div>
              <div className="space-y-3">
                <SkeletonBlock width="100%" height="38px" className="rounded-xl" />
                <SkeletonBlock width="100%" height="38px" className="rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
