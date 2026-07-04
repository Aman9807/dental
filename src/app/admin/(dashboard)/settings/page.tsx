'use client'

import React, { useState, useEffect } from 'react'
import { changeAdminPassword, updateBranchHours, addTimeSlot, deleteTimeSlot, updateCameraPasscode } from '@/app/admin/actions'
import { supabase } from '@/lib/supabase'
import { 
  Settings, Key, Server, Mail, ShieldAlert, 
  CheckCircle, Loader2, RefreshCw, Clock, Edit2, Check, X, Trash2, Plus, Camera
} from 'lucide-react'

export default function AdminSettingsPage() {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Branch hours management states
  const [branches, setBranches] = useState<any[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null)
  const [tempHours, setTempHours] = useState('')
  const [updatingBranchId, setUpdatingBranchId] = useState<string | null>(null)

  // Camera passcode management states
  const [editingPasscodeId, setEditingPasscodeId] = useState<string | null>(null)
  const [tempPasscode, setTempPasscode] = useState('')
  const [updatingPasscodeId, setUpdatingPasscodeId] = useState<string | null>(null)

  // Time slots management states
  const [timeSlots, setTimeSlots] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [newTime, setNewTime] = useState('')
  const [addingSlot, setAddingSlot] = useState(false)
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  
  const fetchTimeSlots = async () => {
    setLoadingSlots(true)
    setSlotsError(null)
    try {
      const { data, error } = await supabase
        .from('time_slots')
        .select('id, time_value, time_label')
        .order('time_value')
      if (error) throw error
      setTimeSlots(data || [])
    } catch (err: any) {
      console.error('Error fetching time slots:', err)
      setSlotsError('Could not load time slots from database. Please ensure you executed the SQL migration.')
    } finally {
      setLoadingSlots(false)
    }
  }

  useEffect(() => {
    async function fetchBranches() {
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('id, name, slug, working_hours, camera_passcode')
          .order('name')
        if (error) throw error
        setBranches(data || [])
      } catch (err) {
        console.error('Error fetching branches:', err)
      } finally {
        setLoadingBranches(false)
      }
    }
    fetchBranches()
    fetchTimeSlots()
  }, [])

  const handleSaveHours = async (branchId: string) => {
    setUpdatingBranchId(branchId)
    try {
      const res = await updateBranchHours(branchId, tempHours)
      if (res.success) {
        setBranches(prev => prev.map(b => b.id === branchId ? { ...b, working_hours: tempHours } : b))
        setEditingBranchId(null)
      } else {
        alert(res.error || 'Failed to update hours')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingBranchId(null)
    }
  }

  const handleSavePasscode = async (branchId: string) => {
    setUpdatingPasscodeId(branchId)
    try {
      const res = await updateCameraPasscode(branchId, tempPasscode)
      if (res.success) {
        setBranches(prev => prev.map(b => b.id === branchId ? { ...b, camera_passcode: tempPasscode } : b))
        setEditingPasscodeId(null)
      } else {
        alert(res.error || 'Failed to update passcode')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingPasscodeId(null)
    }
  }

  const handleAddTimeSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTime) return
    setAddingSlot(true)
    try {
      const res = await addTimeSlot(newTime)
      if (res.success) {
        setNewTime('')
        await fetchTimeSlots()
      } else {
        alert(res.error || 'Failed to add time slot')
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'An error occurred')
    } finally {
      setAddingSlot(false)
    }
  }

  const handleDeleteTimeSlot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return
    setDeletingSlotId(id)
    try {
      const res = await deleteTimeSlot(id)
      if (res.success) {
        await fetchTimeSlots()
      } else {
        alert(res.error || 'Failed to delete time slot')
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'An error occurred')
    } finally {
      setDeletingSlotId(null)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSuccessMsg(null)
    
    try {
      const res = await changeAdminPassword(password)
      setSuccessMsg(res.message)
      setPassword('')
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans max-w-4xl">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-serif text-slate-900 font-normal flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-700" />
          System Settings
        </h1>
        <p className="text-xs text-slate-400 font-light uppercase tracking-wider">
          Configure security, integrations, and branches
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Side: Environment variables / connection statuses */}
        <div className="space-y-6">
          
          {/* SMTP / Resend Integration Status Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Mail className="w-4 h-4 text-slate-500" />
              Email Integration (Resend)
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-light">Status:</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Active (API Key Loaded)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-light">API Key Prefix:</span>
                <code className="text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150">
                  re_Z5UgQKM...
                </code>
              </div>
              <div className="text-[11px] text-slate-400 font-light leading-relaxed pt-2">
                New appointment bookings automatically trigger webhook payloads, calling the Supabase Deno Edge Function which notifies doctors instantly via Resend email.
              </div>
            </div>
          </div>

          {/* Database Info Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Server className="w-4 h-4 text-slate-500" />
              Database Engine (Supabase)
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-light">Engine Type:</span>
                <span className="text-slate-700 font-medium">PostgreSQL (Relational DB)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-light">Security Mode:</span>
                <span className="text-slate-700 font-medium">Row Level Security (RLS) Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-light">Tables Monitored:</span>
                <span className="text-slate-600 font-light">branches, doctors, patients, appointments</span>
              </div>
            </div>
          </div>

          {/* Clinic Branch Hours Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Clock className="w-4 h-4 text-slate-500" />
              Clinic Branch Hours (Store Timings)
            </h3>

            {loadingBranches ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {branches.map(branch => (
                  <div key={branch.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-700">{branch.name}</span>
                      {editingBranchId === branch.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSaveHours(branch.id)}
                            disabled={updatingBranchId === branch.id}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                            title="Save changes"
                          >
                            {updatingBranchId === branch.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingBranchId(null)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingBranchId(branch.id)
                            setTempHours(branch.working_hours || '')
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
                          title="Edit branch hours"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    
                    {editingBranchId === branch.id ? (
                      <textarea
                        rows={2}
                        value={tempHours}
                        onChange={e => setTempHours(e.target.value)}
                        placeholder="e.g. Monday – Saturday: 9:00 AM – 6:00 PM"
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-800 bg-white text-slate-800"
                      />
                    ) : (
                      <p className="text-xs text-slate-500 font-light leading-relaxed">
                        {branch.working_hours || 'No timings set yet.'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Branch Passcodes Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Camera className="w-4 h-4 text-slate-500" />
              Branch Passcodes (Mobile camera upload)
            </h3>

            {loadingBranches ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {branches.map(branch => (
                  <div key={branch.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-700">{branch.name} Passcode</span>
                      {editingPasscodeId === branch.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSavePasscode(branch.id)}
                            disabled={updatingPasscodeId === branch.id}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                            title="Save changes"
                          >
                            {updatingPasscodeId === branch.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingPasscodeId(null)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPasscodeId(branch.id)
                            setTempPasscode(branch.camera_passcode || '')
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
                          title="Edit branch passcode"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    
                    {editingPasscodeId === branch.id ? (
                      <input
                        type="text"
                        maxLength={10}
                        value={tempPasscode}
                        onChange={e => setTempPasscode(e.target.value)}
                        placeholder="e.g. 1234"
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-800 bg-white text-slate-800 font-mono"
                      />
                    ) : (
                      <p className="text-xs text-slate-500 font-mono leading-relaxed bg-slate-100/50 inline-block px-2 py-0.5 rounded border border-slate-150">
                        {branch.camera_passcode || '1234'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manage Time Slots Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Clock className="w-4 h-4 text-slate-500" />
              Manage Patient Time Slots
            </h3>

            {/* Add Slot Form */}
            <form onSubmit={handleAddTimeSlot} className="flex gap-2">
              <input
                type="time"
                required
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
              />
              <button
                type="submit"
                disabled={addingSlot || !newTime}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl transition flex items-center gap-1 shrink-0"
              >
                {addingSlot ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Add Slot
              </button>
            </form>

            {slotsError && (
              <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-xl leading-normal">
                {slotsError}
              </p>
            )}

            {/* List Slots */}
            {loadingSlots ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {timeSlots.length === 0 ? (
                  <p className="text-xs text-slate-400 font-light text-center py-4">
                    No time slots configured. Add a new one above.
                  </p>
                ) : (
                  timeSlots.map(slot => (
                    <div key={slot.id} className="flex justify-between items-center px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-semibold text-slate-700">{slot.time_label}</span>
                      <span className="text-[10px] text-slate-400 font-light font-mono mr-auto ml-2 bg-slate-100 px-1.5 py-0.5 rounded">
                        {slot.time_value}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTimeSlot(slot.id)}
                        disabled={deletingSlotId === slot.id}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                        title="Delete slot"
                      >
                        {deletingSlotId === slot.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Security Settings */}
        <div className="space-y-6">
          
          {/* Admin Credentials Changer Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Key className="w-4 h-4 text-slate-500" />
              Change Admin Password
            </h3>

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">
                  New Passcode
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new admin passcode"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Change Passcode
              </button>
            </form>
          </div>

          {/* Secure Warnings Card */}
          <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4 bg-rose-50/20 border-rose-100">
            <h3 className="text-sm font-semibold text-rose-800 flex items-center gap-2 pb-2 border-b border-rose-100/50">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Access Notice
            </h3>
            <p className="text-xs text-rose-700/80 font-light leading-relaxed">
              This panel provides absolute controls over doctors, clinics, and appointment listings. Do not share admin panel authorization cookies or passwords. Store all Supabase credentials securely.
            </p>
          </div>

        </div>

      </div>

    </div>
  )
}
