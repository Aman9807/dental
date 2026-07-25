import React from 'react'
import { SkeletonBlock } from '@/components/AdminSkeleton'

export default function BillingLoading() {
  return (
    <>
      <div className="nav-progress-bar" />
      <div className="space-y-8" style={{ fontFamily: 'var(--font-sans, Inter), sans-serif' }}>
        {/* Header */}
        <div className="space-y-2">
          <SkeletonBlock width="140px" height="24px" />
          <SkeletonBlock width="260px" height="12px" />
        </div>

        {/* Layout split */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
          
          {/* Left panel: Catalog and Selection */}
          <div className="space-y-6">
            {/* Card 1 */}
            <div className="clay" style={{ padding: 24 }}>
              <SkeletonBlock width="160px" height="16px" className="mb-4" />
              <SkeletonBlock width="100%" height="42px" className="rounded-2xl" />
            </div>

            {/* Card 2 */}
            <div className="clay" style={{ padding: 24 }}>
              <SkeletonBlock width="180px" height="16px" className="mb-4" />
              <SkeletonBlock width="100%" height="42px" className="rounded-2xl mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <SkeletonBlock width="100%" height="42px" className="rounded-2xl" />
                <SkeletonBlock width="100%" height="42px" className="rounded-2xl" />
              </div>
            </div>
          </div>

          {/* Right panel: Checkout Summary */}
          <div className="clay" style={{ padding: 24, height: 'fit-content' }}>
            <SkeletonBlock width="140px" height="16px" className="mb-6" />
            <div className="space-y-4">
              <div className="flex justify-between">
                <SkeletonBlock width="80px" height="12px" />
                <SkeletonBlock width="60px" height="12px" />
              </div>
              <div className="flex justify-between">
                <SkeletonBlock width="100px" height="12px" />
                <SkeletonBlock width="50px" height="12px" />
              </div>
              <hr className="border-slate-100" />
              <div className="flex justify-between">
                <SkeletonBlock width="90px" height="16px" />
                <SkeletonBlock width="70px" height="16px" />
              </div>
              <SkeletonBlock width="100%" height="48px" className="rounded-2xl mt-4" />
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
