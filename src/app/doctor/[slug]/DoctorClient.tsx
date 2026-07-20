'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { 
  bookOfflineAppointment, 
  updateAppointmentStatus, 
  sendPatientReport, 
  logoutDoctor,
  getLocalIpAddress,
  createCaptureTicket,
  clearCaptureTicket,
  searchMedicines,
  createInvoice,
  triggerDeliverAndCleanup
} from '@/app/admin/actions'
import { supabase } from '@/lib/supabase'
import { 
  Calendar, Clock, Check, X, FileText, Upload, Copy, Info, Mail, Phone,
  TrendingUp, Award, LogOut, Sparkles, RefreshCw, User, HelpCircle, CheckCircle,
  Search, PlusCircle, Trash2, Loader2, Percent, AlertCircle, ShoppingCart, Send, Barcode, Activity
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

interface Treatment {
  id: string
  name: string
  price: number
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
  treatments: Treatment[]
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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
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
  branchAppointments,
  treatments
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

  // Billing States
  const [billingItems, setBillingItems] = useState<any[]>([])
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [generatedInvoiceId, setGeneratedInvoiceId] = useState<string | null>(null)
  const [generatingBill, setGeneratingBill] = useState(false)

  // Medicine search autocomplete states
  const [medQuery, setMedQuery] = useState('')
  const [medResults, setMedResults] = useState<any[]>([])
  const [searchingMeds, setSearchingMeds] = useState(false)
  const [showMedDropdown, setShowMedDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Treatment selection
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('')
  
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

  // Detect clicks outside search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMedDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Billing Actions
  const handleMedSearch = async (val: string) => {
    setMedQuery(val)
    if (!val.trim()) {
      setMedResults([])
      setShowMedDropdown(false)
      return
    }

    setSearchingMeds(true)
    try {
      const res = await searchMedicines(val, doctor.branches?.slug)
      if (res.success && res.data) {
        setMedResults(res.data)
        setShowMedDropdown(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSearchingMeds(false)
    }
  }

  const addMedicineItem = (med: any) => {
    const stock = Number(med.stock)
    if (stock <= 0) return

    const existingIndex = billingItems.findIndex(item => item.type === 'medicine' && item.id === med.id)
    if (existingIndex !== -1) {
      const updated = [...billingItems]
      const newQty = updated[existingIndex].quantity + 1
      if (newQty <= stock) {
        updated[existingIndex].quantity = newQty
        setBillingItems(updated)
      } else {
        alert(`Cannot add more. Only ${stock} units available in stock.`)
      }
    } else {
      const price = med.batches && med.batches.length > 0 ? Number(med.batches[0].price) : Number(med.price)
      const newItem = {
        key: `med_${med.id}_${Date.now()}`,
        type: 'medicine',
        id: med.id,
        name: med.name,
        quantity: 1,
        price: price,
        maxStock: stock
      }
      setBillingItems([...billingItems, newItem])
    }
    setMedQuery('')
    setShowMedDropdown(false)
  }

  const handleAddTreatment = () => {
    if (!selectedTreatmentId) return
    const treat = treatments.find(t => t.id === selectedTreatmentId)
    if (!treat) return

    const newItem = {
      key: `treat_${treat.id}_${Date.now()}`,
      type: 'treatment',
      id: treat.id,
      name: treat.name,
      quantity: 1,
      price: Number(treat.price)
    }

    setBillingItems([...billingItems, newItem])
    setSelectedTreatmentId('')
  }

  const handleAddCustom = () => {
    const newItem = {
      key: `custom_${Date.now()}`,
      type: 'custom',
      name: 'Custom Dental Work',
      quantity: 1,
      price: 1000
    }
    setBillingItems([...billingItems, newItem])
  }

  const handleAddCustomMedicine = () => {
    const newItem = {
      key: `custom_med_${Date.now()}`,
      type: 'medicine',
      name: 'Custom Medicine Name',
      quantity: 10, // Default to standard strip size
      price: 12 // Default tablet price
    }
    setBillingItems([...billingItems, newItem])
  }

  const updateItem = (key: string, field: 'quantity' | 'price' | 'name', value: any) => {
    const updated = billingItems.map(item => {
      if (item.key === key) {
        if (field === 'quantity') {
          let val = parseInt(value) || 1
          if (item.type === 'medicine' && item.maxStock) {
            val = Math.min(val, item.maxStock)
          }
          return { ...item, quantity: Math.max(1, val) }
        }
        if (field === 'price') {
          return { ...item, price: Math.max(0, parseFloat(value) || 0) }
        }
        if (field === 'name') {
          return { ...item, name: value }
        }
      }
      return item
    })
    setBillingItems(updated)
  }

  const removeItem = (key: string) => {
    setBillingItems(billingItems.filter(item => item.key !== key))
  }

  const subtotal = billingItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const discountAmount = subtotal * (discountPercent / 100)
  const grandTotal = subtotal - discountAmount

  const handleGenerateBill = async () => {
    if (!activeAppt) return
    if (billingItems.length === 0) {
      alert('Please add medicines or procedures to generate a bill.')
      return
    }

    setGeneratingBill(true)
    try {
      const res = await createInvoice(
        activeAppt.id,
        billingItems,
        subtotal,
        discountPercent,
        discountPercent,
        grandTotal
      )
      if (res.success && res.invoiceId) {
        setGeneratedInvoiceId(res.invoiceId)
        alert('Bill generated and attached to patient report successfully!')
      } else {
        alert(res.error || 'Failed to generate bill')
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'An error occurred while generating invoice')
    } finally {
      setGeneratingBill(false)
    }
  }

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
    
    // Clear billing states
    setBillingItems([])
    setDiscountPercent(0)
    setGeneratedInvoiceId(null)
    setMedQuery('')
    setMedResults([])
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

  // Submit patient report (calls sendPatientReport server action and then triggers delivery & cleanup pipeline)
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAppt) return

    // 1. Enforce that the bill must be generated first before sending reports
    if (!generatedInvoiceId) {
      alert('Error: Please generate and attach the bill first before sending the report!')
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

      // A. Save/Upload reports to database/storage first
      const res = await sendPatientReport(formData)
      if (!res.success) {
        throw new Error(res.error || 'Failed to upload diagnostic reports.')
      }

      // B. Trigger Automated Email/WhatsApp Delivery and Auto-Purge pipeline
      const deliveryRes = await triggerDeliverAndCleanup(activeAppt.id, generatedInvoiceId)
      if (!deliveryRes.success) {
        throw new Error(deliveryRes.error || 'Reports saved, but delivery & cleanup dispatch pipeline failed.')
      }

      alert('Diagnostic reports and invoice bill sent to patient successfully! Cloud records have been auto-purged.')
      
      // Update local state
      const sentTime = new Date().toISOString()
      setAppointments(prev =>
        prev.map(a => a.id === activeAppt.id ? { 
          ...a, 
          status: 'completed',
          report_sent_at: sentTime,
          prescription_text: null, // cleared as part of purge
          prescription_url: null,
          xray_url: null,
          temp_mobile_photo: null
        } : a)
      )
      setShowReportsModal(false)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'An error occurred during report submission and billing delivery.')
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
    <div className="min-h-screen bg-slate-50 font-['Inter',_sans-serif] text-slate-800 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-slate-50">
      
      {/* Abstract Background Elements for Spatial Depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-cyan-400/10 to-transparent blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-teal-400/10 to-transparent blur-[120px] pointer-events-none" />

      {/* ═══ PORTAL HEADER (Glassmorphic) ═══ */}
      <header className="sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between border-b border-white/40 bg-white/60 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_16px_rgba(6,182,212,0.25)] border border-white/20 transform transition hover:scale-105">
            <span className="font-['Poppins',_sans-serif] font-bold text-lg">D</span>
          </div>
          <div>
            <h2 className="text-lg font-['Poppins',_sans-serif] font-bold leading-tight text-slate-800">Dr. {doctor.name}</h2>
            <p className="text-xs text-teal-600 font-medium uppercase tracking-widest">{doctor.branches?.name || 'Dentist Portal'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white/50 hover:bg-white/80 border border-slate-200/50 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 text-slate-600 hover:text-rose-600 hover:shadow-sm"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      <div className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
        
        {/* Floating Navigation Tabs */}
        <div className="flex gap-2 p-1.5 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.03)] w-max mx-auto md:mx-0">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-6 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
              activeTab === 'appointments' ? 'bg-white text-teal-700 shadow-[0_4px_12px_rgba(0,0,0,0.05)]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            My Appointments
          </button>
          <button
            onClick={() => setActiveTab('book')}
            className={`px-6 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
              activeTab === 'book' ? 'bg-white text-teal-700 shadow-[0_4px_12px_rgba(0,0,0,0.05)]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            Book Offline Patient
          </button>
          <button
            onClick={() => setActiveTab('finances')}
            className={`px-6 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
              activeTab === 'finances' ? 'bg-white text-teal-700 shadow-[0_4px_12px_rgba(0,0,0,0.05)]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            Earnings & Attendance
          </button>
        </div>

        {/* ═══ MAIN CONTENT AREA ═══ */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: MY APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <motion.div 
              key="appointments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-6 sm:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.04)] space-y-6"
            >
              <h3 className="text-xl font-['Poppins',_sans-serif] font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-500" />
                Patient Appointments
              </h3>

              <div className="overflow-x-auto rounded-2xl border border-slate-100/50 bg-white/50">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200/60 text-xs text-slate-500 font-semibold tracking-wider uppercase">
                      <th className="px-6 py-4">Patient Details</th>
                      <th className="px-6 py-4">Date / Time</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4 text-center">Reports</th>
                    </tr>
                  </thead>
                  <motion.tbody 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="divide-y divide-slate-100/50 text-sm text-slate-700"
                  >
                    {appointments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                          No appointments assigned to you.
                        </td>
                      </tr>
                    ) : (
                      appointments.map(appt => (
                        <motion.tr variants={itemVariants} key={appt.id} className="hover:bg-white/60 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800 font-['Poppins',_sans-serif]">{appt.patients?.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{appt.patients?.age} years old • {appt.patients?.mobile}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-700">{appt.appointment_date}</p>
                            <p className="text-xs text-slate-500 mt-0.5 font-mono">{appt.appointment_time.substring(0, 5)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                              appt.status === 'pending' ? 'bg-amber-50/80 text-amber-700 border-amber-200/50' :
                              appt.status === 'confirmed' ? 'bg-cyan-50/80 text-cyan-700 border-cyan-200/50' :
                              appt.status === 'completed' ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/50' :
                              'bg-rose-50/80 text-rose-700 border-rose-200/50'
                            }`}>
                              {appt.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {appt.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                                    disabled={updatingId === appt.id}
                                    className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white rounded-lg text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                                    disabled={updatingId === appt.id}
                                    className="px-4 py-1.5 bg-white text-rose-500 border border-rose-100 hover:border-rose-200 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-all"
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                              {appt.status === 'confirmed' && (
                                <button
                                  onClick={() => handleUpdateStatus(appt.id, 'completed')}
                                  disabled={updatingId === appt.id}
                                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                                >
                                  Mark Completed
                                </button>
                              )}
                              {appt.status === 'completed' && (
                                <span className="px-3 py-1.5 text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg">Task completed</span>
                              )}
                              {appt.status === 'cancelled' && (
                                <span className="px-3 py-1.5 text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg">Cancelled</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleOpenReportsModal(appt)}
                              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg font-semibold tracking-wide shadow-md shadow-slate-800/20 transition-all hover:-translate-y-0.5"
                            >
                              {appt.report_sent_at ? 'Resend Report' : 'Send Report'}
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </motion.tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 2: BOOK OFFLINE PATIENT */}
          {activeTab === 'book' && (
            <motion.div 
              key="book"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-[0_20px_40px_rgba(0,0,0,0.04)] max-w-2xl mx-auto space-y-8"
            >
              <div className="border-b border-slate-200/50 pb-4">
                <h3 className="text-xl font-['Poppins',_sans-serif] font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-500" />
                  Book Offline Patient
                </h3>
                <p className="text-sm text-slate-500 mt-2">Register a walk-in patient directly into your schedule.</p>
              </div>

              <form onSubmit={handleBookOffline} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Patient Name</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={offlineName}
                      onChange={e => setOfflineName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white/50 backdrop-blur-sm transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="john@example.com"
                      value={offlineEmail}
                      onChange={e => setOfflineEmail(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white/50 backdrop-blur-sm transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Mobile Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="03001234567"
                      value={offlineMobile}
                      onChange={e => setOfflineMobile(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white/50 backdrop-blur-sm transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Age</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="120"
                      placeholder="25"
                      value={offlineAge}
                      onChange={e => setOfflineAge(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white/50 backdrop-blur-sm transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Date (Min: Past 3 Days)</label>
                    <input
                      type="date"
                      required
                      value={offlineDate}
                      onChange={e => setOfflineDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white/50 backdrop-blur-sm transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Time Slot</label>
                    <select
                      value={offlineTime}
                      required
                      onChange={e => setOfflineTime(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white/50 backdrop-blur-sm transition-all"
                    >
                      <option value="">Select Time</option>
                      {timeSlots.map(t => (
                        <option key={t.id} value={t.time_value}>{t.time_label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">Problem / Symptom Notes</label>
                  <textarea
                    placeholder="Notes about diagnostic..."
                    value={offlineProblem}
                    onChange={e => setOfflineProblem(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white/50 backdrop-blur-sm transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingOffline}
                  className="w-full py-3.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl text-sm font-['Poppins',_sans-serif] font-semibold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {bookingOffline && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Confirm Booking
                </button>
              </form>
            </motion.div>
          )}

          {/* TAB 3: EARNINGS & ATTENDANCE */}
          {activeTab === 'finances' && (
            <motion.div 
              key="finances"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Monthly Earnings Card */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-[0_20px_40px_rgba(0,0,0,0.04)] flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-3xl" />
                
                <div className="flex items-center justify-between border-b border-slate-200/50 pb-4 mb-6 z-10">
                  <h3 className="text-lg font-['Poppins',_sans-serif] font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-500" />
                    Monthly Payout
                  </h3>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-6 rounded-2xl text-center shadow-inner mb-8 z-10">
                  <p className="text-xs text-slate-400 uppercase tracking-[0.2em] font-medium mb-2">Total Earning</p>
                  <p className="text-4xl font-['Poppins',_sans-serif] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-500">
                    INR {finances.finalPayout.toLocaleString()}
                  </p>
                </div>

                <div className="text-sm space-y-3 pt-4 border-t border-slate-100 text-slate-600 z-10 flex-1">
                  {doctor.compensation_type === 'fixed' ? (
                    <>
                      <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-4 text-cyan-700">Compensation: FIXED SALARY</p>
                      <div className="flex justify-between items-center"><span className="font-medium">Base Salary:</span><span className="font-mono text-slate-800">INR {finances.calculations.fixedSalary?.toLocaleString()}</span></div>
                      <div className="flex justify-between items-center"><span className="font-medium">Working Days:</span><span className="font-mono text-slate-800">{finances.calculations.workingDays}</span></div>
                      <div className="flex justify-between items-center"><span className="font-medium">Absences:</span><span className="font-mono text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">-{finances.calculations.absencesCount}</span></div>
                    </>
                  ) : (
                    <>
                      <p className="font-bold uppercase tracking-wider text-[10px] mb-4 text-teal-700">Compensation: {finances.calculations.profitPercentage}% PROFIT SHARE</p>
                      <div className="flex justify-between items-center"><span className="font-medium">Gross Revenue:</span><span className="font-mono text-slate-800">INR {finances.calculations.totalRevenue?.toLocaleString()}</span></div>
                      <div className="flex justify-between items-center"><span className="font-medium">Materials Cost:</span><span className="font-mono text-slate-500">-{finances.calculations.totalTreatmentCost?.toLocaleString()}</span></div>
                      <div className="flex justify-between items-center"><span className="font-medium">Helper Payouts:</span><span className="font-mono text-slate-500">-{finances.calculations.branchHelpersPay?.toLocaleString()}</span></div>
                      <div className="flex justify-between items-center"><span className="font-medium">Electricity:</span><span className="font-mono text-slate-500">-{finances.calculations.electricity?.toLocaleString()}</span></div>
                      <div className="flex justify-between items-center"><span className="font-medium">Extra Expenses:</span><span className="font-mono text-slate-500">-{finances.calculations.extras?.toLocaleString()}</span></div>
                      <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100 font-semibold text-slate-700">
                        <span>Net Profit:</span><span className="font-mono text-teal-600">INR {finances.calculations.branchProfit?.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Attendance Card */}
              <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-[0_20px_40px_rgba(0,0,0,0.04)] flex flex-col relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-rose-400/5 rounded-full blur-3xl" />
                
                <div className="flex items-center gap-2 border-b border-slate-200/50 pb-4 mb-6 z-10">
                  <Calendar className="w-5 h-5 text-rose-400" />
                  <h3 className="text-lg font-['Poppins',_sans-serif] font-bold text-slate-800">Absences Log</h3>
                </div>

                <div className="flex-1 overflow-y-auto z-10 pr-2 space-y-3">
                  {finances.absences.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                      <CheckCircle className="w-12 h-12 text-emerald-400" />
                      <p className="text-sm font-medium text-slate-500">Perfect attendance this month!</p>
                    </div>
                  ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
                      {finances.absences.map((abs, idx) => (
                        <motion.div variants={itemVariants} key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                          <span className="font-semibold text-slate-700">{new Date(abs.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          <span className="text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">Absent</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ═══ MODAL OVERLAY FOR PATIENT REPORT EMAIL ═══ */}
      <AnimatePresence>
        {showReportsModal && activeAppt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              
              <div className="px-6 py-5 bg-white/50 border-b border-slate-200/50 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-['Poppins',_sans-serif] font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  Diagnostic Report
                </h3>
                <button 
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitReport} className="p-6 sm:p-8 space-y-6 overflow-y-auto">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500">Patient Email</label>
                    <input
                      type="email"
                      required
                      value={emailVal}
                      onChange={e => setEmailVal(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500">Patient Phone</label>
                    <input
                      type="text"
                      disabled
                      value={activeAppt.patients?.mobile || ''}
                      className="w-full px-4 py-2.5 border border-slate-100 bg-slate-50 text-slate-400 rounded-xl text-sm font-mono cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500">Medical Advice & Prescription</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Enter detailed medical advices, tests required, and medications..."
                    value={prescriptionText}
                    onChange={e => setPrescriptionText(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500">Upload X-Ray (PDF/Image)</label>
                    <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center hover:border-teal-400 hover:bg-teal-50/30 cursor-pointer bg-slate-50/50 transition-colors group">
                      <input type="file" accept="image/*,application/pdf" onChange={handleXrayChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {xrayPreview ? (
                        <div className="text-sm text-teal-700 font-bold truncate max-w-full flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Attached</div>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-teal-500 transition-colors" />
                          <span className="text-xs text-slate-500 mt-2 font-medium">Click or drop file</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500">Prescription Photo (Optional)</label>
                    <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center hover:border-teal-400 hover:bg-teal-50/30 cursor-pointer bg-slate-50/50 transition-colors group">
                      <input type="file" accept="image/*" onChange={handlePrescriptionChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {prescPreview ? (
                        <div className="text-sm text-teal-700 font-bold truncate max-w-full flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Attached</div>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-teal-500 transition-colors" />
                          <span className="text-xs text-slate-500 mt-2 font-medium">Click or drop photo</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ═══ BILLING & CHECKOUT SECTION ═══ */}
                <div className="border border-slate-200 bg-slate-50/30 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-teal-100 text-teal-600 rounded-lg"><ShoppingCart className="w-4 h-4" /></div>
                      <h4 className="text-sm font-bold text-slate-700">Compile Invoice / Bill</h4>
                    </div>
                    {generatedInvoiceId ? (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] rounded-xl border border-emerald-100 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Bill Generated & Attached (Rs. {grandTotal.toFixed(2)})
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] rounded-xl border border-rose-100 font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5" /> Bill Not Generated
                      </span>
                    )}
                  </div>

                  {!generatedInvoiceId && (
                    <div className="space-y-4">
                      {/* Search Medicines */}
                      <div className="space-y-1 relative" ref={dropdownRef}>
                        <label className="block text-[11px] font-semibold text-slate-500">Search & Add Medicines (TiDB Cloud)</label>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Type generic/brand name or barcode..."
                            value={medQuery}
                            onChange={e => handleMedSearch(e.target.value)}
                            onFocus={() => setShowMedDropdown(medResults.length > 0)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-teal-500"
                          />
                          {searchingMeds && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-2.5 text-teal-600" />
                          )}
                        </div>

                        {showMedDropdown && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                            {medResults.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 text-center">No inventory match.</div>
                            ) : (
                             medResults.map(med => {
                                const stock = Number(med.stock)
                                const isOutOfStock = stock <= 0
                                const tabsPerPatch = Number(med.tablets_per_patch || 10)
                                const stripsStock = Math.floor(stock / tabsPerPatch)
                                const remTabsStock = stock % tabsPerPatch
                                return (
                                  <div
                                    key={med.id}
                                    onClick={() => !isOutOfStock && addMedicineItem(med)}
                                    className={`flex justify-between items-center px-3 py-2 border-b border-slate-50 hover:bg-slate-50 transition text-xs cursor-pointer ${
                                      isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    <div>
                                      <p className="font-semibold text-slate-800">{med.name} <span className="text-[10px] text-slate-400 font-normal">({tabsPerPatch} tabs/strip)</span></p>
                                      <p className="text-[9px] text-slate-400 font-light">Generic: {med.generic_name || 'N/A'}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {isOutOfStock ? (
                                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 text-[9px] rounded-md font-bold uppercase">Out of Stock</span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] rounded-md font-medium">
                                          Stock: {stock} tabs ({stripsStock} strips {remTabsStock > 0 ? `+ ${remTabsStock} tabs` : ''})
                                        </span>
                                      )}
                                      <span className="font-mono font-bold text-slate-600">Rs. {Number(med.price).toFixed(2)}/tab</span>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        )}
                      </div>

                      {/* Select Treatment & Custom Button */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-semibold text-slate-500">Fixed Procedures</label>
                          <div className="flex gap-2.5">
                            <select
                              value={selectedTreatmentId}
                              onChange={e => setSelectedTreatmentId(e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:border-teal-500"
                            >
                              <option value="">-- Choose procedure --</option>
                              {treatments.map(t => (
                                <option key={t.id} value={t.id}>{t.name} (Rs. {t.price})</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleAddTreatment}
                              disabled={!selectedTreatmentId}
                              className="px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition disabled:opacity-40"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col justify-end">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={handleAddCustom}
                              className="w-full py-2 border border-dashed border-slate-300 hover:border-teal-650 hover:bg-white/50 rounded-xl text-[10px] font-semibold text-slate-600 hover:text-teal-700 transition flex items-center justify-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              + Custom Procedure
                            </button>
                            <button
                              type="button"
                              onClick={handleAddCustomMedicine}
                              className="w-full py-2 border border-dashed border-slate-300 hover:border-teal-650 hover:bg-teal-50/20 rounded-xl text-[10px] font-semibold text-slate-600 hover:text-teal-700 transition flex items-center justify-center gap-1"
                            >
                              <Barcode className="w-3 h-3 text-teal-650" />
                              + Custom Medicine
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Line Items List */}
                      {billingItems.length > 0 && (
                        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden divide-y divide-slate-100">
                          {billingItems.map(item => (
                            <div key={item.key} className="p-3 flex items-center justify-between gap-3 text-xs">
                              <div className="flex-1 min-w-0">
                                {item.type === 'custom' || (item.type === 'medicine' && !item.id) ? (
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={e => updateItem(item.key, 'name', e.target.value)}
                                    className="px-1.5 py-0.5 border border-slate-200 rounded text-xs font-semibold text-slate-800 w-full"
                                  />
                                ) : (
                                  <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                                )}
                                <span className="text-[9px] text-slate-400 capitalize font-light">{item.type}</span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {item.type === 'custom' || (item.type === 'medicine' && !item.id) ? (
                                  <input
                                    type="number"
                                    value={item.price}
                                    onChange={e => updateItem(item.key, 'price', e.target.value)}
                                    className="w-16 px-1 py-0.5 border border-slate-200 rounded text-center font-mono font-medium"
                                  />
                                ) : (
                                  <span className="font-mono text-slate-500 font-medium">Rs. {item.price.toFixed(2)}/tab</span>
                                )}

                                {item.type === 'medicine' ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={e => updateItem(item.key, 'quantity', e.target.value)}
                                      className="w-10 px-1 py-0.5 border border-slate-200 rounded text-center font-mono font-medium"
                                    />
                                    {item.maxStock !== undefined ? (
                                      <span className="text-[9px] text-slate-400 font-light">/ {item.maxStock} tabs</span>
                                    ) : (
                                      <span className="text-[9px] text-slate-400 font-light">tabs</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[10px] font-mono px-2">Qty: 1</span>
                                )}

                                <span className="font-mono font-bold text-slate-800 w-16 text-right">
                                  Rs. {(item.price * item.quantity).toFixed(2)}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => removeItem(item.key)}
                                  className="text-slate-400 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Totals & Generate Button */}
                      {billingItems.length > 0 && (
                        <div className="bg-slate-100/50 p-4 rounded-xl space-y-3 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-mono font-bold">Rs. {subtotal.toFixed(2)}</span>
                          </div>

                          <div className="flex justify-between items-center border-t border-slate-200/50 pt-2">
                            <span className="flex items-center gap-1">
                              <Percent className="w-3 h-3 text-teal-600" />
                              Discount %:
                            </span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0"
                              value={discountPercent || ''}
                              onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                              className="w-12 px-1 py-0.5 border border-slate-200 rounded text-center font-mono font-bold"
                            />
                          </div>

                          <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-800">
                            <span>Grand Total:</span>
                            <span className="font-mono text-teal-700">Rs. {grandTotal.toFixed(2)}</span>
                          </div>

                          <button
                            type="button"
                            onClick={handleGenerateBill}
                            disabled={generatingBill}
                            className="w-full py-2.5 mt-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {generatingBill ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Generate & Attach Bill
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile Phone Sync box */}
                <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-cyan-100 text-cyan-600 rounded-lg"><Info className="w-4 h-4" /></div>
                      <h4 className="text-sm font-bold text-slate-700">Mobile Camera Sync</h4>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsWaitingForMobile(true)
                        setTempMobilePhoto(null)
                        if (activeAppt?.id) {
                          await supabase.from('appointments').update({ temp_mobile_photo: null }).eq('id', activeAppt.id)
                          await createCaptureTicket(doctor.branch_id, activeAppt.id)
                        }
                      }}
                      className="px-4 py-2 bg-white border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 text-cyan-700 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Start Sync
                    </button>
                  </div>

                  {isWaitingForMobile && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                      <div className="p-4 border border-cyan-100 rounded-xl bg-white flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-12 h-12 bg-cyan-50 rounded-full flex items-center justify-center text-cyan-500 shrink-0 shadow-inner">
                          <Clock className="w-5 h-5 animate-spin-slow" style={{ animationDuration: '3s' }} />
                        </div>
                        <div className="text-center sm:text-left">
                          <p className="text-sm font-bold text-slate-800">Waiting for mobile capture...</p>
                          <p className="text-xs text-slate-500 mt-0.5">Open the capture URL on your phone for <strong>{activeAppt?.patients?.name}</strong></p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {tempMobilePhoto && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="pt-2">
                      <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center gap-4">
                        <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg overflow-hidden shrink-0 shadow-sm p-1">
                          <img src={tempMobilePhoto} alt="Preview" className="object-cover h-full w-full rounded-md" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-emerald-800 text-sm">Synced Successfully</p>
                          <p className="text-emerald-600 font-medium text-xs mt-0.5">Photo ready to be sent.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTempMobilePhoto(null)}
                          className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReport}
                    className="flex-[2] py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {sendingReport && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Send Report to Patient
                  </button>
                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
