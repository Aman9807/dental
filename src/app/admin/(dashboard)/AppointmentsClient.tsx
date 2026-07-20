'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { updateAppointmentStatus, getLocalIpAddress, sendPatientReport, bookOfflineAppointment, createCaptureTicket, clearCaptureTicket, triggerDeliverAndCleanup } from '@/app/admin/actions'
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
          prescription_text: null, // cleared as part of purge
          prescription_url: null,
          xray_url: null,
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      
      {/* 1. Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white p-6 border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-light">Total Appointments</p>
            <p className="text-2xl font-semibold text-slate-800">{totalCount}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl text-slate-700">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-6 border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-light">Pending Review</p>
            <p className="text-2xl font-semibold text-amber-600">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-6 border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-light">Confirmed Slots</p>
            <p className="text-2xl font-semibold text-blue-600">{confirmedCount}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-6 border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-light">Completed Care</p>
            <p className="text-2xl font-semibold text-emerald-600">{completedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Check className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 2. Search and Filters Bar */}
      <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Branch Filter Tabs & Book Offline Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start">
              <button
                onClick={() => setSelectedBranch('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  selectedBranch === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Clinics
              </button>
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranch(b.slug)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    selectedBranch === b.slug ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {b.slug === 'hazara' ? 'Hazara' : 'Family'}
                </button>
              ))}
            </div>

            <button
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
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" /> Book Offline
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
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
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, email, phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
              />
            </div>
          </div>

        </div>
      </div>

      {/* 3. Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
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
                          className="appearance-none pl-3 pr-8 py-1.5 border rounded-full text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer transition bg-slate-50"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                      </div>
                    </td>

                    {/* Reports column */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleOpenReportsModal(appt)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Reports
                        </button>
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
      {showReportsModal && activeAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col justify-between animate-fade-in-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
              <div>
                <h3 className="text-base font-bold text-slate-800">Finalize Diagnosis & Send Report</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-light mt-0.5">
                  Patient: {activeAppt.patients?.name}
                </p>
              </div>
              <button
                onClick={() => setShowReportsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSendReport} className="p-6 space-y-5 flex-1">
              
              {/* Billing Status Badge */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col gap-1 text-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Invoice / Billing Verification</span>
                {loadingInvoiceCheck ? (
                  <div className="flex items-center gap-1.5 text-slate-500 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking billing records...</span>
                  </div>
                ) : associatedInvoiceId ? (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Bill Attached: Rs. {associatedInvoiceTotal?.toFixed(2)}
                    </span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-mono font-bold border border-emerald-100">
                      #{associatedInvoiceId.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1 mt-1">
                    <div className="flex items-center gap-1 text-amber-700 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      No bill compiled for this appointment
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal font-light">
                      ⚠️ Please go to the <strong>Billing</strong> tab to create the patient's checkout invoice before sending the clinical report.
                    </p>
                  </div>
                )}
              </div>

              {/* Patient Email (Editable) */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500">Patient Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="Enter email address"
                  value={emailVal}
                  onChange={e => setEmailVal(e.target.value)}
                  className="w-full px-4.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                />
                <p className="text-[10px] text-slate-400 font-light">
                  If updated, this email will also be saved as the patient's primary contact email.
                </p>
              </div>

              {/* Prescription Text */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500">Prescription / Advice Notes</label>
                <textarea
                  rows={3}
                  value={prescriptionText}
                  onChange={e => setPrescriptionText(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg - Twice daily after meals. Rinse with saltwater..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                />
              </div>

              {/* X-Ray File Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500">Upload Patient X-Ray (PDF / Image)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={e => {
                    const file = e.target.files?.[0] || null
                    setXrayFile(file)
                    if (file && file.type.startsWith('image/')) {
                      setXrayPreview(URL.createObjectURL(file))
                    } else {
                      setXrayPreview(null)
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition cursor-pointer"
                />

                {/* Previews for X-Ray */}
                {activeAppt.xray_url && (
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    {activeAppt.xray_url.match(/\.(jpeg|jpg|gif|png|webp)/i) || activeAppt.xray_url.includes('storage/v1/object/public') ? (
                      <div className="w-10 h-10 bg-slate-900 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                        <img src={activeAppt.xray_url} alt="Existing X-Ray" className="object-cover h-full w-full" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 border rounded-lg shrink-0 flex items-center justify-center text-[10px] text-slate-500 font-bold uppercase">
                        PDF
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 leading-normal">
                      <p className="font-bold text-slate-700">Existing X-Ray Attached</p>
                      <a href={activeAppt.xray_url} target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline">View Document</a>
                    </div>
                  </div>
                )}

                {xrayPreview && (
                  <div className="p-2 bg-cyan-50/50 border border-cyan-150 rounded-xl flex items-center gap-3 animate-fade-in">
                    <div className="w-10 h-10 bg-slate-900 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                      <img src={xrayPreview} alt="New X-Ray preview" className="object-cover h-full w-full" />
                    </div>
                    <div className="text-[10px] text-slate-600 leading-normal">
                      <p className="font-bold text-cyan-800">New X-Ray Selected</p>
                      <p className="text-slate-400 font-light truncate max-w-[200px]">{xrayFile?.name}</p>
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
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-600">Prescription Sheet Attachment</label>
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
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1 ${
                      isWaitingForMobile 
                        ? 'bg-amber-50 border-amber-200 text-amber-700' 
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
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
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition cursor-pointer"
                    />
                    
                    {/* Previews for Prescription */}
                    {activeAppt.prescription_url && !tempMobilePhoto && (
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                          <img src={activeAppt.prescription_url} alt="Existing Prescription" className="object-cover h-full w-full" />
                        </div>
                        <div className="text-[10px] text-slate-500 leading-normal">
                          <p className="font-bold text-slate-700">Existing Prescription Attached</p>
                          <a href={activeAppt.prescription_url} target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline">View Image</a>
                        </div>
                      </div>
                    )}

                    {prescPreview && (
                      <div className="p-2 bg-cyan-50/50 border border-cyan-150 rounded-xl flex items-center gap-3 animate-fade-in">
                        <div className="w-10 h-10 bg-slate-900 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                          <img src={prescPreview} alt="New Prescription preview" className="object-cover h-full w-full" />
                        </div>
                        <div className="text-[10px] text-slate-600 leading-normal">
                          <p className="font-bold text-cyan-800">New Prescription Selected</p>
                          <p className="text-slate-400 font-light truncate max-w-[200px]">{prescriptionFile?.name}</p>
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
                  <div className="bg-slate-50 p-6 border border-slate-200 rounded-2xl space-y-4 flex flex-col items-center text-center animate-fade-in">
                    <div className="w-12 h-12 bg-cyan-50 border border-cyan-150 rounded-2xl flex items-center justify-center text-cyan-600">
                      <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">Mobile Capture Ticket Active</p>
                      <p className="text-[10px] text-slate-400 font-light leading-relaxed max-w-xs mx-auto">
                        A sync ticket has been sent to the mobile capture page for <strong>{activeAppt?.patients?.name}</strong>.
                      </p>
                      <p className="text-[10px] text-slate-500 italic mt-2">
                        Open the capture page on your phone, and it will automatically lock onto this patient's photo.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50/50 border border-amber-100/60 px-3 py-1.5 rounded-xl font-medium w-full justify-center">
                      <Clock className="w-3 h-3 animate-spin" />
                      <span>Waiting for phone camera prescription upload...</span>
                    </div>
                  </div>
                )}

                {/* Render Mobile Upload Preview if uploaded */}
                {tempMobilePhoto && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-fade-in">
                    <div className="w-12 h-12 bg-slate-900 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                      <img src={tempMobilePhoto} alt="Mobile capture preview" className="object-cover h-full w-full" />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-emerald-800">Prescription Attached from Mobile</p>
                      <p className="text-emerald-600 font-light text-[10px]">Ready to send to patient.</p>
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

              {/* Modal Footer / Action buttons */}
              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportsModal(false)}
                  className="flex-1 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingReport || !associatedInvoiceId || loadingInvoiceCheck}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/10"
                >
                  {sendingReport && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {sendingReport ? 'Sending...' : 'Send Combined Report & Bill'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 5. MODAL overlay for BOOK OFFLINE APPOINTMENT */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                Book Offline Appointment
              </h3>
              <button 
                onClick={() => setShowOfflineModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
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
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Patient Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-500">Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={offlineName}
                      onChange={e => setOfflineName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-500">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={offlineEmail}
                      onChange={e => setOfflineEmail(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-500">Mobile</label>
                    <input
                      type="tel"
                      required
                      placeholder="03001234567"
                      value={offlineMobile}
                      onChange={e => setOfflineMobile(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-500">Age</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="120"
                      placeholder="35"
                      value={offlineAge}
                      onChange={e => setOfflineAge(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Appointment details section */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Appointment Details</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-500">Branch</label>
                    <select
                      value={offlineBranchId}
                      onChange={e => {
                        setOfflineBranchId(e.target.value)
                        setOfflineDoctorId('') // Reset doctor when branch changes
                      }}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                    >
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-500">Doctor</label>
                    <select
                      value={offlineDoctorId}
                      required
                      onChange={e => setOfflineDoctorId(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                    >
                      <option value="">Select Doctor</option>
                      {doctorsList
                        .filter(d => !offlineBranchId || d.branch_id === offlineBranchId)
                        .map(d => (
                          <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialty || 'General'})</option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-500">Date</label>
                    <input
                      type="date"
                      required
                      value={offlineDate}
                      onChange={e => setOfflineDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-500">Time Slot</label>
                    <select
                      value={offlineTime}
                      required
                      onChange={e => setOfflineTime(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                    >
                      <option value="">Select Time</option>
                      {timeSlotsList.map(t => (
                        <option key={t.id} value={t.time_value}>{t.time_label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500">Problem / Notes</label>
                  <textarea
                    placeholder="Describe symptoms or reasons for the booking..."
                    value={offlineProblem}
                    onChange={e => setOfflineProblem(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOfflineModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingOffline}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5"
                >
                  {bookingOffline && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Book Appointment
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </motion.div>
  )
}




