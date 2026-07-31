'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateAppointmentStatus, getLocalIpAddress, sendPatientReport, bookOfflineAppointment, createCaptureTicket, clearCaptureTicket, triggerDeliverAndCleanup, postponeAppointmentAction } from '@/app/admin/actions'
import { supabase } from '@/lib/supabase'
import { 
  Search, Calendar, Check, X, AlertCircle, Info, Filter,
  Building, User2, RefreshCw, ChevronDown, CheckCircle2, Clock,
  FileText, QrCode, UploadCloud, Copy, HelpCircle, User, Plus, Loader2
} from 'lucide-react'

interface AppointmentsClientProps {
  initialAppointments: any[]
  branches: any[]
}

export default function AppointmentsClient({ initialAppointments, branches }: AppointmentsClientProps) {
  const [appointments, setAppointments] = useState(initialAppointments)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Reports Modal states
  const [showReportsModal, setShowReportsModal] = useState(false)
  const [activeAppt, setActiveAppt] = useState<any | null>(null)
  
  // Form fields
  const [emailVal, setEmailVal] = useState('')
  const [prescriptionText, setPrescriptionText] = useState('')
  const [xrayFile, setXrayFile] = useState<File | null>(null)
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null)
  
  // File previews
  const [xrayPreview, setXrayPreview] = useState<string | null>(null)
  const [prescPreview, setPrescPreview] = useState<string | null>(null)

  // Mobile upload syncing
  const [isWaitingForMobile, setIsWaitingForMobile] = useState(false)
  const [tempMobilePhoto, setTempMobilePhoto] = useState<string | null>(null)
  
  // UI states
  const [sendingReport, setSendingReport] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [localIp, setLocalIp] = useState('localhost')
  const [customIp, setCustomIp] = useState('localhost')

  // Postpone / Reschedule Appointment Modal states
  const [showPostponeModal, setShowPostponeModal] = useState(false)
  const [postponeAppt, setPostponeAppt] = useState<any | null>(null)
  const [newPostponeDate, setNewPostponeDate] = useState('')
  const [newPostponeTime, setNewPostponeTime] = useState('')
  const [postponing, setPostponing] = useState(false)

  const handleOpenPostponeModal = (appt: any) => {
    setPostponeAppt(appt)
    setNewPostponeDate(appt.appointment_date || '')
    setNewPostponeTime(appt.appointment_time || '')
    setShowPostponeModal(true)
  }

  const handleConfirmPostpone = async () => {
    if (!postponeAppt || !newPostponeDate || !newPostponeTime) return
    setPostponing(true)
    try {
      const res = await postponeAppointmentAction(postponeAppt.id, newPostponeDate, newTimeSlotLabel(newPostponeTime))
      if (res.success) {
        setAppointments(prev => prev.map(a => a.id === postponeAppt.id ? { ...a, appointment_date: newPostponeDate, appointment_time: newPostponeTime } : a))
        alert('Appointment postponed successfully! Automated WhatsApp & Email notifications sent to the patient.')
        setShowPostponeModal(false)
      } else {
        alert(res.error || 'Failed to postpone appointment.')
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.')
    } finally {
      setPostponing(false)
    }
  }

  const newTimeSlotLabel = (val: string) => {
    if (!val) return '09:00:00'
    return val.length === 5 ? `${val}:00` : val
  }

  // Offline Booking modal states
  const [showOfflineModal, setShowOfflineModal] = useState(false)
  const [offlineName, setOfflineName] = useState('')
  const [offlineEmail, setOfflineEmail] = useState('')
  const [offlineMobile, setOfflineMobile] = useState('')
  const [offlineAge, setOfflineAge] = useState('')
  const [offlineBranchId, setOfflineBranchId] = useState('')
  const [offlineDoctorId, setOfflineDoctorId] = useState('')
  const [offlineDate, setOfflineDate] = useState('')
  const [offlineTime, setOfflineTime] = useState('')
  const [offlineProblem, setOfflineProblem] = useState('')
  
  const [doctorsList, setDoctorsList] = useState<any[]>([])
  const [timeSlotsList, setTimeSlotsList] = useState<any[]>([])
  const [bookingOffline, setBookingOffline] = useState(false)

  // Fetch local IP address for the QR code link and db lists on mount
  useEffect(() => {
    async function loadIp() {
      const res = await getLocalIpAddress()
      if (res.success && res.ip) {
        setLocalIp(res.ip)
        setCustomIp(res.ip)
      }
    }
    async function loadDbData() {
      const { data: docs } = await supabase.from('doctors').select('id, name, branch_id, specialty')
      const { data: times } = await supabase.from('time_slots').select('*').order('time_value')
      if (docs) setDoctorsList(docs)
      if (times) setTimeSlotsList(times)
    }
    loadIp()
    loadDbData()
  }, [])

  // Auto-open Reports Modal if openReportsApptId param is present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const openReportsApptId = searchParams.get('openReportsApptId')
      const openInvoiceId = searchParams.get('openInvoiceId')
      if (openReportsApptId && appointments.length > 0) {
        const matched = appointments.find(a => a.id === openReportsApptId)
        if (matched) {
          handleOpenReportsModal(matched, openInvoiceId || undefined)
          // Clean up search parameters from the URL so it doesn't reopen on page refresh
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
        }
      }
    }
  }, [appointments])

  // Poll for mobile prescription photo upload
  useEffect(() => {
    let interval: any
    if (isWaitingForMobile && activeAppt?.id) {
      interval = setInterval(async () => {
        const { data, error } = await supabase
          .from('appointments')
          .select('temp_mobile_photo')
          .eq('id', activeAppt.id)
          .single()
        
        if (data?.temp_mobile_photo) {
          setTempMobilePhoto(data.temp_mobile_photo)
          setIsWaitingForMobile(false)
          clearInterval(interval)
        }
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [isWaitingForMobile, activeAppt])

  const [associatedInvoiceId, setAssociatedInvoiceId] = useState<string | null>(null)
  const [associatedInvoiceTotal, setAssociatedInvoiceTotal] = useState<number | null>(null)
  const [loadingInvoiceCheck, setLoadingInvoiceCheck] = useState(false)

  // Open Reports Modal and populate fields
  const handleOpenReportsModal = async (appt: any, passedInvoiceId?: string) => {
    setActiveAppt(appt)
    setEmailVal(appt.patients?.email || '')
    setPrescriptionText(appt.prescription_text || '')
    setXrayFile(null)
    setPrescriptionFile(null)
    setXrayPreview(null)
    setPrescPreview(null)
    setTempMobilePhoto(appt.temp_mobile_photo || null)
    setIsWaitingForMobile(false)
    setShowReportsModal(true)

    setAssociatedInvoiceId(passedInvoiceId || null)
    setAssociatedInvoiceTotal(null)
    setLoadingInvoiceCheck(true)
    try {
      if (passedInvoiceId) {
        const { data: invData } = await supabase
          .from('invoices')
          .select('id, total')
          .eq('id', passedInvoiceId)
          .maybeSingle()
        if (invData) {
          setAssociatedInvoiceId(invData.id)
          setAssociatedInvoiceTotal(Number(invData.total))
          return
        }
      }

      const { data } = await supabase
        .from('invoices')
        .select('id, total')
        .eq('appointment_id', appt.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        setAssociatedInvoiceId(data[0].id)
        setAssociatedInvoiceTotal(Number(data[0].total))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingInvoiceCheck(false)
    }
  }

  // Handle status update
  const handleStatusChange = async (id: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    setUpdatingId(id)
    try {
      const res = await updateAppointmentStatus(id, newStatus)
      if (res.success) {
        setAppointments(prev => 
          prev.map(appt => appt.id === id ? { ...appt, status: newStatus } : appt)
        )
      } else {
        alert(res.error || 'Failed to update status')
      }
    } catch (error) {
      console.error(error)
      alert('An error occurred.')
    } finally {
      setUpdatingId(null)
    }
  }

  // Submit diagnostic reports and trigger Brevo email
  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAppt) return

    if (!associatedInvoiceId) {
      alert("Error: Please generate and save the patient's bill in the Billing tab first before sending the report!")
      return
    }

    setSendingReport(true)

    try {
      const formData = new FormData()
      formData.append('appointmentId', activeAppt.id)
      formData.append('patientEmail', emailVal)
      formData.append('prescriptionText', prescriptionText)
      
      if (xrayFile) formData.append('xray', xrayFile)
      if (prescriptionFile) formData.append('prescription', prescriptionFile)
      if (tempMobilePhoto) formData.append('tempMobilePhoto', tempMobilePhoto)

      // A. Save report data to DB and upload attachments
      const res = await sendPatientReport(formData)
      if (!res.success) {
        throw new Error(res.error || 'Failed to save diagnostic reports.')
      }

      // B. Trigger Automated Email/WhatsApp Delivery and Auto-Purge pipeline
      const deliveryRes = await triggerDeliverAndCleanup(activeAppt.id, associatedInvoiceId)
      if (!deliveryRes.success) {
        throw new Error(deliveryRes.error || 'Reports saved, but delivery & cleanup dispatch pipeline failed.')
      }

      alert('Diagnostic reports and invoice bill sent to patient successfully! Cloud records have been auto-purged.')
      
      // Update local appointments state with the report sent time
      const sentTime = new Date().toISOString()
      setAppointments(prev =>
        prev.map(appt => appt.id === activeAppt.id ? { 
          ...appt, 
          status: 'completed',
          report_sent_at: sentTime,
          prescription_text: prescriptionText || appt.prescription_text,
          prescription_url: res.prescriptionUrl || appt.prescription_url,
          xray_url: res.xrayUrl || appt.xray_url,
          temp_mobile_photo: null,
          patient_id: res.updatedPatient?.id || appt.patient_id,
          patients: res.updatedPatient || appt.patients
        } : appt)
      )
      setShowReportsModal(false)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'An error occurred while sending reports')
    } finally {
      setSendingReport(false)
    }
  }

  // Copy mobile camera link to clipboard
  const handleCopyLink = () => {
    const link = `http://${customIp}:3000/admin/capture?branch=${activeAppt?.branches?.slug}&appointment=${activeAppt?.id || ''}`
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Calculate stats
  const totalCount = appointments.length
  const pendingCount = appointments.filter(a => a.status === 'pending').length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length
  const completedCount = appointments.filter(a => a.status === 'completed').length

  // Filtered Appointments
  const filteredAppointments = appointments.filter(appt => {
    if (selectedBranch !== 'all' && appt.branches?.slug !== selectedBranch) {
      return false
    }
    if (selectedDate && appt.appointment_date !== selectedDate) {
      return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const patientName = appt.patients?.name?.toLowerCase() || ''
      const patientEmail = appt.patients?.email?.toLowerCase() || ''
      const patientMobile = appt.patients?.mobile?.toLowerCase() || ''
      const doctorName = appt.doctors?.name?.toLowerCase() || ''

      return (
        patientName.includes(query) ||
        patientEmail.includes(query) ||
        patientMobile.includes(query) ||
        doctorName.includes(query)
      )
    }
    return true
  })

  // Format Status Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200/60'
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-200/60'
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200/60'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/60'
    }
  }

  const mobileCaptureUrl = `http://${customIp}:3000/admin/capture?branch=${activeAppt?.branches?.slug}&appointment=${activeAppt?.id || ''}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(mobileCaptureUrl)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      className="space-y-6"
    >
      
      {/* 1. Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <motion.div 
          whileHover={{ y: -3 }}
          className="clay clay-cyan p-6 border border-slate-200/20 flex items-center justify-between"
        >
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Appointments</p>
            <p className="text-2xl font-serif font-bold text-slate-800">{totalCount}</p>
          </div>
          <div className="p-3.5 bg-white/70 rounded-2xl text-slate-700 shadow-sm">
            <Building className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }}
          className="clay clay-amber p-6 border border-slate-200/20 flex items-center justify-between"
        >
          <div className="space-y-1">
            <p className="text-xs text-amber-700 uppercase tracking-wider font-semibold">Pending Review</p>
            <p className="text-2xl font-serif font-bold text-amber-800">{pendingCount}</p>
          </div>
          <div className="p-3.5 bg-white/70 rounded-2xl text-amber-700 shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }}
          className="clay clay-violet p-6 border border-slate-200/20 flex items-center justify-between"
        >
          <div className="space-y-1">
            <p className="text-xs text-violet-700 uppercase tracking-wider font-semibold">Confirmed Slots</p>
            <p className="text-2xl font-serif font-bold text-violet-800">{confirmedCount}</p>
          </div>
          <div className="p-3.5 bg-white/70 rounded-2xl text-violet-700 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }}
          className="clay clay-emerald p-6 border border-slate-200/20 flex items-center justify-between"
        >
          <div className="space-y-1">
            <p className="text-xs text-emerald-700 uppercase tracking-wider font-semibold">Completed Care</p>
            <p className="text-2xl font-serif font-bold text-emerald-800">{completedCount}</p>
          </div>
          <div className="p-3.5 bg-white/70 rounded-2xl text-emerald-700 shadow-sm">
            <Check className="w-5 h-5" />
          </div>
        </motion.div>

      </div>

      {/* 2. Search and Filters Bar */}
      <div className="clay p-5 border border-slate-200/60 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Branch Filter Tabs & Book Offline Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl self-start">
              <button
                onClick={() => setSelectedBranch('all')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  selectedBranch === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Clinics
              </button>
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranch(b.slug)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                    selectedBranch === b.slug ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {b.slug === 'hazara' ? 'Hazara' : 'Family'}
                </button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setOfflineName('')
                setOfflineEmail('')
                setOfflineMobile('')
                setOfflineAge('')
                setOfflineBranchId(branches[0]?.id || '')
                setOfflineDoctorId('')
                setOfflineDate('')
                setOfflineTime('')
                setOfflineProblem('')
                setShowOfflineModal(true)
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-2xl text-xs font-semibold shadow-md transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Book Offline
            </motion.button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-slate-800 bg-white shadow-inner-sm transition"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="absolute right-2 top-2 text-[10px] text-slate-400 hover:text-slate-600 bg-slate-100 rounded px-1.5 py-0.5"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, email, phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2.5 w-full border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-slate-800 bg-white shadow-inner-sm transition"
              />
            </div>
          </div>

        </div>
      </div>

      {/* 3. Table Card */}
      <div className="clay border border-slate-200/60 overflow-hidden">
        {filteredAppointments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-light">No appointments found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400 font-semibold tracking-wider">
                  <th className="px-6 py-4">Patient details</th>
                  <th className="px-6 py-4">Clinic branch</th>
                  <th className="px-6 py-4">Appt. details</th>
                  <th className="px-6 py-4">Assigned doctor</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Reports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-600 font-light">
                {filteredAppointments.map(appt => (
                  <tr key={appt.id} className="hover:bg-slate-50/50 transition">
                    
                    {/* Patient demographics */}
                    <td className="px-6 py-4 max-w-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800">{appt.patients?.name}</p>
                        <p className="text-xs text-slate-400">Age: {appt.patients?.age} yrs | {appt.patients?.mobile}</p>
                        <p className="text-xs text-slate-500 font-light">{appt.patients?.email}</p>
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        appt.branches?.slug === 'hazara' 
                          ? 'bg-teal-50 text-teal-700 border-teal-100' 
                          : 'bg-amber-50 text-amber-800 border-amber-100'
                      }`}>
                        {appt.branches?.slug === 'hazara' ? 'Hazara' : 'Family'}
                      </span>
                    </td>

                    {/* Date / Time / Problem */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-800">{appt.appointment_date}</p>
                        <p className="text-xs text-slate-500">{appt.appointment_time.substring(0, 5)}</p>
                        {appt.problem_description && (
                          <div className="flex gap-1 items-start bg-slate-50 border border-slate-100 p-2 rounded-lg mt-1 text-xs text-slate-500 max-w-xs italic leading-snug">
                            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2" title={appt.problem_description}>
                              "{appt.problem_description}"
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Doctor details */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800">Dr. {appt.doctors?.name}</p>
                        <p className="text-xs text-slate-400 font-light">{appt.doctors?.specialty || 'General Practitioner'}</p>
                      </div>
                    </td>

                    {/* Status selection */}
                    <td className="px-6 py-4 text-center">
                      <div className="relative inline-block">
                        <select
                          value={appt.status}
                          disabled={updatingId === appt.id}
                          onChange={e => handleStatusChange(appt.id, e.target.value as any)}
                          className={`appearance-none pl-3 pr-8 py-1.5 border rounded-full text-xs font-semibold focus:outline-none focus:ring-1 cursor-pointer transition ${
                            appt.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-400'
                              : appt.status === 'confirmed'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-400'
                              : appt.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-400'
                              : appt.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-400'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="pending" className="bg-white text-slate-800">Pending</option>
                          <option value="confirmed" className="bg-white text-slate-800">Confirmed</option>
                          <option value="completed" className="bg-white text-slate-800">Completed</option>
                          <option value="cancelled" className="bg-white text-slate-800">Cancelled</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                      </div>
                    </td>

                    {/* Reports & Postpone Actions column */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-1.5 justify-center">
                          <button
                            onClick={() => handleOpenReportsModal(appt)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Reports
                          </button>
                          <button
                            onClick={() => handleOpenPostponeModal(appt)}
                            title="Postpone / Reschedule Appointment"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition shadow-sm"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Postpone
                          </button>
                        </div>
                        {appt.report_sent_at && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-semibold uppercase">
                            <Check className="w-2.5 h-2.5" /> Sent
                          </span>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ 4. DIAGNOSTIC REPORTS MODAL ═══ */}
      <AnimatePresence>
        {showReportsModal && activeAppt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white border border-slate-200 dark:bg-[var(--card)] dark:border-teal-900/35 rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col justify-between"
            >
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-teal-900/25 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20 rounded-t-3xl">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-teal-200">Finalize Diagnosis & Send Report</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-light mt-0.5">
                    Patient: {activeAppt.patients?.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportsModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white rounded-full transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={handleSendReport} className="p-6 space-y-5 flex-1 overflow-y-auto">
                
                {/* Billing Status Badge */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col gap-1 text-xs dark:bg-[#18302b]/60 dark:border-teal-900/40">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Invoice / Billing Verification</span>
                  {loadingInvoiceCheck ? (
                    <div className="flex items-center gap-1.5 text-slate-500 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking billing records...</span>
                    </div>
                  ) : associatedInvoiceId ? (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-emerald-700 dark:text-emerald-450 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Bill Attached: Rs. {associatedInvoiceTotal?.toFixed(2)}
                      </span>
                      <span className="text-[9px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded font-mono font-bold border border-emerald-100 dark:border-emerald-900/30">
                        #{associatedInvoiceId.substring(0, 8).toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1 mt-1">
                      <div className="flex items-center gap-1 text-amber-700 dark:text-amber-500 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        No bill compiled for this appointment
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-light">
                        ⚠️ Please go to the <strong>Billing</strong> tab to create the patient's checkout invoice before sending the clinical report.
                      </p>
                    </div>
                  )}
                </div>

                {/* Patient Email (Editable) */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Patient Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter email address"
                    value={emailVal}
                    onChange={e => setEmailVal(e.target.value)}
                    className="w-full px-4.5 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Patient Mobile (Editable) */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Patient Mobile Number (WhatsApp Delivery)</label>
                  <input
                    type="tel"
                    required
                    placeholder="Enter 11-digit mobile number"
                    value={mobileVal}
                    onChange={e => setMobileVal(e.target.value)}
                    className="w-full px-4.5 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Clinical Notes */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Clinical Prescription Notes</label>
                  <textarea
                    required
                    placeholder="Enter patient diagnosis, medication details, and dosage instructions..."
                    value={prescVal}
                    onChange={e => setPrescVal(e.target.value)}
                    rows={4}
                    className="w-full px-4.5 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* File Uploads (X-Ray & Prescription) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* X-Ray Upload */}
                  <div className="border-t border-slate-100 dark:border-teal-900/20 pt-4 space-y-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-455">X-Ray Image Attachment</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0] || null
                        setXrayFile(file)
                        if (file && file.type.startsWith('image/')) {
                          setXrayPreview(URL.createObjectURL(file))
                        } else {
                          setXrayPreview(null)
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-white/5 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-200 dark:hover:file:bg-white/10 transition cursor-pointer"
                    />

                    {activeAppt.xray_url && (
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 dark:bg-[#18302b]/60 dark:border-teal-900/40">
                        <div className="w-10 h-10 bg-slate-900 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                          <img src={activeAppt.xray_url} alt="Existing X-Ray" className="object-cover h-full w-full" />
                        </div>
                        <div className="text-[10px] text-slate-500 leading-normal">
                          <p className="font-bold text-slate-750 dark:text-slate-300">Existing X-Ray Uploaded</p>
                          <a href={activeAppt.xray_url} target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline">View Document</a>
                        </div>
                      </div>
                    )}

                    {xrayPreview && (
                      <div className="p-2 bg-cyan-50/50 border border-cyan-150 rounded-xl flex items-center gap-3 animate-fade-in dark:bg-cyan-950/20 dark:border-cyan-900/30">
                        <div className="w-10 h-10 bg-slate-900 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                          <img src={xrayPreview} alt="New X-Ray preview" className="object-cover h-full w-full" />
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
                          <p className="font-bold text-cyan-800 dark:text-cyan-400">New X-Ray Selected</p>
                          <p className="text-slate-400 dark:text-slate-550 font-light truncate max-w-[200px]">{xrayFile?.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setXrayFile(null); setXrayPreview(null); }}
                          className="ml-auto p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Prescription Photo Upload Source */}
                  <div className="border-t border-slate-100 dark:border-teal-900/20 pt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-455">Prescription Sheet Attachment</label>
                      <button
                        type="button"
                        onClick={async () => {
                          const nextState = !isWaitingForMobile
                          setIsWaitingForMobile(nextState)
                          setTempMobilePhoto(null)
                          if (activeAppt?.id && activeAppt?.branches?.id) {
                            if (nextState) {
                              await supabase
                                .from('appointments')
                                .update({ temp_mobile_photo: null })
                                .eq('id', activeAppt.id)
                              await createCaptureTicket(activeAppt.branches.id, activeAppt.id)
                            } else {
                              await clearCaptureTicket(activeAppt.branches.id)
                            }
                          }
                        }}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                          isWaitingForMobile 
                            ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400' 
                            : 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-white/5 dark:border-teal-900/40 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        {isWaitingForMobile ? 'Stop Mobile Scan' : 'Pick by Mobile'}
                      </button>
                    </div>

                    {/* Local Desktop Upload Form */}
                    {!isWaitingForMobile && (
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0] || null
                            setPrescriptionFile(file)
                            if (file && file.type.startsWith('image/')) {
                              setPrescPreview(URL.createObjectURL(file))
                            } else {
                              setPrescPreview(null)
                            }
                          }}
                          className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-white/5 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-200 dark:hover:file:bg-white/10 transition cursor-pointer"
                        />
                        
                        {/* Previews for Prescription */}
                        {activeAppt.prescription_url && !tempMobilePhoto && (
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 dark:bg-[#18302b]/60 dark:border-teal-900/40">
                            <div className="w-10 h-10 bg-slate-900 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                              <img src={activeAppt.prescription_url} alt="Existing Prescription" className="object-cover h-full w-full" />
                            </div>
                            <div className="text-[10px] text-slate-500 leading-normal">
                              <p className="font-bold text-slate-750 dark:text-slate-300">Existing Prescription Attached</p>
                              <a href={activeAppt.prescription_url} target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline">View Image</a>
                            </div>
                          </div>
                        )}

                        {prescPreview && (
                          <div className="p-2 bg-cyan-50/50 border border-cyan-150 rounded-xl flex items-center gap-3 animate-fade-in dark:bg-cyan-950/20 dark:border-cyan-900/30">
                            <div className="w-10 h-10 bg-slate-900 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                              <img src={prescPreview} alt="New Prescription preview" className="object-cover h-full w-full" />
                            </div>
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
                              <p className="font-bold text-cyan-800 dark:text-cyan-400">New Prescription Selected</p>
                              <p className="text-slate-400 dark:text-slate-550 font-light truncate max-w-[200px]">{prescriptionFile?.name}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setPrescriptionFile(null); setPrescPreview(null); }}
                              className="ml-auto p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mobile Camera Scanner Integration */}
                    {isWaitingForMobile && (
                      <div className="bg-slate-50 dark:bg-[#121c19] p-6 border border-slate-200 dark:border-teal-900/40 rounded-2xl space-y-4 flex flex-col items-center text-center animate-fade-in">
                        <div className="w-12 h-12 bg-cyan-50 dark:bg-cyan-950/25 border border-cyan-150 dark:border-cyan-900/30 rounded-2xl flex items-center justify-center text-cyan-600">
                          <Clock className="w-6 h-6 animate-pulse" />
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Mobile Capture Ticket Active</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-550 leading-relaxed max-w-xs mx-auto font-light">
                            A sync ticket has been sent to the mobile capture page for <strong>{activeAppt?.patients?.name}</strong>.
                          </p>
                          <p className="text-[10px] text-slate-550 italic mt-2">
                            Open the capture page on your phone, and it will automatically lock onto this patient's photo.
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900 px-3 py-1.5 rounded-xl font-medium w-full justify-center">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>Waiting for phone camera prescription upload...</span>
                        </div>
                      </div>
                    )}

                    {/* Render Mobile Upload Preview if uploaded */}
                    {tempMobilePhoto && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-fade-in dark:bg-emerald-950/20 dark:border-emerald-900">
                        <div className="w-12 h-12 bg-slate-900 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                          <img src={tempMobilePhoto} alt="Mobile capture preview" className="object-cover h-full w-full" />
                        </div>
                        <div className="text-xs">
                          <p className="font-bold text-emerald-800 dark:text-emerald-400">Prescription Attached from Mobile</p>
                          <p className="text-emerald-600 dark:text-emerald-500 font-light text-[10px]">Ready to send to patient.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTempMobilePhoto(null)}
                          className="ml-auto p-1 hover:bg-emerald-100 rounded-md text-emerald-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer / Action buttons */}
                <div className="border-t border-slate-100 dark:border-teal-900/20 pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReportsModal(false)}
                    className="flex-1 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-teal-900/40 rounded-2xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReport || !associatedInvoiceId || loadingInvoiceCheck}
                    className="flex-1 py-3 bg-slate-950 dark:bg-emerald-650 hover:bg-slate-800 dark:hover:bg-emerald-750 disabled:bg-slate-100 dark:disabled:bg-white/5 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/10 cursor-pointer animate-none"
                  >
                    {sendingReport && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {sendingReport ? 'Sending...' : 'Send Combined Report & Bill'}
                  </button>
                </div>

              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. MODAL overlay for BOOK OFFLINE APPOINTMENT */}
      <AnimatePresence>
        {showOfflineModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white border border-slate-200 dark:bg-[var(--card)] dark:border-teal-900/35 rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col justify-between"
            >
              
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 dark:bg-slate-950/20 dark:border-teal-900/25 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-teal-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500 dark:text-teal-400" />
                  Book Offline Appointment
                </h3>
                <button 
                  type="button"
                  onClick={() => setShowOfflineModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (!offlineBranchId || !offlineDoctorId || !offlineDate || !offlineTime) {
                  alert('Please fill in all booking fields.')
                  return
                }

                // Enforce date validation
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const minDate = new Date()
                minDate.setDate(today.getDate() - 3)
                minDate.setHours(0, 0, 0, 0)
                const selectedDateObj = new Date(offlineDate)
                selectedDateObj.setHours(0, 0, 0, 0)
                if (selectedDateObj < minDate) {
                  alert('Offline appointments can only be booked for the previous 3 days or future dates.')
                  return
                }

                setBookingOffline(true)
                try {
                  const formData = new FormData()
                  formData.append('patientName', offlineName)
                  formData.append('patientEmail', offlineEmail)
                  formData.append('patientMobile', offlineMobile)
                  formData.append('patientAge', offlineAge)
                  formData.append('branchId', offlineBranchId)
                  formData.append('doctorId', offlineDoctorId)
                  formData.append('appointmentDate', offlineDate)
                  formData.append('appointmentTime', offlineTime)
                  formData.append('problemDescription', offlineProblem)

                  const res = await bookOfflineAppointment(formData)
                  if (res.success) {
                    alert('Offline appointment booked successfully!')
                    setShowOfflineModal(false)
                    window.location.reload()
                  } else {
                    alert(res.error || 'Failed to book offline appointment')
                  }
                } catch (err: any) {
                  console.error(err)
                  alert('An error occurred during booking.')
                } finally {
                  setBookingOffline(false)
                }
              }} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                
                {/* Patient details section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Patient Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-450">Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Jane Doe"
                        value={offlineName}
                        onChange={e => setOfflineName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-805 dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-455">Email</label>
                      <input
                        type="email"
                        required
                        placeholder="jane@example.com"
                        value={offlineEmail}
                        onChange={e => setOfflineEmail(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-805 dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-455">Mobile</label>
                      <input
                        type="tel"
                        required
                        placeholder="03001234567"
                        value={offlineMobile}
                        onChange={e => setOfflineMobile(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-805 dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-455">Age</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="120"
                        placeholder="35"
                        value={offlineAge}
                        onChange={e => setOfflineAge(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-805 dark:text-slate-200 font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Appointment details section */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-teal-900/20">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Appointment Details</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-455">Branch</label>
                      <select
                        value={offlineBranchId}
                        onChange={e => {
                          setOfflineBranchId(e.target.value)
                          setOfflineDoctorId('')
                        }}
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-805 dark:text-slate-200"
                      >
                        <option value="" className="dark:bg-[#121c19]">Select Branch</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id} className="dark:bg-[#121c19]">{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-455">Doctor</label>
                      <select
                        value={offlineDoctorId}
                        required
                        onChange={e => setOfflineDoctorId(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-805 dark:text-slate-200"
                      >
                        <option value="" className="dark:bg-[#121c19]">Select Doctor</option>
                        {doctorsList
                          .filter(d => !offlineBranchId || d.branch_id === offlineBranchId)
                          .map(d => (
                            <option key={d.id} value={d.id} className="dark:bg-[#121c19]">Dr. {d.name} ({d.specialty || 'General'})</option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-455">Date</label>
                      <input
                        type="date"
                        required
                        value={offlineDate}
                        onChange={e => setOfflineDate(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-805 dark:text-slate-200 font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-455">Time Slot</label>
                      <select
                        value={offlineTime}
                        required
                        onChange={e => setOfflineTime(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-805 dark:text-slate-200"
                      >
                        <option value="" className="dark:bg-[#121c19]">Select Time</option>
                        {timeSlotsList.map(t => (
                          <option key={t.id} value={t.time_value} className="dark:bg-[#121c19]">{t.time_label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-455">Problem / Notes</label>
                    <textarea
                      placeholder="Describe symptoms or reasons for the booking..."
                      value={offlineProblem}
                      onChange={e => setOfflineProblem(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-805 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Form buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-teal-900/20">
                  <button
                    type="button"
                    onClick={() => setShowOfflineModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-teal-900/40 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingOffline}
                    className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-650 hover:bg-slate-800 dark:hover:bg-emerald-750 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {bookingOffline && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Book Appointment
                  </button>
                </div>

              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ 5. POSTPONE / RESCHEDULE APPOINTMENT MODAL ═══ */}
      <AnimatePresence>
        {showPostponeModal && postponeAppt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white border border-slate-200 dark:bg-[var(--card)] dark:border-teal-900/35 w-full max-w-md overflow-hidden flex flex-col rounded-3xl shadow-xl"
            >
              
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-teal-900/25 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 rounded-2xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-teal-200">Postpone Appointment</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-450 font-medium">Patient: {postponeAppt.patients?.name || 'Patient'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPostponeModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-650 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content Form */}
              <form onSubmit={e => { e.preventDefault(); handleConfirmPostpone() }} className="p-6 space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-[#18302b]/60 border border-slate-200/80 dark:border-teal-900/40 rounded-2xl text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <p><strong>Current Date:</strong> {postponeAppt.appointment_date}</p>
                  <p><strong>Current Time:</strong> {postponeAppt.appointment_time}</p>
                  <p><strong>Doctor:</strong> Dr. {postponeAppt.doctors?.name || 'Practitioner'}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">New Appointment Date</label>
                  <input
                    type="date"
                    required
                    value={newPostponeDate}
                    onChange={e => setNewPostponeDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-2xl text-xs bg-white dark:bg-[#121c19] text-slate-805 dark:text-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">New Time Slot</label>
                  <input
                    type="time"
                    required
                    value={newPostponeTime}
                    onChange={e => setNewPostponeTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-2xl text-xs bg-white dark:bg-[#121c19] text-slate-805 dark:text-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/50 rounded-2xl text-[11px] text-amber-900 dark:text-amber-400 font-medium leading-relaxed">
                  ℹ️ Saving will instantly update the database and send an automated <strong>WhatsApp & Email reschedule alert</strong> to the patient.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-teal-900/20">
                  <button
                    type="button"
                    onClick={() => setShowPostponeModal(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-teal-900/40 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={postponing}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {postponing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                    Confirm Postpone
                  </button>
                </div>
              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  )
}




