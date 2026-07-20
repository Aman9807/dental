import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Suspense } from 'react'
import BookingSuccess from '@/components/BookingSuccess'

export const metadata = {
  title: 'Booking Confirmed | Family Dental Clinic',
  description: 'Your dental appointment is successfully scheduled at Family Dental Clinic.',
}

export default function FamilySuccessPage() {
  return (
    <div className="flex-1 min-h-screen flex flex-col justify-between font-sans overflow-hidden">
      
      {/* Decorative background */}
      <div className="fixed inset-0 gradient-family -z-10" />
      <div className="fixed blob blob-amber w-72 h-72 -top-20 -left-20 animate-blob -z-10" />
      <div className="fixed blob blob-amber w-60 h-60 bottom-0 -right-20 animate-blob -z-10" style={{ animationDelay: '4s' }} />

      {/* Header */}
      <header className="glass sticky top-0 z-50 animate-fade-in-down">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/family" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors duration-200 text-xs font-medium link-underline">
            <ArrowLeft className="w-3.5 h-3.5 text-amber-700" />
            Back to Family Home
          </Link>
          <span className="text-lg font-serif text-slate-900 font-normal">
            Family{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500 font-light">
              Dental Clinic
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
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin text-amber-700" />
              </div>
              <p className="text-xs font-light mt-4 tracking-wide">Loading confirmation page...</p>
            </div>
          }>
            <BookingSuccess branchSlug="family" />
          </Suspense>
        </div>
      </main>


      {/* Footer */}
      <footer className="glass border-t border-slate-200/40 py-8 text-center text-xs text-slate-400 font-light relative z-10">
        <p>© 2026 Family Dental Clinic. All rights reserved.</p>
      </footer>
    </div>
  )
}
