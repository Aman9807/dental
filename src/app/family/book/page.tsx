import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BookingForm from '@/components/BookingForm'

export const metadata = {
  title: 'Book Appointment | Family Dental Store',
  description: 'Book a free appointment for you or your family members at Family Dental Store.',
}

export default function FamilyBookPage() {
  return (
    <div className="flex-1 bg-amber-50/10 min-h-screen flex flex-col justify-between font-sans">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/family" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-xs font-medium">
            <ArrowLeft className="w-3.5 h-3.5 text-amber-700" />
            Back to Family Home
          </Link>
          <span className="text-lg font-serif text-slate-900 font-normal">
            Family <span className="text-amber-700 font-light">Dental Store</span>
          </span>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      {/* Main booking content */}
      <main className="flex-1 py-12 px-6">
        <BookingForm branchSlug="family" />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 text-center text-xs text-slate-400 font-light">
        <p>© 2026 Family Dental Store. All rights reserved.</p>
      </footer>
    </div>
  )
}
