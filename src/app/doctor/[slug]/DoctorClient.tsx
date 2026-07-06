'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  bookOfflineAppointment, 
  updateAppointmentStatus, 
  sendPatientReport, 
  logoutDoctor,
  getLocalIpAddress,
  createCaptureTicket,
  clearCaptureTicket
} from '@/app/admin/actions'
import { supabase } from '@/lib/supabase'
import { 
  Calendar, Clock, Check, X, FileText, Upload, Copy, Info, Mail, Phone,
  TrendingUp, Award, LogOut, Sparkles, RefreshCw, User, HelpCircle, CheckCircle
} from 'lucide-react'

interface Doctor {
  id: string
  name: string
  email: string
  specialty: string | null
  picture_url: string | null
  branch_id: string
  compensation_type: 'fixed' | 'percentage'
  fixed_salary: number
  profit_percentage: number
  slug: string
  branches: { id: string; name: string; slug: string } | null
}

interface TimeSlot {
  id: string
  time_value: string
  time_label: string
}

interface HelperBoy {
  id: string
  name: string
  shift_1_rate: number
  shift_2_rate: number
  shift_1_enabled: boolean
  shift_2_enabled: boolean
  sunday_enabled: boolean
}

interface HelperAttendance {
  helper_boy_id: string
  date: string
  shift: number
  status: 'present' | 'absent'
}

interface DoctorAttendance {
  doctor_id: string
  date: string
  status: 'present' | 'absent'
}

interface ElectricityExpense {
  id: string
  month_year: string
  electricity_bill: number
  branch_id: string
}

interface ExtraExpense {
  id: string
  amount: number
  note: string
  expense_date: string
}

interface BranchAppointment {
  id: string
  amount_charged: number
  treatment_cost: number
  appointment_date: string
  branch_id: string
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  problem_description: string | null
  status: string
  prescription_text: string | null
  prescription_url: string | null
  xray_url: string | null
  temp_mobile_photo: string | null
  report_sent_at: string | null
  created_at: string
  patients: { id: string; name: string; email: string; mobile: string; age: number } | null
  branches: { id: string; name: string; slug: string } | null
}

interface DoctorClientProps {
  doctor: Doctor
  initialAppointments: Appointment[]
  timeSlots: TimeSlot[]
  helperBoys: HelperBoy[]
  helperAttendance: HelperAttendance[]
  doctorAttendance: DoctorAttendance[]
  electricityExpenses: ElectricityExpense[]
  extraExpenses: ExtraExpense[]
  branchAppointments: BranchAppointment[]
}

// Utility to count working days in a month
function getWorkingDaysInMonth(year: number, month: number, includeSundays: boolean) {
  let count = 0
  const date = new Date(year, month - 1, 1)
  while (date.getMonth() === month - 1) {
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 0 || includeSundays) {
      count++
    }
    date.setDate(date.getDate() + 1)
  }
  return count
}

