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
      <main className="flex-1 flex flex-col items-center justify-center relative perspective-stage">
        
        {/* Decorative animated blobs */}
        <div className="blob blob-teal w-80 h-80 -top-20 -left-20 animate-blob opacity-80" />
        <div className="blob blob-teal w-96 h-96 -bottom-32 -right-32 animate-blob opacity-80" style={{ animationDelay: '4s' }} />
        <div className="blob blob-amber w-72 h-72 top-1/3 right-10 animate-blob opacity-70" style={{ animationDelay: '2s' }} />

        {/* Floating decorative 3D light spheres */}
        <div className="absolute top-16 left-[15%] w-4 h-4 rounded-full bg-gradient-to-r from-cyan-400 to-teal-300 animate-float-3d shadow-lg shadow-cyan-500/30" style={{ animationDelay: '0s' }} />
        <div className="absolute top-32 right-[20%] w-3.5 h-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-300 animate-float-3d-reverse shadow-lg shadow-amber-500/30" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-[25%] w-3 h-3 rounded-full bg-gradient-to-r from-teal-400 to-emerald-300 animate-float-3d shadow-lg shadow-teal-500/30" style={{ animationDelay: '2s' }} />
        <div className="absolute top-48 left-[60%] w-5 h-5 rounded-full bg-gradient-to-r from-cyan-300 to-indigo-300 animate-float-3d-reverse shadow-lg shadow-cyan-500/20" style={{ animationDelay: '3s' }} />

        <div className="py-16 px-6 max-w-6xl mx-auto w-full relative z-10">
          
          {/* Hero Text with Animated 3D Gradient */}
          <div className="text-center max-w-3xl mx-auto mb-20">
            <AnimateOnScroll animation="fade-up" delay={0}>
              <span className="inline-flex items-center gap-2 px-5 py-2 bg-white/80 backdrop-blur-md border border-cyan-200/80 rounded-full text-cyan-800 text-xs font-bold tracking-wide mb-8 shadow-lg shadow-cyan-500/10 animate-badge-bounce">
                <Sparkles className="w-4 h-4 text-cyan-600 animate-pulse" />
                Trusted 3D Dental Care Network
              </span>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={150}>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-slate-900 font-normal leading-[1.1] tracking-tight">
                Premium Dental Care,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-teal-500 to-amber-500 animate-text-gradient font-semibold">
                  Tailored to You
                </span>
              </h1>
            </AnimateOnScroll>

            <AnimateOnScroll animation="fade-up" delay={300}>
              <p className="mt-8 text-lg md:text-xl text-slate-600 font-light leading-relaxed max-w-2xl mx-auto">
                Welcome to our modern dental clinic network. Experience gentle, precise, and state-of-the-art oral healthcare across our local branches.
              </p>
            </AnimateOnScroll>

            {/* Social proof strip */}
            <AnimateOnScroll animation="fade-up" delay={450}>
              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-300 to-teal-400 border-2 border-white shadow-sm" />
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 border-2 border-white shadow-sm" />
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-300 to-green-400 border-2 border-white shadow-sm" />
                  </div>
                  <span className="font-semibold text-slate-700">500+ Happy Patients</span>
                </div>
                <div className="w-px h-4 bg-slate-300/80" />
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                  <span className="font-semibold text-slate-700">4.9 Star Rating</span>
                </div>
                <div className="w-px h-4 bg-slate-300/80" />
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                  <span className="font-semibold text-slate-700">2 Local Branches</span>
                </div>
              </div>
            </AnimateOnScroll>
          </div>

          {/* ═══ BRANCH CARDS (3D ANIMATED BLOCKS) ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto">
            
            {/* Branch 1: Hazara Dental Clinic */}
            <AnimateOnScroll animation="fade-left" delay={600} className="h-full">
              <div className="group relative h-full card-3d glass-3d border border-white/80 rounded-3xl p-8 flex flex-col justify-between overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 animate-float-3d">
                {/* Animated gradient light blur */}
                <div className="absolute -top-12 -right-12 w-44 h-44 bg-gradient-to-br from-cyan-400/15 to-teal-400/15 rounded-full blur-2xl group-hover:from-cyan-400/30 group-hover:to-teal-400/30 transition-all duration-700" />
                
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl text-white mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-md shadow-cyan-500/25">
                    <MapPin className="w-6 h-6 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-slate-900 mb-3 group-hover:text-cyan-700 transition-colors duration-300">
                    Hazara Dental Clinic
                  </h2>
                  <p className="text-slate-600 text-sm font-light leading-relaxed mb-6">
                    Specialized in clinical dental precision and advanced oral care. Modern, tranquil clinical environment.
                  </p>
                  
                  <ul className="space-y-3 text-xs text-slate-600 font-medium mb-8">
                    <li className="flex items-center gap-2.5 group-hover:translate-x-2 transition-transform duration-300">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0 shadow-sm shadow-cyan-500/50" />
                      Orthodontics & Invisible Braces
                    </li>
                    <li className="flex items-center gap-2.5 group-hover:translate-x-2 transition-transform duration-300">
                      <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 shadow-sm shadow-teal-500/50" />
                      Dental Implants & Laser Surgery
                    </li>
                    <li className="flex items-center gap-2.5 group-hover:translate-x-2 transition-transform duration-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-500/50" />
                      Professional Laser Teeth Whitening
                    </li>
                  </ul>
                </div>

                <Link 
                  href="/hazara"
                  className="relative z-10 inline-flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-700 hover:to-emerald-700 text-white rounded-2xl font-bold text-sm transition-all duration-300 shadow-lg shadow-cyan-600/20 hover:shadow-xl hover:shadow-cyan-600/30 btn-shimmer transform group-hover:scale-[1.02]"
                >
                  Visit Hazara Branch Portal
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                </Link>
              </div>
            </AnimateOnScroll>

            {/* Branch 2: Family Dental Clinic */}
            <AnimateOnScroll animation="fade-right" delay={750} className="h-full">
              <div className="group relative h-full card-3d glass-3d border border-white/80 rounded-3xl p-8 flex flex-col justify-between overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 animate-float-3d-reverse">
                {/* Animated gradient light blur */}
                <div className="absolute -top-12 -right-12 w-44 h-44 bg-gradient-to-br from-amber-400/15 to-orange-400/15 rounded-full blur-2xl group-hover:from-amber-400/30 group-hover:to-orange-400/30 transition-all duration-700" />

                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl text-white mb-6 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 shadow-md shadow-amber-500/25">
                    <MapPin className="w-6 h-6 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-slate-900 mb-3 group-hover:text-amber-800 transition-colors duration-300">
                    Family Dental Clinic
                  </h2>
                  <p className="text-slate-600 text-sm font-light leading-relaxed mb-6">
                    Tailored for patients of all ages. Comfortable, warm, and stress-free dental care for the whole family.
                  </p>
                  
                  <ul className="space-y-3 text-xs text-slate-600 font-medium mb-8">
                    <li className="flex items-center gap-2.5 group-hover:translate-x-2 transition-transform duration-300">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-sm shadow-amber-500/50" />
                      Gentle Pediatric Dental Care
                    </li>
                    <li className="flex items-center gap-2.5 group-hover:translate-x-2 transition-transform duration-300">
                      <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 shadow-sm shadow-orange-500/50" />
                      Routine Preventive Cleanings
                    </li>
                    <li className="flex items-center gap-2.5 group-hover:translate-x-2 transition-transform duration-300">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 shadow-sm shadow-rose-500/50" />
                      Aesthetic Restorations & White Fillings
                    </li>
                  </ul>
                </div>

                <Link 
                  href="/family"
                  className="relative z-10 inline-flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white rounded-2xl font-bold text-sm transition-all duration-300 shadow-lg shadow-amber-600/20 hover:shadow-xl hover:shadow-amber-600/30 btn-shimmer transform group-hover:scale-[1.02]"
                >
                  Visit Family Branch Portal
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
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


