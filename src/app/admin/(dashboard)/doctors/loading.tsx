import React from 'react'
import { SkeletonBlock } from '@/components/AdminSkeleton'

export default function DoctorsLoading() {
  return (
    <>
      <div className="nav-progress-bar" />
      <div className="space-y-8" style={{ fontFamily: 'var(--font-sans, Inter), sans-serif' }}>
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <SkeletonBlock width="160px" height="24px" />
            <SkeletonBlock width="280px" height="12px" />
          </div>
          <SkeletonBlock width="130px" height="38px" className="rounded-xl" />
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="clay" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="flex gap-4">
                <SkeletonBlock width="64px" height="64px" className="rounded-full shrink-0" />
                <div className="space-y-2 flex-1 pt-1">
                  <SkeletonBlock width="110px" height="14px" />
                  <SkeletonBlock width="80px" height="10px" />
                  <SkeletonBlock width="60px" height="18px" className="rounded-full" />
                </div>
              </div>
              <hr className="border-slate-100" />
              <div className="flex items-center gap-2">
                <SkeletonBlock width="14px" height="14px" className="rounded-full" />
                <SkeletonBlock width="160px" height="10px" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100/50">
                <SkeletonBlock width="28px" height="28px" className="rounded-lg" />
                <SkeletonBlock width="28px" height="28px" className="rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
