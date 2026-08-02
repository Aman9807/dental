'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { sendAppointmentEmail } from '@/app/admin/actions'
import { 
  Calendar, Clock, User, Phone, Mail, FileText, 
  CheckCircle, AlertCircle, ChevronRight, Loader2, ArrowLeft, Sparkles
} from 'lucide-react'

const TIME_SLOTS = [
  { value: '09:00:00', label: '09:00 AM' },
  { value: '10:00:00', label: '10:00 AM' },
  { value: '11:00:00', label: '11:00 AM' },
  { value: '12:00:00', label: '12:00 PM' },
  { value: '14:00:00', label: '02:00 PM' },
  { value: '15:00:00', label: '03:00 PM' },
  { value: '16:00:00', label: '04:00 PM' },
  { value: '17:00:00', label: '05:00 PM' },
]

interface Doctor {
  id: string
  name: string
  specialty: string | null
  picture_url: string | null
}

interface Branch {
  id: string
  name: string
  slug: string
}

interface BookingFormProps {
  branchSlug: 'hazara' | 'family'
}

export default function BookingForm({ branchSlug }: BookingFormProps) {
  const isHazara = branchSlug === 'hazara'
  const router = useRouter()
  
  const theme = {
    accentText: isHazara ? 'text-cyan-600' : 'text-amber-700',
    accentBg: isHazara 
      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700' 
      : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700',
    accentRing: isHazara ? 'focus:ring-cyan-500/30' : 'focus:ring-amber-500/30',
    accentBorder: isHazara ? 'border-cyan-200' : 'border-amber-200',
    accentLightBg: isHazara ? 'bg-cyan-50' : 'bg-amber-50',
    btnSelected: isHazara 
      ? 'bg-cyan-50 border-cyan-500 text-cyan-900 shadow-sm shadow-cyan-500/10' 
      : 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm shadow-amber-500/10',
    heroBg: isHazara 
      ? 'bg-gradient-to-r from-cyan-50/80 via-teal-50/40 to-transparent' 
      : 'bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-transparent',
    gradientText: isHazara
      ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-500'
      : 'text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500',
    iconGradient: isHazara
      ? 'from-cyan-50 to-teal-50'
      : 'from-amber-50 to-orange-50',
    glowClass: isHazara ? 'hover-glow-teal' : 'hover-glow-amber',
    progressActive: isHazara
      ? 'bg-gradient-to-r from-cyan-500 to-teal-500'
      : 'bg-gradient-to-r from-amber-500 to-orange-500',
    progressBg: isHazara ? 'bg-cyan-100' : 'bg-amber-100',
  }

  // State
  const [branch, setBranch] = useState<Branch | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [activeTimeSlots, setActiveTimeSlots] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [dbConfigured, setDbConfigured] = useState(true)
  const [step, setStep] = useState(1)

  // Patient uniqueness / Family member flow state
  const [existingPatientId, setExistingPatientId] = useState<string | null>(null)
  const [isFamilyMember, setIsFamilyMember] = useState<boolean>(false)
  const [familyPrimaryPatientName, setFamilyPrimaryPatientName] = useState<string>('')
  const [showFamilyCheck, setShowFamilyCheck] = useState<boolean>(false)
  const [checkingPatient, setCheckingPatient] = useState<boolean>(false)

  // Form inputs
  const [patientName, setPatientName] = useState('')
  const [patientAge, setPatientAge] = useState('')
  const [patientMobile, setPatientMobile] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [problemDescription, setProblemDescription] = useState('')
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')

  // Input change handlers that reset conflict detection
  const handleNameChange = (val: string) => {
    setPatientName(val)
    setExistingPatientId(null)
    setIsFamilyMember(false)
    setShowFamilyCheck(false)
  }
  const handleEmailChange = (val: string) => {
    setPatientEmail(val)
    setExistingPatientId(null)
    setIsFamilyMember(false)
    setShowFamilyCheck(false)
  }
  const handleMobileChange = (val: string) => {
    setPatientMobile(val)
    setExistingPatientId(null)
    setIsFamilyMember(false)
    setShowFamilyCheck(false)
  }

  // Pre-check patient registry before step 2
  const handleNextStep1 = async () => {
    if (!patientName.trim() || !patientAge || !patientMobile.trim() || !patientEmail.trim()) {
      setError('Please complete all demographic fields.')
      return
    }

    try {
      setCheckingPatient(true)
      setError(null)

      const trimmedEmail = patientEmail.trim().toLowerCase()
      const trimmedMobile = patientMobile.trim()

      // Query database for patients with same email or mobile
      const { data: matched, error: matchError } = await supabase
        .from('patients')
        .select('*')
        .or(`email.eq.${trimmedEmail},mobile.eq.${trimmedMobile}`)

      if (matchError) throw matchError

      if (matched && matched.length > 0) {
        // Check if any matched patient has the exact same name (case-insensitive)
        const sameNamePatient = matched.find(
          p => p.name.trim().toLowerCase() === patientName.trim().toLowerCase()
        )

        if (sameNamePatient) {
          // Patient already exists, just reuse their ID
          setExistingPatientId(sameNamePatient.id)
          setIsFamilyMember(false)
          setStep(2)
        } else {
          // Different name, same email/mobile. Show family member confirmation.
          const primary = matched[0]
          setFamilyPrimaryPatientName(primary.name)
          setShowFamilyCheck(true)
        }
      } else {
        // No match, new patient
        setExistingPatientId(null)
        setIsFamilyMember(false)
        setStep(2)
      }
    } catch (err: any) {
      console.error('Error checking patient:', err)
      setError('Error checking patient registry. Please try again.')
    } finally {
      setCheckingPatient(false)
    }
  }

  // 1. Initial Load
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)
        setError(null)

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
            process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project')) {
          setDbConfigured(false)
          setLoading(false)
          return
        }

        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id, name, slug')
          .eq('slug', branchSlug)
          .single()

        if (branchError || !branchData) {
          throw new Error('Clinic branch data could not be retrieved.')
        }

        setBranch(branchData)

        const { data: doctorsData, error: doctorsError } = await supabase
          .from('doctors')
          .select('id, name, specialty, picture_url')
          .eq('branch_id', branchData.id)

        if (doctorsError) throw doctorsError

        setDoctors(doctorsData || [])
        if (doctorsData && doctorsData.length > 0) {
          setSelectedDoctorId(doctorsData[0].id)
        }

        // Load active time slots from db
        const { data: dbSlots, error: slotsErr } = await supabase
          .from('time_slots')
          .select('time_value, time_label')
          .order('time_value')

        if (slotsErr || !dbSlots || dbSlots.length === 0) {
          setActiveTimeSlots(TIME_SLOTS)
        } else {
          setActiveTimeSlots(dbSlots.map(s => ({
            value: s.time_value,
            label: s.time_label
          })))
        }
      } catch (err: any) {
        console.error('Error loading booking data:', err)
        setError('Unable to load appointment scheduler. Please check database connection.')
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [branchSlug])

  // 2. Load Booked Slots
  useEffect(() => {
    async function checkBookedSlots() {
      if (!selectedDoctorId || !selectedDate || !dbConfigured) return

      try {
        const { data, error: slotsError } = await supabase
          .from('appointments')
          .select('appointment_time')
          .eq('doctor_id', selectedDoctorId)
          .eq('appointment_date', selectedDate)
          .in('status', ['pending', 'confirmed', 'completed'])

        if (slotsError) throw slotsError

        if (data) {
          const booked = data.map(item => item.appointment_time)
          setBookedSlots(booked)
        } else {
          setBookedSlots([])
        }
      } catch (err) {
        console.error('Error fetching booked slots:', err)
      }
    }

    checkBookedSlots()
  }, [selectedDoctorId, selectedDate, dbConfigured])

  useEffect(() => {
    if (selectedTime && bookedSlots.some(slot => slot.startsWith(selectedTime) || selectedTime.startsWith(slot))) {
      setSelectedTime('')
    }
  }, [bookedSlots, selectedTime])

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!branch || !selectedDoctorId || !selectedDate || !selectedTime) {
      setError('Please fill in all scheduling steps.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      let patientId = ''

      if (existingPatientId) {
        patientId = existingPatientId
        const { error: updateError } = await supabase
          .from('patients')
          .update({
            mobile: patientMobile,
            age: parseInt(patientAge)
          })
          .eq('id', patientId)
        
        if (updateError) throw updateError
      } else {
        let dbEmail = patientEmail.trim().toLowerCase()

        const { data: newPatient, error: insertError } = await supabase
          .from('patients')
          .insert({
            name: patientName.trim(),
            email: dbEmail,
            mobile: patientMobile.trim(),
            age: parseInt(patientAge)
          })
          .select('id')
          .single()

        if (insertError) throw insertError
        patientId = newPatient.id
      }

      const { data: newAppt, error: apptError } = await supabase
        .from('appointments')
        .insert({
          patient_id: patientId,
          doctor_id: selectedDoctorId,
          branch_id: branch.id,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          problem_description: problemDescription.trim() || null,
          status: 'pending'
        })
        .select('id')
        .single()

      if (apptError) {
        if (apptError.code === '23505') {
          throw new Error('This time slot was just booked by another patient. Please select a different slot.')
        }
        throw apptError
      }

      // Trigger doctor notification email asynchronously (non-blocking for user redirect)
      sendAppointmentEmail(newAppt.id).catch(emailErr => {
        console.error('Failed to send doctor notification email:', emailErr)
      })

      // Redirect to the success page
      router.push(`/${branchSlug}/book/success?id=${newAppt.id}`)
    } catch (err: any) {
      console.error('Booking submission error:', err)
      setError(err.message || 'An error occurred during booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getMinDate = () => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  // ─── LOADING ───
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-slate-500 animate-fade-in">
        <div className="relative">
          <div className={`w-16 h-16 rounded-2xl ${theme.accentLightBg} flex items-center justify-center animate-pulse-glow`}>
            <Loader2 className={`w-8 h-8 animate-spin ${theme.accentText}`} />
          </div>
        </div>
        <p className="text-sm font-light tracking-wide mt-6 animate-fade-in-up delay-300">Loading scheduler details...</p>
      </div>
    )
  }

  // ─── DB NOT CONFIGURED ───
  if (!dbConfigured) {
    return (
      <div className="max-w-xl mx-auto my-4 sm:my-12 p-5 sm:p-8 border border-slate-200/60 rounded-3xl shadow-lg bg-white/80 backdrop-blur-sm text-center animate-scale-in">
        <AlertCircle className={`w-12 h-12 ${theme.accentText} mx-auto mb-4`} />
        <h3 className="text-xl font-serif text-slate-800 mb-2">Clinic Service Pending Configuration</h3>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          The database has not been fully connected yet. The administrator must add the database URL and keys in the <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">.env.local</code> configuration file.
        </p>
        <div className="p-4 bg-slate-50 rounded-xl text-left border border-slate-100">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Required environment parameters:</h4>
          <code className="block text-xs text-slate-700 space-y-1">
            <div>NEXT_PUBLIC_SUPABASE_URL</div>
            <div>NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
            <div>SUPABASE_SERVICE_ROLE_KEY</div>
          </code>
        </div>
      </div>
    )
  }

  // ─── MAIN FORM ───
  return (
    <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200/60 shadow-xl overflow-hidden">
      
      {/* Header */}
      <div className={`p-5 sm:p-8 ${theme.heroBg} border-b border-slate-100/60`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${theme.accentText}`}>
            {branch?.name}
          </span>
          <span className="text-xs text-slate-400 font-light">
            Step {step} of 3
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-serif text-slate-900 font-normal">
          Book an Appointment
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-light">
          Fill out the secure intake form. No payment or credit card required.
        </p>
 
        {/* Progress Bar */}
        <div className="flex items-center gap-2 mt-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                step >= s 
                  ? `${theme.progressActive} text-white shadow-sm` 
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`flex-1 h-1 rounded-full transition-all duration-700 ${
                  step > s ? theme.progressActive : 'bg-slate-100'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
 
      <form onSubmit={handleSubmit} className="p-5 sm:p-8">
        {error && (
          <div className="mb-6 p-4 bg-rose-50/80 border border-rose-100 text-rose-800 text-sm rounded-2xl flex items-start gap-3 animate-fade-in-up">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ═══ STEP 1: Patient Info ═══ */}
        {step === 1 && !showFamilyCheck && (
          <div className="space-y-6 animate-fade-in-up">
            <h3 className="text-lg font-serif text-slate-800 font-normal border-b border-slate-100 pb-2">
              1. Patient Demographics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-300 group-focus-within:text-slate-500 transition-colors duration-200" />
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={patientName}
                    onChange={e => handleNameChange(e.target.value)}
                    className={`w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-transparent focus:ring-2 ${theme.accentRing} transition-all duration-200 bg-white hover:border-slate-300`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Age</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  placeholder="30"
                  value={patientAge}
                  onChange={e => setPatientAge(e.target.value)}
                  className={`w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-transparent focus:ring-2 ${theme.accentRing} transition-all duration-200 bg-white hover:border-slate-300`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Mobile Number</label>
                <div className="relative group">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-300 group-focus-within:text-slate-500 transition-colors duration-200" />
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={patientMobile}
                    onChange={e => handleMobileChange(e.target.value)}
                    className={`w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-transparent focus:ring-2 ${theme.accentRing} transition-all duration-200 bg-white hover:border-slate-300`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-300 group-focus-within:text-slate-500 transition-colors duration-200" />
                  <input
                    type="email"
                    required
                    placeholder="patient@example.com"
                    value={patientEmail}
                    onChange={e => handleEmailChange(e.target.value)}
                    className={`w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-transparent focus:ring-2 ${theme.accentRing} transition-all duration-200 bg-white hover:border-slate-300`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                disabled={checkingPatient}
                onClick={handleNextStep1}
                className={`px-7 py-3 text-sm font-semibold text-white rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 btn-shimmer ${theme.accentBg} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {checkingPatient ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Checking Registry...
                  </>
                ) : (
                  <>
                    Choose Doctor & Date <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 1: Family Member Conflict Verification Screen ═══ */}
        {step === 1 && showFamilyCheck && (
          <div className="space-y-6 animate-scale-in text-center py-6 px-4">
            <div className={`w-16 h-16 rounded-2xl ${theme.accentLightBg} flex items-center justify-center mx-auto mb-4 animate-bounce`}>
              <User className={`w-8 h-8 ${theme.accentText}`} />
            </div>
            <h3 className="text-xl font-serif text-slate-900 font-normal">
              Family Member Verification
            </h3>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-3 max-w-md mx-auto">
              <p className="text-sm text-slate-600 leading-relaxed">
                An account with this email or mobile number is already registered under the name:
              </p>
              <p className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className={`w-5 h-5 ${theme.accentText}`} />
                {familyPrimaryPatientName}
              </p>
              <p className="text-sm text-slate-500 font-light leading-relaxed">
                Are you a family member of this patient? If yes, we will link your profile using a shared contact record.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsFamilyMember(true)
                  setShowFamilyCheck(false)
                  setStep(2)
                }}
                className={`w-full sm:w-auto px-8 py-3 text-sm font-semibold text-white rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 ${theme.accentBg}`}
              >
                Yes, I am a family member
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFamilyCheck(false)
                  setIsFamilyMember(false)
                }}
                className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-200"
              >
                No, edit my contact details
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Doctor & Date ═══ */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-lg font-serif text-slate-800 font-normal">
                2. Doctor & Schedule
              </h3>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors duration-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to intake
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Select Dentist</label>
              {doctors.length === 0 ? (
                <div className="p-5 bg-slate-50/80 border border-slate-100 text-slate-600 text-sm rounded-2xl">
                  No doctors have been assigned to this clinic branch yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doctors.map((doc, i) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctorId(doc.id)}
                      className={`p-4 border rounded-2xl cursor-pointer transition-all duration-300 flex items-center gap-4 hover-lift ${
                        selectedDoctorId === doc.id
                          ? theme.btnSelected + ' border-2'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      {doc.picture_url ? (
                        <img 
                          src={doc.picture_url} 
                          alt={doc.name} 
                          className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200" 
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${theme.iconGradient} flex items-center justify-center ${theme.accentText} border border-slate-200/60 font-serif text-lg`}>
                          {doc.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Dr. {doc.name}</p>
                        <p className="text-xs text-slate-500 font-light">{(doc.specialty ? doc.specialty.split('||')[0] : '') || 'General Practitioner'}</p>
                      </div>
                      {selectedDoctorId === doc.id && (
                        <CheckCircle className={`w-5 h-5 ${theme.accentText} ml-auto animate-scale-in`} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Appointment Date</label>
              <div className="relative group">
                <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-300 group-focus-within:text-slate-500 transition-colors duration-200" />
                <input
                  type="date"
                  required
                  min={getMinDate()}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-transparent focus:ring-2 ${theme.accentRing} transition-all duration-200 bg-white hover:border-slate-300`}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedDoctorId && selectedDate) {
                    setStep(3)
                    setError(null)
                  } else {
                    setError('Please select a doctor and appointment date.')
                  }
                }}
                className={`px-7 py-3 text-sm font-semibold text-white rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 btn-shimmer ${theme.accentBg}`}
              >
                Select Time Slot <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Time & Problem ═══ */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-lg font-serif text-slate-800 font-normal">
                3. Choose Time & Describe Concern
              </h3>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors duration-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to schedule
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Available Time Slots — {selectedDate}
              </label>
              {!selectedDate ? (
                <p className="text-xs text-rose-500 font-light">Please complete step 2 to select a date.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {activeTimeSlots.map(slot => {
                    const isBooked = bookedSlots.some(
                      bSlot => bSlot.startsWith(slot.value) || slot.value.startsWith(bSlot)
                    )
                    
                    return (
                      <button
                        key={slot.value}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setSelectedTime(slot.value)}
                        className={`py-3.5 text-xs border rounded-xl font-semibold transition-all duration-300 ${
                          isBooked 
                            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed line-through'
                            : selectedTime === slot.value
                            ? theme.btnSelected + ' border-2 scale-[1.02]'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 hover:scale-[1.02]'
                        }`}
                      >
                        {slot.label}
                        {isBooked && <span className="block text-[9px] font-light mt-0.5">Booked</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Dental Concern (Optional)
              </label>
              <div className="relative group">
                <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-300 group-focus-within:text-slate-500 transition-colors duration-200" />
                <textarea
                  placeholder="Describe details of your toothache, routine clean, checkup concern, etc."
                  value={problemDescription}
                  onChange={e => setProblemDescription(e.target.value)}
                  rows={4}
                  className={`w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-transparent focus:ring-2 ${theme.accentRing} transition-all duration-200 bg-white hover:border-slate-300 resize-none`}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-200"
              >
                Back
              </button>
              
              <button
                type="submit"
                disabled={submitting || !selectedTime}
                className={`px-8 py-3 text-sm font-semibold text-white rounded-xl transition-all duration-300 flex items-center gap-2 ${
                  !selectedTime 
                    ? 'bg-slate-200 cursor-not-allowed text-slate-400' 
                    : `shadow-lg hover:shadow-xl hover:-translate-y-0.5 btn-shimmer ${theme.accentBg}`
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Confirming...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Confirm Appointment (Free)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
