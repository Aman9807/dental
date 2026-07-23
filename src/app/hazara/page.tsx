import Link from 'next/link'
import { Calendar, Clock, MapPin, Phone, ArrowLeft, ArrowRight, ShieldCheck, Star, Sparkles, Zap } from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase'
import AnimateOnScroll from '@/components/AnimateOnScroll'
import DentalLogo from '@/components/DentalLogo'

export default async function HazaraHome() {
  const supabaseServer = getAdminSupabase()
  const { data: branch } = await supabaseServer
    .from('branches')
    .select('working_hours')
    .eq('slug', 'hazara')
    .single()

  const workingHours = branch?.working_hours || 'Monday – Saturday: 9:00 AM – 6:00 PM (Closed on Sunday)'

  return (
    <div className="flex-1 flex flex-col justify-between min-h-screen font-sans overflow-hidden">

      {/* ═══ HEADER ═══ */}
      <header className="glass sticky top-0 z-50 animate-fade-in-down">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors duration-200 text-xs font-medium link-underline">
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-600" />
            Clinic Portal
          </Link>
          <div className="flex items-center gap-2.5">
            <DentalLogo size={30} />
            <span className="text-lg font-serif text-slate-900 font-normal">
              Hazara{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-500 font-light">
                Dental Clinic
              </span>
            </span>
          </div>
          <Link
            href="/hazara/book"
            className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 rounded-xl transition-all duration-300 shadow-md shadow-cyan-500/15 hover:shadow-lg hover:shadow-cyan-500/25 btn-shimmer"
          >
            Book Free Appointment
          </Link>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <main className="flex-1">
        <section className="relative py-24 px-6 text-center overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 gradient-hazara" />
          
          {/* Decorative blobs */}
          <div className="blob blob-teal w-80 h-80 -top-20 -left-20 animate-blob" />
          <div className="blob blob-teal w-64 h-64 -bottom-16 -right-16 animate-blob" style={{ animationDelay: '4s' }} />
          
          {/* Floating particles */}
          <div className="absolute top-20 left-[10%] w-2 h-2 rounded-full bg-cyan-300/40 animate-float" />
          <div className="absolute top-40 right-[15%] w-3 h-3 rounded-full bg-teal-200/30 animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-20 left-[30%] w-2 h-2 rounded-full bg-cyan-400/20 animate-float" style={{ animationDelay: '4s' }} />

          <div className="relative z-10 max-w-4xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/60 backdrop-blur-sm border border-cyan-200/60 rounded-full text-cyan-700 text-xs font-semibold tracking-wide animate-fade-in-up">
              <Sparkles className="w-3.5 h-3.5" />
              Clinical Precision & Orthodontics
            </span>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-slate-900 font-normal mt-8 leading-[1.1] tracking-tight animate-fade-in-up delay-200">
              Excellence in Dental Care &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-500">
                Clinical Precision
              </span>
            </h1>

            <p className="mt-8 text-lg md:text-xl text-slate-500 font-light max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-300">
              Hazara Dental Clinic offers advanced restorative and orthodontic dentistry in a premium, quiet clinical space. Our specialists combine dental science with modern aesthetics.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-500">
              <Link
                href="/hazara/book"
                className="px-10 py-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-2xl text-sm font-semibold transition-all duration-300 shadow-xl shadow-cyan-600/20 hover:shadow-2xl hover:shadow-cyan-600/30 hover:-translate-y-0.5 btn-shimmer"
              >
                Schedule Appointment (Free)
              </Link>
              <a
                href="#services"
                className="px-10 py-4 bg-white/70 backdrop-blur-sm hover:bg-white text-slate-700 border border-slate-200/80 rounded-2xl text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                Explore Services
              </a>
            </div>
          </div>
        </section>

        {/* ═══ INFO GRID ═══ */}
        <section className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimateOnScroll animation="fade-up" delay={0}>
              <div className="flex gap-4 items-start p-6 bg-white rounded-2xl border border-slate-200/60 hover-lift">
                <div className="p-3 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl text-cyan-600 shrink-0 hover-scale">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Opening Hours</h4>
                  <p className="text-slate-500 text-xs mt-1 font-light leading-relaxed">{workingHours}</p>
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={150}>
              <div className="flex gap-4 items-start p-6 bg-white rounded-2xl border border-slate-200/60 hover-lift">
                <div className="p-3 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl text-cyan-600 shrink-0 hover-scale">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Our Location</h4>
                  <p className="text-slate-500 text-xs mt-1 font-light">Hazara Dental Clinic, Main Clinical Avenue</p>
                  <p className="text-slate-400 text-xs mt-0.5 font-light">Medical District, Sector B</p>
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={300}>
              <div className="flex gap-4 items-start p-6 bg-white rounded-2xl border border-slate-200/60 hover-lift">
                <div className="p-3 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl text-cyan-600 shrink-0 hover-scale">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Get in Touch</h4>
                  <p className="text-slate-500 text-xs mt-1 font-light">Direct Phone: +1 (555) 789-0123</p>
                  <p className="text-slate-400 text-xs mt-0.5 font-light">Email: hazara@dentalclinic.com</p>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ═══ SERVICES ═══ */}
        <section id="services" className="py-20 px-6 max-w-6xl mx-auto">
          <AnimateOnScroll animation="fade-up">
            <div className="text-center max-w-xl mx-auto mb-16">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600">Our Specialties</span>
              <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mt-3">Hazara Clinical Specialties</h2>
              <p className="text-slate-500 text-sm font-light mt-4 leading-relaxed">
                Advanced treatment models handled by trained specialists with state-of-the-art dental technology.
              </p>
            </div>
          </AnimateOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AnimateOnScroll animation="fade-up" delay={0}>
              <div className="group p-8 bg-white border border-slate-200/60 rounded-3xl hover-lift hover-glow-teal cursor-default">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl flex items-center justify-center text-cyan-600 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif text-slate-900 mb-3 group-hover:text-cyan-700 transition-colors duration-300">Orthodontic Treatment</h3>
                <p className="text-slate-500 text-xs font-light leading-relaxed mb-4">
                  Specialized teeth alignment procedures using high-grade ceramic, metal, or clear invisalign models.
                </p>
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100/60">Specialty</span>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={150}>
              <div className="group p-8 bg-white border border-slate-200/60 rounded-3xl hover-lift hover-glow-teal cursor-default">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl flex items-center justify-center text-cyan-600 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif text-slate-900 mb-3 group-hover:text-cyan-700 transition-colors duration-300">Dental Implants</h3>
                <p className="text-slate-500 text-xs font-light leading-relaxed mb-4">
                  Permanent, secure titanium replacements for lost teeth, capped with customized dental porcelain crowns.
                </p>
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100/60">Specialty</span>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={300}>
              <div className="group p-8 bg-white border border-slate-200/60 rounded-3xl hover-lift hover-glow-teal cursor-default">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl flex items-center justify-center text-cyan-600 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Star className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif text-slate-900 mb-3 group-hover:text-cyan-700 transition-colors duration-300">Root Canal Therapy</h3>
                <p className="text-slate-500 text-xs font-light leading-relaxed mb-4">
                  Painless endodontic cleanups designed to save infected teeth structure and restore complete tooth viability.
                </p>
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100/60">General</span>
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ═══ WHY CHOOSE US ═══ */}
        <section className="relative py-24 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-cyan-50/30 to-teal-50/20" />
          <div className="blob blob-teal w-60 h-60 top-10 right-0 animate-blob" style={{ animationDelay: '2s' }} />

          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative z-10">
            <AnimateOnScroll animation="fade-left">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 border border-cyan-100/60 rounded-full text-cyan-700 text-xs font-semibold mb-4">
                  <ShieldCheck className="w-3 h-3" />
                  Advanced Standards
                </span>
                <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mt-3 font-normal leading-tight">
                  Why book your treatment at{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-500">Hazara Dental Clinic?</span>
                </h2>
                <p className="text-slate-500 text-sm font-light mt-6 leading-relaxed">
                  Our clinic is optimized for complex treatments and quiet patient recoveries. We maintain a staff of credentialed orthodontic surgeons.
                </p>
                
                <div className="mt-8 space-y-4">
                  {[
                    '100% Sterile Medical Grade Environment',
                    'Assigned Specialists with Over 10+ Years Experience',
                    'Advanced Digital Diagnostic Scanners'
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-center group">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <ShieldCheck className="w-4 h-4 text-cyan-600" />
                      </div>
                      <span className="text-sm text-slate-700 font-light group-hover:text-slate-900 transition-colors duration-200">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-right" delay={200}>
              <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-xl shadow-cyan-500/5 hover-lift">
                <div className="flex gap-1 mb-4 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-slate-600 font-serif text-lg leading-relaxed italic">
                  &ldquo;The orthodontic surgery at Hazara Dental Clinic was absolutely world class. The surgeons explained every step of my implant treatment. Booking was fast and free.&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-200 to-teal-300 flex items-center justify-center text-cyan-800 font-bold text-sm shadow-sm">
                    KH
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Khaleel H.</h4>
                    <p className="text-[10px] text-slate-400">Orthodontic Patient</p>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="glass border-t border-slate-200/40 py-10 text-center">
        <p className="text-xs text-slate-400 font-light">© 2026 Hazara Dental Clinic. All rights reserved. Clinical and Orthodontic Excellence.</p>
      </footer>
    </div>
  )
}
