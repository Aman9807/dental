'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CircleDollarSign, TrendingUp, CheckCircle, AlertCircle, Calendar, Plus, Trash2, 
  User2, PlusCircle, HelpCircle, Save, Info, RefreshCw, Layers, Zap, Clock, X, Loader2, Edit
} from 'lucide-react'
import { 
  updateAppointmentFinances, 
  upsertMonthlyElectricity, 
  addHelperBoy, 
  deleteHelperBoy, 
  updateHelperAttendance, 
  updateDoctorAttendance, 
  addExtraExpense,
  updateExtraExpense,
  deleteExtraExpense
} from '@/app/admin/actions'
import AnalyticsTab from './AnalyticsTab'

interface Branch {
  id: string
  name: string
  slug: string
}

interface Doctor {
  id: string
  name: string
  slug: string
  compensation_type: 'fixed' | 'percentage'
  fixed_salary: number
  profit_percentage: number
  profit_sharing_target?: string
  branch_id: string
}

interface HelperBoy {
  id: string
  name: string
  shift_1_rate: number
  shift_2_rate: number
  shift_1_enabled: boolean
  shift_2_enabled: boolean
  sunday_enabled: boolean
  branch_id: string
}

interface HelperAttendance {
  helper_boy_id: string
  date: string
  shift: number
  status: 'present' | 'absent' | 'half_day'
}

interface DoctorAttendance {
  doctor_id: string
  date: string
  status: 'present' | 'absent' | 'half_day'
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
  branch_id: string
}

interface InvoiceItem {
  id: string
  item_type: 'medicine' | 'treatment' | 'custom'
  custom_name?: string
  quantity: number
  unit_price: number
  unit_cost: number
  total_price: number
}

interface Invoice {
  id: string
  total: number
  subtotal: number
  discount_percentage: number
  treatment_discount_percentage?: number
  medicine_discount_percentage?: number
  invoice_items: InvoiceItem[]
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  patients: { id: string; name: string } | null
  doctors: { id: string; name: string; branch_id: string } | null
  branches: { id: string; name: string; slug: string } | null
  invoices: Invoice[] | null
}

interface FinancesClientProps {
  branches: Branch[]
  doctors: Doctor[]
  helperBoys: HelperBoy[]
  initialHelperAttendance: HelperAttendance[]
  initialDoctorAttendance: DoctorAttendance[]
  initialElectricityExpenses: ElectricityExpense[]
  initialExtraExpenses: ExtraExpense[]
  initialAppointments: Appointment[]
}

// Utility to count working days in a month for a specific helper (excluding/including Sundays)
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

// Compute profits and revenue breakdown from appointment invoices
function getAppointmentFinances(appt: Appointment) {
  const invoice = appt.invoices?.[0]
  if (!invoice) return null

  const treatmentDiscount = invoice.treatment_discount_percentage ?? invoice.discount_percentage ?? 0
  const medicineDiscount = invoice.medicine_discount_percentage ?? invoice.discount_percentage ?? 0

  const treatmentDiscountMultiplier = 1 - treatmentDiscount / 100
  const medicineDiscountMultiplier = 1 - medicineDiscount / 100

  let treatmentRevenue = 0
  let treatmentCost = 0
  let medicineRevenue = 0
  let medicineCost = 0

  if (invoice.invoice_items) {
    invoice.invoice_items.forEach(item => {
      const price = Number(item.unit_price || 0) * Number(item.quantity || 1)
      const cost = Number(item.unit_cost || 0) * Number(item.quantity || 1)
      const isMedicine = item.item_type === 'medicine' || (item.custom_name && /medicine|tab|capsule|syrup|strip/i.test(item.custom_name))
      if (isMedicine) {
        medicineRevenue += price
        medicineCost += cost
      } else {
        treatmentRevenue += price
        treatmentCost += cost
      }
    })
  }

  const netTreatmentRevenue = treatmentRevenue * treatmentDiscountMultiplier
  const netMedicineRevenue = medicineRevenue * medicineDiscountMultiplier

  const treatmentProfit = netTreatmentRevenue - treatmentCost
  const medicineProfit = netMedicineRevenue - medicineCost

  return {
    netTreatmentRevenue,
    treatmentCost,
    treatmentProfit,
    netMedicineRevenue,
    medicineCost,
    medicineProfit,
    totalProfit: treatmentProfit + medicineProfit,
    totalPaid: invoice.total
  }
}

