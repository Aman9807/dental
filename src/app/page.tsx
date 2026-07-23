import Link from 'next/link'
import { Calendar, Shield, MapPin, ArrowRight, Sparkles, Heart, Star } from 'lucide-react'
import AnimateOnScroll from '@/components/AnimateOnScroll'
import DentalLogo from '@/components/DentalLogo'

export default function Home() {
  return (
    <div className="flex-1 flex flex-col justify-between min-h-screen overflow-hidden">

      {/* ═══ HEADER ═══ */}
      <header className="glass sticky top-0 z-50 animate-fade-in-down">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <DentalLogo size={36} />
            <div className="flex flex-col">
              <span className="text-lg font-serif font-semibold tracking-tight text-slate-900 group-hover:text-cyan-700 transition-colors">
                Dental Clinic
              </span>
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-500">
                Network
              </span>
            </div>
          </Link>
        </div>
      </header>

      {/* ═══ HERO SECTION ═══ */}
      <main className="flex-1 flex flex-col items-center justify-center relative">
        
        {/* Decorative animated blobs */}
        <div className="blob blob-teal w-72 h-72 -top-20 -left-20 animate-blob" />
        <div className="blob blob-teal w-96 h-96 -bottom-32 -right-32 animate-blob" style={{ animationDelay: '4s' }} />
        <div className="blob blob-amber w-60 h-60 top-1/3 right-10 animate-blob" style={{ animationDelay: '2s' }} />

        {/* Floating decorative shapes */}
        <div className="absolute top-16 left-[15%] w-3 h-3 rounded-full bg-cyan-300/40 animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-32 right-[20%] w-2 h-2 rounded-full bg-amber-300/50 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-[25%] w-2.5 h-2.5 rounded-full bg-teal-400/30 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-48 left-[60%] w-4 h-4 rounded-full bg-cyan-200/30 animate-float" style={{ animationDelay: '3s' }} />

        <div className="py-16 px-6 max-w-6xl mx-auto w-full relative z-10">
          
          {/* Hero Text */}
          <div className="text-center max-w-3xl mx-auto mb-20">
            <AnimateOnScroll animation="fade-up" delay={0}>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/70 backdrop-blur-sm border border-cyan-200/60 rounded-full text-cyan-700 text-xs font-semibold tracking-wide mb-6 shadow-sm shadow-cyan-500/5">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Trusted Dental Care Network
              </span>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={150}>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-slate-900 font-normal leading-[1.1] tracking-tight">
                Premium Dental Care,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-500">
                  Tailored to You
                </span>
              </h1>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={300}>
              <p className="mt-8 text-lg md:text-xl text-slate-500 font-light leading-relaxed max-w-2xl mx-auto">
                Welcome to our dental clinic network. We offer professional, gentle dental services across our two custom-designed local branches.
              </p>
            </AnimateOnScroll>

            {/* Social proof strip */}
            <AnimateOnScroll animation="fade-up" delay={450}>
              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1.5">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-200 to-teal-300 border-2 border-white" />
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 border-2 border-white" />
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-200 to-green-300 border-2 border-white" />
                  </div>
                  <span className="font-medium text-slate-500">500+ Patients</span>
                </div>
                <div className="w-px h-4 bg-slate-200" />
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="font-medium text-slate-500">4.9 Rating</span>
                </div>
                <div className="w-px h-4 bg-slate-200" />
                <div className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-medium text-slate-500">2 Branches</span>
                </div>
              </div>
            </AnimateOnScroll>
          </div>

          {/* ═══ BRANCH CARDS ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto">
            
            {/* Branch 1: Hazara Dental Clinic */}
            <AnimateOnScroll animation="fade-left" delay={600} className="h-full">
              <div className="group relative h-full bg-white/70 backdrop-blur-md border border-slate-200/50 rounded-3xl p-8 hover-lift hover-glow-teal flex flex-col justify-between overflow-hidden cursor-pointer shadow-lg shadow-slate-100/50 hover:shadow-2xl hover:shadow-cyan-500/5 transition-all duration-300">
                {/* Animated gradient border on hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-400/0 via-teal-400/0 to-emerald-400/0 group-hover:from-cyan-400/5 group-hover:via-teal-400/5 group-hover:to-emerald-400/5 transition-all duration-500" />
                
                {/* Decorative blob */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-cyan-400/8 to-teal-400/8 rounded-full blur-2xl group-hover:from-cyan-400/15 group-hover:to-teal-400/15 transition-all duration-700" />
                
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl text-cyan-600 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm shadow-cyan-500/10">
                    <MapPin className="w-6 h-6 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-serif text-slate-900 mb-3 group-hover:text-cyan-700 transition-colors duration-300">
                    Hazara Dental Clinic
                  </h2>
                  <p className="text-slate-500 text-sm font-light leading-relaxed mb-6">
                    Specialized in clinical dental precision and advanced oral care. Modern, tranquil clinical environment.
                  </p>
                  
                  <ul className="space-y-2.5 text-xs text-slate-500 font-light mb-8">
                    <li className="flex items-center gap-2.5 group-hover:translate-x-1.5 transition-transform duration-300" style={{ transitionDelay: '0ms' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-teal-500 shrink-0" />
                      Orthodontics & Braces
                    </li>
                    <li className="flex items-center gap-2.5 group-hover:translate-x-1.5 transition-transform duration-300" style={{ transitionDelay: '50ms' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-teal-500 shrink-0" />
                      Dental Implants & Surgery
                    </li>
                    <li className="flex items-center gap-2.5 group-hover:translate-x-1.5 transition-transform duration-300" style={{ transitionDelay: '100ms' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-teal-500 shrink-0" />
                      Professional Teeth Whitening
                    </li>
                  </ul>
                </div>

                <Link 
                  href="/hazara"
                  className="relative z-10 inline-flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-2xl font-medium text-sm transition-all duration-300 shadow-lg shadow-cyan-600/15 hover:shadow-xl hover:shadow-cyan-600/25 btn-shimmer"
                >
                  Visit Clinic Website
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </div>
            </AnimateOnScroll>

            {/* Branch 2: Family Dental Clinic */}
            <AnimateOnScroll animation="fade-right" delay={750} className="h-full">
              <div className="group relative h-full bg-white/70 backdrop-blur-md border border-slate-200/50 rounded-3xl p-8 hover-lift hover-glow-amber flex flex-col justify-between overflow-hidden cursor-pointer shadow-lg shadow-slate-100/50 hover:shadow-2xl hover:shadow-amber-500/5 transition-all duration-300">
                {/* Animated gradient border on hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-400/0 via-orange-400/0 to-yellow-400/0 group-hover:from-amber-400/5 group-hover:via-orange-400/5 group-hover:to-yellow-400/5 transition-all duration-500" />
                
                {/* Decorative blob */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-amber-400/8 to-orange-400/8 rounded-full blur-2xl group-hover:from-amber-400/15 group-hover:to-orange-400/15 transition-all duration-700" />

                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl text-amber-700 mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-sm shadow-amber-500/10">
                    <MapPin className="w-6 h-6 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-serif text-slate-900 mb-3 group-hover:text-amber-800 transition-colors duration-300">
                    Family Dental Clinic
                  </h2>
                  <p className="text-slate-500 text-sm font-light leading-relaxed mb-6">
                    Tailored for patients of all ages. Comfortable, warm, and stress-free dental care for the whole family.
                  </p>
                  
                  <ul className="space-y-2.5 text-xs text-slate-500 font-light mb-8">
                    <li className="flex items-center gap-2.5 group-hover:translate-x-1.5 transition-transform duration-300" style={{ transitionDelay: '0ms' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shrink-0" />
                      Pediatric Dental Care
                    </li>
                    <li className="flex items-center gap-2.5 group-hover:translate-x-1.5 transition-transform duration-300" style={{ transitionDelay: '50ms' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shrink-0" />
                      Routine Hygiene & Cleanings
                    </li>
                    <li className="flex items-center gap-2.5 group-hover:translate-x-1.5 transition-transform duration-300" style={{ transitionDelay: '100ms' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shrink-0" />
                      Restorations & White Fillings
                    </li>
                  </ul>
                </div>

                <Link 
                  href="/family"
                  className="relative z-10 inline-flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl font-medium text-sm transition-all duration-300 shadow-lg shadow-amber-600/15 hover:shadow-xl hover:shadow-amber-600/25 btn-shimmer"
                >
                  Visit Clinic Website
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </div>
            </AnimateOnScroll>

          </div>
        </div>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="glass border-t border-slate-200/40 py-10 text-center animate-fade-in delay-700">
        <p className="text-xs text-slate-400 font-light">© 2026 Dental Clinics. All rights reserved.</p>
        <p className="mt-1.5 text-[11px] text-slate-300 font-light">Modern Minimalist Care across Hazara & Family Branches.</p>
      </footer>
    </div>
  )
}


