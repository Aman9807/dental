import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Suspense } from 'react'
import BookingSuccess from '@/components/BookingSuccess'

export const metadata = {
  title: 'Booking Confirmed | Hazara Dental Store',
  description: 'Your dental appointment is successfully scheduled at Hazara Dental Store.',
}

export default function HazaraSuccessPage() {
  return (
    <div className="flex-1 min-h-screen flex flex-col justify-between font-sans overflow-hidden">
      
      {/* Decorative background */}
      <div className="fixed inset-0 gradient-hazara -z-10" />
      <div className="fixed blob blob-teal w-72 h-72 -top-20 -right-20 animate-blob -z-10" />
      <div className="fixed blob blob-teal w-60 h-60 bottom-0 -left-20 animate-blob -z-10" style={{ animationDelay: '4s' }} />

      {/* Header */}
      <header className="glass sticky top-0 z-50 animate-fade-in-down">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/hazara" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors duration-200 text-xs font-medium link-underline">
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-600" />
            Back to Hazara Home
          </Link>
          <span className="text-lg font-serif text-slate-900 font-normal">
            Hazara{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-500 font-light">
              Dental Store
            </span>
          </span>
          <div className="w-20" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-12 px-6 relative z-10">
        <div className="animate-fade-in-up delay-200">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 flex items-center justify-center animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin text-cyan-600" />
              </div>
              <p className="text-xs font-light mt-4 tracking-wide">Loading confirmation page...</p>
            </div>
          }>
            <BookingSuccess branchSlug="hazara" />
          </Suspense>
        </div>
      </main>


      {/* Footer */}
      <footer className="glass border-t border-slate-200/40 py-8 text-center text-xs text-slate-400 font-light relative z-10">
        <p>© 2026 Hazara Dental Store. All rights reserved.</p>
      </footer>
    </div>
  )
}
