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
  Trash2, Plus, Camera, Activity, DollarSign, Barcode, Inbox
} from 'lucide-react'

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'clinic' | 'treatments' | 'medicines'>('clinic')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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

    exportToCSV('medicines_import_template.csv', headers, sampleRows)
  }

  // Handle CSV parser and bulk importer logic
  const handleBulkImportMeds = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const text = evt.target?.result as string
      if (!text) return

      try {
        const rows = parseCSV(text)
        if (rows.length === 0) {
          alert('Empty CSV or invalid format.')
          return
        }

        const confirmMsg = `Found ${rows.length} medicine records in file. Do you want to import them into the selected branch: "${selectedInventoryBranch.toUpperCase()}"?`
        if (!window.confirm(confirmMsg)) return

        setLoadingMeds(true)
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
        // Reset file input
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  // Parse CSV helper supporting quotes and commas
  const parseCSV = (text: string): any[] => {
    const lines = text.split(/\r?\n/)
    if (lines.length < 2) return []

    // Extract headers and map to clean lower_case slugs
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
    <div className="space-y-8 animate-in fade-in duration-300 font-sans max-w-5xl">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-serif text-slate-900 font-normal flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-700" />
          System Settings
        </h1>
        <p className="text-xs text-slate-400 font-light uppercase tracking-wider">
          Configure security, inventory, and branches
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('clinic')}
          className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'clinic'
              ? 'border-cyan-600 text-cyan-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Clinic Configurations
        </button>
        <button
          onClick={() => setActiveTab('treatments')}
          className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'treatments'
              ? 'border-cyan-600 text-cyan-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Treatments & Procedures
        </button>
        <button
          onClick={() => setActiveTab('medicines')}
          className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'medicines'
              ? 'border-cyan-600 text-cyan-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Medicines Inventory
        </button>
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        {activeTab === 'clinic' && (
          <motion.div
            key="clinic"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
          {/* Clinic Configurations Column */}
          <div className="space-y-6">
            {/* Branch Hours (Timings) */}
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Clock className="w-4 h-4 text-slate-500" />
                Clinic Branch Hours (Clinic Timings)
              </h3>
              {loadingBranches ? (
                <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
              ) : (
                <div className="space-y-4">
                  {branches.map(branch => (
                    <div key={branch.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-700">{branch.name}</span>
                        {editingBranchId === branch.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleSaveHours(branch.id)} disabled={updatingBranchId === branch.id} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingBranchId(null)} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingBranchId(branch.id); setTempHours(branch.working_hours || '') }} className="px-2.5 py-1 text-[10px] text-slate-600 bg-slate-100 hover:bg-slate-200 border rounded-lg transition">
                            Edit Timings
                          </button>
                        )}
                      </div>
                      {editingBranchId === branch.id ? (
                        <textarea rows={2} value={tempHours} onChange={e => setTempHours(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800" />
                      ) : (
                        <p className="text-xs text-slate-500 leading-normal font-light">{branch.working_hours}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Passcodes */}
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Camera className="w-4 h-4 text-slate-500" />
                Branch Passcodes (Mobile camera upload)
              </h3>
              <div className="space-y-4">
                {branches.map(branch => (
                  <div key={branch.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-700">{branch.name}</span>
                      {editingPasscodeId === branch.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleSavePasscode(branch.id)} disabled={updatingPasscodeId === branch.id} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingPasscodeId(null)} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingPasscodeId(branch.id); setTempPasscode(branch.camera_passcode || '') }} className="px-2.5 py-1 text-[10px] text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-150 rounded-lg transition">
                          Change Passcode
                        </button>
                      )}
                    </div>
                    {editingPasscodeId === branch.id ? (
                      <input type="text" maxLength={10} value={tempPasscode} onChange={e => setTempPasscode(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 font-mono" />
                    ) : (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-light">Passcode:</span>
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border font-semibold">{branch.camera_passcode || '1234'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Time slots */}
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Clock className="w-4 h-4 text-slate-500" />
                Manage Patient Time Slots
              </h3>
              <form onSubmit={handleAddTimeSlot} className="flex gap-2">
                <input type="time" required value={newTime} onChange={e => setNewTime(e.target.value)} className="flex-1 px-4 py-2 border rounded-xl text-xs bg-white text-slate-800" />
                <button type="submit" disabled={addingSlot || !newTime} className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition flex items-center gap-1 shrink-0">
                  {addingSlot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add Slot
                </button>
              </form>
              {loadingSlots ? (
                <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {timeSlots.map(slot => (
                    <div key={slot.id} className="flex justify-between items-center px-3.5 py-2 bg-slate-50 border rounded-xl">
                      <span className="text-xs font-semibold text-slate-700">{slot.time_label}</span>
                      <button onClick={() => handleDeleteTimeSlot(slot.id)} disabled={deletingSlotId === slot.id} className="p-1 text-slate-400 hover:text-rose-600 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Password change */}
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Key className="w-4 h-4 text-slate-500" />
                Change Admin Password
              </h3>
              {successMsg && <div className="p-3 bg-emerald-50 border text-emerald-800 text-xs rounded-xl">{successMsg}</div>}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <input type="password" required placeholder="Enter new passcode" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-xl text-xs bg-white text-slate-850" />
                <button type="submit" disabled={submitting} className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition">Change Passcode</button>
              </form>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'treatments' && (
        <motion.div
          key="treatments"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Add Treatment */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4 sticky top-6">
              <h3 className="text-sm font-semibold text-slate-800 pb-2 border-b">Add Procedure</h3>
              <form onSubmit={handleCreateTreatment} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Procedure Name</label>
                  <input type="text" required placeholder="e.g. Tooth Extraction" value={newTreatmentName} onChange={e => setNewTreatmentName(e.target.value)} className="w-full px-3.5 py-2 border rounded-xl text-xs bg-white text-slate-850" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Selling Price (INR)</label>
                  <input type="number" required placeholder="1200" value={newTreatmentPrice} onChange={e => setNewTreatmentPrice(e.target.value)} className="w-full px-3.5 py-2 border rounded-xl text-xs bg-white text-slate-855 font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Cost Price (INR)</label>
                  <input type="number" required placeholder="400" value={newTreatmentCost} onChange={e => setNewTreatmentCost(e.target.value)} className="w-full px-3.5 py-2 border rounded-xl text-xs bg-white text-slate-855 font-mono" />
                </div>
                <button type="submit" disabled={addingTreatment} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
                  {addingTreatment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add Procedure
                </button>
              </form>
            </div>
          </div>

          {/* List Treatments */}
          <div className="md:col-span-2">
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 pb-2 border-b">Configured Clinic Procedures</h3>
              {loadingTreatments ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b">
                        <th className="p-3">Procedure Name</th>
                        <th className="p-3 font-mono">Selling Price</th>
                        <th className="p-3 font-mono">Cost Price</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {treatments.map(t => (
                        <tr key={t.id} className="border-b hover:bg-slate-50 transition text-slate-700">
                          <td className="p-3 font-medium">{t.name}</td>
                          <td className="p-3 font-mono">
                            {editingTreatmentId === t.id ? (
                              <input type="number" value={tempTreatmentPrice} onChange={e => setTempTreatmentPrice(e.target.value)} className="w-20 px-2 py-1 border rounded" />
                            ) : (
                              `Rs. ${Number(t.price).toFixed(2)}`
                            )}
                          </td>
                          <td className="p-3 font-mono">
                            {editingTreatmentId === t.id ? (
                              <input type="number" value={tempTreatmentCost} onChange={e => setTempTreatmentCost(e.target.value)} className="w-20 px-2 py-1 border rounded" />
                            ) : (
                              `Rs. ${Number(t.cost || 0).toFixed(2)}`
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {editingTreatmentId === t.id ? (
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => handleSaveTreatmentDetails(t.id)} disabled={updatingTreatmentId === t.id} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingTreatmentId(null)} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditingTreatmentId(t.id); setTempTreatmentPrice(String(t.price)); setTempTreatmentCost(String(t.cost || 0)) }} className="p-1.5 text-slate-400 hover:text-cyan-600 rounded hover:bg-slate-100">
                                <Edit2 className="w-3.5 h-3.5" />
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

      {activeTab === 'medicines' && (
        <motion.div
          key="medicines"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Branch Selector for Inventory */}
          <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-slate-500" />
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Branch-Specific Inventory</h4>
                <p className="text-[10px] text-slate-400 font-light">Select branch to view/add medicines stock.</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedInventoryBranch('hazara')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                  selectedInventoryBranch === 'hazara'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Hazara Dental Clinic
              </button>
              <button
                type="button"
                onClick={() => setSelectedInventoryBranch('family')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                  selectedInventoryBranch === 'family'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Family Dental Clinic
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Add Medicine Stock */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4 sticky top-6">
              <h3 className="text-sm font-semibold text-slate-800 pb-2 border-b">Register Medicine Stock</h3>
              <form onSubmit={handleCreateMedicine} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-505 uppercase">Barcode (GTIN)</label>
                  <input type="text" required placeholder="e.g. 8901117210103" value={newMedBarcode} onChange={e => setNewMedBarcode(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-mono text-slate-850" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-505 uppercase">Medicine Name</label>
                  <input type="text" required placeholder="e.g. Amoxicillin 500mg" value={newMedName} onChange={e => setNewMedName(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white text-slate-850" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-505 uppercase">Generic Name</label>
                  <input type="text" placeholder="e.g. Amoxicillin" value={newMedGeneric} onChange={e => setNewMedGeneric(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white text-slate-850" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-505 uppercase">Batch No.</label>
                    <input type="text" required value={newMedBatch} onChange={e => setNewMedBatch(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-mono text-slate-850" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-505 uppercase">Expiry Date</label>
                    <input type="date" required value={newMedExpiry} onChange={e => setNewMedExpiry(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white text-slate-850" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-505 uppercase">Tabs/Strip</label>
                    <input type="number" required value={newMedTabletsPerPatch} onChange={e => setNewMedTabletsPerPatch(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-mono text-slate-850" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-505 uppercase">Strips Quantity</label>
                    <input type="number" required value={newMedQty} onChange={e => setNewMedQty(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-mono text-slate-850" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-505 uppercase">Price / Strip</label>
                    <input type="number" required placeholder="120" value={newMedPatchPrice} onChange={e => setNewMedPatchPrice(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-mono text-slate-850" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-505 uppercase">Cost / Strip</label>
                    <input type="number" required placeholder="80" value={newMedCostPrice} onChange={e => setNewMedCostPrice(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-mono text-slate-850" />
                  </div>
                </div>
                <button type="submit" disabled={addingMed} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
                  {addingMed ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Register Stock
                </button>
              </form>
            </div>
          </div>

          {/* List Medicines */}
          <div className="md:col-span-2">
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b gap-3">
                <h3 className="text-sm font-semibold text-slate-800">In-Stock Medicines (TiDB Cloud Inventory)</h3>
                
                <div className="flex items-center flex-wrap gap-2">
                  {/* Download Template Button */}
                  <button
                    type="button"
                    onClick={downloadMedTemplate}
                    title="Download Excel/CSV Import Template"
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-slate-600 bg-slate-100 hover:bg-slate-200 border rounded-lg transition"
                  >
                    Template
                  </button>

                  {/* Export Inventory Button */}
                  <button
                    type="button"
                    onClick={exportMedicinesInventory}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-150 rounded-lg transition"
                  >
                    Export (CSV)
                  </button>

                  {/* Import Button & File input */}
                  <label
                    htmlFor="bulk-import-meds-input"
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 rounded-lg cursor-pointer transition font-semibold"
                  >
                    Import (CSV)
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
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
              ) : medsError ? (
                <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-xl">{medsError}</div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b">
                        <th className="p-3">Medicine Info</th>
                        <th className="p-3 font-mono">Stock (Tabs)</th>
                        <th className="p-3 font-mono">Price / Tab</th>
                        <th className="p-3 font-mono">Cost / Tab</th>
                        <th className="p-3">Expiry (Oldest)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.length === 0 ? (
                        <tr><td colSpan={5} className="p-4 text-slate-400 text-center font-light">No medicines in inventory database.</td></tr>
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
                            <tr key={med.id} className="border-b hover:bg-slate-50 transition text-slate-700">
                              <td className="p-3">
                                <p className="font-semibold text-slate-800">{med.name}</p>
                                <p className="text-[10px] text-slate-400 font-light">Generic: {med.generic_name || 'N/A'} | Barcode: {med.barcode}</p>
                              </td>
                              <td className="p-3 font-mono">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  Number(med.stock) <= 0 
                                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  {med.stock} tabs ({stripsStock} strips {remTabsStock > 0 ? `+ ${remTabsStock} tabs` : ''})
                                </span>
                              </td>
                              <td className="p-3 font-mono">Rs. {price.toFixed(2)}</td>
                              <td className="p-3 font-mono">Rs. {cost.toFixed(2)}</td>
                              <td className="p-3 text-slate-500 font-light">{expiry}</td>
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
      
      {/* Secure Notice */}
      <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm bg-rose-50/10 border-rose-100">
        <h3 className="text-sm font-semibold text-rose-800 flex items-center gap-2 pb-2 border-b border-rose-100/50">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          Access Notice
        </h3>
        <p className="text-xs text-slate-500 leading-normal font-light pt-2">
          This settings dashboard provides absolute controls over doctors, clinics, inventory databases, and appointment listings. Do not share admin panel authorization cookies or passwords. Store all credentials securely.
        </p>
      </div>

    </div>
  )
}
