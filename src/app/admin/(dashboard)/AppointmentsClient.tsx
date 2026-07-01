'use client'

import React, { useState } from 'react'
import { updateAppointmentStatus } from '@/app/admin/actions'
import { 
  Search, Calendar, Check, X, AlertCircle, Info, Filter,
  Building, User2, RefreshCw, ChevronDown, CheckCircle2, Clock
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

  // Calculate stats
  const totalCount = appointments.length
  const pendingCount = appointments.filter(a => a.status === 'pending').length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length
  const completedCount = appointments.filter(a => a.status === 'completed').length

  // Filtered Appointments
  const filteredAppointments = appointments.filter(appt => {
    // 1. Branch Filter
    if (selectedBranch !== 'all' && appt.branches?.slug !== selectedBranch) {
      return false
    }

    // 2. Date Filter
    if (selectedDate && appt.appointment_date !== selectedDate) {
      return false
    }

    // 3. Search Filter
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
                          className={`appearance-none pl-3 pr-8 py-1.5 border rounded-full text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer transition ${getStatusBadge(
                            appt.status
                          )}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
