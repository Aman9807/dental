'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  changeAdminPassword, updateBranchHours, addTimeSlot, 
  deleteTimeSlot, updateCameraPasscode, addTreatment, 
  updateTreatmentPrice, getAllMedicines, saveMedicineStock 
} from '@/app/admin/actions'
import { supabase } from '@/lib/supabase'
import { 
  Settings, Key, Server, Mail, ShieldAlert, 
  CheckCircle, Loader2, Clock, Edit2, Check, X, 
  Trash2, Plus, Camera, Activity, DollarSign, Barcode, Inbox,
  Shield, Building2, Stethoscope, Pill, Download, Upload, Video
} from 'lucide-react'

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'security' | 'branches' | 'treatments' | 'medicines'>('security')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Percentage Doctor Profit Share Rule State
  const [doctorRule, setDoctorRule] = useState<'present_days_only' | 'full_month'>('present_days_only')
  const [showDoctorRuleInfo, setShowDoctorRuleInfo] = useState(false)

  useEffect(() => {
    const savedRule = localStorage.getItem('dental_doctor_payout_rule')
    if (savedRule === 'full_month' || savedRule === 'present_days_only') {
      setDoctorRule(savedRule)
    }
  }, [])

  const handleSaveDoctorRule = (rule: 'present_days_only' | 'full_month') => {
    setDoctorRule(rule)
    localStorage.setItem('dental_doctor_payout_rule', rule)
  }

  // Safe helper to format dates from TiDB Cloud database to prevent React crashes
  const formatExpiry = (dateVal: any) => {
    if (!dateVal) return 'N/A'
    if (dateVal instanceof Date) {
      return dateVal.toISOString().split('T')[0]
    }
    return String(dateVal).split('T')[0]
  }

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

  // Treatment / Procedure management states
  const [treatments, setTreatments] = useState<any[]>([])
  const [loadingTreatments, setLoadingTreatments] = useState(true)
  const [newTreatmentName, setNewTreatmentName] = useState('')
  const [newTreatmentPrice, setNewTreatmentPrice] = useState('')
  const [newTreatmentCost, setNewTreatmentCost] = useState('')
  const [addingTreatment, setAddingTreatment] = useState(false)
  const [editingTreatmentId, setEditingTreatmentId] = useState<string | null>(null)
  const [tempTreatmentPrice, setTempTreatmentPrice] = useState('')
  const [tempTreatmentCost, setTempTreatmentCost] = useState('')
  const [updatingTreatmentId, setUpdatingTreatmentId] = useState<string | null>(null)
  const [treatmentError, setTreatmentError] = useState<string | null>(null)

  // Medicine management states
  const [medicines, setMedicines] = useState<any[]>([])
  const [loadingMeds, setLoadingMeds] = useState(true)
  const [medsError, setMedsError] = useState<string | null>(null)
  const [selectedInventoryBranch, setSelectedInventoryBranch] = useState('hazara')
  const [newMedBarcode, setNewMedBarcode] = useState('')
  const [newMedName, setNewMedName] = useState('')
  const [newMedGeneric, setNewMedGeneric] = useState('')
  const [newMedBatch, setNewMedBatch] = useState('GEN-BATCH')
  const [newMedExpiry, setNewMedExpiry] = useState('')
  const [newMedTabletsPerPatch, setNewMedTabletsPerPatch] = useState('10')
  const [newMedPatchPrice, setNewMedPatchPrice] = useState('')
  const [newMedCostPrice, setNewMedCostPrice] = useState('')
  const [newMedQty, setNewMedQty] = useState('10')
  const [addingMed, setAddingMed] = useState(false)

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
      setSlotsError('Could not load time slots from database.')
    } finally {
      setLoadingSlots(false)
    }
  }

  const fetchTreatments = async () => {
    setLoadingTreatments(true)
    setTreatmentError(null)
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      setTreatments(data || [])
    } catch (err: any) {
      console.error('Error fetching treatments:', err)
      setTreatmentError('Could not load treatments list.')
    } finally {
      setLoadingTreatments(false)
    }
  }

  const fetchMedicines = async (branchSlug: string = 'hazara') => {
    setLoadingMeds(true)
    setMedsError(null)
    try {
      const res = await getAllMedicines(branchSlug)
      if (res.success && res.data) {
        setMedicines(res.data)
      } else {
        setMedsError(res.error || 'Failed to load medicines.')
      }
    } catch (err: any) {
      console.error(err)
      setMedsError('Failed to fetch medicines inventory.')
    } finally {
      setLoadingMeds(false)
    }
  }

  const fetchBranches = async () => {
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

  useEffect(() => {
    fetchBranches()
    fetchTimeSlots()
    fetchTreatments()
  }, [])

  useEffect(() => {
    fetchMedicines(selectedInventoryBranch)
  }, [selectedInventoryBranch])

  const handleCreateTreatment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTreatmentName || !newTreatmentPrice || !newTreatmentCost) return
    setAddingTreatment(true)
    try {
      const price = parseFloat(newTreatmentPrice)
      const cost = parseFloat(newTreatmentCost)
      const res = await addTreatment(newTreatmentName, price, cost)
      if (res.success) {
        setNewTreatmentName('')
        setNewTreatmentPrice('')
        setNewTreatmentCost('')
        await fetchTreatments()
      } else {
        alert(res.error || 'Failed to add treatment')
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'An error occurred')
    } finally {
      setAddingTreatment(false)
    }
  }

  const handleSaveTreatmentDetails = async (id: string) => {
    if (!tempTreatmentPrice || !tempTreatmentCost) return
    setUpdatingTreatmentId(id)
    try {
      const price = parseFloat(tempTreatmentPrice)
      const cost = parseFloat(tempTreatmentCost)
      const res = await updateTreatmentPrice(id, price, cost)
      if (res.success) {
        setEditingTreatmentId(null)
        await fetchTreatments()
      } else {
        alert(res.error || 'Failed to update treatment details')
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'An error occurred')
    } finally {
      setUpdatingTreatmentId(null)
    }
  }

  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMedBarcode || !newMedName || !newMedPatchPrice || !newMedCostPrice) return
    setAddingMed(true)
    try {
      const res = await saveMedicineStock(newMedBarcode, Number(newMedQty), {
        name: newMedName,
        genericName: newMedGeneric || undefined,
        batchNumber: newMedBatch,
        expiryDate: newMedExpiry || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        patchPrice: Number(newMedPatchPrice),
        costPrice: Number(newMedCostPrice),
        tabletsPerPatch: Number(newMedTabletsPerPatch),
        branchSlug: selectedInventoryBranch
      })

      if (res.success) {
        setNewMedBarcode('')
        setNewMedName('')
        setNewMedGeneric('')
        setNewMedBatch('GEN-BATCH')
        setNewMedExpiry('')
        setNewMedPatchPrice('')
        setNewMedCostPrice('')
        await fetchMedicines(selectedInventoryBranch)
      } else {
        alert(res.error || 'Failed to register medicine stock')
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'An error occurred')
    } finally {
      setAddingMed(false)
    }
  }

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

  // Export Medicines Inventory to Excel-compatible CSV format
  const exportMedicinesInventory = () => {
    const headers = [
      'Barcode',
      'Name',
      'Generic Name',
      'Batch Number',
      'Expiry Date',
      'Tablets Per Strip',
      'Strips Quantity',
      'Price Per Strip',
      'Cost Per Strip'
    ]

    const rows = medicines.map(med => {
      const activeBatch = med.batches?.find((b: any) => Number(b.stock) > 0) || med.batches?.[0]
      const tabsPerPatch = Number(med.tablets_per_patch || 10)
      const stripsStock = Math.ceil(Number(med.stock || 0) / tabsPerPatch)
      const pricePerStrip = activeBatch ? Number(activeBatch.price) * tabsPerPatch : 0
      const costPerStrip = activeBatch ? Number(activeBatch.cost_price || 0) * tabsPerPatch : 0
      const batchNumber = activeBatch?.batch_number || 'GEN-BATCH'
      const expiry = activeBatch && activeBatch.expiry_date ? formatExpiry(activeBatch.expiry_date) : new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
      
      return [
        med.barcode || '',
        med.name || '',
        med.generic_name || '',
        batchNumber,
        expiry,
        String(tabsPerPatch),
        String(stripsStock > 0 ? stripsStock : 0),
        pricePerStrip.toFixed(2),
        costPerStrip.toFixed(2)
      ]
    })

    exportToCSV(`inventory_${selectedInventoryBranch}.csv`, headers, rows)
  }

  // Download Medicines Import Template CSV
  const downloadMedTemplate = () => {
    const headers = [
      'Barcode',
      'Name',
      'Generic Name',
      'Batch Number',
      'Expiry Date',
      'Tablets Per Strip',
      'Strips Quantity',
      'Price Per Strip',
      'Cost Per Strip'
    ]
    const sampleRows = [
      ['8901117210103', 'Amoxicillin 500mg', 'Amoxicillin', 'AMX2026', '2026-12-31', '10', '50', '120', '80'],
      ['8901234567890', 'Paracetamol 650mg', 'Paracetamol', 'PCT2026', '2026-10-15', '10', '100', '30', '20']
    ]

    exportToCSV(`template_medicines_import.csv`, headers, sampleRows)
  }

  // Bulk Import Medicines from CSV
  const handleBulkImportMeds = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoadingMeds(true)
    setMedsError(null)

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        if (!text) throw new Error('File content is empty.')

        const rows = parseCSV(text)
        if (!rows || rows.length === 0) {
          throw new Error('No valid records found in CSV file.')
        }

        let successCount = 0
        let failCount = 0

        for (const row of rows) {
          const barcode = String(row.barcode || row.gtin || row.code || '').trim()
          const name = String(row.name || row.medicine_name || row.title || row.item_name || '').trim()

          const priceVal = row.price_per_strip || row.price_per_strip_inr || row.price || row.selling_price
          const priceStr = priceVal !== undefined && priceVal !== null && String(priceVal).trim() !== '' ? String(priceVal).trim() : null

          const costVal = row.cost_per_strip || row.cost_per_strip_inr || row.cost_price_per_strip || row.cost || row.cost_price
          const costStr = costVal !== undefined && costVal !== null && String(costVal).trim() !== '' ? String(costVal).trim() : '0'

          const tabletsPerPatch = parseInt(row.tablets_per_strip || row.tablets_per_patch || row.tablets || row.tabs || '10') || 10

          let qtyStr = row.strips_quantity || row.quantity || row.qty || row.strips || row.strips_qty
          if ((!qtyStr || String(qtyStr).trim() === '') && (row.total_stock_tablets || row.stock)) {
            const totalTabs = parseInt(row.total_stock_tablets || row.stock) || 0
            qtyStr = String(Math.ceil(totalTabs / tabletsPerPatch))
          }

          if (!barcode || !name || !priceStr || !qtyStr) {
            console.warn('Skipping invalid CSV row:', row)
            failCount++
            continue
          }

          const genericName = row.generic_name || row.generic
          const batchNumber = row.batch_number || row.batch || 'GEN-BATCH'

          let expiryDate = row.expiry_date || row.expiry || row.oldest_expiry
          if (!expiryDate || expiryDate === 'N/A' || String(expiryDate).includes('N/A')) {
            expiryDate = new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
          }
          
          try {
            const res = await saveMedicineStock(barcode, Number(qtyStr), {
              name,
              genericName: genericName || undefined,
              batchNumber,
              expiryDate,
              patchPrice: Number(priceStr),
              costPrice: Number(costStr),
              tabletsPerPatch,
              branchSlug: selectedInventoryBranch
            })
            if (res.success) {
              successCount++
            } else {
              failCount++
            }
          } catch (err) {
            console.error('Error saving row:', err)
            failCount++
          }
        }

        alert(`Bulk Import Complete!\nSuccessfully imported: ${successCount} items.\nFailed: ${failCount} items.`)
        await fetchMedicines(selectedInventoryBranch)
      } catch (err: any) {
        console.error(err)
        alert('Failed to parse CSV file: ' + err.message)
      } finally {
        setLoadingMeds(false)
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  // Parse CSV helper supporting quotes and commas
  const parseCSV = (text: string): any[] => {
    const lines = text.split(/\r?\n/)
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => 
      h.trim()
       .replace(/^["']|["']$/g, '')
       .toLowerCase()
       .replace(/[^a-z0-9]/g, '_')
       .replace(/_+/g, '_')
       .replace(/^_+|_+$/g, '')
    )
    const results: any[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values: string[] = []
      let currentVal = ''
      let inQuotes = false

      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(currentVal.trim().replace(/^["']|["']$/g, ''))
          currentVal = ''
        } else {
          currentVal += char
        }
      }
      values.push(currentVal.trim().replace(/^["']|["']$/g, ''))

      const rowObj: any = {}
      headers.forEach((header, idx) => {
        rowObj[header] = values[idx] || ''
      })
      results.push(rowObj)
    }
    return results
  }

  // Excel-compatible CSV exporter helper
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="perspective-stage space-y-7 font-sans max-w-6xl"
    >
      
      {/* ════ SECTION 1: HEADER & TITLE ════ */}
      <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-white/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-cyan-400 shadow-md">
            <Settings className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">
              System Settings & Control Terminal
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Configure clinic security, doctor profit share policies, branch hours, time slots, treatments, and stock inventory.
            </p>
          </div>
        </div>
      </div>

      {/* ════ SECTION 2: 3D TABS CONTROL DECK ════ */}
      <div className="card-3d glass-3d p-2 rounded-2xl shadow-lg border border-white/80 flex items-center gap-2 overflow-x-auto">
        {[
          { key: 'security', label: '🔐 Security & Policies', icon: Shield },
          { key: 'branches', label: '🏥 Branch Hours & Slots', icon: Building2 },
          { key: 'treatments', label: '🩺 Procedures & Pricing', icon: Stethoscope },
          { key: 'medicines', label: '💊 Medicine Inventory Stock', icon: Pill },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-cyan-400 shadow-md border border-white/10' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ════ SECTION 3: TAB CONTENTS (WITH SMOOTH FRAMER MOTION ANIMATION) ════ */}
      <AnimatePresence mode="wait">
        
        {/* ══ T1: SECURITY & POLICIES ══ */}
        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 md:grid-cols-2 gap-7"
          >
            {/* Password Change */}
            <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-white/80 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200/60">
                <Key className="w-4 h-4 text-cyan-600" />
                Change Admin System Passcode
              </h3>
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  {successMsg}
                </div>
              )}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">New Admin Passcode</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new admin passcode"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:border-cyan-500 shadow-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-cyan-400 rounded-2xl text-xs font-bold shadow-md shadow-slate-900/15 transition transform hover:scale-[1.01] flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <Key className="w-4 h-4" />}
                  Update Access Passcode
                </button>
              </form>
            </div>

            {/* Doctor Profit Share Calculation Policy */}
            <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-white/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Doctor Profit Payout Policy Rule
                </h3>
                
                {/* Interactive Tooltip Icon */}
                <div className="relative group">
                  <button 
                    type="button" 
                    onClick={() => setShowDoctorRuleInfo(!showDoctorRuleInfo)}
                    className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-800 flex items-center justify-center font-serif text-xs font-bold hover:bg-cyan-200 transition shadow-sm"
                    title="Click for rule explanation"
                  >
                    i
                  </button>

                  <div className={`absolute right-0 top-8 w-72 p-4 bg-slate-900 text-white text-xs rounded-2xl shadow-2xl z-50 space-y-2.5 transition-all duration-200 border border-white/10 ${
                    showDoctorRuleInfo ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-hover:scale-100'
                  }`}>
                    <div className="flex justify-between items-center border-b border-slate-700 pb-1.5">
                      <strong className="text-cyan-400 font-semibold text-[11px] uppercase tracking-wider">Payout Rule Explanation</strong>
                      <button onClick={() => setShowDoctorRuleInfo(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
                    </div>
                    <div className="space-y-2 text-[11px] leading-relaxed text-slate-300">
                      <p><strong className="text-white">Option 1 (Present Days Only):</strong> Profit share is calculated strictly on days the doctor was present in clinic.</p>
                      <p><strong className="text-white">Option 2 (Full Month Branch Profit):</strong> Profit share is calculated on the total net monthly branch profit regardless of individual absent days.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <label className={`flex items-start gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                  doctorRule === 'present_days_only' ? 'bg-teal-50/70 border-teal-300 text-teal-900 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}>
                  <input 
                    type="radio" 
                    name="doctorRule" 
                    value="present_days_only"
                    checked={doctorRule === 'present_days_only'}
                    onChange={() => handleSaveDoctorRule('present_days_only')}
                    className="mt-0.5 text-teal-600"
                  />
                  <div>
                    <strong className="font-bold block">Option 1: Present Days Only (Recommended)</strong>
                    <span className="text-[11px] text-slate-500 font-medium leading-snug block mt-0.5">
                      Percentage doctor earns profit share only for dates they were logged present.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                  doctorRule === 'full_month' ? 'bg-teal-50/70 border-teal-300 text-teal-900 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}>
                  <input 
                    type="radio" 
                    name="doctorRule" 
                    value="full_month"
                    checked={doctorRule === 'full_month'}
                    onChange={() => handleSaveDoctorRule('full_month')}
                    className="mt-0.5 text-teal-600"
                  />
                  <div>
                    <strong className="font-bold block">Option 2: Full Month Branch Net Profit</strong>
                    <span className="text-[11px] text-slate-500 font-medium leading-snug block mt-0.5">
                      Percentage doctor earns profit share on total monthly branch net profits.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══ T2: BRANCH HOURS & BOOKING SLOTS ══ */}
        {activeTab === 'branches' && (
          <motion.div
            key="branches"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 md:grid-cols-2 gap-7"
          >
            {/* Branch Operating Hours */}
            <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-white/80 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200/60">
                <Clock className="w-4 h-4 text-cyan-600" />
                Clinic Branch Operating Hours
              </h3>
              {loadingBranches ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : (
                <div className="space-y-4">
                  {branches.map(branch => (
                    <div key={branch.id} className="p-4 bg-white/80 rounded-2xl border border-slate-200 space-y-2.5 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">{branch.name}</span>
                        {editingBranchId === branch.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleSaveHours(branch.id)} disabled={updatingBranchId === branch.id} className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingBranchId(null)} className="p-1.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingBranchId(branch.id); setTempHours(branch.working_hours || '') }} className="px-3 py-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border rounded-xl transition">
                            Edit Timings
                          </button>
                        )}
                      </div>
                      {editingBranchId === branch.id ? (
                        <textarea rows={2} value={tempHours} onChange={e => setTempHours(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:border-cyan-500" />
                      ) : (
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{branch.working_hours}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Camera Passcodes & Booking Time Slots */}
            <div className="space-y-7">
              {/* CCTV Camera Passcodes */}
              <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-white/80 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200/60">
                  <Camera className="w-4 h-4 text-cyan-600" />
                  Live CCTV Security Feed Passcodes
                </h3>
                <div className="space-y-3">
                  {branches.map(branch => (
                    <div key={branch.id} className="p-3.5 bg-white/80 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
                      <span className="text-xs font-bold text-slate-800">{branch.name}</span>
                      {editingPasscodeId === branch.id ? (
                        <div className="flex gap-1.5 items-center">
                          <input type="text" maxLength={10} value={tempPasscode} onChange={e => setTempPasscode(e.target.value)} className="w-24 p-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-mono font-bold" />
                          <button onClick={() => handleSavePasscode(branch.id)} disabled={updatingPasscodeId === branch.id} className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingPasscodeId(null)} className="p-1.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-mono bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">{branch.camera_passcode || '1234'}</span>
                          <button onClick={() => { setEditingPasscodeId(branch.id); setTempPasscode(branch.camera_passcode || '') }} className="px-2.5 py-1 text-[10px] font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-xl transition">
                            Change
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient Booking Time Slots */}
              <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-white/80 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200/60">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Public Booking Time Slots Generator
                </h3>
                <form onSubmit={handleAddTimeSlot} className="flex gap-2">
                  <input type="time" required value={newTime} onChange={e => setNewTime(e.target.value)} className="flex-1 px-4 py-2 border border-slate-200 rounded-2xl text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:border-cyan-500 shadow-sm" />
                  <button type="submit" disabled={addingSlot || !newTime} className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-2xl transition flex items-center gap-1.5 shrink-0 shadow-md">
                    {addingSlot ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Plus className="w-3.5 h-3.5" />}
                    Add Slot
                  </button>
                </form>
                {loadingSlots ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {timeSlots.map(slot => (
                      <div key={slot.id} className="flex justify-between items-center px-3.5 py-2 bg-white/80 border border-slate-200 rounded-xl shadow-sm">
                        <span className="text-xs font-bold font-mono text-slate-800">{slot.time_label}</span>
                        <button onClick={() => handleDeleteTimeSlot(slot.id)} disabled={deletingSlotId === slot.id} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══ T3: TREATMENTS & PROCEDURES ══ */}
        {activeTab === 'treatments' && (
          <motion.div
            key="treatments"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 md:grid-cols-3 gap-7"
          >
            {/* Add Treatment */}
            <div className="md:col-span-1">
              <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-white/80 space-y-4 sticky top-6">
                <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-200/60 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-cyan-600" />
                  Add New Clinic Procedure
                </h3>
                <form onSubmit={handleCreateTreatment} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Procedure Name</label>
                    <input type="text" required placeholder="e.g. Tooth Extraction" value={newTreatmentName} onChange={e => setNewTreatmentName(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:border-cyan-500 shadow-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Selling Price (INR)</label>
                    <input type="number" required placeholder="1200" value={newTreatmentPrice} onChange={e => setNewTreatmentPrice(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-cyan-500 shadow-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Material Cost Price (INR)</label>
                    <input type="number" required placeholder="400" value={newTreatmentCost} onChange={e => setNewTreatmentCost(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-cyan-500 shadow-sm" />
                  </div>
                  <button type="submit" disabled={addingTreatment} className="w-full py-3 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-cyan-400 rounded-2xl text-xs font-bold shadow-md transition transform hover:scale-[1.01] flex items-center justify-center gap-1.5">
                    {addingTreatment ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <Plus className="w-4 h-4" />}
                    Add Procedure Record
                  </button>
                </form>
              </div>
            </div>

            {/* List Treatments */}
            <div className="md:col-span-2">
              <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-white/80 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-200/60 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-cyan-600" />
                  Configured Procedures & Pricing Matrix
                </h3>
                {loadingTreatments ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-cyan-600 animate-spin" /></div>
                ) : (
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden text-xs shadow-sm bg-white/80">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                          <th className="p-3.5">Procedure Name</th>
                          <th className="p-3.5 font-mono">Selling Price</th>
                          <th className="p-3.5 font-mono">Material Cost</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {treatments.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/70 transition text-slate-800">
                            <td className="p-3.5 font-semibold text-slate-900">{t.name}</td>
                            <td className="p-3.5 font-mono font-bold text-emerald-600">
                              {editingTreatmentId === t.id ? (
                                <input type="number" value={tempTreatmentPrice} onChange={e => setTempTreatmentPrice(e.target.value)} className="w-24 px-2 py-1 border rounded-lg font-mono text-xs" />
                              ) : (
                                `INR ${Number(t.price).toFixed(2)}`
                              )}
                            </td>
                            <td className="p-3.5 font-mono font-medium text-slate-500">
                              {editingTreatmentId === t.id ? (
                                <input type="number" value={tempTreatmentCost} onChange={e => setTempTreatmentCost(e.target.value)} className="w-24 px-2 py-1 border rounded-lg font-mono text-xs" />
                              ) : (
                                `INR ${Number(t.cost || 0).toFixed(2)}`
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              {editingTreatmentId === t.id ? (
                                <div className="flex gap-1.5 justify-end">
                                  <button onClick={() => handleSaveTreatmentDetails(t.id)} disabled={updatingTreatmentId === t.id} className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingTreatmentId(null)} className="p-1.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => { setEditingTreatmentId(t.id); setTempTreatmentPrice(String(t.price)); setTempTreatmentCost(String(t.cost || 0)) }} className="p-1.5 text-slate-500 hover:text-cyan-600 rounded-lg hover:bg-cyan-50 transition">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══ T4: MEDICINES & STOCK INVENTORY ══ */}
        {activeTab === 'medicines' && (
          <motion.div
            key="medicines"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-7"
          >
            {/* Branch Selector for Inventory */}
            <div className="card-3d glass-3d p-4 rounded-2xl border border-white/80 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-50 text-cyan-700 rounded-xl border border-cyan-100">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Branch-Specific Inventory</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Select branch to view or register medicine stock.</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl border border-slate-200/40">
                <button
                  type="button"
                  onClick={() => setSelectedInventoryBranch('hazara')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                    selectedInventoryBranch === 'hazara'
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hazara Dental Clinic
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInventoryBranch('family')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                    selectedInventoryBranch === 'family'
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Family Dental Clinic
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              {/* Add Medicine Stock Form */}
              <div className="md:col-span-1">
                <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-white/80 space-y-4 sticky top-6">
                  <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-200/60 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-cyan-600" />
                    Register Medicine Stock Batch
                  </h3>
                  <form onSubmit={handleCreateMedicine} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Barcode (GTIN)</label>
                      <input type="text" required placeholder="e.g. 8901117210103" value={newMedBarcode} onChange={e => setNewMedBarcode(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-bold text-slate-800 shadow-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Medicine Name</label>
                      <input type="text" required placeholder="e.g. Amoxicillin 500mg" value={newMedName} onChange={e => setNewMedName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-semibold text-slate-800 shadow-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Generic Name</label>
                      <input type="text" placeholder="e.g. Amoxicillin" value={newMedGeneric} onChange={e => setNewMedGeneric(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 shadow-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Batch No.</label>
                        <input type="text" required value={newMedBatch} onChange={e => setNewMedBatch(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-bold text-slate-800 shadow-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Expiry Date</label>
                        <input type="date" required value={newMedExpiry} onChange={e => setNewMedExpiry(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-semibold shadow-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tabs / Strip</label>
                        <input type="number" required value={newMedTabletsPerPatch} onChange={e => setNewMedTabletsPerPatch(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-bold text-slate-800 shadow-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Strips Quantity</label>
                        <input type="number" required value={newMedQty} onChange={e => setNewMedQty(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-bold text-slate-800 shadow-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Price / Strip</label>
                        <input type="number" required placeholder="120" value={newMedPatchPrice} onChange={e => setNewMedPatchPrice(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-bold text-slate-800 shadow-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cost / Strip</label>
                        <input type="number" required placeholder="80" value={newMedCostPrice} onChange={e => setNewMedCostPrice(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-bold text-slate-800 shadow-sm" />
                      </div>
                    </div>
                    <button type="submit" disabled={addingMed} className="w-full py-3 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-cyan-400 rounded-2xl text-xs font-bold shadow-md transition transform hover:scale-[1.01] flex items-center justify-center gap-1.5">
                      {addingMed ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <Plus className="w-4 h-4" />}
                      Register Stock
                    </button>
                  </form>
                </div>
              </div>

              {/* Medicine Catalog Table */}
              <div className="md:col-span-2">
                <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-white/80 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/60 gap-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Pill className="w-4 h-4 text-cyan-600" />
                      In-Stock Medicines Inventory (TiDB Cloud Database)
                    </h3>
                    
                    <div className="flex items-center flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={downloadMedTemplate}
                        title="Download CSV Import Template"
                        className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" /> Template
                      </button>

                      <button
                        type="button"
                        onClick={exportMedicinesInventory}
                        className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-xl shadow-sm transition"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-600" /> Export CSV
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/admin/capture?branch=${selectedInventoryBranch}&mode=barcode`
                          window.open(url, '_blank')
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl shadow-sm transition"
                      >
                        <Camera className="w-3.5 h-3.5" /> Mobile Scan
                      </button>

                      <label
                        htmlFor="bulk-import-meds-input"
                        className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl cursor-pointer shadow-sm transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-600" /> Import CSV
                      </label>
                      <input
                        type="file"
                        id="bulk-import-meds-input"
                        accept=".csv"
                        className="hidden"
                        onChange={handleBulkImportMeds}
                      />
                    </div>
                  </div>

                  {loadingMeds ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-cyan-600 animate-spin" /></div>
                  ) : medsError ? (
                    <div className="p-4 bg-rose-50 text-rose-700 text-xs font-semibold rounded-2xl">{medsError}</div>
                  ) : (
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden text-xs shadow-sm bg-white/80">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                            <th className="p-3.5">Medicine Info</th>
                            <th className="p-3.5 font-mono">Stock Level</th>
                            <th className="p-3.5 font-mono">Strip Price</th>
                            <th className="p-3.5 font-mono">Strip Cost</th>
                            <th className="p-3.5">Expiry Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {medicines.length === 0 ? (
                            <tr><td colSpan={5} className="p-6 text-slate-400 text-center font-light">No medicines registered in database for this branch.</td></tr>
                          ) : (
                            medicines.map(med => {
                              const activeBatch = med.batches?.find((b: any) => Number(b.stock) > 0) || med.batches?.[0]
                              const price = activeBatch ? Number(activeBatch.price) : 0
                              const cost = activeBatch ? Number(activeBatch.cost_price || 0) : 0
                              const expiry = activeBatch ? formatExpiry(activeBatch.expiry_date) : 'N/A'
                              const tabsPerPatch = Number(med.tablets_per_patch || 10)
                              const stripsStock = Math.floor(Number(med.stock) / tabsPerPatch)
                              const remTabsStock = Number(med.stock) % tabsPerPatch

                              return (
                                <tr key={med.id} className="hover:bg-slate-50/70 transition text-slate-800">
                                  <td className="p-3.5">
                                    <p className="font-bold text-slate-900">{med.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">Generic: {med.generic_name || 'N/A'} | Barcode: {med.barcode}</p>
                                  </td>
                                  <td className="p-3.5 font-mono">
                                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                                      Number(med.stock) <= 0 
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>
                                      {med.stock} tabs ({stripsStock} strips {remTabsStock > 0 ? `+ ${remTabsStock} tabs` : ''})
                                    </span>
                                  </td>
                                  <td className="p-3.5 font-mono font-bold text-emerald-600">INR {(price * tabsPerPatch).toFixed(2)}</td>
                                  <td className="p-3.5 font-mono font-medium text-slate-500">INR {(cost * tabsPerPatch).toFixed(2)}</td>
                                  <td className="p-3.5 text-slate-600 font-mono">{expiry}</td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ SECTION 4: SECURITY AUTHORIZATION NOTICE ════ */}
      <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-rose-200/60 bg-gradient-to-br from-rose-50/40 via-white to-amber-50/40 space-y-2">
        <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          Administrator Authorization Notice
        </h3>
        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          This system control terminal manages critical clinic configurations, financial payout policies, database inventory records, and authorization keys. Store all login passcodes and tokens securely.
        </p>
      </div>

    </motion.div>
  )
}
