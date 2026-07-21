'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  CircleDollarSign, TrendingUp, CheckCircle, AlertCircle, Calendar, Plus, Trash2, 
  User2, PlusCircle, HelpCircle, Save, Info, RefreshCw, Layers, Zap, Clock, X
} from 'lucide-react'
import { 
  updateAppointmentFinances, 
  upsertMonthlyElectricity, 
  addHelperBoy, 
  deleteHelperBoy, 
  updateHelperAttendance, 
  updateDoctorAttendance, 
  addExtraExpense 
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
  status: 'present' | 'absent'
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

  const discountMultiplier = 1 - (invoice.discount_percentage || 0) / 100

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

  const netTreatmentRevenue = treatmentRevenue * discountMultiplier
  const netMedicineRevenue = medicineRevenue * discountMultiplier

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
      return true
    })
  }

  // Calculate Helper salary for the month dynamically
  const calculateHelperSalary = (helper: HelperBoy) => {
    const totalWorkingDays = getWorkingDaysInMonth(year, month, helper.sunday_enabled)
    
    // Count absences for this month
    const absences = helperAttendance.filter(a => {
      if (a.helper_boy_id !== helper.id || a.status !== 'absent') return false
      const absDate = new Date(a.date)
      const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
      return absMonthStr === selectedMonth
    })
    
    const shift1Absences = absences.filter(a => a.shift === 1).length
    const shift2Absences = absences.filter(a => a.shift === 2).length

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

    filteredAppts.forEach(appt => {
      const finances = getAppointmentFinances(appt)
      if (finances) {
        totalCharged += finances.totalPaid
        totalTreatmentCost += finances.treatmentCost
        totalMedicineCost += finances.medicineCost
        totalTreatmentProfit += finances.treatmentProfit
        totalMedicineProfit += finances.medicineProfit
      }
    })

    const treatmentProfit = totalTreatmentProfit + totalMedicineProfit

    // 2. Fixed Expenses (Helper Salaries + Electricity)
    // Helper salaries
    const helpers = getBranchFilteredHelpers()
    const helperSalariesTotal = helpers.reduce((sum, h) => sum + calculateHelperSalary(h), 0)

    // Electricity bills
    let electricityTotal = 0
    if (selectedBranch === 'all') {
      electricityTotal = electricityExpenses
        .filter(e => e.month_year === selectedMonth)
        .reduce((sum, e) => sum + (e.electricity_bill || 0), 0)
    } else {
      const targetBranch = branches.find(b => b.slug === selectedBranch)
      const bill = electricityExpenses.find(e => e.branch_id === targetBranch?.id && e.month_year === selectedMonth)
      electricityTotal = bill ? bill.electricity_bill : 0
    }

    // 3. Extra Expenses
    const extras = getFilteredExtraExpenses()
    const extraExpensesTotal = extras.reduce((sum, e) => sum + (e.amount || 0), 0)

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
          if (a.doctor_id !== d.id || a.status !== 'absent') return false
          const absDate = new Date(a.date)
          const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
          return absMonthStr === selectedMonth
        }).length
        
        const docWorked = Math.max(0, docWorkingDays - absencesCount)
        const dailyRate = d.fixed_salary / docWorkingDays
        doctorFixedSalariesTotal += docWorked * dailyRate
      } else {
        // Percentage based on branch net profit
        let bProfit = branchNetProfitBeforeDoctors
        if (selectedBranch === 'all') {
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
          
          let docBranchRev = 0
          let docBranchCost = 0
          docBranchAppts.forEach(appt => {
            const finances = getAppointmentFinances(appt)
            if (finances) {
              docBranchRev += finances.totalPaid
              docBranchCost += finances.treatmentCost + finances.medicineCost
            }
          })

          bProfit = (docBranchRev - docBranchCost) - docBranchHelpersPay - docBranchBill - docBranchExtras
        }
        
        if (bProfit > 0) {
          const docWorkingDays = getWorkingDaysInMonth(year, month, false)
          const absencesCount = doctorAttendance.filter(a => {
            if (a.doctor_id !== d.id || a.status !== 'absent') return false
            const absDate = new Date(a.date)
            const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
            return absMonthStr === selectedMonth
          }).length
          const docWorked = Math.max(0, docWorkingDays - absencesCount)
          const fullPayout = bProfit * (d.profit_percentage / 100)
          
          const docPayout = doctorRule === 'present_days_only' && docWorkingDays > 0
            ? fullPayout * (docWorked / docWorkingDays)
            : fullPayout

          doctorPercentagePayoutsTotal += docPayout
        }
      }
    })

    const totalDoctorPay = doctorFixedSalariesTotal + doctorPercentagePayoutsTotal
    const totalExpenses = helperSalariesTotal + electricityTotal + extraExpensesTotal + totalDoctorPay
    const netProfit = treatmentProfit - totalExpenses

    return {
      totalCharged,
      totalTreatmentCost: totalTreatmentCost + totalMedicineCost,
      treatmentProfit,
      helperSalariesTotal,
      electricityTotal,
      extraExpensesTotal,
      totalDoctorPay,
      totalExpenses,
      netProfit,
      branchNetProfitBeforeDoctors
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

  // Add Extra Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseNote.trim()) {
      alert('A note/description describing the expense is compulsory!')
      return
    }

    setAddingExpense(true)
    const amount = parseFloat(expenseAmount || '0')

    try {
      const res = await addExtraExpense(amount, expenseNote, expenseDate, expenseBranch)
      if (res.success && res.data) {
        alert('Extra expense logged successfully!')
        setExtraExpenses(prev => [res.data[0], ...prev])
        setShowAddExpense(false)
        setExpenseAmount('0')
        setExpenseNote('')
      } else {
        alert(res.error || 'Failed to add expense')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred.')
    } finally {
      setAddingExpense(false)
    }
  }

  // Toggle Helper Attendance (Status toggle present/absent)
  const handleToggleHelperAttendance = async (helperId: string, shift: number, currentStatus: 'present' | 'absent') => {
    const nextStatus = currentStatus === 'present' ? 'absent' : 'present'
    try {
      const res = await updateHelperAttendance(helperId, attendanceDate, shift, nextStatus)
      if (res.success) {
        setHelperAttendance(prev => {
          const withoutMatch = prev.filter(a => !(a.helper_boy_id === helperId && a.date === attendanceDate && a.shift === shift))
          if (nextStatus === 'absent') {
            return [...withoutMatch, { helper_boy_id: helperId, date: attendanceDate, shift, status: 'absent' }]
          }
          return withoutMatch
        })
      } else {
        alert(res.error || 'Failed to update attendance')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Toggle Doctor Attendance (cycles: present -> absent -> half_day -> present)
  const handleToggleDoctorAttendance = async (doctorId: string, dateStr: string, currentStatus: 'present' | 'absent' | 'half_day') => {
    const nextStatus: 'present' | 'absent' | 'half_day' = 
      currentStatus === 'present' ? 'absent' : currentStatus === 'absent' ? 'half_day' : 'present'

    try {
      const res = await updateDoctorAttendance(doctorId, dateStr, nextStatus as any)
      if (res.success) {
        setDoctorAttendance(prev => {
          const withoutMatch = prev.filter(a => !(a.doctor_id === doctorId && a.date === dateStr))
          if (nextStatus !== 'present') {
            return [...withoutMatch, { doctor_id: doctorId, date: dateStr, status: nextStatus }]
          }
          return withoutMatch
        })
      } else {
        alert(res.error || 'Failed to update doctor attendance')
      }
    } catch (err) {
      console.error(err)
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      
      {/* ════ SECTION 1: GLOBAL CONTROL BAR ════ */}
      <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Branch Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start">
          <button
            onClick={() => setSelectedBranch('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedBranch === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Branches
          </button>
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBranch(b.slug)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedBranch === b.slug ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {b.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Month Selector & Extra Expense Button & Export Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
            />
          </div>

          <button
            onClick={exportSalesLedger}
            title="Download CSV for Excel"
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <CircleDollarSign className="w-3.5 h-3.5 text-emerald-600" />
            Export Sales (CSV)
          </button>

          <button
            onClick={exportPatientDirectory}
            title="Download CSV for Excel"
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <User2 className="w-3.5 h-3.5 text-cyan-600" />
            Export Patients (CSV)
          </button>

          <button
            onClick={() => setShowAddExpense(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" /> Add Extra Expense
          </button>
        </div>

      </div>

      {/* ════ SECTION 2: STATS OVERVIEW ════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-light">Gross Charged</p>
          <p className="text-xl font-semibold text-slate-800">INR {totals.totalCharged.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-light">Treatment Costs</p>
          <p className="text-xl font-semibold text-slate-500">INR {totals.totalTreatmentCost.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-light">Treatment Profits</p>
          <p className="text-xl font-semibold text-teal-600">INR {totals.treatmentProfit.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-light">Total Expenses</p>
          <p className="text-xl font-semibold text-rose-600">INR {totals.totalExpenses.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 border border-slate-900 rounded-2xl shadow-md text-white space-y-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-light">Net Profits</p>
          <p className="text-xl font-semibold">INR {totals.netProfit.toLocaleString()}</p>
        </div>

      </div>

      {/* ════ SECTION 3: TABS NAVIGATION ════ */}
      <div className="border-b border-slate-200 flex gap-4 text-xs font-semibold">
        {[
          { key: 'analytics', label: 'Graphs & Analytics' },
          { key: 'closing', label: 'Closing Time Payouts' },
          { key: 'attendance', label: 'Attendance Logger' },
          { key: 'helpers', label: 'Helper Boys Details' },
          { key: 'doctors', label: 'Doctor Earnings' },
          { key: 'extra', label: 'Extra Expenses Log' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 border-b-2 px-1 transition ${
              activeTab === tab.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
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
          />
        )}
        
        {activeTab === 'closing' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
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
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                Staff Monthly Attendance Matrix & Daily Logger
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Full month calendar: <span className="font-bold text-slate-500">Grey</span> = Future, <span className="font-bold text-emerald-600">Green</span> = Present, <span className="font-bold text-rose-600">Red</span> = Absent, <span className="font-bold text-amber-600">Orange</span> = Half Day. Click day square to toggle status!
              </p>
            </div>
            
            <input
              type="date"
              value={attendanceDate}
              onChange={e => setAttendanceDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Helper Boys Attendance Column */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Helper Boys Attendance</h4>
              <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                {getBranchFilteredHelpers().length === 0 ? (
                  <p className="p-4 text-xs text-slate-400 text-center font-light">No helper boys assigned to this branch.</p>
                ) : (
                  getBranchFilteredHelpers().map(helper => {
                    const shift1Record = helperAttendance.find(
                      a => a.helper_boy_id === helper.id && a.date === attendanceDate && a.shift === 1
                    )
                    const shift2Record = helperAttendance.find(
                      a => a.helper_boy_id === helper.id && a.date === attendanceDate && a.shift === 2
                    )

                    const isShift1Absent = shift1Record?.status === 'absent'
                    const isShift2Absent = shift2Record?.status === 'absent'

                    return (
                      <div key={helper.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{helper.name}</p>
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider font-light">
                            {helper.sunday_enabled ? 'Works Sunday' : 'Mon-Sat only'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {helper.shift_1_enabled && (
                            <button
                              onClick={() => handleToggleHelperAttendance(helper.id, 1, isShift1Absent ? 'absent' : 'present')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition ${
                                isShift1Absent 
                                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              Shift 1: {isShift1Absent ? 'ABSENT' : 'PRESENT'}
                            </button>
                          )}
                          {helper.shift_2_enabled && (
                            <button
                              onClick={() => handleToggleHelperAttendance(helper.id, 2, isShift2Absent ? 'absent' : 'present')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition ${
                                isShift2Absent 
                                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              Shift 2: {isShift2Absent ? 'ABSENT' : 'PRESENT'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

          {/* FULL MONTHLY ATTENDANCE GRID MATRIX */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Monthly Attendance Matrix ({selectedMonth})</h4>
            <div className="space-y-4 overflow-x-auto">
              {getBranchFilteredDoctors().map(doc => {
                const totalDays = new Date(year, month, 0).getDate()
                const todayStr = new Date().toISOString().split('T')[0]

                return (
                  <div key={doc.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">Dr. {doc.name}</span>
                      <span className="text-[10px] text-slate-400">Click past/current day square to change status</span>
                    </div>

                    <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 lg:grid-cols-31 gap-1.5 pt-1">
                      {Array.from({ length: totalDays }, (_, i) => {
                        const dayNum = i + 1
                        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                        const isFuture = dateStr > todayStr
                        
                        const attRecord = doctorAttendance.find(a => a.doctor_id === doc.id && a.date === dateStr)
                        const status = attRecord?.status || 'present'

                        let bgClass = 'bg-emerald-500 text-white font-bold'
                        if (isFuture) bgClass = 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        else if (status === 'absent') bgClass = 'bg-rose-500 text-white font-bold'
                        else if (status === 'half_day') bgClass = 'bg-amber-500 text-white font-bold'

                        return (
                          <div
                            key={dayNum}
                            onClick={() => !isFuture && handleToggleDoctorAttendance(doc.id, dateStr, status)}
                            title={`${dateStr} - ${isFuture ? 'Future' : status.toUpperCase()}`}
                            className={`h-9 flex flex-col items-center justify-center rounded-lg text-[10px] transition cursor-pointer shadow-sm ${bgClass}`}
                          >
                            <span>{dayNum}</span>
                            <span className="text-[7px] uppercase leading-none opacity-80">
                              {isFuture ? 'WAIT' : status === 'absent' ? 'ABS' : status === 'half_day' ? 'HALF' : 'PRES'}
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
        </div>
        </div>
      )}

      {/* 4C. HELPER BOYS MANAGEMENT */}
      {activeTab === 'helpers' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6">
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

      {/* 4D. DOCTOR COMPENSATION LIST */}
      {activeTab === 'doctors' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-4">
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
                  <th className="px-4 py-3 text-right">Calculated Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {getBranchFilteredDoctors().length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 font-light">
                      No doctors registered.
                    </td>
                  </tr>
                ) : (
                  getBranchFilteredDoctors().map(doc => {
                    const branch = branches.find(b => b.id === doc.branch_id)
                    const branchName = branch?.name || 'Unassigned'
                    
                    let pay = 0
                    let rateString = ''
                    
                    if (doc.compensation_type === 'fixed') {
                      const docWorkingDays = getWorkingDaysInMonth(year, month, false)
                      const absencesCount = doctorAttendance.filter(a => {
                        if (a.doctor_id !== doc.id || a.status !== 'absent') return false
                        const absDate = new Date(a.date)
                        const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
                        return absMonthStr === selectedMonth
                      }).length
                      
                      const worked = Math.max(0, docWorkingDays - absencesCount)
                      const dailyRate = doc.fixed_salary / docWorkingDays
                      pay = worked * dailyRate
                      rateString = `INR ${doc.fixed_salary.toLocaleString()} / mo (${absencesCount} absences)`
                    } else {
                      // Percentage based on branch net profit
                      let bProfit = totals.branchNetProfitBeforeDoctors
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
                        
                        let docBranchRev = 0
                        let docBranchCost = 0
                        docBranchAppts.forEach(appt => {
                          const finances = getAppointmentFinances(appt)
                          if (finances) {
                            docBranchRev += finances.totalPaid
                            docBranchCost += finances.treatmentCost + finances.medicineCost
                          }
                        })
                        
                        bProfit = (docBranchRev - docBranchCost) - docBranchHelpersPay - docBranchBill - docBranchExtras
                      }
                      
                      if (bProfit > 0) {
                        const docWorkingDays = getWorkingDaysInMonth(year, month, false)
                        const absencesCount = doctorAttendance.filter(a => {
                          if (a.doctor_id !== doc.id || a.status !== 'absent') return false
                          const absDate = new Date(a.date)
                          const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
                          return absMonthStr === selectedMonth
                        }).length
                        const docWorked = Math.max(0, docWorkingDays - absencesCount)
                        const fullPayout = bProfit * (doc.profit_percentage / 100)

                        pay = doctorRule === 'present_days_only' && docWorkingDays > 0
                          ? fullPayout * (docWorked / docWorkingDays)
                          : fullPayout
                      }
                      rateString = `${doc.profit_percentage}% share (${doctorRule === 'present_days_only' ? 'Present Days' : 'Full Month'})`
                    }

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-800">Dr. {doc.name}</td>
                        <td className="px-4 py-3">{branchName}</td>
                        <td className="px-4 py-3 uppercase font-semibold text-slate-500">{doc.compensation_type}</td>
                        <td className="px-4 py-3">{rateString}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-850">INR {Math.round(pay).toLocaleString()}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4E. EXTRA EXPENSES */}
      {activeTab === 'extra' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="border-b pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                Extra Expenses Ledger
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Logs miscellaneous repairs, breakages, or store costs.</p>
            </div>
            <button
              onClick={() => {
                setExpenseAmount('0')
                setExpenseNote('')
                setShowAddExpense(true)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm transition animate-in fade-in"
            >
              <Plus className="w-3.5 h-3.5" /> Add Extra Expense
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400 font-semibold">
                  <th className="px-4 py-3">Expense Date</th>
                  <th className="px-4 py-3">Description / Note</th>
                  <th className="px-4 py-3">Branch Clinic</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {getFilteredExtraExpenses().length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400 font-light">
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
      {showAddHelper && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Add Helper Boy</h3>
              <button onClick={() => setShowAddHelper(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddHelper} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Helper Boy Name"
                  value={newHelperName}
                  onChange={e => setNewHelperName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500">Shift 1 Rate (Morning)</label>
                  <input
                    type="number"
                    value={newHelperShift1}
                    onChange={e => setNewHelperShift1(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500">Shift 2 Rate (Evening)</label>
                  <input
                    type="number"
                    value={newHelperShift2}
                    onChange={e => setNewHelperShift2(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 py-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHelperShift1Enabled}
                    onChange={e => setNewHelperShift1Enabled(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Morning Shift Enabled
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHelperShift2Enabled}
                    onChange={e => setNewHelperShift2Enabled(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Evening Shift Enabled
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHelperSundayEnabled}
                    onChange={e => setNewHelperSundayEnabled(e.target.checked)}
                    className="rounded border-slate-300 font-bold"
                  />
                  Works on Sundays?
                </label>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Branch Assignment</label>
                <select
                  value={newHelperBranch}
                  onChange={e => setNewHelperBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddHelper(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-55 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingHelper}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5"
                >
                  {addingHelper && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Register Helper
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════ SECTION 6: MODAL overlay for ADDING EXTRA EXPENSE ════ */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Add Extra Expense</h3>
              <button onClick={() => setShowAddExpense(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Expense Description / Note (Compulsory)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water motor broken repair, X-ray light repair"
                  value={expenseNote}
                  onChange={e => setExpenseNote(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500">Amount (INR)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="2500"
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500">Date</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Clinic Branch</label>
                <select
                  value={expenseBranch}
                  onChange={e => setExpenseBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingExpense}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-850 rounded-xl transition flex items-center gap-1.5"
                >
                  {addingExpense && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </motion.div>
  )
}
