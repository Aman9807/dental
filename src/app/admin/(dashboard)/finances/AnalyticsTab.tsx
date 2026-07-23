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
}

function getAppointmentFinances(appt: any) {
  const invoice = appt.invoices?.[0]
  if (!invoice) return null
  const discountMultiplier = 1 - (invoice.discount_percentage || 0) / 100
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

  const netT = tRev * discountMultiplier
  const netM = mRev * discountMultiplier
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

export default function AnalyticsTab({
  appointments, electricityExpenses, helperBoys, helperAttendance, extraExpenses, doctors, doctorAttendance, selectedBranch
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
        dataMap[elec.month_year].expenses += Math.round(elec.electricity_bill || 0)
      }
    })

    Object.keys(dataMap).forEach(key => {
      dataMap[key].netProfit = dataMap[key].revenue - dataMap[key].expenses
    })

    const sorted = Object.values(dataMap).sort((a, b) => a.month.localeCompare(b.month))
    return sorted
  }, [appointments, electricityExpenses, extraExpenses, selectedBranch, doctors])

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
        
        {/* CHART 1: MONTHLY NET PROFIT TREND */}
        <motion.div 
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="card-3d glass-3d p-6 md:p-7 rounded-3xl shadow-xl border border-white/80 space-y-6 relative overflow-hidden"
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

        {/* CHART 2: PROFIT DISTRIBUTION (PIE CHART) */}
        <motion.div 
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
          className="card-3d glass-3d p-6 md:p-7 rounded-3xl shadow-xl border border-white/80 space-y-6 relative overflow-hidden"
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
        
        {/* CHART 3: WEEKLY PROFIT TRAJECTORY */}
        <motion.div 
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          className="card-3d glass-3d p-6 md:p-7 rounded-3xl shadow-xl border border-white/80 space-y-6 relative overflow-hidden"
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

        {/* CHART 4: REVENUE VS EXPENSES COMPOSITION */}
        <motion.div 
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.55 }}
          className="card-3d glass-3d p-6 md:p-7 rounded-3xl shadow-xl border border-white/80 space-y-6 relative overflow-hidden"
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
