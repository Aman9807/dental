'use client'

import React, { useEffect } from 'react'
import { AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function DoctorFinanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Doctor finance page error boundary caught:', error)
  }, [error])

  return (
    <div className="p-8 max-w-xl mx-auto text-center bg-white dark:bg-[#121c19] border border-slate-200 dark:border-teal-900/30 rounded-3xl mt-12 shadow-sm space-y-4">
      <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
        Unable to Load Doctor Financial Breakdown
      </h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
        An unexpected error occurred while fetching or calculating doctor payroll data. Please try reloading or returning to the finances dashboard.
      </p>
      
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Reload Page
        </button>

        <Link
          href="/admin/finances"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Finances
        </Link>
      </div>
    </div>
  )
}
