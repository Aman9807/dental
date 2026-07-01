import Link from 'next/link'
import { Calendar, Clock, MapPin, Phone, ArrowLeft, ArrowRight, Heart, Star, Sparkles, Smile } from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase'
import AnimateOnScroll from '@/components/AnimateOnScroll'

export default async function FamilyHome() {
  const supabaseServer = getAdminSupabase()
  const { data: branch } = await supabaseServer
    .from('branches')
    .select('working_hours')
    .eq('slug', 'family')
    .single()

  const workingHours = branch?.working_hours || 'Monday – Friday: 9:00 AM – 6:00 PM, Saturday: 9:00 AM – 2:00 PM (Sunday Closed)'

  return (
    <div className="flex-1 flex flex-col justify-between min-h-screen font-sans overflow-hidden">

      {/* ═══ HEADER ═══ */}
      <header className="glass sticky top-0 z-50 animate-fade-in-down">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors duration-200 text-xs font-medium link-underline">
            <ArrowLeft className="w-3.5 h-3.5 text-amber-700" />
            Clinic Portal
          </Link>
          <span className="text-lg font-serif text-slate-900 font-normal">
            Family{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500 font-light">
              Dental Store
            </span>
          </span>
          <Link
            href="/family/book"
            className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl transition-all duration-300 shadow-md shadow-amber-500/15 hover:shadow-lg hover:shadow-amber-500/25 btn-shimmer"
          >
            Book Free Appointment
          </Link>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <main className="flex-1">
        <section className="relative py-24 px-6 text-center overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 gradient-family" />
          
          {/* Decorative blobs */}
          <div className="blob blob-amber w-80 h-80 -top-20 -right-20 animate-blob" />
          <div className="blob blob-amber w-64 h-64 -bottom-16 -left-16 animate-blob" style={{ animationDelay: '4s' }} />
          
          {/* Floating particles */}
          <div className="absolute top-20 right-[10%] w-2 h-2 rounded-full bg-amber-300/40 animate-float" />
          <div className="absolute top-40 left-[15%] w-3 h-3 rounded-full bg-orange-200/30 animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-20 right-[30%] w-2 h-2 rounded-full bg-amber-400/20 animate-float" style={{ animationDelay: '4s' }} />

          <div className="relative z-10 max-w-4xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/60 backdrop-blur-sm border border-amber-200/60 rounded-full text-amber-800 text-xs font-semibold tracking-wide animate-fade-in-up">
              <Heart className="w-3.5 h-3.5" />
              Comfortable & Gentle Care for All Ages
            </span>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-slate-900 font-normal mt-8 leading-[1.1] tracking-tight animate-fade-in-up delay-200">
              Gentle Dental Care{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-500">
                Built for Your Family
              </span>
            </h1>

            <p className="mt-8 text-lg md:text-xl text-slate-500 font-light max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-300">
              Family Dental Store is committed to making dentistry stress-free, comfortable, and affordable. From your toddler&apos;s first checkup to senior restorations, we treat every patient like family.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-500">
              <Link
                href="/family/book"
                className="px-10 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl text-sm font-semibold transition-all duration-300 shadow-xl shadow-amber-600/20 hover:shadow-2xl hover:shadow-amber-600/30 hover:-translate-y-0.5 btn-shimmer"
              >
                Schedule Appointment (Free)
              </Link>
              <a
                href="#services"
                className="px-10 py-4 bg-white/70 backdrop-blur-sm hover:bg-white text-slate-700 border border-slate-200/80 rounded-2xl text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                Our Treatments
              </a>
            </div>
          </div>
        </section>

        {/* ═══ INFO GRID ═══ */}
        <section className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimateOnScroll animation="fade-up" delay={0}>
              <div className="flex gap-4 items-start p-6 bg-white rounded-2xl border border-slate-200/60 hover-lift">
                <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl text-amber-700 shrink-0 hover-scale">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Clinic Hours</h4>
                  <p className="text-slate-500 text-xs mt-1 font-light leading-relaxed">{workingHours}</p>
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={150}>
              <div className="flex gap-4 items-start p-6 bg-white rounded-2xl border border-slate-200/60 hover-lift">
                <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl text-amber-700 shrink-0 hover-scale">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Where to Find Us</h4>
                  <p className="text-slate-500 text-xs mt-1 font-light">Family Dental Store, Suite 4, Plaza Block</p>
                  <p className="text-slate-400 text-xs mt-0.5 font-light">Community Commercial Center, West side</p>
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={300}>
              <div className="flex gap-4 items-start p-6 bg-white rounded-2xl border border-slate-200/60 hover-lift">
                <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl text-amber-700 shrink-0 hover-scale">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Contact Clinic</h4>
                  <p className="text-slate-500 text-xs mt-1 font-light">Direct Phone: +1 (555) 345-6789</p>
                  <p className="text-slate-400 text-xs mt-0.5 font-light">Email: family@dentalstore.com</p>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ═══ SERVICES ═══ */}
        <section id="services" className="py-20 px-6 max-w-6xl mx-auto">
          <AnimateOnScroll animation="fade-up">
            <div className="text-center max-w-xl mx-auto mb-16">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Our Treatments</span>
              <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mt-3">Family-Centric Dental Care</h2>
              <p className="text-slate-500 text-sm font-light mt-4 leading-relaxed">
                Comprehensive dentistry tailored to give patients of all ages a comfortable, confident, healthy smile.
              </p>
            </div>
          </AnimateOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AnimateOnScroll animation="fade-up" delay={0}>
              <div className="group p-8 bg-white border border-slate-200/60 rounded-3xl hover-lift hover-glow-amber cursor-default">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl flex items-center justify-center text-amber-700 mb-5 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                  <Smile className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif text-slate-900 mb-3 group-hover:text-amber-800 transition-colors duration-300">Pediatric Dental Hygiene</h3>
                <p className="text-slate-500 text-xs font-light leading-relaxed mb-4">
                  Friendly, anxiety-free cleaning and education designed specially for young children and teens.
                </p>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100/60">Kids Care</span>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={150}>
              <div className="group p-8 bg-white border border-slate-200/60 rounded-3xl hover-lift hover-glow-amber cursor-default">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl flex items-center justify-center text-amber-700 mb-5 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif text-slate-900 mb-3 group-hover:text-amber-800 transition-colors duration-300">Routine Examinations & Clean</h3>
                <p className="text-slate-500 text-xs font-light leading-relaxed mb-4">
                  Thorough plaque removals, dental charting, oral checkups, and polishing to preserve long term teeth health.
                </p>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100/60">Hygiene</span>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={300}>
              <div className="group p-8 bg-white border border-slate-200/60 rounded-3xl hover-lift hover-glow-amber cursor-default">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl flex items-center justify-center text-amber-700 mb-5 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                  <Star className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif text-slate-900 mb-3 group-hover:text-amber-800 transition-colors duration-300">Crowns, Bridges & Fillings</h3>
                <p className="text-slate-500 text-xs font-light leading-relaxed mb-4">
                  Reconstructive restorative fillings and ceramic caps to fix cavities, restore chewing force, and cover structural damages.
                </p>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100/60">Restorations</span>
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ═══ WHY CHOOSE US ═══ */}
        <section className="relative py-24 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20" />
          <div className="blob blob-amber w-60 h-60 top-10 left-0 animate-blob" style={{ animationDelay: '2s' }} />

          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative z-10">
            <AnimateOnScroll animation="fade-left">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-100/60 rounded-full text-amber-800 text-xs font-semibold mb-4">
                  <Heart className="w-3 h-3" />
                  Warm & Welcoming
                </span>
                <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mt-3 font-normal leading-tight">
                  A comfortable dental experience for{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500">your loved ones</span>
                </h2>
                <p className="text-slate-500 text-sm font-light mt-6 leading-relaxed">
                  We understand that visiting the dentist can cause anxiety. Our team focuses on gentle dental procedures, custom options, and absolute clinical transparency.
                </p>
                
                <div className="mt-8 space-y-4">
                  {[
                    'Kid-Friendly Treatment Rooms & Amenities',
                    'Conservative, Non-Aggressive Treatment Philosophy',
                    'Flexible Family Booking Slots'
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-center group">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Heart className="w-4 h-4 text-amber-700" />
                      </div>
                      <span className="text-sm text-slate-700 font-light group-hover:text-slate-900 transition-colors duration-200">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-right" delay={200}>
              <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-xl shadow-amber-500/5 hover-lift">
                <div className="flex gap-1 mb-4 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-slate-600 font-serif text-lg leading-relaxed italic">
                  &ldquo;Finding a clinic that is patient with young kids and also affordable was a nightmare until we found Family Dental Store. My children actually enjoy going to their cleanings!&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center text-amber-900 font-bold text-sm shadow-sm">
                    MT
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Maria T.</h4>
                    <p className="text-[10px] text-slate-400">Mother of Two</p>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="glass border-t border-slate-200/40 py-10 text-center">
        <p className="text-xs text-slate-400 font-light">© 2026 Family Dental Store. All rights reserved. Gentle Care for Everyone.</p>
      </footer>
    </div>
  )
}
