'use client'

import React, { useState, useEffect } from 'react'
import { updateAppointmentStatus, getLocalIpAddress, sendPatientReport } from '@/app/admin/actions'
import { supabase } from '@/lib/supabase'
import { 
  Search, Calendar, Check, X, AlertCircle, Info, Filter,
  Building, User2, RefreshCw, ChevronDown, CheckCircle2, Clock,
  FileText, QrCode, UploadCloud, Copy, HelpCircle, User
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
  
  // Mobile upload syncing
  const [isWaitingForMobile, setIsWaitingForMobile] = useState(false)
  const [tempMobilePhoto, setTempMobilePhoto] = useState<string | null>(null)
  
  // UI states
  const [sendingReport, setSendingReport] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [localIp, setLocalIp] = useState('localhost')

  // Fetch local IP address for the QR code link on mount
  useEffect(() => {
    async function loadIp() {
      const res = await getLocalIpAddress()
      if (res.success && res.ip) {
        setLocalIp(res.ip)
      }
    }
    loadIp()
  }, [])

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

  // Open Reports Modal and populate fields
  const handleOpenReportsModal = (appt: any) => {
    setActiveAppt(appt)
    setEmailVal(appt.patients?.email || '')
    setPrescriptionText(appt.prescription_text || '')
    setXrayFile(null)
    setPrescriptionFile(null)
    setTempMobilePhoto(appt.temp_mobile_photo || null)
    setIsWaitingForMobile(false)
    setShowReportsModal(true)
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

  // Submit diagnostic reports and trigger Resend email
  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAppt) return
    setSendingReport(true)

    try {
      const formData = new FormData()
      formData.append('appointmentId', activeAppt.id)
      formData.append('patientEmail', emailVal)
      formData.append('prescriptionText', prescriptionText)
      
      if (xrayFile) formData.append('xrayFile', xrayFile)
      if (prescriptionFile) formData.append('prescriptionFile', prescriptionFile)
      if (tempMobilePhoto) formData.append('tempMobilePhotoUrl', tempMobilePhoto)

      const res = await sendPatientReport(formData)
      if (res.success) {
        alert('Diagnostic report and prescription sent to patient successfully!')
        
        // Update local appointments state with the report sent time
        const sentTime = new Date().toISOString()
        setAppointments(prev =>
          prev.map(appt => appt.id === activeAppt.id ? { 
            ...appt, 
            report_sent_at: sentTime,
            prescription_text: prescriptionText,
            temp_mobile_photo: tempMobilePhoto
          } : appt)
        )
        setShowReportsModal(false)
      } else {
        alert(res.error || 'Failed to send reports')
      }
    } catch (err: any) {
      console.error(err)
      alert('An error occurred while sending reports')
    } finally {
      setSendingReport(false)
    }
  }

  // Copy mobile camera link to clipboard
  const handleCopyLink = () => {
    const link = `http://${localIp}:3000/admin/capture?branch=${activeAppt?.branches?.slug}`
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

  const mobileCaptureUrl = `http://${localIp}:3000/admin/capture?branch=${activeAppt?.branches?.slug}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(mobileCaptureUrl)}`

  return (
    <div className="space-y-6">
      
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
          
          {/* Branch Filter Tabs */}
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
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500">Upload Patient X-Ray (PDF / Image)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={e => setXrayFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition cursor-pointer"
                />
              </div>

              {/* Prescription Photo Upload Source */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-600">Prescription Sheet Attachment</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWaitingForMobile(!isWaitingForMobile)
                      setTempMobilePhoto(null)
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
                  <div className="space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setPrescriptionFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition cursor-pointer"
                    />
                  </div>
                )}

                {/* Mobile Camera Scanner Integration */}
                {isWaitingForMobile && (
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-3 flex flex-col items-center text-center animate-fade-in">
                    <img 
                      src={qrCodeUrl} 
                      alt="Mobile scan QR code" 
                      className="w-32 h-32 border border-slate-200/60 rounded-xl p-1 bg-white"
                    />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">Scan QR Code with Phone</p>
                      <p className="text-[10px] text-slate-400 font-light leading-relaxed max-w-xs mx-auto">
                        Your phone must be on the same local network. Login with passcode: <strong className="text-slate-800 font-semibold font-mono">{activeAppt.branches?.camera_passcode || '1234'}</strong>
                      </p>
                    </div>

                    <div className="flex gap-2 w-full max-w-xs">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="flex-1 py-2 text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition flex items-center justify-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedLink ? 'Copied' : 'Copy link'}
                      </button>
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
                  disabled={sendingReport}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/10"
                >
                  {sendingReport && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Send Diagnostic Report
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  )
}

