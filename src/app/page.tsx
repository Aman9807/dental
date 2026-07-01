import Link from 'next/link'
import { Calendar, Shield, MapPin, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex-1 bg-slate-50 flex flex-col justify-between min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-serif tracking-tight font-medium text-slate-900">
            Dental Store <span className="text-slate-400 font-light font-sans text-sm uppercase ml-1 tracking-wider">Clinics</span>
          </span>
          <Link 
            href="/admin/login" 
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition"
          >
            <Shield className="w-3.5 h-3.5" />
            Admin Panel
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-slate-900 font-normal leading-tight tracking-tight">
            Premium Dental Care, Tailored to You
          </h1>
          <p className="mt-6 text-base md:text-lg text-slate-500 font-light leading-relaxed">
            Welcome to our dental clinic network. We offer professional, gentle dental services across our two custom-designed local branches. Please select a branch below to view services and schedule your appointment.
          </p>
        </div>

        {/* Branches Selection grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          
          {/* Branch 1: Hazara Dental Store */}
          <div className="group relative bg-white border border-slate-200 rounded-3xl p-8 hover:shadow-xl hover:border-teal-500/30 transition-all duration-300 flex flex-col justify-between overflow-hidden">
            {/* Top-right subtle glow on hover */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl group-hover:bg-teal-500/10 transition-colors duration-300" />
            
            <div>
              <div className="inline-flex items-center justify-center p-3 bg-teal-50 rounded-2xl text-teal-600 mb-6 group-hover:scale-110 transition-transform duration-300">
                <MapPin className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-serif text-slate-900 mb-3 group-hover:text-teal-700 transition-colors">
                Hazara Dental Store
              </h2>
              <p className="text-slate-500 text-sm font-light leading-relaxed mb-6">
                Specialized in clinical dental precision and advanced oral care. Offering a modern, tranquil clinical environment with teal design accents.
              </p>
              
              <ul className="space-y-2 text-xs text-slate-500 font-light mb-8">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Orthodontics & Braces
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Dental Implants & Surgery
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Professional Teeth Whitening
                </li>
              </ul>
            </div>

            <Link 
              href="/hazara"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-medium text-sm transition-colors duration-200 group-hover:shadow-lg group-hover:shadow-teal-500/15"
            >
              Visit Store Website
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Branch 2: Family Dental Store */}
          <div className="group relative bg-white border border-slate-200 rounded-3xl p-8 hover:shadow-xl hover:border-amber-600/30 transition-all duration-300 flex flex-col justify-between overflow-hidden">
            {/* Top-right subtle glow on hover */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors duration-300" />

            <div>
              <div className="inline-flex items-center justify-center p-3 bg-amber-50 rounded-2xl text-amber-700 mb-6 group-hover:scale-110 transition-transform duration-300">
                <MapPin className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-serif text-slate-900 mb-3 group-hover:text-amber-800 transition-colors">
                Family Dental Store
              </h2>
              <p className="text-slate-500 text-sm font-light leading-relaxed mb-6">
                Tailored for patients of all ages. Focusing on comfortable, warm, and stress-free dental care. Designed with cozy amber-bronze accents.
              </p>
              
              <ul className="space-y-2 text-xs text-slate-500 font-light mb-8">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" /> Pediatric Dental Care
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" /> Routine Hygiene & Cleanings
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" /> Restorations & White Fillings
                </li>
              </ul>
            </div>

            <Link 
              href="/family"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-amber-700 hover:bg-amber-800 text-white rounded-2xl font-medium text-sm transition-colors duration-200 group-hover:shadow-lg group-hover:shadow-amber-500/15"
            >
              Visit Store Website
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white py-8 text-center text-xs text-slate-400 font-light">
        <p>© 2026 Dental Store Clinics. All rights reserved.</p>
        <p className="mt-1">Modern Minimalist Care across Hazara & Family Branches.</p>
      </footer>
    </div>
  )
}
