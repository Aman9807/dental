'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { Calendar, TrendingUp, DollarSign, Activity } from 'lucide-react'

const COLORS = ['#0891b2', '#059669', '#334155', '#e11d48', '#d97706', '#7c3aed']

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

function getWorkingDaysInMonth(year: number, month: number, includeSundays: boolean) {
  let count = 0
  const date = new Date(year, month - 1, 1)
  while (date.getMonth() === month - 1) {
    if (date.getDay() !== 0 || includeSundays) count++
    date.setDate(date.getDate() + 1)
  }
  return count
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
      if (item.item_type === 'medicine') {
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

export default function AnalyticsTab({
  appointments, electricityExpenses, helperBoys, helperAttendance, extraExpenses, doctors, doctorAttendance, selectedBranch
}: AnalyticsTabProps) {

  // Aggregate Data by Month
  const monthlyData = useMemo(() => {
    const dataMap: Record<string, any> = {}

    // Initialize map from appointments
    appointments.forEach(appt => {
      const d = new Date(appt.appointment_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!dataMap[key]) dataMap[key] = { month: key, revenue: 0, treatmentProfit: 0, medicineProfit: 0, expenses: 0, netProfit: 0, appts: [] }
      
      if (selectedBranch === 'all' || appt.branches?.slug === selectedBranch) {
        dataMap[key].appts.push(appt)
      }
    })

    // Compute basic revenue & treatment/medicine profits
    Object.keys(dataMap).forEach(key => {
      let tProf = 0, mProf = 0
      dataMap[key].appts.forEach((a: any) => {
        const fin = getAppointmentFinances(a)
        if (fin) {
          tProf += fin.treatmentProfit
          mProf += fin.medicineProfit
        }
      })
      dataMap[key].treatmentProfit = tProf
      dataMap[key].medicineProfit = mProf
      dataMap[key].revenue = tProf + mProf
    })

    // Approximate Expenses per month
    // Extra Expenses
    extraExpenses.forEach(ex => {
      const d = new Date(ex.expense_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (dataMap[key]) {
        if (selectedBranch === 'all' || (doctors.find(doc => doc.branch_id === ex.branch_id && doc.branches?.slug === selectedBranch))) {
          dataMap[key].expenses += ex.amount || 0
        }
      }
    })

    // Electricity
    electricityExpenses.forEach(elec => {
      if (dataMap[elec.month_year]) {
        dataMap[elec.month_year].expenses += elec.electricity_bill || 0
      }
    })

    // Net Profit
    Object.keys(dataMap).forEach(key => {
      dataMap[key].netProfit = dataMap[key].revenue - dataMap[key].expenses
    })

    const sorted = Object.values(dataMap).sort((a, b) => a.month.localeCompare(b.month))
    return sorted
  }, [appointments, electricityExpenses, extraExpenses, selectedBranch, doctors])

  // Aggregate Data by Week for Recent Trend
  const weeklyData = useMemo(() => {
    // simplified weekly grouping
    const weeks: Record<string, any> = {}
    appointments.forEach(appt => {
      if (selectedBranch !== 'all' && appt.branches?.slug !== selectedBranch) return
      const d = new Date(appt.appointment_date)
      // Get week string e.g., 2026-W28
      const firstDayOfYear = new Date(d.getFullYear(), 0, 1)
      const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
      const key = `${d.getFullYear()}-W${weekNum}`
      
      if (!weeks[key]) weeks[key] = { week: key, profit: 0 }
      const fin = getAppointmentFinances(appt)
      if (fin) weeks[key].profit += fin.totalProfit
    })
    return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week)).slice(-10) // last 10 weeks
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
      { name: 'Treatment Profit', value: t },
      { name: 'Medicine Profit', value: m }
    ]
  }, [appointments, selectedBranch])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Profit Trend (Monthly) */}
        <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-6">
            <TrendingUp className="w-4 h-4 text-cyan-600" />
            Monthly Net Profit Trend
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => \`₹\${val}\`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  formatter={(value: number) => [\`₹\${value.toLocaleString()}\`, 'Net Profit']}
                />
                <Line type="monotone" dataKey="netProfit" stroke="#0891b2" strokeWidth={3} dot={{ r: 4, fill: '#0891b2', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-6">
            <Activity className="w-4 h-4 text-emerald-600" />
            Profit Distribution (Medicine vs Treatment)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {revenueBreakdown.map((entry, index) => (
                    <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => \`₹\${value.toLocaleString()}\`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Profit Bar Chart */}
        <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-6">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Weekly Profit Trajectory (Last 10 Weeks)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => \`₹\${val}\`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  formatter={(value: number) => [\`₹\${value.toLocaleString()}\`, 'Profit']}
                />
                <Bar dataKey="profit" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Composition over Months */}
        <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-6">
            <DollarSign className="w-4 h-4 text-rose-500" />
            Revenue vs Expenses (Monthly)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => \`₹\${val}\`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  formatter={(value: number) => \`₹\${value.toLocaleString()}\`}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                <Bar dataKey="revenue" name="Total Revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Total Expenses" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </motion.div>
  )
}
