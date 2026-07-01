'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Calendar, Clock, User, Phone, Mail, FileText, 
  CheckCircle, AlertCircle, ChevronRight, Loader2, ArrowLeft 
} from 'lucide-react'

// Standard operating slots for both clinics
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
  // Theme styling based on the branch
  const isHazara = branchSlug === 'hazara'
  
  // Theme-specific styles
  const themeClasses = {
    accentText: isHazara ? 'text-teal-600' : 'text-amber-700',
    accentBg: isHazara ? 'bg-teal-600 hover:bg-teal-700' : 'bg-amber-700 hover:bg-amber-800',
    accentRing: isHazara ? 'focus:ring-teal-500' : 'focus:ring-amber-600',
    accentBorder: isHazara ? 'border-teal-100' : 'border-amber-100',
    accentLightBg: isHazara ? 'bg-teal-50' : 'bg-amber-50',
    btnSelected: isHazara ? 'bg-teal-50 border-teal-600 text-teal-900' : 'bg-amber-50 border-amber-600 text-amber-900',
    heroBg: isHazara 
      ? 'bg-gradient-to-r from-teal-50 via-teal-100/30 to-transparent' 
      : 'bg-gradient-to-r from-amber-50 via-amber-100/30 to-transparent',
  }

  // State management
  const [branch, setBranch] = useState<Branch | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [dbConfigured, setDbConfigured] = useState(true)

  // Step state
  const [step, setStep] = useState(1)

  // Form inputs
  const [patientName, setPatientName] = useState('')
  const [patientAge, setPatientAge] = useState('')
  const [patientMobile, setPatientMobile] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [problemDescription, setProblemDescription] = useState('')
  
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')

  // 1. Initial Load: Fetch Branch and its Doctors
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)
        setError(null)

        // Check if supabase keys are placeholders
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
            process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project')) {
          setDbConfigured(false)
          setLoading(false)
          return
        }

        // Fetch Branch details
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id, name, slug')
          .eq('slug', branchSlug)
          .single()

        if (branchError || !branchData) {
          throw new Error('Clinic branch data could not be retrieved.')
        }

        setBranch(branchData)

        // Fetch Doctors for this branch
        const { data: doctorsData, error: doctorsError } = await supabase
          .from('doctors')
          .select('id, name, specialty, picture_url')
          .eq('branch_id', branchData.id)

        if (doctorsError) {
          throw doctorsError
        }

        setDoctors(doctorsData || [])
        if (doctorsData && doctorsData.length > 0) {
          setSelectedDoctorId(doctorsData[0].id)
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

  // 2. Load Booked Slots when Doctor or Date changes
  useEffect(() => {
    async function checkBookedSlots() {
      if (!selectedDoctorId || !selectedDate || !dbConfigured) return

      try {
        const { data, error: slotsError } = await supabase
          .from('appointments')
          .select('appointment_time')
          .eq('doctor_id', selectedDoctorId)
          .eq('appointment_date', selectedDate)
          .in('status', ['pending', 'confirmed', 'completed']) // exclude cancelled slots

        if (slotsError) throw slotsError

        if (data) {
          // Normalize time strings (e.g. "09:00:00" or "09:00:00.000")
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

  // Clear selected time if it becomes booked/disabled
  useEffect(() => {
    if (selectedTime && bookedSlots.some(slot => slot.startsWith(selectedTime) || selectedTime.startsWith(slot))) {
      setSelectedTime('')
    }
  }, [bookedSlots, selectedTime])

  // Handle Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!branch || !selectedDoctorId || !selectedDate || !selectedTime) {
      setError('Please fill in all scheduling steps.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Step A: Upsert/Handle Patient details (query by email)
      const { data: existingPatient, error: getPatientError } = await supabase
        .from('patients')
        .select('id')
        .eq('email', patientEmail.trim().toLowerCase())
        .maybeSingle()

      if (getPatientError) throw getPatientError

      let patientId = ''

      if (existingPatient) {
        patientId = existingPatient.id
        // Optionally update patient age and mobile
        const { error: updateError } = await supabase
          .from('patients')
          .update({
            name: patientName,
            mobile: patientMobile,
            age: parseInt(patientAge)
          })
          .eq('id', patientId)
        
        if (updateError) throw updateError
      } else {
        // Insert new patient
        const { data: newPatient, error: insertError } = await supabase
          .from('patients')
          .insert({
            name: patientName,
            email: patientEmail.trim().toLowerCase(),
            mobile: patientMobile,
            age: parseInt(patientAge)
          })
          .select('id')
          .single()

        if (insertError) throw insertError
        patientId = newPatient.id
      }

      // Step B: Insert the Appointment
      const { error: apptError } = await supabase
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

      if (apptError) {
        if (apptError.code === '23505') {
          throw new Error('This time slot was just booked by another patient. Please select a different slot.')
        }
        throw apptError
      }

      setSuccess(true)
    } catch (err: any) {
      console.error('Booking submission error:', err)
      setError(err.message || 'An error occurred during booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Minimum date is today
  const getMinDate = () => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400 mb-4" />
        <p className="text-sm font-light tracking-wide">Loading scheduler details...</p>
      </div>
    )
  }

  // Database Connection Alert (Elegant Placeholder)
  if (!dbConfigured) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 border border-slate-200 rounded-2xl shadow-sm bg-white text-center">
        <AlertCircle className={`w-12 h-12 ${themeClasses.accentText} mx-auto mb-4`} />
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Clinic Service Pending Configuration</h3>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          The Supabase database has not been fully connected yet. The administrator must add the Supabase URL and keys in the <code>.env.local</code> configuration file.
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

  // Success Confirmation screen
  if (success) {
    const doctorObj = doctors.find(d => d.id === selectedDoctorId)
    const selectedSlot = TIME_SLOTS.find(ts => ts.value === selectedTime)
    
    return (
      <div className="max-w-xl mx-auto my-12 p-8 border border-slate-200 rounded-2xl shadow-sm bg-white text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className={`w-10 h-10 ${themeClasses.accentText}`} />
        </div>
        <h2 className="text-2xl font-serif text-slate-900 mb-3">Appointment Booked Successfully!</h2>
        <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto leading-relaxed">
          Your booking is confirmed. The clinic doctor has been notified via email with your intake details.
        </p>

        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 text-left mb-6 text-sm">
          <h4 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">Booking Summary</h4>
          <div className="space-y-2 text-slate-600">
            <p><span className="font-medium text-slate-800">Branch:</span> {branch?.name}</p>
            <p><span className="font-medium text-slate-800">Doctor:</span> Dr. {doctorObj?.name}</p>
            <p><span className="font-medium text-slate-800">Date:</span> {selectedDate}</p>
            <p><span className="font-medium text-slate-800">Time Slot:</span> {selectedSlot?.label}</p>
            <p><span className="font-medium text-slate-800">Patient:</span> {patientName} ({patientAge} yrs)</p>
          </div>
        </div>

        <button
          onClick={() => {
            setSuccess(false)
            setStep(1)
            setPatientName('')
            setPatientAge('')
            setPatientMobile('')
            setPatientEmail('')
            setProblemDescription('')
            setSelectedTime('')
            setSelectedDate('')
          }}
          className={`w-full py-3 text-sm font-medium text-white rounded-xl transition duration-200 ${themeClasses.accentBg}`}
        >
          Book Another Appointment
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Dynamic Header */}
      <div className={`p-8 ${themeClasses.heroBg} border-b border-slate-100`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${themeClasses.accentText}`}>
            {branch?.name}
          </span>
          <span className="text-xs text-slate-500 font-light">
            Step {step} of 3
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-serif text-slate-900 font-normal">
          Book an Appointment
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-light">
          Fill out the secure intake form. No payment or credit card is required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-800 text-sm rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Patient Intake Information */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-lg font-serif text-slate-800 font-normal border-b border-slate-100 pb-2">
              1. Patient Demographics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-transparent focus:ring-2 ${themeClasses.accentRing} transition`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Age</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  placeholder="30"
                  value={patientAge}
                  onChange={e => setPatientAge(e.target.value)}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-transparent focus:ring-2 ${themeClasses.accentRing} transition`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={patientMobile}
                    onChange={e => setPatientMobile(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-transparent focus:ring-2 ${themeClasses.accentRing} transition`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Login Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="patient@example.com"
                    value={patientEmail}
                    onChange={e => setPatientEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-transparent focus:ring-2 ${themeClasses.accentRing} transition`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  if (patientName && patientAge && patientMobile && patientEmail) {
                    setStep(2)
                  } else {
                    setError('Please complete all demographic fields.')
                  }
                }}
                className={`px-6 py-2.5 text-sm font-medium text-white rounded-xl transition flex items-center gap-2 ${themeClasses.accentBg}`}
              >
                Choose Doctor & Date <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Doctor & Date */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-lg font-serif text-slate-800 font-normal">
                2. Doctor & Schedule
              </h3>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to intake
              </button>
            </div>

            {/* Doctor Select */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-600">Select Dentist</label>
              {doctors.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-100 text-slate-600 text-sm rounded-xl">
                  No doctors have been assigned to this clinic branch yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doctors.map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctorId(doc.id)}
                      className={`p-4 border rounded-xl cursor-pointer transition flex items-center gap-4 ${
                        selectedDoctorId === doc.id
                          ? themeClasses.btnSelected
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {doc.picture_url ? (
                        <img 
                          src={doc.picture_url} 
                          alt={doc.name} 
                          className="w-12 h-12 rounded-full object-cover bg-slate-100 border border-slate-200" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 font-serif">
                          {doc.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Dr. {doc.name}</p>
                        <p className="text-xs text-slate-500 font-light">{doc.specialty || 'General Practitioner'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date Select */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Select Appointment Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  required
                  min={getMinDate()}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-transparent focus:ring-2 ${themeClasses.accentRing} transition`}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedDoctorId && selectedDate) {
                    setStep(3)
                  } else {
                    setError('Please select a doctor and appointment date.')
                  }
                }}
                className={`px-6 py-2.5 text-sm font-medium text-white rounded-xl transition flex items-center gap-2 ${themeClasses.accentBg}`}
              >
                Select Time Slot <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Choose Time Slot & Problem Description */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-lg font-serif text-slate-800 font-normal">
                3. Choose Time & Describe Concern
              </h3>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to schedule
              </button>
            </div>

            {/* Time Slot Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-600">
                Available Time Slots (Date: {selectedDate})
              </label>
              {!selectedDate ? (
                <p className="text-xs text-rose-500 font-light">Please complete step 2 to select a date.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {TIME_SLOTS.map(slot => {
                    // Check if slot is booked
                    const isBooked = bookedSlots.some(
                      bSlot => bSlot.startsWith(slot.value) || slot.value.startsWith(bSlot)
                    )
                    
                    return (
                      <button
                        key={slot.value}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setSelectedTime(slot.value)}
                        className={`py-3 text-xs border rounded-xl font-medium transition ${
                          isBooked 
                            ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed line-through'
                            : selectedTime === slot.value
                            ? themeClasses.btnSelected + ' border-2 ring-1'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
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

            {/* Problem Description */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Dental Concern / Problem Description (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <textarea
                  placeholder="Describe details of your toothache, routine clean, checkup concern, etc. so the dentist is prepared."
                  value={problemDescription}
                  onChange={e => setProblemDescription(e.target.value)}
                  rows={4}
                  className={`w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-transparent focus:ring-2 ${themeClasses.accentRing} transition`}
                />
              </div>
            </div>

            {/* Back & Submit buttons */}
            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                Back
              </button>
              
              <button
                type="submit"
                disabled={submitting || !selectedTime}
                className={`px-8 py-2.5 text-sm font-medium text-white rounded-xl transition flex items-center gap-2 ${
                  !selectedTime 
                    ? 'bg-slate-300 cursor-not-allowed' 
                    : themeClasses.accentBg
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Confirming...
                  </>
                ) : (
                  'Confirm Appointment (Free)'
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
