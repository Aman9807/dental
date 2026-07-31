'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Calendar, Info, Calculator, CreditCard, Clock, CheckCircle2, 
  TrendingUp, CircleDollarSign, Zap, AlertTriangle
} from 'lucide-react'

// Helper to count working days in a month (excluding Sundays)
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

interface DoctorFinancePageClientProps {
  doctor: any
  helperBoys: any[]
  helperAttendance: any[]
  doctorAttendance: any[]
  electricityExpenses: any[]
  extraExpenses: any[]
  branchAppointments: any[]
  monthParam?: string
}

export default function DoctorFinancePageClient({
  doctor,
  helperBoys,
  helperAttendance,
  doctorAttendance,
  electricityExpenses,
  extraExpenses,
  branchAppointments,
  monthParam
}: DoctorFinancePageClientProps) {
  const router = useRouter()
  
  // Load month filter or default to current month
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (monthParam) return monthParam
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const [doctorRule, setDoctorRule] = useState<'present_days_only' | 'full_month'>('present_days_only')
  const [salaryReductions, setSalaryReductions] = useState<any[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRule = localStorage.getItem('dental_doctor_payout_rule') || 'present_days_only'
      setDoctorRule(savedRule as any)
      
      const savedReductions = localStorage.getItem('dental_salary_reductions')
      if (savedReductions) {
        try {
          setSalaryReductions(JSON.parse(savedReductions))
        } catch (e) {
          console.error('Failed parsing reductions', e)
        }
      }
    }
  }, [])

  // Parse Year and Month
  const [yearStr, monthStr] = selectedMonth.split('-')
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)

  // 1. Working Days in Selected Month
  const workingDays = getWorkingDaysInMonth(year, month, false)

  // 2. Doctor Absences in Selected Month
  const absences = doctorAttendance.filter(a => {
    if (a.doctor_id !== doctor.id || (a.status !== 'absent' && a.status !== 'half_day')) return false
    const absDate = new Date(a.date)
    const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
    return absMonthStr === selectedMonth
  })
  
  const absencesCount = absences.reduce((acc, curr) => acc + (curr.status === 'half_day' ? 0.5 : 1.0), 0)
  const workedDays = Math.max(0, workingDays - absencesCount)

  // 3. Helper Invoice Finance Calculation
  const getAppointmentFinances = (appt: any) => {
    const invoices = appt.invoices || []
    if (invoices.length === 0) return null

    let totalPaid = 0
    let treatmentCost = 0
    let medicineCost = 0
    let treatmentProfit = 0
    let medicineProfit = 0

    invoices.forEach((invoice: any) => {
      const discount = invoice.discount_percentage || 0
      const items = invoice.invoice_items || []
      
      items.forEach((item: any) => {
        const qty = item.quantity || 1
        const price = item.unit_price || 0
        const cost = item.unit_cost || 0
        const itemType = item.item_type || 'treatment'

        let discountPercentage = discount
        if (itemType === 'treatment' && invoice.treatment_discount_percentage !== undefined && invoice.treatment_discount_percentage !== null) {
          discountPercentage = invoice.treatment_discount_percentage
        } else if (itemType === 'medicine' && invoice.medicine_discount_percentage !== undefined && invoice.medicine_discount_percentage !== null) {
          discountPercentage = invoice.medicine_discount_percentage
        }

        const netItemPrice = price * (1 - discountPercentage / 100) * qty
        const totalCost = cost * qty
        const profit = netItemPrice - totalCost

        totalPaid += netItemPrice
        if (itemType === 'treatment') {
          treatmentCost += totalCost
          treatmentProfit += profit
        } else {
          medicineCost += totalCost
          medicineProfit += profit
        }
      })
    })

    return { totalPaid, treatmentCost, medicineCost, treatmentProfit, medicineProfit }
  }

  // 4. Calculate Payout Metrics
  const docReductions = salaryReductions
    .filter(r => r.person_id === doctor.id && r.month_year === selectedMonth && r.person_type === 'doctor')
    .reduce((acc, curr) => acc + curr.amount, 0)

  // Doctor Portal details calculations
  const docAppts = branchAppointments.filter(appt => {
    const apptDate = new Date(appt.appointment_date)
    const apptMonthStr = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, '0')}`
    return apptMonthStr === selectedMonth && appt.doctor_id === doctor.id
  })
  let docTotalGross = 0
  docAppts.forEach(appt => {
    const finances = getAppointmentFinances(appt)
    if (finances) {
      docTotalGross += finances.totalPaid
    }
  })

  const absentDaysGross = absences.map(rec => {
    const apptsOnDay = branchAppointments.filter(appt => appt.doctor_id === doctor.id && appt.appointment_date === rec.date)
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

  let finalPayout = 0
  let branchProfit = 0
  let totalRevenue = 0
  let totalTreatmentProfit = 0
  let totalMedicineProfit = 0
  let branchHelpersPay = 0
  let electricity = 0
  let extras = 0

  if (doctor.compensation_type === 'fixed') {
    const dailyRate = doctor.fixed_salary / workingDays
    const basePay = workedDays * dailyRate
    finalPayout = Math.max(0, basePay - docReductions)
  } else {
    // Percentage split
    const branchAppts = branchAppointments.filter(appt => {
      const apptDate = new Date(appt.appointment_date)
      const apptMonthStr = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, '0')}`
      return apptMonthStr === selectedMonth
    })

    let totalTreatmentCost = 0
    let totalMedicineCost = 0

    branchAppts.forEach(appt => {
      const finances = getAppointmentFinances(appt)
      if (finances) {
        totalRevenue += finances.totalPaid
        totalTreatmentCost += finances.treatmentCost
        totalMedicineCost += finances.medicineCost
        totalTreatmentProfit += finances.treatmentProfit
        totalMedicineProfit += finances.medicineProfit
      }
    })

    const treatmentProfit = totalTreatmentProfit + totalMedicineProfit

    // Helper salaries for branch
    branchHelpersPay = helperBoys.reduce((sum, helper) => {
      const hWorkingDays = getWorkingDaysInMonth(year, month, helper.sunday_enabled)
      const hAbsences = helperAttendance.filter(a => {
        if (a.helper_boy_id !== helper.id || (a.status !== 'absent' && a.status !== 'half_day')) return false
        const absDate = new Date(a.date)
        const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
        return absMonthStr === selectedMonth
      })
      const shift1Abs = hAbsences.filter(a => a.shift === 1).reduce((acc, curr) => acc + (curr.status === 'half_day' ? 0.5 : 1.0), 0)
      const shift2Abs = hAbsences.filter(a => a.shift === 2).reduce((acc, curr) => acc + (curr.status === 'half_day' ? 0.5 : 1.0), 0)
      const shift1Worked = helper.shift_1_enabled ? Math.max(0, hWorkingDays - shift1Abs) : 0
      const shift2Worked = helper.shift_2_enabled ? Math.max(0, hWorkingDays - shift2Abs) : 0
      const basePay = (shift1Worked * helper.shift_1_rate) + (shift2Worked * helper.shift_2_rate)
      const reduction = salaryReductions
        .filter(r => r.person_id === helper.id && r.month_year === selectedMonth && r.person_type === 'helper')
        .reduce((acc, curr) => acc + curr.amount, 0)
      return sum + Math.max(0, basePay - reduction)
    }, 0)

    // Electricity
    electricity = electricityExpenses.find(e => e.month_year === selectedMonth)?.electricity_bill || 0

    // Extra expenses
    extras = extraExpenses.filter(e => {
      const expDate = new Date(e.expense_date)
      const expMonthStr = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`
      return expMonthStr === selectedMonth
    }).reduce((sum, e) => sum + e.amount, 0)

    const target = doctor.profit_sharing_target || 'both'
    const revenueTarget = target === 'treatment' 
      ? totalTreatmentProfit 
      : target === 'medicine' 
      ? totalMedicineProfit 
      : treatmentProfit

    branchProfit = revenueTarget - branchHelpersPay - electricity - extras

    if (branchProfit > 0) {
      const fullPayout = branchProfit * (doctor.profit_percentage / 100)
      finalPayout = doctorRule === 'present_days_only' && workingDays > 0
        ? fullPayout * (workedDays / workingDays)
        : fullPayout
    }
  }

  const baseEarnings = doctor.compensation_type === 'fixed' 
    ? (workedDays * (doctor.fixed_salary / workingDays))
    : (branchProfit > 0 ? (branchProfit * (doctor.profit_percentage / 100)) : 0)

  const proratedBaseEarnings = doctor.compensation_type === 'percentage' && doctorRule === 'present_days_only' && workingDays > 0
    ? (baseEarnings * (workedDays / workingDays))
    : baseEarnings

  const netPayout = Math.max(0, proratedBaseEarnings - docReductions)

  // Motion variants for stagger entry
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15
      }
    }
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto space-y-8 p-1 text-slate-800 dark:text-slate-100"
    >
      
      {/* HEADER SECTION (Claymorphic card) */}
      <motion.div 
        variants={itemVariants} 
        className="clay bg-white dark:bg-[#121c19] border border-teal-950/10 dark:border-teal-900/30 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-scale-in"
      >
        <div className="space-y-1.5">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-teal-400/80 hover:text-slate-800 dark:hover:text-teal-350 transition cursor-pointer mb-2 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Finances
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-teal-100 font-serif">
            Salary Computation breakdown
          </h1>
          <p className="text-[10px] text-slate-400 dark:text-teal-400 font-bold uppercase tracking-wider">
            Dr. {doctor.name} • Branch: {doctor.branches?.name || 'Clinic'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-teal-400/70 font-semibold">Payroll Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-[#0c1412] border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition font-mono"
          />
        </div>
      </motion.div>

      {/* OVERVIEW KEYSTATS */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="clay clay-teal bg-gradient-to-br from-teal-500/10 to-teal-500/5 dark:from-teal-950/30 dark:to-teal-900/10 p-5 flex flex-col justify-between border border-teal-500/20 dark:border-teal-900/40 relative overflow-visible">
          <span className="text-[10px] text-slate-500 dark:text-teal-450 font-bold uppercase tracking-wider">Total Payout</span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-teal-600 dark:text-teal-400 font-mono tracking-tight">
            INR {Math.round(netPayout).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-450 dark:text-teal-400/60 mt-1.5 font-medium">Calculated net monthly salary</span>
        </div>

        <div className="clay bg-white dark:bg-[#121c19] border border-teal-950/10 dark:border-teal-900/20 p-5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-450 dark:text-teal-450 font-bold uppercase tracking-wider">Attendance Rate</span>
          <div className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-200 font-mono tracking-tight">
            {workedDays} / {workingDays} <span className="text-sm text-slate-405 font-sans font-medium">days</span>
          </div>
          <span className="text-[10px] text-slate-450 dark:text-teal-450/60 mt-1.5 font-medium">{absencesCount} absent days logged</span>
        </div>

        <div className="clay bg-white dark:bg-[#121c19] border border-teal-950/10 dark:border-teal-900/20 p-5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-450 dark:text-teal-450 font-bold uppercase tracking-wider">Compensation Scheme</span>
          <div className="mt-2 text-sm sm:text-base font-extrabold text-slate-700 dark:text-teal-350 uppercase tracking-wide">
            {doctor.compensation_type === 'percentage' 
              ? `${doctor.profit_percentage}% Profit Share` 
              : 'Fixed base salary'}
          </div>
          <span className="text-[10px] text-slate-450 dark:text-teal-450/60 mt-1.5 font-medium">Target sharing: {(doctor.profit_sharing_target || 'both').toUpperCase()}</span>
        </div>
      </motion.div>

      {/* CORE CALCULATION SECTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: PARAMETERS & BREAKDOWNS */}
        <motion.div variants={itemVariants} className="space-y-6">
          
          {/* SECTION 1: Gross Billed & Attendance */}
          <div className="clay bg-white dark:bg-[#121c19] border border-teal-950/10 dark:border-teal-900/20 p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-150/40 dark:border-teal-950/40 pb-2.5">
              <Calendar className="w-4 h-4 text-cyan-500" />
              1. Gross Billed & Attendance
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Gross Billed appointments:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">INR {docTotalGross.toLocaleString()}</span>
              </div>

              {doctorRule === 'present_days_only' && absencesCount > 0 && (
                <div className="space-y-3.5 border-t border-dashed border-slate-200/60 dark:border-teal-950/40 pt-3.5">
                  <div className="flex justify-between items-center font-bold text-rose-600 dark:text-rose-455">
                    <span>Absent Days Gross Deducted:</span>
                    <span className="font-mono text-sm">-INR {totalAbsentGross.toLocaleString()}</span>
                  </div>
                  
                  <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/10 rounded-2xl border border-rose-100/50 dark:border-rose-900/20 space-y-2">
                    <p className="font-bold text-[9px] text-rose-500 dark:text-rose-400 uppercase tracking-wider">Absentee Gross breakdown</p>
                    {absentDaysGross.map((d, i) => (
                      <div key={i} className="flex justify-between font-mono text-[10px] text-slate-650 dark:text-slate-400">
                        <span>{d.date} ({d.status.toUpperCase()}):</span>
                        <span className="font-semibold">INR {d.gross.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-850 pt-2 font-bold text-slate-850 dark:text-slate-100">
                    <span>Gross Billed for Salary:</span>
                    <span className="font-mono text-sm">INR {grossForSalary.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: Branch Operating Expenses (if percentage share) */}
          {doctor.compensation_type === 'percentage' && (
            <div className="clay bg-white dark:bg-[#121c19] border border-teal-950/10 dark:border-teal-900/20 p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-150/40 dark:border-teal-950/40 pb-2.5">
                <Zap className="w-4 h-4 text-amber-500" />
                2. Branch Operating Expenses
              </h3>

              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Electricity Bill:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-300">INR {electricity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Helper Boy Salaries:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-300">INR {branchHelpersPay.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Extra Expenses:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-300">INR {extras.toLocaleString()}</span>
                </div>
                
                {/* Total Expenses Row with Built-In Hover Tooltip Details */}
                <div className="flex justify-between border-t border-slate-150/60 dark:border-teal-950/40 pt-2.5 font-bold text-slate-850 dark:text-slate-100 relative group cursor-help">
                  <span className="flex items-center gap-1 border-b border-dashed border-slate-400 dark:border-teal-700/60 pb-0.5">
                    Total Branch Expenses ⓘ
                  </span>
                  <span className="font-mono text-rose-500 dark:text-rose-455">INR {(electricity + branchHelpersPay + extras).toLocaleString()}</span>
                  
                  {/* Detailed popover */}
                  <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-slate-950 text-white text-[11px] p-4 rounded-2xl shadow-xl z-50 w-64 border border-white/10 space-y-2.5 font-mono">
                    <p className="font-bold text-teal-400 border-b border-white/10 pb-1.5 text-[9px] uppercase tracking-wider">Expenses Details</p>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Electricity Bill:</span>
                      <span className="font-bold">INR {electricity.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Helper Boy Salaries:</span>
                      <span className="font-bold">INR {branchHelpersPay.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Extra Expenses:</span>
                      <span className="font-bold">INR {extras.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </motion.div>

        {/* RIGHT COLUMN: STEP-BY-STEP MATH */}
        <motion.div variants={itemVariants} className="space-y-6">
          
          <div className="clay bg-white dark:bg-[#121c19] border border-teal-950/10 dark:border-teal-900/20 p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-150/40 dark:border-teal-950/40 pb-2.5">
              <Calculator className="w-4 h-4 text-emerald-500" />
              3. Step-by-Step Mathematical Math
            </h3>

            <div className="space-y-4 font-mono text-[11px] text-slate-750 dark:text-slate-350 leading-relaxed bg-slate-50 dark:bg-[#0c1412] p-4 border border-slate-150/40 dark:border-teal-900/20 rounded-2xl">
              {doctor.compensation_type === 'percentage' ? (
                <>
                  <div className="border-b border-slate-200/60 dark:border-teal-950/20 pb-2.5">
                    <p className="text-[9px] text-slate-400 dark:text-teal-450 uppercase font-bold tracking-wide">Step A: Get Branch Revenue ({(doctor.profit_sharing_target || 'both').toUpperCase()})</p>
                    <p className="font-bold mt-1 text-slate-900 dark:text-teal-100 text-xs">
                      = INR {(totalTreatmentProfit + totalMedicineProfit).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="border-b border-slate-200/60 dark:border-teal-950/20 pb-2.5">
                    <p className="text-[9px] text-slate-400 dark:text-teal-450 uppercase font-bold tracking-wide">Step B: Compute Net Branch Profit (Revenue - Expenses)</p>
                    <p className="font-bold mt-1 text-slate-900 dark:text-teal-100 text-xs">
                      = INR {(totalTreatmentProfit + totalMedicineProfit).toLocaleString()} 
                      - INR {(electricity + branchHelpersPay + extras).toLocaleString()}
                      <br />
                      = INR {branchProfit.toLocaleString()}
                    </p>
                  </div>

                  <div className="border-b border-slate-200/60 dark:border-teal-950/20 pb-2.5">
                    <p className="text-[9px] text-slate-400 dark:text-teal-450 uppercase font-bold tracking-wide">Step C: Apply Profit Split ({doctor.profit_percentage}%)</p>
                    <p className="font-bold mt-1 text-slate-900 dark:text-teal-100 text-xs">
                      = INR {branchProfit.toLocaleString()} * {doctor.profit_percentage}%
                      <br />
                      = INR {Math.round(baseEarnings).toLocaleString()}
                    </p>
                  </div>

                  {doctorRule === 'present_days_only' && (
                    <div className="border-b border-slate-200/60 dark:border-teal-950/20 pb-2.5">
                      <p className="text-[9px] text-slate-400 dark:text-teal-450 uppercase font-bold tracking-wide">Step D: Prorate on Attendance ({workedDays} / {workingDays} days)</p>
                      <p className="font-bold mt-1 text-slate-900 dark:text-teal-100 text-xs">
                        = INR {Math.round(baseEarnings).toLocaleString()} * ({workedDays} / {workingDays})
                        <br />
                        = INR {Math.round(proratedBaseEarnings).toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="border-b border-slate-200/60 dark:border-teal-950/20 pb-2.5">
                    <p className="text-[9px] text-slate-400 dark:text-teal-450 uppercase font-bold tracking-wide">Step A: Prorate Fixed Salary on Attendance ({workedDays} / {workingDays} days)</p>
                    <p className="font-bold mt-1 text-slate-900 dark:text-teal-100 text-xs">
                      = INR {doctor.fixed_salary.toLocaleString()} * ({workedDays} / {workingDays})
                      <br />
                      = INR {Math.round(proratedBaseEarnings).toLocaleString()}
                    </p>
                  </div>
                </>
              )}

              <div>
                <p className="text-[9px] text-slate-400 dark:text-teal-450 uppercase font-bold tracking-wide">Step E: Subtract Fines & Deductions (Local Storage)</p>
                <p className="font-bold mt-1 text-slate-900 dark:text-teal-100 text-xs">
                  = INR {Math.round(proratedBaseEarnings).toLocaleString()} - INR {docReductions.toLocaleString()}
                  <br />
                  <span className="text-teal-650 dark:text-teal-400 font-extrabold text-sm block mt-1.5 border-t border-slate-200/40 dark:border-teal-950/40 pt-1.5">
                    = INR {Math.round(netPayout).toLocaleString()} Net Payout
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* ATTENDANCE RULE BANNER */}
          <div className="clay bg-[#fffbeb] border border-amber-200/60 dark:bg-amber-950/10 dark:border-amber-900/30 p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-amber-800 dark:text-amber-400">Clinic Attendance Policy</p>
              <p className="text-[11px] text-slate-650 dark:text-slate-400 leading-relaxed font-medium">
                The current calculation rule is set to <strong>{doctorRule === 'present_days_only' ? 'Present Days Only' : 'Full Month Payout'}</strong>. You can change this clinic-wide policy inside the Finances attendances settings tab.
              </p>
            </div>
          </div>

        </motion.div>

      </div>

    </motion.div>
  )
}