export default function DoctorClient({
  doctor,
  initialAppointments,
  timeSlots,
  helperBoys,
  helperAttendance,
  doctorAttendance,
  electricityExpenses,
  extraExpenses,
  branchAppointments
}: DoctorClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'appointments' | 'book' | 'finances'>('appointments')
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)

  // Booking Form states
  const [offlineName, setOfflineName] = useState('')
  const [offlineEmail, setOfflineEmail] = useState('')
  const [offlineMobile, setOfflineMobile] = useState('')
  const [offlineAge, setOfflineAge] = useState('')
  const [offlineDate, setOfflineDate] = useState('')
  const [offlineTime, setOfflineTime] = useState('')
  const [offlineProblem, setOfflineProblem] = useState('')
  const [bookingOffline, setBookingOffline] = useState(false)

  // Reports Modal states
  const [showReportsModal, setShowReportsModal] = useState(false)
  const [activeAppt, setActiveAppt] = useState<Appointment | null>(null)
  const [emailVal, setEmailVal] = useState('')
  const [prescriptionText, setPrescriptionText] = useState('')
  const [xrayFile, setXrayFile] = useState<File | null>(null)
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null)
  const [xrayPreview, setXrayPreview] = useState<string | null>(null)
  const [prescPreview, setPrescPreview] = useState<string | null>(null)
  const [sendingReport, setSendingReport] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [localIp, setLocalIp] = useState('localhost')
  const [customIp, setCustomIp] = useState('localhost')
  
  // Mobile prescription upload syncing
  const [isWaitingForMobile, setIsWaitingForMobile] = useState(false)
  const [tempMobilePhoto, setTempMobilePhoto] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // Month selector for earnings
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Load IP and poll for mobile capture
  useEffect(() => {
    async function loadIp() {
      const res = await getLocalIpAddress()
      if (res.success && res.ip) {
        setLocalIp(res.ip)
        setCustomIp(res.ip)
      }
    }
    loadIp()
  }, [])

  useEffect(() => {
    let interval: any
    if (isWaitingForMobile && activeAppt?.id) {
      interval = setInterval(async () => {
        const { data } = await supabase
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

  const handleLogout = async () => {
    const res = await logoutDoctor()
    if (res.success) {
      router.refresh()
      window.location.reload()
    }
  }

  const handleCloseModal = async () => {
    setShowReportsModal(false)
    setIsWaitingForMobile(false)
    if (doctor.branch_id) {
      await clearCaptureTicket(doctor.branch_id)
    }
  }

  // Handle Online Booking Confirm/Complete/Cancel
  const handleUpdateStatus = async (id: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
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

  // Handle Booking Offline
  const handleBookOffline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offlineDate || !offlineTime) {
      alert('Please select date and time.')
      return
    }

    // Date range validation
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const minDate = new Date()
    minDate.setDate(today.getDate() - 3)
    minDate.setHours(0, 0, 0, 0)
    const selectedDate = new Date(offlineDate)
    selectedDate.setHours(0, 0, 0, 0)
    if (selectedDate < minDate) {
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
      formData.append('branchId', doctor.branch_id)
      formData.append('doctorId', doctor.id)
      formData.append('appointmentDate', offlineDate)
      formData.append('appointmentTime', offlineTime)
      formData.append('problemDescription', offlineProblem)

      const res = await bookOfflineAppointment(formData)
      if (res.success) {
        alert('Offline appointment registered successfully!')
        setOfflineName('')
        setOfflineEmail('')
        setOfflineMobile('')
        setOfflineAge('')
        setOfflineDate('')
        setOfflineTime('')
        setOfflineProblem('')
        
        // Refresh appointments list
        const { data } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            problem_description,
            status,
            prescription_text,
            prescription_url,
            xray_url,
            temp_mobile_photo,
            report_sent_at,
            created_at,
            patients (id, name, email, mobile, age),
            branches (id, name, slug)
          `)
          .eq('doctor_id', doctor.id)
          .order('appointment_date', { ascending: false })
        
        if (data) {
          const formatted = (data as any[]).map(appt => ({
            ...appt,
            patients: Array.isArray(appt.patients) ? appt.patients[0] : appt.patients,
            branches: Array.isArray(appt.branches) ? appt.branches[0] : appt.branches
          })) as Appointment[]
          setAppointments(formatted)
        }
        
        setActiveTab('appointments')
      } else {
        alert(res.error || 'Failed to book appointment')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred during offline booking.')
    } finally {
      setBookingOffline(false)
    }
  }

  // Open reports modal
  const handleOpenReportsModal = (appt: Appointment) => {
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
  }

  const handleXrayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setXrayFile(file)
      setXrayPreview(URL.createObjectURL(file))
    }
  }

  const handlePrescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPrescriptionFile(file)
      setPrescPreview(URL.createObjectURL(file))
    }
  }

  const handleCopyLink = () => {
    const link = `http://${customIp}:3000/admin/capture?branch=${doctor.branches?.slug}&appointment=${activeAppt?.id || ''}`
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Submit patient report (calls sendPatientReport server action)
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAppt) return
    setSendingReport(true)

    try {
      const formData = new FormData()
      formData.append('appointmentId', activeAppt.id)
      formData.append('patientEmail', emailVal)
      formData.append('prescriptionText', prescriptionText)
      
      if (xrayFile) formData.append('xray', xrayFile)
      if (prescriptionFile) formData.append('prescription', prescriptionFile)
      if (tempMobilePhoto) formData.append('tempMobilePhoto', tempMobilePhoto)

      const res = await sendPatientReport(formData)
      if (res.success) {
        alert('Diagnostic report and prescription sent to patient successfully!')
        
        // Update local state
        const sentTime = new Date().toISOString()
        setAppointments(prev =>
          prev.map(a => a.id === activeAppt.id ? { 
            ...a, 
            report_sent_at: sentTime,
            prescription_text: prescriptionText,
            temp_mobile_photo: tempMobilePhoto
          } : a)
        )
        setShowReportsModal(false)
      } else {
        alert(res.error || 'Failed to send reports')
      }
    } catch (err: any) {
      console.error(err)
      alert('An error occurred.')
    } finally {
      setSendingReport(false)
    }
  }

  // Calculate Doctor's Payout & Attendance Details for selectedMonth
  const getDoctorFinances = () => {
    const [yearStr, monthStr] = selectedMonth.split('-')
    const year = parseInt(yearStr || '2026', 10)
    const month = parseInt(monthStr || '07', 10)
    
    const workingDays = getWorkingDaysInMonth(year, month, false)
    
    // Doctor Absences
    const absences = doctorAttendance.filter(a => {
      if (a.status !== 'absent') return false
      const absDate = new Date(a.date)
      const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
      return absMonthStr === selectedMonth
    })
    const absencesCount = absences.length
    const workedDays = Math.max(0, workingDays - absencesCount)

    let finalPayout = 0
    let calculations: any = {}

    if (doctor.compensation_type === 'fixed') {
      const dailyRate = doctor.fixed_salary / workingDays
      finalPayout = workedDays * dailyRate
      calculations = {
        workingDays,
        absencesCount,
        workedDays,
        dailyRate: Math.round(dailyRate),
        fixedSalary: doctor.fixed_salary
      }
    } else {
      // Percentage of branch net profit
      const branchAppts = branchAppointments.filter(appt => {
        const apptDate = new Date(appt.appointment_date)
        const apptMonthStr = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, '0')}`
        return apptMonthStr === selectedMonth
      })

      const totalRevenue = branchAppts.reduce((sum, a) => sum + (a.amount_charged || 0), 0)
      const totalTreatmentCost = branchAppts.reduce((sum, a) => sum + (a.treatment_cost || 0), 0)
      const treatmentProfit = totalRevenue - totalTreatmentCost

      // Helper salaries for branch
      const branchHelpersPay = helperBoys.reduce((sum, helper) => {
        const hWorkingDays = getWorkingDaysInMonth(year, month, helper.sunday_enabled)
        const hAbsences = helperAttendance.filter(a => {
          if (a.helper_boy_id !== helper.id || a.status !== 'absent') return false
          const absDate = new Date(a.date)
          const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
          return absMonthStr === selectedMonth
        })
        const shift1Abs = hAbsences.filter(a => a.shift === 1).length
        const shift2Abs = hAbsences.filter(a => a.shift === 2).length
        const shift1Worked = helper.shift_1_enabled ? Math.max(0, hWorkingDays - shift1Abs) : 0
        const shift2Worked = helper.shift_2_enabled ? Math.max(0, hWorkingDays - shift2Abs) : 0
        return sum + (shift1Worked * helper.shift_1_rate) + (shift2Worked * helper.shift_2_rate)
      }, 0)

      // Electricity
      const electricity = electricityExpenses.find(e => e.month_year === selectedMonth)?.electricity_bill || 0

      // Extra expenses
      const extras = extraExpenses.filter(e => {
        const expDate = new Date(e.expense_date)
        const expMonthStr = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`
        return expMonthStr === selectedMonth
      }).reduce((sum, e) => sum + e.amount, 0)

      const branchProfit = treatmentProfit - branchHelpersPay - electricity - extras
      if (branchProfit > 0) {
        finalPayout = branchProfit * (doctor.profit_percentage / 100)
      }

      calculations = {
        totalRevenue,
        totalTreatmentCost,
        treatmentProfit,
        branchHelpersPay,
        electricity,
        extras,
        branchProfit,
        profitPercentage: doctor.profit_percentage
      }
    }

    return {
      finalPayout: Math.round(finalPayout),
      calculations,
      absences
    }
  }

  const finances = getDoctorFinances()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* ═══ PORTAL HEADER ═══ */}
      <header className="h-16 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 px-6 sm:px-8 flex items-center justify-between shrink-0 text-white shadow-md z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg">
            <span className="font-serif font-bold text-sm">D</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">Dr. {doctor.name}</h2>
            <p className="text-[10px] text-cyan-400 font-light uppercase tracking-wider">{doctor.branches?.name || 'Dentist Portal'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold tracking-wide transition duration-200 text-slate-200 hover:text-white"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
        
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`pb-3 border-b-2 px-1 transition ${
              activeTab === 'appointments' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            My Appointments
          </button>
          <button
            onClick={() => setActiveTab('book')}
            className={`pb-3 border-b-2 px-1 transition ${
              activeTab === 'book' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Book Offline Patient
          </button>
          <button
            onClick={() => setActiveTab('finances')}
            className={`pb-3 border-b-2 px-1 transition ${
              activeTab === 'finances' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Earnings & Attendance
          </button>
        </div>

        {/* ═══ TAB 1: MY APPOINTMENTS ═══ */}
        {activeTab === 'appointments' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-500" />
              Patient Appointments
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400 font-semibold">
                    <th className="px-4 py-3">Patient Details</th>
                    <th className="px-4 py-3">Date / Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3 text-center">Reports</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400 font-light">
                        No appointments assigned to you.
                      </td>
                    </tr>
                  ) : (
                    appointments.map(appt => (
                      <tr key={appt.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{appt.patients?.name}</p>
                          <p className="text-[10px] text-slate-400 font-light">{appt.patients?.age} years old | {appt.patients?.mobile}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-700">{appt.appointment_date}</p>
                          <p className="text-[10px] text-slate-400 font-light">{appt.appointment_time.substring(0, 5)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] font-semibold uppercase tracking-wider ${
                            appt.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            appt.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            appt.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {appt.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {appt.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                                  disabled={updatingId === appt.id}
                                  className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                                  disabled={updatingId === appt.id}
                                  className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[10px] font-bold"
                                >
                                  Decline
                                </button>
                              </>
                            )}
                            {appt.status === 'confirmed' && (
                              <button
                                onClick={() => handleUpdateStatus(appt.id, 'completed')}
                                disabled={updatingId === appt.id}
                                className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                              >
                                Mark Completed
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleOpenReportsModal(appt)}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] rounded-lg font-semibold tracking-wide"
                          >
                            {appt.report_sent_at ? 'Resend Report' : 'Send Report'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ TAB 2: BOOK OFFLINE PATIENT ═══ */}
        {activeTab === 'book' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-lg mx-auto space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 border-b pb-3">
              <Calendar className="w-4 h-4 text-slate-500" />
              Book Offline Patient
            </h3>

            <form onSubmit={handleBookOffline} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500">Patient Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={offlineName}
                    onChange={e => setOfflineName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={offlineEmail}
                    onChange={e => setOfflineEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500">Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="03001234567"
                    value={offlineMobile}
                    onChange={e => setOfflineMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500">Age</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    placeholder="25"
                    value={offlineAge}
                    onChange={e => setOfflineAge(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500">Date (Min: Past 3 Days)</label>
                  <input
                    type="date"
                    required
                    value={offlineDate}
                    onChange={e => setOfflineDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500">Time Slot</label>
                  <select
                    value={offlineTime}
                    required
                    onChange={e => setOfflineTime(e.target.value)}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                  >
                    <option value="">Select Time</option>
                    {timeSlots.map(t => (
                      <option key={t.id} value={t.time_value}>{t.time_label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-500">Problem / Symptom Notes</label>
                <textarea
                  placeholder="Notes about diagnostic..."
                  value={offlineProblem}
                  onChange={e => setOfflineProblem(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={bookingOffline}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow"
              >
                {bookingOffline && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Booking
              </button>
            </form>
          </div>
        )}

        {/* ═══ TAB 3: EARNINGS & ATTENDANCE ═══ */}
        {activeTab === 'finances' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Monthly Earnings Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  Monthly Payout Calculator
                </h3>
                
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="px-3 py-1 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none"
                />
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl text-center space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-light">Earning Payout</p>
                <p className="text-2xl font-semibold text-slate-800">PKR {finances.finalPayout.toLocaleString()}</p>
              </div>

              {/* Formula calculations view */}
              {doctor.compensation_type === 'fixed' ? (
                <div className="text-xs space-y-2 border-t pt-4 text-slate-650">
                  <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Compensation Basis: FIXED SALARY</p>
                  <div className="flex justify-between">
                    <span>Base monthly salary:</span>
                    <span>PKR {finances.calculations.fixedSalary?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expected working days:</span>
                    <span>{finances.calculations.workingDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days absent:</span>
                    <span className="text-rose-600">-{finances.calculations.absencesCount} days</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 border-t pt-2 mt-2">
                    <span>Days worked payout:</span>
                    <span>PKR {finances.finalPayout?.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs space-y-2 border-t pt-4 text-slate-650">
                  <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Compensation Basis: {finances.calculations.profitPercentage}% PROFIT SHARE</p>
                  
                  <div className="flex justify-between">
                    <span>Branch gross revenue:</span>
                    <span>PKR {finances.calculations.totalRevenue?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Branch materials cost:</span>
                    <span className="text-rose-600">-{finances.calculations.totalTreatmentCost?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Branch helper payouts:</span>
                    <span className="text-rose-600">-{finances.calculations.branchHelpersPay?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Branch electricity bill:</span>
                    <span className="text-rose-600">-{finances.calculations.electricity?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Branch extra expenses:</span>
                    <span className="text-rose-600">-{finances.calculations.extras?.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between border-t border-dashed pt-2 font-medium text-slate-700">
                    <span>Branch net profits:</span>
                    <span>PKR {finances.calculations.branchProfit?.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between font-bold text-slate-800 border-t pt-2 mt-2">
                    <span>Your {finances.calculations.profitPercentage}% share:</span>
                    <span>PKR {finances.finalPayout?.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Attendance Absences logs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 border-b pb-3">
                <Calendar className="w-4 h-4 text-slate-500" />
                Marked Absences Logs
              </h3>

              <div className="space-y-3">
                {finances.absences.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-12 font-light">Great! You have no absences marked in this month.</p>
                ) : (
                  <div className="divide-y text-xs">
                    {finances.absences.map((abs, index) => (
                      <div key={index} className="py-2.5 flex items-center justify-between text-slate-650">
                        <span className="font-semibold text-slate-800">{abs.date}</span>
                        <span className="text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded text-[10px]">Absent</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ═══ MODAL OVERLAY FOR PATIENT REPORT EMAIL ═══ */}
      {showReportsModal && activeAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Update Report & Email Patient
              </h3>
              <button 
                onClick={handleCloseModal}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500">Send To Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="patient@email.com"
                    value={emailVal}
                    onChange={e => setEmailVal(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500">Patient Phone</label>
                  <input
                    type="text"
                    disabled
                    value={activeAppt.patients?.mobile || ''}
                    className="w-full px-3 py-1.5 border border-slate-100 bg-slate-50 text-slate-450 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-500">Doctor Advice & Prescription Details</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter medical advices, tests required, and medications details here..."
                  value={prescriptionText}
                  onChange={e => setPrescriptionText(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                />
              </div>

              {/* Upload boxes for PDFs and X-rays */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500">Diagnostic X-Ray (PDF/Image)</label>
                  <div className="relative border border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center hover:border-slate-400 cursor-pointer bg-slate-50 relative group">
                    <input type="file" accept="image/*,application/pdf" onChange={handleXrayChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {xrayPreview ? (
                      <div className="text-[10px] text-teal-700 font-semibold truncate max-w-full">File Attached</div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-[9px] text-slate-400 mt-1">Upload files</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500">Prescription Paper Photo (Optional)</label>
                  <div className="relative border border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center hover:border-slate-400 cursor-pointer bg-slate-50 relative group">
                    <input type="file" accept="image/*" onChange={handlePrescriptionChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {prescPreview ? (
                      <div className="text-[10px] text-teal-700 font-semibold truncate max-w-full">File Attached</div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-[9px] text-slate-400 mt-1">Upload photo</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Phone Sync box */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sync Handheld Mobile Camera</h4>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsWaitingForMobile(true)
                      setTempMobilePhoto(null)
                      if (activeAppt?.id) {
                        await supabase
                          .from('appointments')
                          .update({ temp_mobile_photo: null })
                          .eq('id', activeAppt.id)
                        await createCaptureTicket(doctor.branch_id, activeAppt.id)
                      }
                    }}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold shadow-sm transition"
                  >
                    Start Sync
                  </button>
                </div>

                {isWaitingForMobile && (
                  <div className="p-4 border rounded-2xl bg-slate-50 flex flex-col items-center justify-center gap-3 animate-fade-in">
                    <div className="w-12 h-12 bg-cyan-50 border border-cyan-150 rounded-2xl flex items-center justify-center text-cyan-600">
                      <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                    
                    <div className="space-y-1 text-center">
                      <p className="text-xs font-bold text-slate-800">Mobile Capture Ticket Active</p>
                      <p className="text-[10px] text-slate-400 font-light leading-relaxed max-w-xs mx-auto">
                        A sync ticket has been sent to the mobile capture page for <strong>{activeAppt?.patients?.name}</strong>.
                      </p>
                      <p className="text-[10px] text-slate-500 italic mt-2">
                        Open the capture page on your phone, and it will automatically lock onto this patient's photo.
                      </p>
                    </div>
                  </div>
                )}

                {tempMobilePhoto && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-fade-in">
                    <div className="w-12 h-12 bg-slate-900 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                      <img src={tempMobilePhoto} alt="Mobile capture preview" className="object-cover h-full w-full" />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-emerald-800 text-[10px]">Photo Uploaded from Mobile</p>
                      <p className="text-emerald-600 font-light text-[9px]">Ready to email patient.</p>
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

              {/* Form buttons */}
              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 border rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingReport}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5"
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
