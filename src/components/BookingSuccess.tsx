'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  CheckCircle, AlertCircle, Loader2, ArrowLeft, 
  Calendar, Clock, User, Phone, MapPin, Mail, Home, Sparkles
} from 'lucide-react'

interface BookingSuccessProps {
  branchSlug: 'hazara' | 'family'
}

export default function BookingSuccess({ branchSlug }: BookingSuccessProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get('id')

  const isHazara = branchSlug === 'hazara'

  const theme = {
    accentText: isHazara ? 'text-cyan-600' : 'text-amber-700',
    accentBg: isHazara 
      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700' 
      : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700',
    accentBorder: isHazara ? 'border-cyan-200/60' : 'border-amber-200/60',
    accentLightBg: isHazara ? 'bg-cyan-50/50' : 'bg-amber-50/50',
    iconGradient: isHazara
      ? 'from-cyan-500/20 to-teal-500/20'
      : 'from-amber-500/20 to-orange-500/20',
    gradientText: isHazara
      ? 'from-cyan-600 to-teal-500'
      : 'from-amber-600 to-orange-500',
    cardShadow: isHazara ? 'shadow-cyan-500/5' : 'shadow-amber-500/5',
  }

  const [appointment, setAppointment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAppointment() {
      if (!appointmentId) {
        setError('No appointment ID found. Please go back to booking.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Query the appointment details joining related tables
        const { data, error: fetchErr } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            problem_description,
            patients (
              name,
              age,
              mobile,
              email
            ),
            doctors (
              name,
              specialty
            ),
            branches (
              name
            )
          `)
          .eq('id', appointmentId)
          .single()

        if (fetchErr || !data) {
          throw new Error('Appointment details could not be found.')
        }

        setAppointment(data)
      } catch (err: any) {
        console.error('Error fetching appointment:', err)
        setError(err.message || 'Could not load appointment details.')
      } finally {
        setLoading(false)
      }
    }

    fetchAppointment()
  }, [appointmentId])

  // Helper to format date
  const formatDate = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      return new Date(dateStr).toLocaleDateString('en-US', options)
    } catch {
      return dateStr
    }
  }

  // Helper to format time
  const formatTime = (timeStr: string) => {
    try {
      const parts = timeStr.split(':')
      let hours = parseInt(parts[0], 10)
      const minutes = parts[1] || '00'
      const ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12
      hours = hours ? hours : 12
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`
    } catch {
      return timeStr
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <div className={`w-14 h-14 rounded-2xl ${isHazara ? 'bg-cyan-50' : 'bg-amber-50'} flex items-center justify-center animate-pulse`}>
          <Loader2 className={`w-7 h-7 animate-spin ${theme.accentText}`} />
        </div>
        <p className="text-xs font-light mt-4 tracking-wide">Retrieving confirmation details...</p>
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 border border-slate-200/60 rounded-3xl shadow-lg bg-white/95 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-serif text-slate-800 mb-2">Booking Not Found</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed font-light">
          {error || 'The requested appointment record does not exist or has expired.'}
        </p>
        <button
          onClick={() => router.push(`/${branchSlug}/book`)}
          className={`w-full py-3 text-xs font-semibold text-white rounded-xl transition duration-300 shadow-md ${theme.accentBg}`}
        >
          Go to Booking Page
        </button>
      </div>
    )
  }

  const patient = appointment.patients
  const doctor = appointment.doctors
  const branch = appointment.branches

  return (
    <div className={`max-w-xl mx-auto my-6 p-8 border border-slate-200/60 rounded-3xl shadow-2xl bg-white/95 backdrop-blur-md text-center ${theme.cardShadow} animate-in zoom-in-95 duration-350`}>
      {/* Success Badge */}
      <div className={`w-20 h-20 bg-gradient-to-br ${theme.iconGradient} rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce`}>
        <CheckCircle className={`w-10 h-10 ${theme.accentText}`} />
      </div>
      
      <h2 className="text-2xl font-serif text-slate-900 mb-2 font-normal">
        Appointment Successful!
      </h2>
      <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed font-light">
        Your slot is reserved. The dentist is notified of your visit, and you are ready to check in at the clinic.
      </p>

      {/* Booking Details Card */}
      <div className={`text-left rounded-2xl border ${theme.accentBorder} ${theme.accentLightBg} p-6 mb-6 space-y-4`}>
        <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
          <Sparkles className={`w-4 h-4 ${theme.accentText}`} />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Booking Summary</h4>
          <span className="text-[10px] text-slate-400 font-mono ml-auto truncate max-w-[120px]" title={appointment.id}>
            ID: {appointment.id.substring(0, 8)}...
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Clinic Branch</span>
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {branch?.name}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Assigned Dentist</span>
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Dr. {doctor?.name}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Date</span>
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {formatDate(appointment.appointment_date)}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Time Slot</span>
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {formatTime(appointment.appointment_time)}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/60 pt-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500 font-light">Patient Name:</span>
            <span className="font-semibold text-slate-700">{patient?.name} ({patient?.age} yrs)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-light">Contact Number:</span>
            <span className="font-medium text-slate-700 flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" /> {patient?.mobile}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-light">Email Address:</span>
            <span className="font-medium text-slate-700 flex items-center gap-1">
              <Mail className="w-3 h-3 text-slate-400" /> {patient?.email}
            </span>
          </div>
        </div>

        {appointment.problem_description && (
          <div className="border-t border-slate-200/60 pt-3 text-xs">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Stated Concern</span>
            <p className="text-slate-600 bg-white/60 p-3 rounded-xl border border-slate-100 italic leading-relaxed font-light">
              "{appointment.problem_description}"
            </p>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => router.push(`/${branchSlug}`)}
          className="flex-1 py-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition duration-200 flex items-center justify-center gap-1.5"
        >
          <Home className="w-3.5 h-3.5" />
          Go to Home
        </button>

        <button
          onClick={() => router.push(`/${branchSlug}/book`)}
          className={`flex-1 py-3 text-xs font-semibold text-white rounded-xl transition duration-200 shadow-md ${theme.accentBg} flex items-center justify-center gap-1.5`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Book Another
        </button>
      </div>
    </div>
  )
}
