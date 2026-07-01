import Link from 'next/link'
import { Calendar, Clock, MapPin, Phone, ArrowLeft, ArrowRight, Heart, Star } from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase'

export default async function FamilyHome() {
  const supabaseServer = getAdminSupabase()
  const { data: branch } = await supabaseServer
    .from('branches')
    .select('working_hours')
    .eq('slug', 'family')
    .single()

  const workingHours = branch?.working_hours || 'Monday – Friday: 9:00 AM – 6:00 PM, Saturday: 9:00 AM – 2:00 PM (Sunday Closed)'

  return (
    <div className="flex-1 bg-amber-50/20 flex flex-col justify-between min-h-screen font-sans">
      {/* Header */}
      <header className="border-b border-amber-100/50 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-xs font-medium">
            <ArrowLeft className="w-3.5 h-3.5 text-amber-700" />
            Clinic Portal
          </Link>
          <span className="text-lg font-serif text-slate-900 font-normal">
            Family <span className="text-amber-700 font-light">Dental Store</span>
          </span>
          <Link
            href="/family/book"
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition duration-200 shadow-sm hover:shadow shadow-amber-700/10"
          >
            Book Free Appointment
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1">
        <section className="py-20 px-6 bg-gradient-to-b from-amber-100/30 via-transparent to-transparent text-center max-w-4xl mx-auto">
          <span className="px-3 py-1 bg-amber-50 border border-amber-100/80 rounded-full text-amber-800 text-xs font-medium tracking-wide">
            Comfortable & Gentle Care for All Ages
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-slate-900 font-normal mt-6 leading-tight tracking-tight">
            Gentle Dental Care Built for Your Family
          </h1>
          <p className="mt-6 text-base md:text-lg text-slate-500 font-light max-w-2xl mx-auto leading-relaxed">
            Family Dental Store is committed to making dentistry stress-free, comfortable, and affordable. From your toddler’s first checkup to senior restorations, we treat every patient like family.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/family/book"
              className="px-8 py-3.5 bg-amber-700 hover:bg-amber-800 text-white rounded-2xl text-sm font-semibold transition shadow-lg shadow-amber-700/15"
            >
              Schedule Appointment (Free)
            </Link>
            <a
              href="#services"
              className="px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-sm font-semibold transition"
            >
              Our Treatments
            </a>
          </div>
        </section>

        {/* Info Grid */}
        <section className="max-w-6xl mx-auto px-6 py-12 border-y border-slate-200/60 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-700">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">Clinic Hours</h4>
                <p className="text-slate-500 text-xs mt-1 font-light">{workingHours}</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-700">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">Where to Find Us</h4>
                <p className="text-slate-500 text-xs mt-1 font-light">Family Dental Store, Suite 4, Plaza Block</p>
                <p className="text-slate-400 text-xs mt-0.5 font-light">Community Commercial Center, West side</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-700">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">Contact Clinic</h4>
                <p className="text-slate-500 text-xs mt-1 font-light">Direct Phone: +1 (555) 345-6789</p>
                <p className="text-slate-400 text-xs mt-0.5 font-light">Email: family@dentalstore.com</p>
              </div>
            </div>
          </div>
        </section>

        {/* Services Showcase */}
        <section id="services" className="py-20 px-6 max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-serif text-slate-900">Family-Centric Dental Care</h2>
            <p className="text-slate-500 text-sm font-light mt-4">
              Comprehensive dentistry tailored to give patients of all ages a comfortable, confident, healthy smile.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-white border border-slate-200 rounded-3xl">
              <h3 className="text-lg font-serif text-slate-900 mb-3">Pediatric Dental Hygiene</h3>
              <p className="text-slate-500 text-xs font-light leading-relaxed mb-4">
                Friendly, anxiety-free cleaning and education designed specially for young children and teens.
              </p>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Kids Care</span>
            </div>

            <div className="p-8 bg-white border border-slate-200 rounded-3xl">
              <h3 className="text-lg font-serif text-slate-900 mb-3">Routine Examinations & Clean</h3>
              <p className="text-slate-500 text-xs font-light leading-relaxed mb-4">
                Thorough plaque removals, dental charting, oral checkups, and polishing to preserve long term teeth health.
              </p>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Hygiene</span>
            </div>

            <div className="p-8 bg-white border border-slate-200 rounded-3xl">
              <h3 className="text-lg font-serif text-slate-900 mb-3">Crowns, Bridges & Fillings</h3>
              <p className="text-slate-500 text-xs font-light leading-relaxed mb-4">
                Reconstructive restorative fillings and ceramic caps to fix cavities, restore chewing force, and cover structural damages.
              </p>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Restorations</span>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="bg-amber-50/10 py-20 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Warm & Welcoming</span>
              <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mt-3 font-normal">
                A comfortable dental experience for your loved ones
              </h2>
              <p className="text-slate-500 text-sm font-light mt-6 leading-relaxed">
                We understand that visiting the dentist can cause anxiety. Our team focuses on gentle dental procedures, custom options, sedation choices, and absolute clinical transparency.
              </p>
              
              <div className="mt-8 space-y-4">
                <div className="flex gap-3 items-center">
                  <Heart className="w-5 h-5 text-amber-700" />
                  <span className="text-sm text-slate-700 font-light">Kid-Friendly Treatment Rooms & Amenities</span>
                </div>
                <div className="flex gap-3 items-center">
                  <Heart className="w-5 h-5 text-amber-700" />
                  <span className="text-sm text-slate-700 font-light">Conservative, Non-Aggressive Treatment Philosophy</span>
                </div>
                <div className="flex gap-3 items-center">
                  <Heart className="w-5 h-5 text-amber-700" />
                  <span className="text-sm text-slate-700 font-light">Flexible Family Booking Slots</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200">
              <div className="flex gap-1 mb-4 text-amber-500">
                <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-slate-600 font-serif text-lg leading-relaxed italic">
                "Finding a clinic that is patient with young kids and also affordable was a nightmare until we found Family Dental Store. My children actually enjoy going to their cleanings! Highly recommended!"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-sm">
                  MT
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Maria T.</h4>
                  <p className="text-[10px] text-slate-400">Mother of Two</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-10 text-center">
        <p className="text-xs text-slate-400 font-light">© 2026 Family Dental Store. All rights reserved. Gentle Care for Everyone.</p>
      </footer>
    </div>
  )
}