export default function FinancesClient({
  branches,
  doctors,
  helperBoys,
  initialHelperAttendance,
  initialDoctorAttendance,
  initialElectricityExpenses,
  initialExtraExpenses,
  initialAppointments
}: FinancesClientProps) {
  const router = useRouter()
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'closing' | 'attendance' | 'helpers' | 'doctors' | 'extra'>('analytics')
  
  // Selection filters
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  
  // Local lists
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [helperBoysList, setHelperBoysList] = useState<HelperBoy[]>(helperBoys)
  const [helperAttendance, setHelperAttendance] = useState<HelperAttendance[]>(initialHelperAttendance)
  const [doctorAttendance, setDoctorAttendance] = useState<DoctorAttendance[]>(initialDoctorAttendance)
  const [electricityExpenses, setElectricityExpenses] = useState<ElectricityExpense[]>(initialElectricityExpenses)
  const [extraExpenses, setExtraExpenses] = useState<ExtraExpense[]>(initialExtraExpenses)
  
  // Attendance Date Selector
  const [attendanceDate, setAttendanceDate] = useState<string>(() => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  })

  // Pending daily attendance choices before update is clicked
  const [pendingAttendance, setPendingAttendance] = useState<{ [key: string]: 'present' | 'absent' | 'half_day' }>({})
  const [isSavingAttendance, setIsSavingAttendance] = useState(false)

  // Initialize pending values on date/branch/lists load
  useEffect(() => {
    const initial: { [key: string]: 'present' | 'absent' | 'half_day' } = {}
    
    helperBoysList.forEach(helper => {
      if (helper.shift_1_enabled) {
        const key = `helper-${helper.id}-1`
        const rec = helperAttendance.find(a => a.helper_boy_id === helper.id && a.date === attendanceDate && a.shift === 1)
        if (rec) {
          initial[key] = rec.status as 'present' | 'absent' | 'half_day'
        }
      }
      if (helper.shift_2_enabled) {
        const key = `helper-${helper.id}-2`
        const rec = helperAttendance.find(a => a.helper_boy_id === helper.id && a.date === attendanceDate && a.shift === 2)
        if (rec) {
          initial[key] = rec.status as 'present' | 'absent' | 'half_day'
        }
      }
    })
    
    getBranchFilteredDoctors().forEach(doc => {
      const key = `doc-${doc.id}`
      const rec = doctorAttendance.find(a => a.doctor_id === doc.id && a.date === attendanceDate)
      if (rec) {
        initial[key] = rec.status as 'present' | 'absent' | 'half_day'
      }
    })
    
    setPendingAttendance(initial)
  }, [attendanceDate, helperAttendance, doctorAttendance, selectedBranch])

  // Inputs for saving closing charges
  const [tempCharges, setTempCharges] = useState<{ [apptId: string]: { charged: string; cost: string } }>({})
  const [savingApptId, setSavingApptId] = useState<string | null>(null)
  
  // Electricity Input
  const [electricityBill, setElectricityBill] = useState<string>('')
  const [savingElectricity, setSavingElectricity] = useState(false)
  
  // Add Helper states
  const [showAddHelper, setShowAddHelper] = useState(false)
  const [newHelperName, setNewHelperName] = useState('')
  const [newHelperShift1, setNewHelperShift1] = useState('0')
  const [newHelperShift2, setNewHelperShift2] = useState('0')
  const [newHelperShift1Enabled, setNewHelperShift1Enabled] = useState(true)
  const [newHelperShift2Enabled, setNewHelperShift2Enabled] = useState(true)
  const [newHelperSundayEnabled, setNewHelperSundayEnabled] = useState(false)
  const [newHelperBranch, setNewHelperBranch] = useState(branches[0]?.id || '')
  const [addingHelper, setAddingHelper] = useState(false)
  
  // Add Extra Expense states
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('0')
  const [expenseNote, setExpenseNote] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0])
  const [expenseBranch, setExpenseBranch] = useState(branches[0]?.id || '')
  const [addingExpense, setAddingExpense] = useState(false)

  // Percentage Doctor Profit Share Rule state (synced with Admin Settings)
  const [doctorRule, setDoctorRule] = useState<'present_days_only' | 'full_month'>('present_days_only')

  // Salary Reductions & Fines state
  const [salaryReductions, setSalaryReductions] = useState<Array<{
    id: string
    person_id: string
    person_name: string
    person_type: 'doctor' | 'helper'
    month_year: string
    amount: number
    reason: string
  }>>([])

  // Modal for logging salary reduction / fine
  const [showAddReductionModal, setShowAddReductionModal] = useState(false)
  const [reductionPersonId, setReductionPersonId] = useState('')
  const [reductionPersonType, setReductionPersonType] = useState<'doctor' | 'helper'>('doctor')
  const [reductionAmount, setReductionAmount] = useState('')
  const [reductionReason, setReductionReason] = useState('')

  // Earning breakdown and tooltips states
  const [showMedTooltip, setShowMedTooltip] = useState(false)
  const [showExpTooltip, setShowExpTooltip] = useState(false)
  const [showPreDocTooltip, setShowPreDocTooltip] = useState(false)
  const [showAddBill, setShowAddBill] = useState(false)
  const [billElectricity, setBillElectricity] = useState('')
  const [billWater, setBillWater] = useState('')
  const [billGas, setBillGas] = useState('')
  const [billRent, setBillRent] = useState('')
  const [billInternet, setBillInternet] = useState('')
  const [billOther, setBillOther] = useState('')
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0])
  const [billBranch, setBillBranch] = useState(branches[0]?.id || '')
  const [savingBill, setSavingBill] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)

  useEffect(() => {
    const savedRule = localStorage.getItem('dental_doctor_payout_rule')
    if (savedRule === 'full_month' || savedRule === 'present_days_only') {
      setDoctorRule(savedRule as any)
    }

    const savedReductions = localStorage.getItem('dental_salary_reductions')
    if (savedReductions) {
      try {
        setSalaryReductions(JSON.parse(savedReductions))
      } catch (e) {
        console.error('Failed to parse salary reductions', e)
      }
    }
  }, [])

  const getDocRule = (d: any): 'present_days_only' | 'full_month' => {
    const specRule = (d?.specialty || '').split('||')[1]
    if (specRule === 'full_month' || specRule === 'present_days_only') return specRule
    return doctorRule || 'present_days_only'
  }

  const handleAddSalaryReduction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reductionPersonId || !reductionAmount || !reductionReason) {
      alert('Please fill out all required fields.')
      return
    }

    let personName = ''
    if (reductionPersonType === 'doctor') {
      personName = doctors.find(d => d.id === reductionPersonId)?.name || 'Doctor'
    } else {
      personName = helperBoysList.find(h => h.id === reductionPersonId)?.name || 'Helper'
    }

    const newReduction = {
      id: `red_${Date.now()}`,
      person_id: reductionPersonId,
      person_name: personName,
      person_type: reductionPersonType,
      month_year: selectedMonth,
      amount: parseFloat(reductionAmount),
      reason: reductionReason
    }

    const updated = [newReduction, ...salaryReductions]
    setSalaryReductions(updated)
    localStorage.setItem('dental_salary_reductions', JSON.stringify(updated))
    setShowAddReductionModal(false)
    setReductionAmount('')
    setReductionReason('')
  }

  const handleDeleteSalaryReduction = (id: string) => {
    const updated = salaryReductions.filter(r => r.id !== id)
    setSalaryReductions(updated)
    localStorage.setItem('dental_salary_reductions', JSON.stringify(updated))
  }

  // Populate dynamic inputs on branch/month changes
  useEffect(() => {
    // Fill current electricity bill
    const targetBranch = branches.find(b => b.slug === selectedBranch)
    if (targetBranch) {
      const billRecord = electricityExpenses.find(
        e => e.branch_id === targetBranch.id && e.month_year === selectedMonth
      )
      setElectricityBill(billRecord ? String(billRecord.electricity_bill) : '0')
    } else {
      setElectricityBill('0')
    }
  }, [selectedBranch, selectedMonth, electricityExpenses, branches])

  // Extract year/month from selector
  const [yearStr, monthStr] = selectedMonth.split('-')
  const year = parseInt(yearStr || '2026', 10)
  const month = parseInt(monthStr || '07', 10)

  // Filter helper boys based on selected branch
  const getBranchFilteredHelpers = () => {
    if (selectedBranch === 'all') return helperBoysList
    const targetBranch = branches.find(b => b.slug === selectedBranch)
    return helperBoysList.filter(h => h.branch_id === targetBranch?.id)
  }

  // Filter doctors based on selected branch
  const getBranchFilteredDoctors = () => {
    if (selectedBranch === 'all') return doctors
    const targetBranch = branches.find(b => b.slug === selectedBranch)
    return doctors.filter(d => d.branch_id === targetBranch?.id)
  }

  // Filter extra expenses for the selected branch/month
  const getFilteredExtraExpenses = () => {
    return extraExpenses.filter(e => {
      const expDate = new Date(e.expense_date)
      const expMonthStr = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`
      if (expMonthStr !== selectedMonth) return false
      if (selectedBranch !== 'all') {
        const targetBranch = branches.find(b => b.slug === selectedBranch)
        if (e.branch_id !== targetBranch?.id) return false
      }
      return true
    })
  }

  // Filter appointments for the selected branch/month
  const getFilteredAppointments = () => {
    return appointments.filter(appt => {
      const apptDate = new Date(appt.appointment_date)
      const apptMonthStr = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, '0')}`
      if (apptMonthStr !== selectedMonth) return false
      if (selectedBranch !== 'all' && appt.branches?.slug !== selectedBranch) return false
      
      // Grouping filter: If this appointment has no invoices, check if another appointment for the same patient on the same day has invoices
      const hasInvoice = appt.invoices && appt.invoices.length > 0
      if (!hasInvoice && appt.patients?.id) {
        const hasAlternativeBilled = appointments.some(other => 
          other.id !== appt.id &&
          other.patients?.id === appt.patients?.id &&
          other.appointment_date === appt.appointment_date &&
          other.invoices && other.invoices.length > 0
        )
        if (hasAlternativeBilled) {
          return false // Skip duplicate invoice-less rows since patient has a finalized invoice today
        }
      }
      return true
    })
  }

  // Calculate Helper salary for the month dynamically
  const calculateHelperSalary = (helper: HelperBoy) => {
    const totalWorkingDays = getWorkingDaysInMonth(year, month, helper.sunday_enabled)
    
    // Count absences for this month
    const absences = helperAttendance.filter(a => {
      if (a.helper_boy_id !== helper.id || (a.status !== 'absent' && a.status !== 'half_day')) return false
      const absDate = new Date(a.date)
      const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
      return absMonthStr === selectedMonth
    })
    
    const shift1Absences = absences.filter(a => a.shift === 1).reduce((sum, a) => sum + (a.status === 'half_day' ? 0.5 : 1), 0)
    const shift2Absences = absences.filter(a => a.shift === 2).reduce((sum, a) => sum + (a.status === 'half_day' ? 0.5 : 1), 0)

    const shift1Worked = helper.shift_1_enabled ? Math.max(0, totalWorkingDays - shift1Absences) : 0
    const shift2Worked = helper.shift_2_enabled ? Math.max(0, totalWorkingDays - shift2Absences) : 0

    return (shift1Worked * helper.shift_1_rate) + (shift2Worked * helper.shift_2_rate)
  }

  // Calculated Financial Metrics for selected month & branch
  const calculateTotals = () => {
    const filteredAppts = getFilteredAppointments()
    
    let totalCharged = 0
    let totalTreatmentCost = 0
    let totalTreatmentProfit = 0
    let totalMedicineProfit = 0
    let totalMedicineCost = 0
    let totalMedicineRevenue = 0

    filteredAppts.forEach(appt => {
      const finances = getAppointmentFinances(appt)
      if (finances) {
        totalCharged += finances.totalPaid
        totalTreatmentCost += finances.treatmentCost
        totalMedicineCost += finances.medicineCost
        totalTreatmentProfit += finances.treatmentProfit
        totalMedicineProfit += finances.medicineProfit
        totalMedicineRevenue += finances.netMedicineRevenue
      }
    })

    const treatmentProfit = totalTreatmentProfit + totalMedicineProfit

    // 2. Fixed Expenses (Helper Salaries + Electricity)
    // Helper salaries
    const helpers = getBranchFilteredHelpers()
    const helperSalariesTotal = helpers.reduce((sum, h) => {
      const basePay = calculateHelperSalary(h)
      const reductionsAmount = salaryReductions
        .filter(r => r.person_id === h.id && r.month_year === selectedMonth && r.person_type === 'helper')
        .reduce((acc, curr) => acc + curr.amount, 0)
      return sum + Math.max(0, basePay - reductionsAmount)
    }, 0)

    // 3. Extra Expenses & Utility Bills (parsing out utilities)
    const extras = getFilteredExtraExpenses()
    
    let electricityTotal = 0
    let waterTotal = 0
    let gasTotal = 0
    let rentTotal = 0
    let internetTotal = 0
    let otherTotal = 0
    let nonBillExtraExpensesTotal = 0

    extras.forEach(e => {
      const parsed = parseUtilityBills(e.note)
      if (parsed) {
        electricityTotal += parsed.electricity ? parseFloat(parsed.electricity) : 0
        waterTotal += parsed.water ? parseFloat(parsed.water) : 0
        gasTotal += parsed.gas ? parseFloat(parsed.gas) : 0
        rentTotal += parsed.rent ? parseFloat(parsed.rent) : 0
        internetTotal += parsed.internet ? parseFloat(parsed.internet) : 0
        otherTotal += parsed.other ? parseFloat(parsed.other) : 0
      } else {
        nonBillExtraExpensesTotal += e.amount || 0
      }
    })

    const extraExpensesTotal = nonBillExtraExpensesTotal + waterTotal + gasTotal + rentTotal + internetTotal + otherTotal

    // Doctor Payroll Expenses (if configured as fixed salary)
    const activeDocs = getBranchFilteredDoctors()
    
    // Calculated branch profit before doctor percentage share
    const branchNetProfitBeforeDoctors = treatmentProfit - helperSalariesTotal - electricityTotal - extraExpensesTotal

    let doctorFixedSalariesTotal = 0
    let doctorPercentagePayoutsTotal = 0

    activeDocs.forEach(d => {
      if (d.compensation_type === 'fixed') {
        const docWorkingDays = getWorkingDaysInMonth(year, month, false) // Doctors don't work sundays
        const absencesCount = doctorAttendance.filter(a => {
          if (a.doctor_id !== d.id || (a.status !== 'absent' && a.status !== 'half_day')) return false
          const absDate = new Date(a.date)
          const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
          return absMonthStr === selectedMonth
        }).reduce((acc, curr) => acc + (curr.status === 'half_day' ? 0.5 : 1.0), 0)
        
        const docWorked = Math.max(0, docWorkingDays - absencesCount)
        const dailyRate = d.fixed_salary / docWorkingDays
        const basePay = docWorked * dailyRate
        const reductionsAmount = salaryReductions
          .filter(r => r.person_id === d.id && r.month_year === selectedMonth && r.person_type === 'doctor')
          .reduce((acc, curr) => acc + curr.amount, 0)
        doctorFixedSalariesTotal += Math.max(0, basePay - reductionsAmount)
      } else {
        // Percentage based on branch net profit
        let bProfit = branchNetProfitBeforeDoctors
        
        if (selectedBranch !== 'all') {
          const target = d.profit_sharing_target || 'both'
          if (target === 'treatment') {
            bProfit = totalTreatmentProfit - helperSalariesTotal - electricityTotal - extraExpensesTotal
          } else if (target === 'medicine') {
            bProfit = totalMedicineProfit - helperSalariesTotal - electricityTotal - extraExpensesTotal
          }
        } else {
          // If viewing all, base it on the doctor's specific branch
          const docBranchBill = electricityExpenses.find(e => e.branch_id === d.branch_id && e.month_year === selectedMonth)?.electricity_bill || 0
          const docBranchHelpers = helperBoysList.filter(h => h.branch_id === d.branch_id)
          const docBranchHelpersPay = docBranchHelpers.reduce((sum, h) => sum + calculateHelperSalary(h), 0)
          const docBranchExtras = extraExpenses.filter(e => {
            const expDate = new Date(e.expense_date)
            const expMonthStr = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`
            return expMonthStr === selectedMonth && e.branch_id === d.branch_id
          }).reduce((sum, e) => sum + e.amount, 0)
          
          const docBranchAppts = appointments.filter(appt => {
            const apptDate = new Date(appt.appointment_date)
            const apptMonthStr = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, '0')}`
            return apptMonthStr === selectedMonth && appt.branches?.id === d.branch_id
          })
          
          let docBranchTProfit = 0
          let docBranchMProfit = 0
          docBranchAppts.forEach(appt => {
            const finances = getAppointmentFinances(appt)
            if (finances) {
              docBranchTProfit += finances.treatmentProfit
              docBranchMProfit += finances.medicineProfit
            }
          })
          
          const target = d.profit_sharing_target || 'both'
          if (target === 'treatment') {
            bProfit = docBranchTProfit - docBranchHelpersPay - docBranchBill - docBranchExtras
          } else if (target === 'medicine') {
            bProfit = docBranchMProfit - docBranchHelpersPay - docBranchBill - docBranchExtras
          } else {
            bProfit = (docBranchTProfit + docBranchMProfit) - docBranchHelpersPay - docBranchBill - docBranchExtras
          }
        }
        
        if (bProfit > 0) {
          const docWorkingDays = getWorkingDaysInMonth(year, month, false)
          const absencesCount = doctorAttendance.filter(a => {
            if (a.doctor_id !== d.id || (a.status !== 'absent' && a.status !== 'half_day')) return false
            const absDate = new Date(a.date)
            const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
            return absMonthStr === selectedMonth
          }).reduce((acc, curr) => acc + (curr.status === 'half_day' ? 0.5 : 1.0), 0)
          const docWorked = Math.max(0, docWorkingDays - absencesCount)
          const fullPayout = bProfit * (d.profit_percentage / 100)
          
          const docRule = getDocRule(d)
          const docPayout = docRule === 'present_days_only' && docWorkingDays > 0
            ? fullPayout * (docWorked / docWorkingDays)
            : fullPayout

          const reductionsAmount = salaryReductions
            .filter(r => r.person_id === d.id && r.month_year === selectedMonth && r.person_type === 'doctor')
            .reduce((acc, curr) => acc + curr.amount, 0)
          
          doctorPercentagePayoutsTotal += Math.max(0, docPayout - reductionsAmount)
        }
      }
    })

    const totalDoctorPay = doctorFixedSalariesTotal + doctorPercentagePayoutsTotal
    const totalExpenses = helperSalariesTotal + electricityTotal + extraExpensesTotal + totalDoctorPay
    const netProfit = treatmentProfit - totalExpenses

    return {
      totalCharged: Math.round(totalCharged),
      totalTreatmentCost: Math.round(totalTreatmentCost + totalMedicineCost),
      treatmentProfit: Math.round(treatmentProfit),
      totalTreatmentProfit: Math.round(totalTreatmentProfit),
      totalMedicineProfit: Math.round(totalMedicineProfit),
      totalMedicineCost: Math.round(totalMedicineCost),
      totalMedicineRevenue: Math.round(totalMedicineRevenue),
      helperSalariesTotal: Math.round(helperSalariesTotal),
      electricityTotal: Math.round(electricityTotal),
      waterTotal: Math.round(waterTotal),
      gasTotal: Math.round(gasTotal),
      rentTotal: Math.round(rentTotal),
      internetTotal: Math.round(internetTotal),
      otherTotal: Math.round(otherTotal),
      nonBillExtraExpensesTotal: Math.round(nonBillExtraExpensesTotal),
      extraExpensesTotal: Math.round(extraExpensesTotal),
      totalDoctorPay: Math.round(totalDoctorPay),
      totalExpenses: Math.round(totalExpenses),
      netProfit: Math.round(netProfit),
      branchNetProfitBeforeDoctors: Math.round(branchNetProfitBeforeDoctors)
    }
  }

  const totals = calculateTotals()

  // Save closing patient financial records
  const handleSaveFinances = async (apptId: string) => {
    const inputVal = tempCharges[apptId]
    if (!inputVal) return

    setSavingApptId(apptId)
    const charged = parseFloat(inputVal.charged || '0')
    const cost = parseFloat(inputVal.cost || '0')

    try {
      const res = await updateAppointmentFinances(apptId, charged, cost)
      if (res.success) {
        setAppointments(prev =>
          prev.map(a => a.id === apptId ? { ...a, amount_charged: charged, treatment_cost: cost } : a)
        )
      } else {
        alert(res.error || 'Failed to save finances')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred during submission.')
    } finally {
      setSavingApptId(null)
    }
  }

  // Update Electricity Bill
  const handleSaveElectricity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedBranch === 'all') {
      alert('Please select a specific branch to update the electricity bill.')
      return
    }

    setSavingElectricity(true)
    const targetBranch = branches.find(b => b.slug === selectedBranch)
    const bill = parseFloat(electricityBill || '0')

    try {
      const res = await upsertMonthlyElectricity(targetBranch!.id, selectedMonth, bill)
      if (res.success) {
        alert('Electricity bill updated successfully!')
        
        // Update local state
        setElectricityExpenses(prev => {
          const exists = prev.some(e => e.branch_id === targetBranch!.id && e.month_year === selectedMonth)
          if (exists) {
            return prev.map(e => (e.branch_id === targetBranch!.id && e.month_year === selectedMonth) 
              ? { ...e, electricity_bill: bill } : e
            )
          } else {
            return [...prev, { id: Math.random().toString(), branch_id: targetBranch!.id, month_year: selectedMonth, electricity_bill: bill }]
          }
        })
      } else {
        alert(res.error || 'Failed to update electricity bill')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred.')
    } finally {
      setSavingElectricity(false)
    }
  }

  // Add Helper Boy
  const handleAddHelper = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHelperName || !newHelperBranch) {
      alert('Please enter a name and branch.')
      return
    }

    setAddingHelper(true)
    const rate1 = parseFloat(newHelperShift1 || '0')
    const rate2 = parseFloat(newHelperShift2 || '0')

    try {
      const res = await addHelperBoy(
        newHelperName,
        rate1,
        rate2,
        newHelperShift1Enabled,
        newHelperShift2Enabled,
        newHelperSundayEnabled,
        newHelperBranch
      )
      if (res.success && res.data) {
        alert('Helper boy registered successfully!')
        setHelperBoysList(prev => [...prev, ...res.data])
        setShowAddHelper(false)
        setNewHelperName('')
        setNewHelperShift1('0')
        setNewHelperShift2('0')
        setNewHelperShift1Enabled(true)
        setNewHelperShift2Enabled(true)
        setNewHelperSundayEnabled(false)
      } else {
        alert(res.error || 'Failed to add helper boy')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred.')
    } finally {
      setAddingHelper(false)
    }
  }

  // Delete Helper Boy
  const handleDeleteHelper = async (id: string) => {
    if (!confirm('Are you sure you want to remove this helper boy? This will delete all attendance logs for them.')) return

    try {
      const res = await deleteHelperBoy(id)
      if (res.success) {
        setHelperBoysList(prev => prev.filter(h => h.id !== id))
        alert('Helper boy deleted.')
      } else {
        alert(res.error || 'Failed to delete helper boy')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Helper to parse utility bills from note string
  function parseUtilityBills(note: string) {
    const match = note.match(/^Utility Bills - Electricity:\s*([\d.]+),\s*Water:\s*([\d.]+),\s*Gas:\s*([\d.]+),\s*Rent:\s*([\d.]+),\s*Internet:\s*([\d.]+),\s*Other:\s*([\d.]+)$/)
    if (match) {
      return {
        electricity: match[1] === '0' ? '' : match[1],
        water: match[2] === '0' ? '' : match[2],
        gas: match[3] === '0' ? '' : match[3],
        rent: match[4] === '0' ? '' : match[4],
        internet: match[5] === '0' ? '' : match[5],
        other: match[6] === '0' ? '' : match[6]
      }
    }
    return null
  }

  // Add Extra Expense (handles both add & edit)
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseNote.trim()) {
      alert('A note/description describing the expense is compulsory!')
      return
    }

    setAddingExpense(true)
    const amount = parseFloat(expenseAmount || '0')
    const activeBranchObj = branches.find(b => b.id === expenseBranch || b.slug === expenseBranch || b.slug === selectedBranch || b.id === selectedBranch)
    const targetBranch = activeBranchObj?.id || (expenseBranch && expenseBranch.trim() !== '' ? expenseBranch : branches[0]?.id || '')

    try {
      if (editingExpenseId) {
        // Edit flow
        const res = await updateExtraExpense(editingExpenseId, amount, expenseNote, expenseDate, targetBranch)
        if (res.success && res.data) {
          alert('Extra expense updated successfully!')
          setExtraExpenses(prev => prev.map(exp => exp.id === editingExpenseId ? res.data[0] : exp))
          setShowAddExpense(false)
          setEditingExpenseId(null)
          setExpenseAmount('0')
          setExpenseNote('')
        } else {
          alert(res.error || 'Failed to update expense')
        }
      } else {
        // Add flow
        const res = await addExtraExpense(amount, expenseNote, expenseDate, targetBranch)
        if (res.success && res.data) {
          alert('Extra expense logged successfully!')
          setExtraExpenses(prev => [res.data[0], ...prev])
          setShowAddExpense(false)
          setExpenseAmount('0')
          setExpenseNote('')
        } else {
          alert(res.error || 'Failed to add expense')
        }
      }
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'An error occurred while saving the expense.')
    } finally {
      setAddingExpense(false)
    }
  }

  // Save Utility Bill (handles both add & edit)
  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingBill(true)

    const elec = parseFloat(billElectricity || '0')
    const water = parseFloat(billWater || '0')
    const gas = parseFloat(billGas || '0')
    const rent = parseFloat(billRent || '0')
    const internet = parseFloat(billInternet || '0')
    const other = parseFloat(billOther || '0')

    const totalBillAmount = elec + water + gas + rent + internet + other
    const note = `Utility Bills - Electricity: ${elec}, Water: ${water}, Gas: ${gas}, Rent: ${rent}, Internet: ${internet}, Other: ${other}`
    const activeBranchObj = branches.find(b => b.id === billBranch || b.slug === billBranch || b.slug === selectedBranch || b.id === selectedBranch)
    const targetBranch = activeBranchObj?.id || (billBranch && billBranch.trim() !== '' ? billBranch : branches[0]?.id || '')

    try {
      if (editingExpenseId) {
        // Edit flow
        const res = await updateExtraExpense(editingExpenseId, totalBillAmount, note, billDate, targetBranch)
        if (res.success && res.data) {
          alert('Bill details updated successfully!')
          setExtraExpenses(prev => prev.map(exp => exp.id === editingExpenseId ? res.data[0] : exp))
          setShowAddBill(false)
          setEditingExpenseId(null)
        } else {
          alert(res.error || 'Failed to update bill')
        }
      } else {
        // Add flow
        const res = await addExtraExpense(totalBillAmount, note, billDate, targetBranch)
        if (res.success && res.data) {
          alert('Bill details saved successfully!')
          setExtraExpenses(prev => [res.data[0], ...prev])
          setShowAddBill(false)
        } else {
          alert(res.error || 'Failed to save bill')
        }
      }
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'An error occurred while saving the bill.')
    } finally {
      setSavingBill(false)
    }
  }

  // Set Helper daily attendance selection locally (no API call yet)
  const handleToggleHelperAttendance = (helperId: string, shift: number, status: 'present' | 'absent' | 'half_day') => {
    const key = `helper-${helperId}-${shift}`
    setPendingAttendance(prev => ({
      ...prev,
      [key]: status
    }))
  }

  // Set Doctor daily attendance selection locally (no API call yet)
  const handleToggleDoctorAttendance = (doctorId: string, status: 'present' | 'absent' | 'half_day') => {
    const key = `doc-${doctorId}`
    setPendingAttendance(prev => ({
      ...prev,
      [key]: status
    }))
  }

  // Batch update all changed attendance records for the selected date
  const handleSaveAllAttendance = async () => {
    setIsSavingAttendance(true)
    try {
      // 1. Check if any active staff members are unmarked on the SELECTED attendanceDate itself
      const unmarkedStaff: string[] = []
      getBranchFilteredDoctors().forEach(doc => {
        if (!pendingAttendance[`doc-${doc.id}`]) {
          unmarkedStaff.push(`Dr. ${doc.name}`)
        }
      })
      getBranchFilteredHelpers().forEach(helper => {
        if (helper.shift_1_enabled && !pendingAttendance[`helper-${helper.id}-1`]) {
          unmarkedStaff.push(`${helper.name} (Shift 1)`)
        }
        if (helper.shift_2_enabled && !pendingAttendance[`helper-${helper.id}-2`]) {
          unmarkedStaff.push(`${helper.name} (Shift 2)`)
        }
      })
      
      if (unmarkedStaff.length > 0) {
        const proceed = window.confirm(
          `The following staff members have unmarked attendance for ${attendanceDate}:\n${unmarkedStaff.map(s => `- ${s}`).join('\n')}\n\nDo you want to save anyway? (Unmarked staff will not have attendance records generated)`
        )
        if (!proceed) {
          setIsSavingAttendance(false)
          return
        }
      }

      // 2. Check for unmarked attendance in past days of the current selected month
      const todayStr = new Date().toISOString().split('T')[0]
      const unmarkedPastDates: string[] = []
      const targetDateLimit = attendanceDate < todayStr ? attendanceDate : todayStr
      
      // Check last 5 past days of this month before the limit date
      for (let d = 1; d <= 5; d++) {
        const checkDate = new Date(new Date(targetDateLimit).getTime() - d * 24 * 60 * 60 * 1000)
        const checkDateStr = checkDate.toISOString().split('T')[0]
        
        // Ensure the check date falls within the selected month (e.g. '2026-07')
        const checkDateMonthStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`
        if (checkDateMonthStr !== selectedMonth) continue
        
        let hasUnmarked = false
        
        // Check active doctors for this past day
        const activeDocs = getBranchFilteredDoctors()
        for (const doc of activeDocs) {
          const rec = doctorAttendance.find(a => a.doctor_id === doc.id && a.date === checkDateStr)
          if (!rec) {
            hasUnmarked = true
            break
          }
        }
        
        if (!hasUnmarked) {
          // Check active helpers for this past day
          const activeHelpers = getBranchFilteredHelpers()
          for (const helper of activeHelpers) {
            if (helper.shift_1_enabled) {
              const rec = helperAttendance.find(a => a.helper_boy_id === helper.id && a.date === checkDateStr && a.shift === 1)
              if (!rec) {
                hasUnmarked = true
                break
              }
            }
            if (helper.shift_2_enabled) {
              const rec = helperAttendance.find(a => a.helper_boy_id === helper.id && a.date === checkDateStr && a.shift === 2)
              if (!rec) {
                hasUnmarked = true
                break
              }
            }
          }
        }
        
        if (hasUnmarked) {
          unmarkedPastDates.push(checkDateStr)
        }
      }
      
      if (unmarkedPastDates.length > 0) {
        // Sort descending so the most recent unmarked past day is first
        unmarkedPastDates.sort((a, b) => b.localeCompare(a))
        const mostRecent = unmarkedPastDates[0]
        const proceed = window.confirm(
          `Attention: You have unmarked attendance for past days in this month: ${unmarkedPastDates.join(', ')}.\n\nWould you like to switch to ${mostRecent} first to log it?`
        )
        if (proceed) {
          setAttendanceDate(mostRecent)
          setIsSavingAttendance(false)
          return
        }
      }

      const promises: Promise<any>[] = []
      
      const helpersToUpdate: { id: string; shift: number; status: 'present' | 'absent' | 'half_day' }[] = []
      getBranchFilteredHelpers().forEach(helper => {
        if (helper.shift_1_enabled) {
          const key = `helper-${helper.id}-1`
          const status = pendingAttendance[key]
          if (status) {
            helpersToUpdate.push({ id: helper.id, shift: 1, status })
          }
        }
        if (helper.shift_2_enabled) {
          const key = `helper-${helper.id}-2`
          const status = pendingAttendance[key]
          if (status) {
            helpersToUpdate.push({ id: helper.id, shift: 2, status })
          }
        }
      })
      
      const doctorsToUpdate: { id: string; status: 'present' | 'absent' | 'half_day' }[] = []
      getBranchFilteredDoctors().forEach(doc => {
        const key = `doc-${doc.id}`
        const status = pendingAttendance[key]
        if (status) {
          doctorsToUpdate.push({ id: doc.id, status })
        }
      })

      // Run all upserts in parallel
      helpersToUpdate.forEach(item => {
        promises.push(updateHelperAttendance(item.id, attendanceDate, item.shift, item.status))
      })
      
      doctorsToUpdate.forEach(item => {
        promises.push(updateDoctorAttendance(item.id, attendanceDate, item.status))
      })

      const results = await Promise.all(promises)
      const failed = results.filter(r => !r.success)

      if (failed.length > 0) {
        alert('Failed to update some records: ' + failed.map(f => f.error).join(', '))
      } else {
        alert('Attendance records successfully updated for ' + attendanceDate)
        
        // Sync visual lists
        setHelperAttendance(prev => {
          let next = [...prev]
          helpersToUpdate.forEach(item => {
            next = next.filter(a => !(a.helper_boy_id === item.id && a.date === attendanceDate && a.shift === item.shift))
            next.push({ helper_boy_id: item.id, date: attendanceDate, shift: item.shift, status: item.status })
          })
          return next
        })

        setDoctorAttendance(prev => {
          let next = [...prev]
          doctorsToUpdate.forEach(item => {
            next = next.filter(a => !(a.doctor_id === item.id && a.date === attendanceDate))
            next.push({ doctor_id: item.id, date: attendanceDate, status: item.status })
          })
          return next
        })
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred during save.')
    } finally {
      setIsSavingAttendance(false)
    }
  }

  // Export sales ledger to Excel-compatible CSV format
  const exportSalesLedger = () => {
    const filtered = getFilteredAppointments()
    const headers = [
      'Patient Name',
      'Doctor Name',
      'Branch',
      'Appointment Date',
      'Total Paid (INR)',
      'Treatment Profit (INR)',
      'Medicine Profit (INR)',
      'Total Net Profit (INR)'
    ]

    const rows = filtered.map(appt => {
      const finances = getAppointmentFinances(appt)
      return [
        appt.patients?.name || 'Walk-in',
        `Dr. ${appt.doctors?.name || 'Unassigned'}`,
        appt.branches?.name || '',
        appt.appointment_date,
        finances ? finances.totalPaid.toFixed(2) : '0.00',
        finances ? finances.treatmentProfit.toFixed(2) : '0.00',
        finances ? finances.medicineProfit.toFixed(2) : '0.00',
        finances ? (finances.treatmentProfit + finances.medicineProfit).toFixed(2) : '0.00'
      ]
    })

    exportToCSV(`sales_ledger_${selectedMonth}_${selectedBranch}.csv`, headers, rows)
  }

  // Export patient directory to Excel-compatible CSV format
  const exportPatientDirectory = () => {
    const filtered = getFilteredAppointments()
    const patientMap = new Map<string, any>()
    filtered.forEach(appt => {
      if (appt.patients && appt.patients.id) {
        patientMap.set(appt.patients.id, appt.patients)
      }
    })

    const headers = ['Patient Name', 'Email', 'Mobile', 'Age']
    const rows = Array.from(patientMap.values()).map(p => [
      p.name || '',
      p.email || '',
      p.mobile || '',
      String(p.age || '')
    ])

    exportToCSV(`patient_directory_${selectedMonth}_${selectedBranch}.csv`, headers, rows)
  }

  // Common CSV exporter utility supporting BOM for Excel compatibility
  const exportToCSV = (filename: string, headers: string[], rows: string[][]) => {
    const content = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const stringVal = String(val ?? '')
        const escaped = stringVal.replace(/"/g, '""')
        if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
          return `"${escaped}"`
        }
        return escaped
      }).join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      className="perspective-stage space-y-7"
    >
      
      {/* ════ SECTION 1: GLOBAL CONTROL BAR (CLAYMORPHISM) ════ */}
      <div className="clay p-5 border border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Branch Filters */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/50 rounded-2xl self-start backdrop-blur-sm border border-slate-200/40">
          <button
            onClick={() => setSelectedBranch('all')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-300 ${
              selectedBranch === 'all' 
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-600/20' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            All Branches
          </button>
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBranch(b.slug)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-300 ${
                selectedBranch === b.slug 
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-600/20' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {b.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Month Selector & Extra Expense Button & Export Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="relative">
            <Calendar className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-cyan-500 bg-white shadow-sm font-semibold text-slate-800"
            />
          </div>

          <button
            onClick={exportSalesLedger}
            title="Download CSV for Excel"
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-2xl text-xs font-semibold shadow-sm transition-all duration-300 ease-out hover:scale-[1.02]"
          >
            <CircleDollarSign className="w-4 h-4 text-emerald-600" />
            Export Sales (CSV)
          </button>

          <button
            onClick={exportPatientDirectory}
            title="Download CSV for Excel"
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-2xl text-xs font-semibold shadow-sm transition-all duration-300 ease-out hover:scale-[1.02]"
          >
            <User2 className="w-4 h-4 text-cyan-600" />
            Export Patients (CSV)
          </button>

          <button
            onClick={() => setShowAddExpense(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-600/15 transition-all duration-300 ease-out hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4" /> Add Extra Expense
          </button>
        </div>

      </div>

      {/* ════ SECTION 2: STATS OVERVIEW (CLAY CARDS) ════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        
        <div className="clay p-5 border border-slate-200/60 space-y-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Gross Charged</p>
          <p className="text-xl font-bold font-mono text-slate-900">INR {totals.totalCharged.toLocaleString()}</p>
        </div>

        <div className="clay p-5 border border-slate-200/60 space-y-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Material & Medicine Costs</p>
          <p className="text-xl font-bold font-mono text-slate-500">INR {totals.totalTreatmentCost.toLocaleString()}</p>
        </div>

        <div className="clay clay-emerald p-5 border border-teal-100/50 space-y-1">
          <p className="text-[10px] text-teal-700 uppercase tracking-wider font-bold">Treatment Profits</p>
          <p className="text-xl font-bold font-mono text-teal-600">INR {totals.totalTreatmentProfit.toLocaleString()}</p>
        </div>

        <div 
          className="clay clay-emerald p-5 border border-teal-100/50 space-y-1 relative group cursor-help"
          onMouseEnter={() => setShowMedTooltip(true)}
          onMouseLeave={() => setShowMedTooltip(false)}
        >
          <p className="text-[10px] text-teal-700 uppercase tracking-wider font-bold">Medicine Profits</p>
          <p className="text-xl font-bold font-mono text-teal-600">INR {totals.totalMedicineProfit.toLocaleString()}</p>
          
          <AnimatePresence>
            {showMedTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3.5 w-60 p-4 bg-slate-900/95 backdrop-blur-md text-white text-xs rounded-2xl shadow-2xl z-50 border border-teal-500/20 space-y-2 text-left"
              >
                <div className="border-b border-white/10 pb-1.5 flex items-center justify-between">
                  <span className="font-bold text-teal-400">Medicine Profit Breakdown</span>
                  <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded-full font-semibold">Net Info</span>
                </div>
                <div className="space-y-1.5 font-medium">
                  <div className="flex justify-between text-slate-300">
                    <span>Total Selling Price:</span>
                    <span className="font-mono text-white">INR {totals.totalMedicineRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-350">
                    <span>Total Cost Price:</span>
                    <span className="font-mono text-white">INR {totals.totalMedicineCost.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-white/5 pt-1.5 flex justify-between font-bold text-teal-400">
                    <span>Net Profit:</span>
                    <span className="font-mono">INR {totals.totalMedicineProfit.toLocaleString()}</span>
                  </div>
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-teal-500/20" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div 
          className="clay clay-rose p-5 border border-rose-100/50 space-y-1 relative group cursor-help"
          onMouseEnter={() => setShowExpTooltip(true)}
          onMouseLeave={() => setShowExpTooltip(false)}
        >
          <p className="text-[10px] text-rose-700 uppercase tracking-wider font-bold">Total Expenses</p>
          <p className="text-xl font-bold font-mono text-rose-600">INR {totals.totalExpenses.toLocaleString()}</p>
          
          <AnimatePresence>
            {showExpTooltip && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute left-1/2 -translate-x-1/2 top-full mt-3.5 w-72 sm:w-80 max-h-[360px] overflow-y-auto p-4 bg-slate-900/95 backdrop-blur-md text-white text-xs rounded-2xl shadow-2xl z-50 border border-rose-500/20 space-y-2 text-left"
              >
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-l border-t border-rose-500/20" />
                <div className="border-b border-white/10 pb-1.5 flex items-center justify-between font-bold text-rose-400">
                  <span>Expenses Breakdown</span>
                  <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-full font-semibold">Net Info</span>
                </div>
                <div className="space-y-1.5 font-medium">
                  <div className="flex justify-between text-slate-300">
                    <span>Helper Salaries:</span>
                    <span className="font-mono text-white">INR {totals.helperSalariesTotal.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-white/10 pt-1.5 space-y-1">
                    <p className="text-[9px] uppercase tracking-wider text-rose-300 font-bold">Utility Bills Breakdown</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300 text-[11px]">
                      <div className="flex justify-between">
                        <span>Electricity:</span>
                        <span className="font-mono text-white">INR {totals.electricityTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Water:</span>
                        <span className="font-mono text-white">INR {totals.waterTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gas:</span>
                        <span className="font-mono text-white">INR {totals.gasTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rent:</span>
                        <span className="font-mono text-white">INR {totals.rentTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Internet:</span>
                        <span className="font-mono text-white">INR {totals.internetTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other:</span>
                        <span className="font-mono text-white">INR {totals.otherTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-slate-300 border-t border-white/10 pt-1.5">
                    <span>Non-Bill Extra Exp:</span>
                    <span className="font-mono text-white">INR {totals.nonBillExtraExpensesTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Dentists Payouts:</span>
                    <span className="font-mono text-white">INR {totals.totalDoctorPay.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold text-rose-400">
                    <span>Total Expenses:</span>
                    <span className="font-mono">INR {totals.totalExpenses.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div 
          className="clay clay-indigo p-5 border border-indigo-100/50 space-y-1 relative group cursor-help"
          onMouseEnter={() => setShowPreDocTooltip(true)}
          onMouseLeave={() => setShowPreDocTooltip(false)}
        >
          <p className="text-[10px] text-indigo-700 uppercase tracking-wider font-bold">Pre-Doctor Net Profit</p>
          <p className="text-xl font-bold font-mono text-indigo-600">INR {totals.branchNetProfitBeforeDoctors.toLocaleString()}</p>
          
          <AnimatePresence>
            {showPreDocTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3.5 w-64 p-4 bg-slate-900/95 backdrop-blur-md text-white text-xs rounded-2xl shadow-2xl z-50 border border-indigo-500/20 space-y-2 text-left"
              >
                <div className="border-b border-white/10 pb-1.5 flex items-center justify-between font-bold text-indigo-400">
                  <span>Pre-Doctor Net Profit</span>
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-semibold">Clinic Profit</span>
                </div>
                <div className="space-y-1.5 font-medium">
                  <div className="flex justify-between text-slate-300">
                    <span>Treatment & Med Profit:</span>
                    <span className="font-mono text-white">INR {totals.treatmentProfit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-350">
                    <span>- Helper Salaries:</span>
                    <span className="font-mono text-rose-300">INR {totals.helperSalariesTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-350">
                    <span>- Utility & Extra Exp:</span>
                    <span className="font-mono text-rose-300">INR {(totals.electricityTotal + totals.extraExpensesTotal).toLocaleString()}</span>
                  </div>
                  <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold text-indigo-400">
                    <span>Net Profit (Excl. Doctors):</span>
                    <span className="font-mono">INR {totals.branchNetProfitBeforeDoctors.toLocaleString()}</span>
                  </div>
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-indigo-500/20" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="clay clay-cyan p-5 border border-cyan-100/50 text-slate-800 space-y-1">
          <p className="text-[10px] text-cyan-700 uppercase tracking-wider font-bold">Net Profits</p>
          <p className="text-xl font-bold font-mono text-cyan-600">INR {totals.netProfit.toLocaleString()}</p>
        </div>

      </div>

      <div className="clay p-2 border border-slate-200/60 flex items-center gap-2 overflow-x-auto">
        {[
          { key: 'analytics', label: '📊 Graphs & Analytics' },
          { key: 'closing', label: '💰 Closing Time Payouts' },
          { key: 'attendance', label: '📅 Attendance Logger' },
          { key: 'helpers', label: '👷 Helper Boys Details' },
          { key: 'doctors', label: '👨‍⚕️ Doctor Earnings' },
          { key: 'extra', label: '📝 Extra Expenses Log' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
              activeTab === tab.key 
                ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-cyan-400 shadow-md border border-white/10' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════ SECTION 4: TAB VIEWS ════ */}
      
      <div className="pt-2">
        {activeTab === 'analytics' && (
          <AnalyticsTab 
            appointments={appointments}
            electricityExpenses={electricityExpenses}
            helperBoys={helperBoysList}
            helperAttendance={helperAttendance}
            extraExpenses={extraExpenses}
            doctors={doctors}
            doctorAttendance={doctorAttendance}
            selectedBranch={selectedBranch}
            branches={branches}
          />
        )}
        
        {activeTab === 'closing' && (
        <div className="clay border border-slate-200/60 overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Patient Operations & Medicines Profits Ledger
            </h3>
            <span className="text-[10px] text-slate-400">Automated ledger reading finalized invoices (no manual entry required).</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400 font-semibold">
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total Paid</th>
                  <th className="px-4 py-3">Treatment Profit</th>
                  <th className="px-4 py-3">Medicine Profit</th>
                  <th className="px-4 py-3 font-bold text-slate-700">Total Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {getFilteredAppointments().length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-light">
                      No appointments found for the selected month/branch filters.
                    </td>
                  </tr>
                ) : (
                  getFilteredAppointments().map(appt => {
                    const finances = getAppointmentFinances(appt)
                    
                    if (!finances) {
                      return (
                        <tr key={appt.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3.5 font-semibold text-slate-800">{appt.patients?.name || 'Walk-in'}</td>
                          <td className="px-4 py-3.5">Dr. {appt.doctors?.name || 'Unassigned'}</td>
                          <td className="px-4 py-3.5">{appt.branches?.name}</td>
                          <td className="px-4 py-3.5">{appt.appointment_date}</td>
                          <td colSpan={4} className="px-4 py-3.5 text-slate-400 italic">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-semibold border border-slate-200">
                              Awaiting Invoice Checkout
                            </span>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={appt.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3.5 font-semibold text-slate-800">{appt.patients?.name || 'Walk-in'}</td>
                        <td className="px-4 py-3.5">Dr. {appt.doctors?.name || 'Unassigned'}</td>
                        <td className="px-4 py-3.5">{appt.branches?.name}</td>
                        <td className="px-4 py-3.5">{appt.appointment_date}</td>
                        <td className="px-4 py-3.5 font-mono font-medium text-slate-800">
                          Rs. {finances.totalPaid.toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-teal-600 font-mono">Rs. {finances.treatmentProfit.toFixed(2)}</p>
                            <p className="text-[10px] text-slate-400 font-light">Rev: {finances.netTreatmentRevenue.toFixed(1)} | Cost: {finances.treatmentCost.toFixed(1)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-cyan-600 font-mono">Rs. {finances.medicineProfit.toFixed(2)}</p>
                            <p className="text-[10px] text-slate-400 font-light">Rev: {finances.netMedicineRevenue.toFixed(1)} | Cost: {finances.medicineCost.toFixed(1)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 bg-slate-50/45">
                          Rs. {finances.totalProfit.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4B. ATTENDANCE LOGGER */}
      {activeTab === 'attendance' && (
        <div className="clay rounded-3xl p-6 md:p-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/60 pb-4 gap-4">
            <div>
              <h3 className="text-base font-serif font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-600" />
                Staff Monthly Attendance Matrix & Daily Logger
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Select a date below to log/edit daily attendance. View monthly matrix grids at the bottom.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Selected Log Date:</span>
              <input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className="px-3.5 py-2 border border-slate-200 rounded-2xl text-xs bg-white shadow-sm font-semibold text-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* ══ CLAYMORPHISM DAILY QUICK LOGGER GRID ══ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Helper Boys Logger ── */}
            <div className="clay p-5 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User2 className="w-4 h-4 text-cyan-600" />
                  Helper Boys Daily Quick Logger ({attendanceDate})
                </h4>
              </div>

              <div className="divide-y divide-slate-100">
                {getBranchFilteredHelpers().length === 0 ? (
                  <p className="py-4 text-xs text-slate-400 text-center font-light">No helper boys assigned to this branch.</p>
                ) : (
                  getBranchFilteredHelpers().map(helper => {
                    const key1 = `helper-${helper.id}-1`
                    const key2 = `helper-${helper.id}-2`
                    const status1 = pendingAttendance[key1]
                    const status2 = pendingAttendance[key2]

                    return (
                      <div key={helper.id} className="py-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-bold text-slate-900">{helper.name}</p>
                          <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                            {helper.sunday_enabled ? 'Works Sundays' : 'Mon-Sat Only'}
                          </span>
                        </div>

                        {/* Shift 1 & 2 Options */}
                        <div className="space-y-2 pl-2 border-l-2 border-cyan-500/20">
                          {helper.shift_1_enabled && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold text-slate-500">Shift 1 (Morning)</span>
                              <div className="flex gap-1.5">
                                {['present', 'absent', 'half_day'].map(opt => {
                                  const isSel = status1 === opt
                                  let btnClass = 'px-3 py-1 text-[9px] font-bold rounded-lg border transition-all '
                                  if (isSel) {
                                    btnClass += opt === 'present' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
                                              : opt === 'absent' ? 'bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-500/20'
                                              : 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20'
                                  } else {
                                    btnClass += 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }
                                  return (
                                    <button
                                      key={opt}
                                      onClick={() => handleToggleHelperAttendance(helper.id, 1, opt as any)}
                                      className={btnClass}
                                    >
                                      {opt === 'present' ? 'PRESENT' : opt === 'absent' ? 'ABSENT' : 'HALF DAY'}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {helper.shift_2_enabled && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                              <span className="text-[10px] font-semibold text-slate-500">Shift 2 (Evening)</span>
                              <div className="flex gap-1.5">
                                {['present', 'absent', 'half_day'].map(opt => {
                                  const isSel = status2 === opt
                                  let btnClass = 'px-3 py-1 text-[9px] font-bold rounded-lg border transition-all '
                                  if (isSel) {
                                    btnClass += opt === 'present' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
                                              : opt === 'absent' ? 'bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-500/20'
                                              : 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20'
                                  } else {
                                    btnClass += 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }
                                  return (
                                    <button
                                      key={opt}
                                      onClick={() => handleToggleHelperAttendance(helper.id, 2, opt as any)}
                                      className={btnClass}
                                    >
                                      {opt === 'present' ? 'PRESENT' : opt === 'absent' ? 'ABSENT' : 'HALF DAY'}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* ── Doctors Logger ── */}
            <div className="clay p-5 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User2 className="w-4 h-4 text-emerald-600" />
                  Doctor Daily Quick Logger ({attendanceDate})
                </h4>
              </div>

              <div className="divide-y divide-slate-100">
                {getBranchFilteredDoctors().length === 0 ? (
                  <p className="py-4 text-xs text-slate-400 text-center font-light">No doctors assigned to this branch.</p>
                ) : (
                  getBranchFilteredDoctors().map(doc => {
                    const key = `doc-${doc.id}`
                    const status = pendingAttendance[key]

                    return (
                      <div key={doc.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-900">Dr. {doc.name}</p>
                          <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                            {doc.compensation_type === 'percentage' ? `${doc.profit_percentage}% Profit Share` : `INR ${doc.fixed_salary} Salary`}
                          </span>
                        </div>

                        <div className="flex gap-1.5">
                          {['present', 'absent', 'half_day'].map(opt => {
                            const isSel = status === opt
                            let btnClass = 'px-3.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all '
                            if (isSel) {
                              btnClass += opt === 'present' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
                                        : opt === 'absent' ? 'bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-500/20'
                                        : 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20'
                            } else {
                              btnClass += 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleDoctorAttendance(doc.id, opt as any)}
                                className={btnClass}
                              >
                                {opt === 'present' ? 'PRESENT' : opt === 'absent' ? 'ABSENT' : 'HALF DAY'}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

          </div>

          {/* Save Button for selected date */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveAllAttendance}
              disabled={isSavingAttendance}
              className="px-6 py-3.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-2xl font-bold text-xs shadow-md transition transform hover:scale-102 flex items-center gap-2 disabled:opacity-50"
            >
              {isSavingAttendance && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Daily Attendance for {attendanceDate}
            </button>
          </div>

          {/* ═══ FULL MONTHLY ATTENDANCE MATRIX SECTION (7-COLUMN CALENDAR GRID) ═══ */}
          <div className="space-y-8 border-t border-slate-200/60 pt-6">
            
            {/* DOCTOR MONTHLY GRID */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Doctor Monthly Attendance Calendar Grid ({selectedMonth})
                </h4>
                <span className="text-[10px] text-slate-400 font-medium">Click any day square to select it for daily logging</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getBranchFilteredDoctors().map(doc => {
                  const totalDays = new Date(year, month, 0).getDate()
                  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
                  const todayStr = new Date().toISOString().split('T')[0]

                  return (
                    <div key={doc.id} className="clay border border-slate-200/60 p-5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900">Dr. {doc.name}</span>
                        <div className="flex gap-2">
                          <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">PRES</span>
                          <span className="text-[8px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">ABS</span>
                          <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">HALF</span>
                        </div>
                      </div>

                      {/* Weekday titles */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400 border-b border-slate-100 pb-1">
                        <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1 pt-1">
                        {Array.from({ length: firstDayOfWeek }).map((_, emptyIdx) => (
                          <div key={`empty-${emptyIdx}`} className="h-8 bg-slate-50/50 rounded-lg" />
                        ))}
                        
                        {Array.from({ length: totalDays }, (_, i) => {
                          const dayNum = i + 1
                          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                          const isFuture = dateStr > todayStr
                          
                          const attRecord = doctorAttendance.find(a => a.doctor_id === doc.id && a.date === dateStr)
                          const status = attRecord?.status

                          let bgClass = 'bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-sm'
                          if (isFuture) bgClass = 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          else if (status === 'absent') bgClass = 'bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-sm'
                          else if (status === 'half_day') bgClass = 'bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-sm'
                          else if (!status) bgClass = 'bg-slate-200 text-slate-500 border border-dashed border-slate-350 font-bold hover:bg-slate-300 shadow-sm'

                          return (
                            <div
                              key={dayNum}
                              onClick={() => {
                                if (!isFuture) {
                                  setAttendanceDate(dateStr)
                                }
                              }}
                              title={`${dateStr} - Click to select log date`}
                              className={`h-8 flex flex-col items-center justify-center rounded-lg text-[9px] transition transform hover:scale-105 cursor-pointer select-none ${bgClass}`}
                            >
                              <span className="font-semibold">{dayNum}</span>
                              <span className="text-[6px] uppercase leading-none opacity-90 font-mono">
                                {isFuture ? 'WAIT' : status === 'absent' ? 'ABS' : status === 'half_day' ? 'HALF' : status === 'present' ? 'PRES' : 'UNMRK'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* HELPER BOYS MONTHLY GRID */}
            <div className="space-y-4 border-t border-slate-200/60 pt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                  Helper Boys Monthly Attendance Calendar Grid ({selectedMonth})
                </h4>
              </div>

              <div className="space-y-6">
                {getBranchFilteredHelpers().map(helper => {
                  const totalDays = new Date(year, month, 0).getDate()
                  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
                  const todayStr = new Date().toISOString().split('T')[0]

                  return (
                    <div key={helper.id} className="clay border border-slate-200/60 p-5 space-y-4">
                      <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                        <div>
                          <span className="font-bold text-slate-900">{helper.name}</span>
                          <span className="text-[10px] text-slate-400 ml-2 font-light">
                            Rates: S1=₹{helper.shift_1_rate} | S2=₹{helper.shift_2_rate}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Shift 1 Calendar */}
                        {helper.shift_1_enabled && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider block">Shift 1 (Morning)</span>
                            <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold text-slate-400 border-b border-slate-100 pb-1">
                              <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {Array.from({ length: firstDayOfWeek }).map((_, emptyIdx) => (
                                <div key={`empty-s1-${emptyIdx}`} className="h-8 bg-slate-50/50 rounded-lg" />
                              ))}
                              {Array.from({ length: totalDays }, (_, i) => {
                                const dayNum = i + 1
                                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                                const isFuture = dateStr > todayStr

                                const record = helperAttendance.find(a => a.helper_boy_id === helper.id && a.date === dateStr && a.shift === 1)
                                const status = record?.status

                                let bgClass = 'bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-sm'
                                if (isFuture) bgClass = 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                else if (status === 'absent') bgClass = 'bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-sm'
                                else if (status === 'half_day') bgClass = 'bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-sm'
                                else if (!status) bgClass = 'bg-slate-200 text-slate-500 border border-dashed border-slate-350 font-bold hover:bg-slate-300 shadow-sm'

                                return (
                                  <div
                                    key={`s1_${dayNum}`}
                                    onClick={() => {
                                      if (!isFuture) {
                                        setAttendanceDate(dateStr)
                                      }
                                    }}
                                    title={`${dateStr} (Shift 1) - Click to select log date`}
                                    className={`h-8 flex flex-col items-center justify-center rounded-lg text-[9px] transition transform hover:scale-105 cursor-pointer select-none ${bgClass}`}
                                  >
                                    <span className="font-semibold">{dayNum}</span>
                                    <span className="text-[6px] uppercase leading-none opacity-90 font-mono">
                                      {isFuture ? 'WAIT' : status === 'absent' ? 'ABS' : status === 'half_day' ? 'HALF' : status === 'present' ? 'PRES' : 'UNMRK'}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Shift 2 Calendar */}
                        {helper.shift_2_enabled && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">Shift 2 (Evening)</span>
                            <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold text-slate-400 border-b border-slate-100 pb-1">
                              <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {Array.from({ length: firstDayOfWeek }).map((_, emptyIdx) => (
                                <div key={`empty-s2-${emptyIdx}`} className="h-8 bg-slate-50/50 rounded-lg" />
                              ))}
                              {Array.from({ length: totalDays }, (_, i) => {
                                const dayNum = i + 1
                                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                                const isFuture = dateStr > todayStr

                                const record = helperAttendance.find(a => a.helper_boy_id === helper.id && a.date === dateStr && a.shift === 2)
                                const status = record?.status

                                let bgClass = 'bg-teal-600 text-white font-bold hover:bg-teal-700 shadow-sm'
                                if (isFuture) bgClass = 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                else if (status === 'absent') bgClass = 'bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-sm'
                                else if (status === 'half_day') bgClass = 'bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-sm'
                                else if (!status) bgClass = 'bg-slate-200 text-slate-500 border border-dashed border-slate-350 font-bold hover:bg-slate-300 shadow-sm'

                                return (
                                  <div
                                    key={`s2_${dayNum}`}
                                    onClick={() => {
                                      if (!isFuture) {
                                        setAttendanceDate(dateStr)
                                      }
                                    }}
                                    title={`${dateStr} (Shift 2) - Click to select log date`}
                                    className={`h-8 flex flex-col items-center justify-center rounded-lg text-[9px] transition transform hover:scale-105 cursor-pointer select-none ${bgClass}`}
                                  >
                                    <span className="font-semibold">{dayNum}</span>
                                    <span className="text-[6px] uppercase leading-none opacity-90 font-mono">
                                      {isFuture ? 'WAIT' : status === 'absent' ? 'ABS' : status === 'half_day' ? 'HALF' : status === 'present' ? 'PRES' : 'UNMRK'}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'helpers' && (
        <div className="clay border border-slate-200/60 p-6 space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <User2 className="w-4 h-4 text-slate-500" />
                Helper Boys Details & Pay calculation
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Manage helper staffing, daily rates, and Sunday work.</p>
            </div>

            <button
              onClick={() => {
                setNewHelperName('')
                setNewHelperShift1('0')
                setNewHelperShift2('0')
                setNewHelperSundayEnabled(false)
                setShowAddHelper(true)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Helper Boy
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400 font-semibold">
                  <th className="px-4 py-3">Helper Name</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Shift 1 Rate (Morn)</th>
                  <th className="px-4 py-3">Shift 2 Rate (Eve)</th>
                  <th className="px-4 py-3">Sunday Shifts</th>
                  <th className="px-4 py-3 text-right">Calculated Payout</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {getBranchFilteredHelpers().length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 font-light">
                      No helper boys registered under the current filters.
                    </td>
                  </tr>
                ) : (
                  getBranchFilteredHelpers().map(helper => {
                    const branchName = branches.find(b => b.id === helper.branch_id)?.name || 'Unassigned'
                    const pay = calculateHelperSalary(helper)
                    return (
                      <tr key={helper.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{helper.name}</td>
                        <td className="px-4 py-3">{branchName}</td>
                        <td className="px-4 py-3">INR {helper.shift_1_rate} {helper.shift_1_enabled ? '' : '(Disabled)'}</td>
                        <td className="px-4 py-3">INR {helper.shift_2_rate} {helper.shift_2_enabled ? '' : '(Disabled)'}</td>
                        <td className="px-4 py-3 font-medium">
                          {helper.sunday_enabled ? (
                            <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">Yes (Sunday Work)</span>
                          ) : (
                            <span className="text-slate-400 font-light">Off Sundays</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">INR {pay.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteHelper(helper.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Electricity fixed bills manager */}
          <div className="border-t pt-6">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Electricity Bills for {selectedMonth}</h4>
            {selectedBranch === 'all' ? (
              <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-xl flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>Please select a specific branch from the top menu to view or edit its electricity bill.</span>
              </div>
            ) : (
              <form onSubmit={handleSaveElectricity} className="flex items-end gap-3 max-w-sm">
                <div className="space-y-1 flex-1">
                  <label className="block text-[10px] font-semibold text-slate-400">Electricity Bill (INR)</label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      value={electricityBill}
                      onChange={e => setElectricityBill(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingElectricity}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow shadow-slate-900/10 flex items-center gap-1.5 transition"
                >
                  {savingElectricity && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Bill
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {activeTab === 'doctors' && (
        <div className="clay border border-slate-200/60 p-6 space-y-4">
          <div className="border-b pb-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              Doctor Payroll Calculator
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Calculates fixed salary or profit-split percentage payouts.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400 font-semibold">
                  <th className="px-4 py-3">Dentist Name</th>
                  <th className="px-4 py-3">Branch Assignment</th>
                  <th className="px-4 py-3">Compensation Type</th>
                  <th className="px-4 py-3">Rates / Metric</th>
                  <th className="px-4 py-3 text-right">Base Earnings</th>
                  <th className="px-4 py-3 text-right">Fines / Deductions</th>
                  <th className="px-4 py-3 text-right">Net Payout</th>
                  <th className="px-4 py-3 text-center">Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {getBranchFilteredDoctors().length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-light">
                      No doctors registered.
                    </td>
                  </tr>
                ) : (
                  getBranchFilteredDoctors().map(doc => {
                    const branch = branches.find(b => b.id === doc.branch_id)
                    const branchName = branch?.name || 'Unassigned'
                    
                    let pay = 0
                    let rateString = ''
                    let absencesCount = 0
                    let bProfit = totals.branchNetProfitBeforeDoctors
                    
                    if (doc.compensation_type === 'fixed') {
                      const docWorkingDays = getWorkingDaysInMonth(year, month, false)
                      absencesCount = doctorAttendance.filter(a => {
                        if (a.doctor_id !== doc.id || (a.status !== 'absent' && a.status !== 'half_day')) return false
                        const absDate = new Date(a.date)
                        const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
                        return absMonthStr === selectedMonth
                      }).reduce((acc, curr) => acc + (curr.status === 'half_day' ? 0.5 : 1.0), 0)
                      
                      const worked = Math.max(0, docWorkingDays - absencesCount)
                      const dailyRate = doc.fixed_salary / docWorkingDays
                      pay = worked * dailyRate
                      rateString = `INR ${doc.fixed_salary.toLocaleString()} / mo (${absencesCount} absences)`
                    } else {
                      // Percentage based on branch net profit
                      if (selectedBranch === 'all' && doc.branch_id) {
                        const docBranchBill = electricityExpenses.find(e => e.branch_id === doc.branch_id && e.month_year === selectedMonth)?.electricity_bill || 0
                        const docBranchHelpers = helperBoysList.filter(h => h.branch_id === doc.branch_id)
                        const docBranchHelpersPay = docBranchHelpers.reduce((sum, h) => sum + calculateHelperSalary(h), 0)
                        const docBranchExtras = extraExpenses.filter(e => {
                          const expDate = new Date(e.expense_date)
                          const expMonthStr = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`
                          return expMonthStr === selectedMonth && e.branch_id === doc.branch_id
                        }).reduce((sum, e) => sum + e.amount, 0)
                        
                        const docBranchAppts = appointments.filter(appt => {
                          const apptDate = new Date(appt.appointment_date)
                          const apptMonthStr = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, '0')}`
                          return apptMonthStr === selectedMonth && appt.branches?.id === doc.branch_id
                        })
                        
                        let docBranchTProfit = 0
                        let docBranchMProfit = 0
                        docBranchAppts.forEach(appt => {
                          const finances = getAppointmentFinances(appt)
                          if (finances) {
                            docBranchTProfit += finances.treatmentProfit
                            docBranchMProfit += finances.medicineProfit
                          }
                        })
                        
                        const target = doc.profit_sharing_target || 'both'
                        if (target === 'treatment') {
                          bProfit = docBranchTProfit - docBranchHelpersPay - docBranchBill - docBranchExtras
                        } else if (target === 'medicine') {
                          bProfit = docBranchMProfit - docBranchHelpersPay - docBranchBill - docBranchExtras
                        } else {
                          bProfit = (docBranchTProfit + docBranchMProfit) - docBranchHelpersPay - docBranchBill - docBranchExtras
                        }
                      } else {
                        // Apply target logic if single branch selected
                        const target = doc.profit_sharing_target || 'both'
                        if (target === 'treatment') {
                          bProfit = totals.totalTreatmentProfit - totals.helperSalariesTotal - totals.electricityTotal - totals.extraExpensesTotal
                        } else if (target === 'medicine') {
                          bProfit = totals.totalMedicineProfit - totals.helperSalariesTotal - totals.electricityTotal - totals.extraExpensesTotal
                        }
                      }
                      
                      if (bProfit > 0) {
                        const docWorkingDays = getWorkingDaysInMonth(year, month, false)
                        absencesCount = doctorAttendance.filter(a => {
                          if (a.doctor_id !== doc.id || (a.status !== 'absent' && a.status !== 'half_day')) return false
                          const absDate = new Date(a.date)
                          const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
                          return absMonthStr === selectedMonth
                        }).reduce((acc, curr) => acc + (curr.status === 'half_day' ? 0.5 : 1.0), 0)
                        const docWorked = Math.max(0, docWorkingDays - absencesCount)
                        const fullPayout = bProfit * (doc.profit_percentage / 100)

                        const docRule = getDocRule(doc)
                        pay = docRule === 'present_days_only' && docWorkingDays > 0
                          ? fullPayout * (docWorked / docWorkingDays)
                          : fullPayout
                      }
                      const docRule = getDocRule(doc)
                      rateString = `${doc.profit_percentage}% share (${docRule === 'present_days_only' ? 'Present Days' : 'Full Month'})`
                    }

                    const reduction = salaryReductions
                      .filter(r => r.person_id === doc.id && r.month_year === selectedMonth && r.person_type === 'doctor')
                      .reduce((sum, r) => sum + r.amount, 0)
                    const netPayout = Math.max(0, pay - reduction)

                    // Details calculations
                    const docAppts = appointments.filter(appt => {
                      const apptDate = new Date(appt.appointment_date)
                      const apptMonthStr = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, '0')}`
                      return apptMonthStr === selectedMonth && appt.doctors?.id === doc.id
                    })
                    let docTotalGross = 0
                    docAppts.forEach(appt => {
                      const finances = getAppointmentFinances(appt)
                      if (finances) {
                        docTotalGross += finances.totalPaid
                      }
                    })

                    const docWorkingDays = getWorkingDaysInMonth(year, month, false)
                    
                    const absentRecords = doctorAttendance.filter(a => {
                      if (a.doctor_id !== doc.id || (a.status !== 'absent' && a.status !== 'half_day')) return false
                      const absDate = new Date(a.date)
                      const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
                      return absMonthStr === selectedMonth
                    })

                    const absentDaysGross = absentRecords.map(rec => {
                      const apptsOnDay = appointments.filter(appt => appt.doctors?.id === doc.id && appt.appointment_date === rec.date)
                      let dayGross = 0
                      apptsOnDay.forEach(appt => {
                        const finances = getAppointmentFinances(appt)
                        if (finances) {
                          dayGross += finances.totalPaid
                        }
                      })
                      return {
                        date: rec.date,
                        status: rec.status,
                        gross: dayGross
                      }
                    })
                    const totalAbsentGross = absentDaysGross.reduce((sum, item) => sum + item.gross, 0)
                    const grossForSalary = docTotalGross - totalAbsentGross

                    // Branch expenses details
                    let branchHelpers = helperBoysList
                    let branchBill = 0
                    let branchExtrasTotal = 0
                    let branchTProfit = totals.totalTreatmentProfit
                    let branchMProfit = totals.totalMedicineProfit

                    if (doc.branch_id) {
                      branchHelpers = helperBoysList.filter(h => h.branch_id === doc.branch_id)
                      branchBill = electricityExpenses.find(e => e.branch_id === doc.branch_id && e.month_year === selectedMonth)?.electricity_bill || 0
                      branchExtrasTotal = extraExpenses.filter(e => {
                        const expDate = new Date(e.expense_date)
                        const expMonthStr = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`
                        return expMonthStr === selectedMonth && e.branch_id === doc.branch_id
                      }).reduce((sum, e) => sum + e.amount, 0)

                      const branchApptsForExp = appointments.filter(appt => {
                        const apptDate = new Date(appt.appointment_date)
                        const apptMonthStr = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, '0')}`
                        return apptMonthStr === selectedMonth && appt.branches?.id === doc.branch_id
                      })
                      let tProf = 0
                      let mProf = 0
                      branchApptsForExp.forEach(appt => {
                        const finances = getAppointmentFinances(appt)
                        if (finances) {
                          tProf += finances.treatmentProfit
                          mProf += finances.medicineProfit
                        }
                      })
                      branchTProfit = tProf
                      branchMProfit = mProf
                    } else {
                      branchBill = totals.electricityTotal
                      branchExtrasTotal = totals.extraExpensesTotal
                    }

                    const branchHelpersPay = branchHelpers.reduce((sum, h) => sum + calculateHelperSalary(h), 0)
                    const totalBranchExpenses = branchHelpersPay + branchBill + branchExtrasTotal

                    const detailObj = {
                      doctorName: doc.name,
                      compensationType: doc.compensation_type,
                      profitPercentage: doc.profit_percentage,
                      fixedSalary: doc.fixed_salary,
                      profitSharingTarget: doc.profit_sharing_target || 'both',
                      docTotalGross,
                      absentDaysGross,
                      totalAbsentGross,
                      grossForSalary,
                      workingDays: docWorkingDays,
                      workedDays: Math.max(0, docWorkingDays - absencesCount),
                      absencesCount,
                      branchHelpersPay,
                      electricity: branchBill,
                      extras: branchExtrasTotal,
                      totalBranchExpenses,
                      branchTProfit,
                      branchMProfit,
                      branchProfit: bProfit,
                      baseEarnings: pay,
                      reduction,
                      netPayout,
                    }

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-800">Dr. {doc.name}</td>
                        <td className="px-4 py-3">{branchName}</td>
                        <td className="px-4 py-3 uppercase font-semibold text-slate-500">{doc.compensation_type}</td>
                        <td className="px-4 py-3 text-slate-500">{rateString}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">INR {Math.round(pay).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-600">INR {Math.round(reduction).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-850">INR {Math.round(netPayout).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => router.push(`/admin/finances/doctor/${doc.id}?month=${selectedMonth}`)}
                            className="px-2.5 py-1 text-[10px] font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/40 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'extra' && (
        <div className="clay border border-slate-200/60 p-6 space-y-4">
          <div className="border-b pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                Extra Expenses Ledger
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Logs miscellaneous repairs, breakages, or store costs.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBillElectricity('')
                  setBillWater('')
                  setBillGas('')
                  setBillRent('')
                  setBillInternet('')
                  setBillOther('')
                  setBillDate(new Date().toISOString().split('T')[0])
                  setBillBranch(selectedBranch !== 'all' ? selectedBranch : branches[0]?.id || '')
                  setEditingExpenseId(null)
                  setShowAddBill(true)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Bill
              </button>
              <button
                onClick={() => {
                  setExpenseAmount('0')
                  setExpenseNote('')
                  setExpenseDate(new Date().toISOString().split('T')[0])
                  setExpenseBranch(selectedBranch !== 'all' ? selectedBranch : branches[0]?.id || '')
                  setEditingExpenseId(null)
                  setShowAddExpense(true)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Extra Expense
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400 font-semibold">
                  <th className="px-4 py-3">Expense Date</th>
                  <th className="px-4 py-3">Description / Note</th>
                  <th className="px-4 py-3">Branch Clinic</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {getFilteredExtraExpenses().length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 font-light">
                      No extra expenses logged for this month/branch filters.
                    </td>
                  </tr>
                ) : (
                  getFilteredExtraExpenses().map(exp => {
                    const branch = branches.find(b => b.id === exp.branch_id)
                    const branchName = branch?.name || 'All Clinics'
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">{exp.expense_date}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{exp.note}</td>
                        <td className="px-4 py-3">{branchName}</td>
                        <td className="px-4 py-3 text-right text-rose-600 font-bold">INR {exp.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              const parsed = parseUtilityBills(exp.note)
                              if (parsed) {
                                setBillElectricity(parsed.electricity)
                                setBillWater(parsed.water)
                                setBillGas(parsed.gas)
                                setBillRent(parsed.rent)
                                setBillInternet(parsed.internet)
                                setBillOther(parsed.other)
                                setBillDate(exp.expense_date)
                                setBillBranch(exp.branch_id)
                                setEditingExpenseId(exp.id)
                                setShowAddBill(true)
                              } else {
                                setExpenseAmount(String(exp.amount))
                                setExpenseNote(exp.note)
                                setExpenseDate(exp.expense_date)
                                setExpenseBranch(exp.branch_id)
                                setEditingExpenseId(exp.id)
                                setShowAddExpense(true)
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('Are you sure you want to delete this expense?')) return
                              try {
                                const res = await deleteExtraExpense(exp.id)
                                if (res.success) {
                                  setExtraExpenses(prev => prev.filter(e => e.id !== exp.id))
                                  alert('Expense deleted successfully.')
                                } else {
                                  alert(res.error || 'Failed to delete expense')
                                }
                              } catch (err) {
                                console.error(err)
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-455 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════ SECTION 5: MODAL overlay for REGISTERING HELPER BOY ════ */}
      <AnimatePresence>
        {showAddHelper && (
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
              className="bg-white border border-slate-200 dark:bg-[var(--card)] dark:border-teal-900/35 rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col justify-between"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 dark:bg-slate-950/20 dark:border-teal-900/25 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-teal-200">Add Helper Boy</h3>
                <button type="button" onClick={() => setShowAddHelper(false)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white rounded-lg transition cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddHelper} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Helper Boy Name"
                    value={newHelperName}
                    onChange={e => setNewHelperName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Shift 1 Rate (Morning)</label>
                    <input
                      type="number"
                      value={newHelperShift1}
                      onChange={e => setNewHelperShift1(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Shift 2 Rate (Evening)</label>
                    <input
                      type="number"
                      value={newHelperShift2}
                      onChange={e => setNewHelperShift2(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 py-2 text-slate-600 dark:text-slate-400">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newHelperShift1Enabled}
                      onChange={e => setNewHelperShift1Enabled(e.target.checked)}
                      className="rounded border-slate-350 dark:border-teal-900/40 dark:bg-[#121c19]"
                    />
                    Morning Shift Enabled
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newHelperShift2Enabled}
                      onChange={e => setNewHelperShift2Enabled(e.target.checked)}
                      className="rounded border-slate-350 dark:border-teal-900/40 dark:bg-[#121c19]"
                    />
                    Evening Shift Enabled
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={newHelperSundayEnabled}
                      onChange={e => setNewHelperSundayEnabled(e.target.checked)}
                      className="rounded border-slate-350 dark:border-teal-900/40 dark:bg-[#121c19]"
                    />
                    Works on Sundays?
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Branch Assignment</label>
                  <select
                    value={newHelperBranch}
                    onChange={e => setNewHelperBranch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-850 dark:text-slate-200 font-semibold"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id} className="dark:bg-[#121c19] dark:text-slate-200">{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-teal-900/20">
                  <button
                    type="button"
                    onClick={() => setShowAddHelper(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-450 border border-slate-200 dark:border-teal-900/40 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingHelper}
                    className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {addingHelper && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Register Helper
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ SECTION 6: MODAL overlay for ADDING EXTRA EXPENSE ════ */}
      <AnimatePresence>
        {showAddExpense && (
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
              className="bg-white border border-slate-200 dark:bg-[var(--card)] dark:border-teal-900/35 rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col justify-between"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 dark:bg-slate-950/20 dark:border-teal-900/25 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-teal-200">{editingExpenseId ? 'Edit Extra Expense' : 'Add Extra Expense'}</h3>
                <button type="button" onClick={() => setShowAddExpense(false)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white rounded-lg transition cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Expense Description / Note (Compulsory)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Water motor broken repair, X-ray light repair"
                    value={expenseNote}
                    onChange={e => setExpenseNote(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Amount (INR)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="2500"
                      value={expenseAmount}
                      onChange={e => setExpenseAmount(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Date</label>
                    <input
                      type="date"
                      required
                      value={expenseDate}
                      onChange={e => setExpenseDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Clinic Branch</label>
                  <select
                    value={expenseBranch}
                    onChange={e => setExpenseBranch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-855 dark:text-slate-200 font-semibold"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id} className="dark:bg-[#121c19] dark:text-slate-200">{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-teal-900/20">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-455 border border-slate-200 dark:border-teal-900/40 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingExpense}
                    className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {addingExpense && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {editingExpenseId ? 'Update Expense' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ SECTION 7: MODAL overlay for ADDING/EDITING BILLS ════ */}
      <AnimatePresence>
        {showAddBill && (
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
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 dark:bg-slate-950/20 dark:border-teal-900/25 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-teal-200">{editingExpenseId ? 'Edit Utility Bill' : 'Add Utility Bill'}</h3>
                <button type="button" onClick={() => setShowAddBill(false)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white rounded-lg transition cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBill} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Clinic Branch</label>
                    <select
                      value={billBranch}
                      onChange={e => setBillBranch(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-855 dark:text-slate-200 font-semibold"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id} className="dark:bg-[#121c19] dark:text-slate-200">{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Billing Date</label>
                    <input
                      type="date"
                      required
                      value={billDate}
                      onChange={e => setBillDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-semibold"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-teal-900/20 rounded-2xl space-y-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-450 dark:text-teal-400 font-bold border-b border-slate-200/40 pb-1">Bill Breakdown (Optional)</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-550 dark:text-slate-400">Electricity Bill</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={billElectricity}
                        onChange={e => setBillElectricity(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-teal-900/35 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-mono font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-550 dark:text-slate-400">Water Bill</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={billWater}
                        onChange={e => setBillWater(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-teal-900/35 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-mono font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-550 dark:text-slate-400">Rent / Lease</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={billRent}
                        onChange={e => setBillRent(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-teal-900/35 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-mono font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-550 dark:text-slate-400">Internet / Phone</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={billInternet}
                        onChange={e => setBillInternet(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-teal-900/35 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-mono font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-550 dark:text-slate-400">Gas Bill</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={billGas}
                        onChange={e => setBillGas(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-teal-900/35 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-mono font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-550 dark:text-slate-400">Other Utilities</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={billOther}
                        onChange={e => setBillOther(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-teal-900/35 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-teal-900/20">
                  <button
                    type="button"
                    onClick={() => setShowAddBill(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-455 border border-slate-200 dark:border-teal-900/40 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBill}
                    className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 animate-pulse-slow"
                  >
                    {savingBill && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {editingExpenseId ? 'Update Bill Details' : 'Save Bills'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      </div>
    </motion.div>
  )
}
