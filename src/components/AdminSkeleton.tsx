'use client'

import React from 'react'

// ─────────────────────────────────────────────
// Shared Admin Skeleton — Claymorphism Edition
// Linear top progress bar + pulsing skeleton blocks
// NO spinning circles / NO rotation loaders
// ─────────────────────────────────────────────

interface SkeletonBlockProps {
  width?: string
  height?: string
  className?: string
  style?: React.CSSProperties
}

export function SkeletonBlock({ width = '100%', height = '16px', className = '', style }: SkeletonBlockProps) {
  return (
    <div
      className={`skeleton-block ${className}`}
      style={{ width, height, borderRadius: 12, ...style }}
    />
  )
}

interface AdminPageSkeletonProps {
  statCards?: number
  tableRows?: number
  showTabs?: boolean
}

export default function AdminPageSkeleton({
  statCards = 4,
  tableRows = 6,
  showTabs = false,
}: AdminPageSkeletonProps) {
  return (
    <>
      {/* ── Fixed linear top progress bar ── */}
      <div className="nav-progress-bar" />

      <div className="space-y-8" style={{ fontFamily: 'var(--font-sans, Inter), sans-serif' }}>
        {/* Page header skeleton */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <SkeletonBlock width="220px" height="28px" />
            <SkeletonBlock width="340px" height="14px" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock width="100px" height="38px" className="rounded-2xl" />
            <SkeletonBlock width="120px" height="38px" className="rounded-2xl" />
          </div>
        </div>

        {/* Optional tabs */}
        {showTabs && (
          <div className="flex gap-2">
            {[80, 100, 90, 110, 85].map((w, i) => (
              <SkeletonBlock key={i} width={`${w}px`} height="34px" className="rounded-xl" />
            ))}
          </div>
        )}

        {/* Stat cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statCards}, 1fr)`, gap: 20 }}>
          {Array.from({ length: statCards }).map((_, i) => (
            <div
              key={i}
              className="clay"
              style={{ padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <SkeletonBlock width="80px" height="12px" />
                <SkeletonBlock width="32px" height="32px" className="rounded-xl" />
              </div>
              <SkeletonBlock width="100px" height="32px" />
              <SkeletonBlock width="140px" height="11px" />
            </div>
          ))}
        </div>

        {/* Main content card */}
        <div className="clay" style={{ padding: 28, borderRadius: 24 }}>
          {/* Card header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <SkeletonBlock width="180px" height="18px" />
            <div style={{ display: 'flex', gap: 8 }}>
              <SkeletonBlock width="90px" height="32px" className="rounded-xl" />
              <SkeletonBlock width="110px" height="32px" className="rounded-xl" />
            </div>
          </div>

          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr',
              gap: 12,
              paddingBottom: 12,
              borderBottom: '1px solid #f1f5f9',
              marginBottom: 8,
            }}
          >
            {[120, 100, 70, 80, 60].map((w, i) => (
              <SkeletonBlock key={i} width={`${w}px`} height="11px" />
            ))}
          </div>

          {/* Table rows */}
          {Array.from({ length: tableRows }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr',
                gap: 12,
                padding: '14px 0',
                borderBottom: '1px solid #f8fafc',
                alignItems: 'center',
                opacity: 1 - i * 0.1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SkeletonBlock width="36px" height="36px" className="rounded-xl" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <SkeletonBlock width="140px" height="13px" style={{ marginBottom: 5 }} />
                  <SkeletonBlock width="90px" height="10px" />
                </div>
              </div>
              <SkeletonBlock width="100px" height="12px" />
              <SkeletonBlock width="60px" height="22px" className="rounded-xl" />
              <SkeletonBlock width="70px" height="22px" className="rounded-xl" />
              <SkeletonBlock width="50px" height="22px" className="rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
