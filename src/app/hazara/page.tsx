import Link from 'next/link'
import { Calendar, Clock, MapPin, Phone, ArrowLeft, ArrowRight, ShieldCheck, Star } from 'lucide-react'

export default function HazaraHome() {
  return (
    <div className="flex-1 bg-slate-50 flex flex-col justify-between min-h-screen font-sans">
      {/* Header */}
      <header className="border-b border-teal-100/50 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-xs font-medium">
            <ArrowLeft className="w-3.5 h-3.5 text-teal-600" />
            Clinic Portal
          </Link>
          <span className="text-lg font-serif text-slate-900 font-normal">
            Hazara <span className="text-teal-600 font-light">Dental Store</span>
          </span>
          <Link
            href="/hazara/book"
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition duration-200 shadow-sm hover:shadow shadow-teal-500/10"
          >
            Book Free Appointment
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1">
        <section className="py-20 px-6 bg-gradient-to-b from-teal-50/40 via-transparent to-transparent text-center max-w-4xl mx-auto">
          <span className="px-3 py-1 bg-teal-50 border border-teal-100/80 rounded-full text-teal-600 text-xs font-medium tracking-wide">
            Clinical Precision & Orthodontics
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-slate-900 font-normal mt-6 leading-tight tracking-tight">
            Excellence in Dental Care & Clinical Precision
          </h1>
          <p className="mt-6 text-base md:text-lg text-slate-500 font-light max-w-2xl mx-auto leading-relaxed">
            Hazara Dental Store offers advanced restorative and orthodontic dentistry in a premium, quiet clinical space. Our specialists combine dental science with modern aesthetics to give you a pristine smile.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/hazara/book"
              className="px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-sm font-semibold transition shadow-lg shadow-teal-600/15"
            >
              Schedule Appointment (Free)
            </Link>
            <a
              href="#services"
              className="px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-sm font-semibold transition"
            >
              Explore Services
            </a>
          </div>
        </section>

        {/* Info Grid */}
        <section className="max-w-6xl mx-auto px-6 py-12 border-y border-slate-200/60 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">Opening Hours</h4>
                <p className="text-slate-500 text-xs mt-1 font-light">Monday – Saturday: 9:00 AM – 6:00 PM</p>
                <p className="text-slate-400 text-xs mt-0.5 font-light">Closed on Sundays</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">Our Location</h4>
                <p className="text-slate-500 text-xs mt-1 font-light">Hazara Dental Store, Main Clinical Avenue</p>
                <p className="text-slate-400 text-xs mt-0.5 font-light">Medical District, Sector B</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">Get in Touch</h4>
                <p className="text-slate-500 text-xs mt-1 font-light">Direct Phone: +1 (555) 789-0123</p>
                <p className="text-slate-400 text-xs mt-0.5 font-light">Email: hazara@dentalstore.com</p>
              </div>
            </div>
          </div>
        </section>

        {/* Services Showcase */}
        <section id="services" className="py-20 px-6 max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-serif text-slate-900">Hazara Clinical Specialties</h2>
            <p className="text-slate-500 text-sm font-light mt-4">
              Advanced treatment models handled by trained specialists with state-of-the-art dental technology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-white border border-slate-200 rounded-3xl">
              <h3 className="text-lg font-serif text-slate-900 mb-3">Orthodontic Treatment</h3>
              <p className="text-slate-500 text-xs font-light leading-relaxed mb-4">
                Specialized teeth alignment procedures using high-grade ceramic, metal, or clear invisalign models.
              </p>
              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded">Specialty</span>
            </div>

            <div className="p-8 bg-white border border-slate-200 rounded-3xl">
              <h3 className="text-lg font-serif text-slate-900 mb-3">Dental Implants</h3>
              <p className="text-slate-500 text-xs font-light leading-relaxed mb-4">
                Permanent, secure titanium replacements for lost teeth, capped with customized dental porcelain crowns.
              </p>
              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded">Specialty</span>
            </div>

            <div className="p-8 bg-white border border-slate-200 rounded-3xl">
              <h3 className="text-lg font-serif text-slate-900 mb-3">Root Canal Therapy</h3>
              <p className="text-slate-500 text-xs font-light leading-relaxed mb-4">
                Painless endodontic cleanups designed to save infected teeth structure and restore complete tooth viability.
              </p>
              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded">General</span>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="bg-slate-100/50 py-20 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-600">Advanced Standards</span>
              <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mt-3 font-normal">
                Why book your treatment at Hazara Dental Store?
              </h2>
              <p className="text-slate-500 text-sm font-light mt-6 leading-relaxed">
                Our clinic is optimized for complex treatments and quiet patient recoveries. We maintain a staff of credentialed orthodontic surgeons and dental surgeons who collaborate on comprehensive care models.
              </p>
              
              <div className="mt-8 space-y-4">
                <div className="flex gap-3 items-center">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <span className="text-sm text-slate-700 font-light">100% Sterile Medical Grade Environment</span>
                </div>
                <div className="flex gap-3 items-center">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <span className="text-sm text-slate-700 font-light">Assigned Specialists with Over 10+ Years Experience</span>
                </div>
                <div className="flex gap-3 items-center">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <span className="text-sm text-slate-700 font-light">Advanced Digital Diagnostic Scanners</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200">
              <div className="flex gap-1 mb-4 text-amber-500">
                <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-slate-600 font-serif text-lg leading-relaxed italic">
                "The orthodontic surgery at Hazara Dental Store was absolutely world class. The surgeons explained every step of my implant treatment. Booking an appointment online was extremely fast and free."
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                  KH
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Khaleel H.</h4>
                  <p className="text-[10px] text-slate-400">Orthodontic Patient</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-10 text-center">
        <p className="text-xs text-slate-400 font-light">© 2026 Hazara Dental Store. All rights reserved. Clinical and Orthodontic Excellence.</p>
      </footer>
    </div>
  )
}
