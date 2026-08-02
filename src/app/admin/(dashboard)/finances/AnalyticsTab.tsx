'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart
} from 'recharts'
import { Calendar, TrendingUp, DollarSign, Activity, Sparkles, ShieldCheck, ArrowUpRight, BarChart3 } from 'lucide-react'
import DentalLogo from '@/components/DentalLogo'

const PIE_COLORS = ['#0891b2', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6']

interface AnalyticsTabProps {
  appointments: any[]
  electricityExpenses: any[]
  helperBoys: any[]
  helperAttendance: any[]
  extraExpenses: any[]
  doctors: any[]
  doctorAttendance: any[]
  selectedBranch: string
  branches: any[]
}

function getAppointmentFinances(appt: any) {
  const invoice = appt.invoices?.[0]
  if (!invoice) return null
  const treatmentDiscount = invoice.treatment_discount_percentage ?? invoice.discount_percentage ?? 0
  const medicineDiscount = invoice.medicine_discount_percentage ?? invoice.discount_percentage ?? 0

  const treatmentDiscountMultiplier = 1 - treatmentDiscount / 100
  const medicineDiscountMultiplier = 1 - medicineDiscount / 100
  let tRev = 0, tCost = 0, mRev = 0, mCost = 0

  if (invoice.invoice_items) {
    invoice.invoice_items.forEach((item: any) => {
      const p = Number(item.unit_price || 0) * Number(item.quantity || 1)
      const c = Number(item.unit_cost || 0) * Number(item.quantity || 1)
      const isMedicine = item.item_type === 'medicine' || (item.custom_name && /medicine|tab|capsule|syrup|strip/i.test(item.custom_name))
      if (isMedicine) {
        mRev += p; mCost += c;
      } else {
        tRev += p; tCost += c;
      }
    })
  }

  const netT = tRev * treatmentDiscountMultiplier
  const netM = mRev * medicineDiscountMultiplier
  return {
    netTreatmentRevenue: netT, treatmentCost: tCost, treatmentProfit: netT - tCost,
    netMedicineRevenue: netM, medicineCost: mCost, medicineProfit: netM - mCost,
    totalProfit: (netT - tCost) + (netM - mCost), totalPaid: invoice.total
  }
}

// Custom Glassmorphic Tooltip Component
const Custom3DTooltip = ({ active, payload, label, prefix = 'Rs. ' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-3d-dark p-3.5 rounded-2xl shadow-2xl border border-white/20 text-xs font-sans space-y-1.5 min-w-[160px]">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-white/10 pb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`tooltip-${index}`} className="flex justify-between items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              {entry.name || 'Value'}:
            </span>
            <span className="font-mono font-bold text-white">
              {prefix}{Number(entry.value || 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
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

export default function AnalyticsTab({
  appointments, electricityExpenses, helperBoys, helperAttendance, extraExpenses, doctors, doctorAttendance, selectedBranch, branches
}: AnalyticsTabProps) {

  // Aggregate Data by Month
  const monthlyData = useMemo(() => {
    const dataMap: Record<string, any> = {}

    appointments.forEach(appt => {
      const d = new Date(appt.appointment_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!dataMap[key]) dataMap[key] = { month: key, revenue: 0, treatmentProfit: 0, medicineProfit: 0, expenses: 0, netProfit: 0, appts: [] }
      
      if (selectedBranch === 'all' || appt.branches?.slug === selectedBranch) {
        dataMap[key].appts.push(appt)
      }
    })

    Object.keys(dataMap).forEach(key => {
      let tProf = 0, mProf = 0
      dataMap[key].appts.forEach((a: any) => {
        const fin = getAppointmentFinances(a)
        if (fin) {
          tProf += fin.treatmentProfit
          mProf += fin.medicineProfit
        }
      })
      dataMap[key].treatmentProfit = Math.round(tProf)
      dataMap[key].medicineProfit = Math.round(mProf)
      dataMap[key].revenue = Math.round(tProf + mProf)
    })

    extraExpenses.forEach(ex => {
      const d = new Date(ex.expense_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (dataMap[key]) {
        if (selectedBranch === 'all' || (doctors.find(doc => doc.branch_id === ex.branch_id && doc.branches?.slug === selectedBranch))) {
          dataMap[key].expenses += Math.round(ex.amount || 0)
        }
      }
    })

    electricityExpenses.forEach(elec => {
      if (dataMap[elec.month_year]) {
        if (selectedBranch === 'all' || (branches.find(b => b.id === elec.branch_id)?.slug === selectedBranch)) {
          dataMap[elec.month_year].expenses += Math.round(elec.electricity_bill || 0)
        }
      }
    })

    // Load salary reductions inside memo
    let salaryReductions: any[] = []
    if (typeof window !== 'undefined') {
      const savedReductions = localStorage.getItem('dental_salary_reductions')
      if (savedReductions) {
        try {
          salaryReductions = JSON.parse(savedReductions)
        } catch (e) {}
      }
    }

    // Compute helper salaries and doctor payouts for each month key to match totals cards
    Object.keys(dataMap).forEach(key => {
      const [yearStr, monthStr] = key.split('-')
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10)

      // 1. Helper Salaries
      const branchHelpers = helperBoys.filter(h => {
        if (selectedBranch === 'all') return true
        const branchSlug = branches.find(b => b.id === h.branch_id)?.slug
        return branchSlug === selectedBranch
      })

      const helperSalariesTotal = branchHelpers.reduce((sum, h) => {
        const hWorkingDays = getWorkingDaysInMonth(year, month, h.sunday_enabled)
        const hAbsences = helperAttendance.filter(a => {
          if (a.helper_boy_id !== h.id || (a.status !== 'absent' && a.status !== 'half_day')) return false
          const absDate = new Date(a.date)
          const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
          return absMonthStr === key
        })
        const shift1Abs = hAbsences.filter(a => a.shift === 1).reduce((acc, curr) => acc + (curr.status === 'half_day' ? 0.5 : 1.0), 0)
        const shift2Abs = hAbsences.filter(a => a.shift === 2).reduce((acc, curr) => acc + (curr.status === 'half_day' ? 0.5 : 1.0), 0)
        const shift1Worked = h.shift_1_enabled ? Math.max(0, hWorkingDays - shift1Abs) : 0
        const shift2Worked = h.shift_2_enabled ? Math.max(0, hWorkingDays - shift2Abs) : 0
        const basePay = (shift1Worked * h.shift_1_rate) + (shift2Worked * h.shift_2_rate)
        const reduction = salaryReductions
          .filter(r => r.person_id === h.id && r.month_year === key && r.person_type === 'helper')
          .reduce((acc, curr) => acc + curr.amount, 0)
        return sum + Math.max(0, basePay - reduction)
      }, 0)

      // 2. Doctor Payroll
      const activeDocs = doctors.filter(d => {
        if (selectedBranch === 'all') return true
        const branchSlug = branches.find(b => b.id === d.branch_id)?.slug
        return branchSlug === selectedBranch
      })

      // Get branch profit before doctor percentage payouts
      const branchTProfit = dataMap[key].revenue
      const branchExtras = extraExpenses.filter(ex => {
        const d = new Date(ex.expense_date)
        const expMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (expMonthStr !== key) return false
        if (selectedBranch === 'all') return true
        const branchSlug = branches.find(b => b.id === ex.branch_id)?.slug
        return branchSlug === selectedBranch
      }).reduce((sum, ex) => sum + (ex.amount || 0), 0)

      const branchElec = electricityExpenses.filter(e => {
        if (e.month_year !== key) return false
        if (selectedBranch === 'all') return true
        const branchSlug = branches.find(b => b.id === e.branch_id)?.slug
        return branchSlug === selectedBranch
      }).reduce((sum, e) => sum + (e.electricity_bill || 0), 0)

      const branchNetProfitBeforeDoctors = branchTProfit - helperSalariesTotal - branchElec - branchExtras

      let doctorFixedSalariesTotal = 0
      let doctorPercentagePayoutsTotal = 0

      activeDocs.forEach(d => {
        if (d.compensation_type === 'fixed') {
          const docWorkingDays = getWorkingDaysInMonth(year, month, false)
          const absencesCount = doctorAttendance.filter(a => {
            if (a.doctor_id !== d.id || (a.status !== 'absent' && a.status !== 'half_day')) return false
            const absDate = new Date(a.date)
            const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
            return absMonthStr === key
          }).reduce((acc, curr) => acc + (curr.status === 'half_day' ? 0.5 : 1.0), 0)
          
          const docWorked = Math.max(0, docWorkingDays - absencesCount)
          const dailyRate = d.fixed_salary / docWorkingDays
          const basePay = docWorked * dailyRate
          const reduction = salaryReductions
            .filter(r => r.person_id === d.id && r.month_year === key && r.person_type === 'doctor')
            .reduce((acc, curr) => acc + curr.amount, 0)
          doctorFixedSalariesTotal += Math.max(0, basePay - reduction)
        } else {
          let bProfit = branchNetProfitBeforeDoctors
          if (selectedBranch === 'all' && d.branch_id) {
            const docBranchBill = electricityExpenses.find(e => e.branch_id === d.branch_id && e.month_year === key)?.electricity_bill || 0
            const docBranchHelpers = helperBoys.filter(h => h.branch_id === d.branch_id)
            const docBranchHelpersPay = docBranchHelpers.reduce((sum, h) => {
              const hWorkingDays = getWorkingDaysInMonth(year, month, h.sunday_enabled)
              const hAbsences = helperAttendance.filter(a => {
                if (a.helper_boy_id !== h.id || (a.status !== 'absent' && a.status !== 'half_day')) return false
                const absDate = new Date(a.date)
                const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
                return absMonthStr === key
              })
              const shift1Abs = hAbsences.filter(a => a.shift === 1).reduce((acc, curr) => acc + (curr.status === 'half_day' ? 0.5 : 1.0), 0)
              const shift2Abs = hAbsences.filter(a => a.shift === 2).reduce((acc, curr) => acc + (curr.status === 'half_day' ? 0.5 : 1.0), 0)
              const shift1Worked = h.shift_1_enabled ? Math.max(0, hWorkingDays - shift1Abs) : 0
              const shift2Worked = h.shift_2_enabled ? Math.max(0, hWorkingDays - shift2Abs) : 0
              const basePay = (shift1Worked * h.shift_1_rate) + (shift2Worked * h.shift_2_rate)
              const reduction = salaryReductions
                .filter(r => r.person_id === h.id && r.month_year === key && r.person_type === 'helper')
                .reduce((acc, curr) => acc + curr.amount, 0)
              return sum + Math.max(0, basePay - reduction)
            }, 0)
            const docBranchExtras = extraExpenses.filter(e => {
              const expDate = new Date(e.expense_date)
              const expMonthStr = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`
              return expMonthStr === key && e.branch_id === d.branch_id
            }).reduce((sum, e) => sum + e.amount, 0)
            
            const docBranchAppts = dataMap[key].appts.filter((appt: any) => {
              return appt.branches?.id === d.branch_id
            })
            
            let docBranchTProfit = 0
            let docBranchMProfit = 0
            docBranchAppts.forEach((appt: any) => {
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
          } else {
            const target = d.profit_sharing_target || 'both'
            let filteredTProfit = branchTProfit
            if (target === 'treatment') {
              filteredTProfit = dataMap[key].treatmentProfit
            } else if (target === 'medicine') {
              filteredTProfit = dataMap[key].medicineProfit
            }
            bProfit = filteredTProfit - helperSalariesTotal - branchElec - branchExtras
          }

          if (bProfit > 0) {
            const docWorkingDays = getWorkingDaysInMonth(year, month, false)
            const absencesCount = doctorAttendance.filter(a => {
              if (a.doctor_id !== d.id || (a.status !== 'absent' && a.status !== 'half_day')) return false
              const absDate = new Date(a.date)
              const absMonthStr = `${absDate.getFullYear()}-${String(absDate.getMonth() + 1).padStart(2, '0')}`
              return absMonthStr === key
            }).reduce((acc, curr) => acc + (curr.status === 'half_day' ? 0.5 : 1.0), 0)
            const docWorked = Math.max(0, docWorkingDays - absencesCount)
            const fullPayout = bProfit * (d.profit_percentage / 100)
            
            const docRule = (d.specialty || '').split('||')[1] || 'present_days_only'
            const docPayout = docRule === 'present_days_only' && docWorkingDays > 0
              ? fullPayout * (docWorked / docWorkingDays)
              : fullPayout
            
            const reduction = salaryReductions
              .filter(r => r.person_id === d.id && r.month_year === key && r.person_type === 'doctor')
              .reduce((acc, curr) => acc + curr.amount, 0)
            doctorPercentagePayoutsTotal += Math.max(0, docPayout - reduction)
          }
        }
      })

      const totalDoctorPay = doctorFixedSalariesTotal + doctorPercentagePayoutsTotal
      dataMap[key].expenses += Math.round(helperSalariesTotal + totalDoctorPay)
    })

    Object.keys(dataMap).forEach(key => {
      dataMap[key].netProfit = dataMap[key].revenue - dataMap[key].expenses
    })

    const sorted = Object.values(dataMap).sort((a, b) => a.month.localeCompare(b.month))
    return sorted
  }, [appointments, electricityExpenses, extraExpenses, selectedBranch, doctors, branches, helperBoys, helperAttendance, doctorAttendance])

  // Aggregate Data by Week for Recent Trend
  const weeklyData = useMemo(() => {
    const weeks: Record<string, any> = {}
    appointments.forEach(appt => {
      if (selectedBranch !== 'all' && appt.branches?.slug !== selectedBranch) return
      const d = new Date(appt.appointment_date)
      const firstDayOfYear = new Date(d.getFullYear(), 0, 1)
      const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
      const key = `${d.getFullYear()}-W${weekNum}`
      
      if (!weeks[key]) weeks[key] = { week: key, profit: 0 }
      const fin = getAppointmentFinances(appt)
      if (fin) weeks[key].profit += Math.round(fin.totalProfit)
    })
    return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week)).slice(-10)
  }, [appointments, selectedBranch])

  // Revenue Breakdown (Medicine vs Treatment)
  const revenueBreakdown = useMemo(() => {
    let t = 0, m = 0
    appointments.forEach(appt => {
      if (selectedBranch !== 'all' && appt.branches?.slug !== selectedBranch) return
      const fin = getAppointmentFinances(appt)
      if (fin) {
        t += fin.treatmentProfit
        m += fin.medicineProfit
      }
    })
    return [
      { name: 'Treatment Profit', value: Math.round(t) },
      { name: 'Medicine Profit', value: Math.round(m) }
    ]
  }, [appointments, selectedBranch])

  return (
    <div className="perspective-stage space-y-8 font-sans">
      
      {/* ═══ 3D CHARTS GRID (ROW 1) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12 }}
          className="clay p-6 md:p-7 border border-slate-200/60 space-y-6 relative overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-semibold text-slate-900 leading-tight">
                  Monthly Net Profit Trajectory
                </h3>
                <p className="text-[10px] text-slate-400 font-light uppercase tracking-wider">
                  Live revenue minus operational expenses
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-400/30 rounded-full text-[10px] font-bold text-cyan-700 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-600 animate-pulse" />
              Interactive 3D
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip content={<Custom3DTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="netProfit" 
                  name="Net Profit"
                  stroke="#0891b2" 
                  strokeWidth={4} 
                  fill="url(#profitGrad)"
                  dot={{ r: 5, fill: '#0891b2', strokeWidth: 3, stroke: '#ffffff' }} 
                  activeDot={{ r: 8, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 3 }} 
                  isAnimationActive={true}
                  animationDuration={1800}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12 }}
          className="clay p-6 md:p-7 border border-slate-200/60 space-y-6 relative overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-semibold text-slate-900 leading-tight">
                  Profit Distribution Split
                </h3>
                <p className="text-[10px] text-slate-400 font-light uppercase tracking-wider">
                  Medicine Stock vs Clinical Procedure Profit
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-400/30 rounded-full text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
              Share Ratio
            </span>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={6}
                  dataKey="value"
                  isAnimationActive={true}
                  animationDuration={1600}
                  animationBegin={300}
                >
                  {revenueBreakdown.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={PIE_COLORS[index % PIE_COLORS.length]} 
                      stroke="#ffffff" 
                      strokeWidth={3} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<Custom3DTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#475569', fontWeight: 600 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ═══ 3D CHARTS GRID (ROW 2) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12 }}
          className="clay p-6 md:p-7 border border-slate-200/60 space-y-6 relative overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-semibold text-slate-900 leading-tight">
                  Weekly Profit Trajectory
                </h3>
                <p className="text-[10px] text-slate-400 font-light uppercase tracking-wider">
                  Recent 10-Week Performance Cycles
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-400/30 rounded-full text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
              10 Weeks
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="barGradIndigo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip content={<Custom3DTooltip />} />
                <Bar 
                  dataKey="profit" 
                  name="Weekly Profit"
                  fill="url(#barGradIndigo)" 
                  radius={[8, 8, 0, 0]} 
                  barSize={32}
                  isAnimationActive={true}
                  animationDuration={1800}
                  animationBegin={500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12 }}
          className="clay p-6 md:p-7 border border-slate-200/60 space-y-6 relative overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-semibold text-slate-900 leading-tight">
                  Revenue vs Expenses Monthly
                </h3>
                <p className="text-[10px] text-slate-400 font-light uppercase tracking-wider">
                  Gross Income vs Total Operational Costs
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-rose-500/10 border border-rose-400/30 rounded-full text-[10px] font-bold text-rose-700 uppercase tracking-wider">
              Comparison
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="barGradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="barGradExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip content={<Custom3DTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#475569', fontWeight: 600 }} />
                <Bar 
                  dataKey="revenue" 
                  name="Total Revenue" 
                  fill="url(#barGradRevenue)" 
                  radius={[8, 8, 0, 0]} 
                  isAnimationActive={true}
                  animationDuration={2000}
                  animationBegin={600}
                />
                <Bar 
                  dataKey="expenses" 
                  name="Total Expenses" 
                  fill="url(#barGradExpenses)" 
                  radius={[8, 8, 0, 0]} 
                  isAnimationActive={true}
                  animationDuration={2000}
                  animationBegin={700}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

    </div>
  )
}
