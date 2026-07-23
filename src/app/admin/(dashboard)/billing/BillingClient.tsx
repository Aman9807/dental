'use client'

import React, { useState, useEffect, useRef } from 'react'
import { searchMedicines, createInvoice, saveMedicineStock } from '@/app/admin/actions'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Receipt, User, Search, PlusCircle, Trash2, Loader2, 
  CheckCircle, Percent, AlertCircle, ShoppingCart, Activity, ShieldAlert, Sparkles, Send, Barcode,
  CreditCard, Sparkle, Layers, ChevronRight, Check, ArrowRight
} from 'lucide-react'
import DentalLogo from '@/components/DentalLogo'

interface Treatment {
  id: string
  name: string
  price: number
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  prescription_text: string | null
  prescription_url: string | null
  xray_url: string | null
  temp_mobile_photo: string | null
  patients: {
    id: string
    name: string
    email: string
    mobile: string
  }
  doctors: {
    id: string
    name: string
  }
  branches: {
    id: string
    name: string
    slug: string
  }
}

interface BillingItem {
  key: string // unique react key
  type: 'medicine' | 'treatment' | 'custom'
  id?: string // medicine_id or treatment_id
  name: string
  quantity: number
  price: number
  maxStock?: number // For medicine stock bounds
  unitType?: 'strips' | 'tablets'
  tabletsPerPatch?: number
}

interface BillingClientProps {
  initialAppointments: Appointment[]
  initialTreatments: Treatment[]
}

export default function BillingClient({ initialAppointments, initialTreatments }: BillingClientProps) {
  const [appointments] = useState<Appointment[]>(initialAppointments)
  const [treatments] = useState<Treatment[]>(initialTreatments)

  // Selected patient/appointment
  const [selectedApptId, setSelectedApptId] = useState('')
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  // Invoice Items state
  const [billingItems, setBillingItems] = useState<BillingItem[]>([])
  const [treatmentDiscountPercent, setTreatmentDiscountPercent] = useState<number>(0)
  const [medicineDiscountPercent, setMedicineDiscountPercent] = useState<number>(0)

  // Medicine search autocomplete states
  const [medQuery, setMedQuery] = useState('')
  const [medResults, setMedResults] = useState<any[]>([])
  const [searchingMeds, setSearchingMeds] = useState(false)
  const [showMedDropdown, setShowMedDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Treatment dropdown selection
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('')

  // Checkout flow states
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const [successInfo, setSuccessInfo] = useState<any>(null)

  // Add new medicine modal & form states
  const [showAddMedModal, setShowAddMedModal] = useState(false)
  const [newMedBarcode, setNewMedBarcode] = useState('')
  const [newMedName, setNewMedName] = useState('')
  const [newMedGeneric, setNewMedGeneric] = useState('')
  const [newMedBatch, setNewMedBatch] = useState('GEN-BATCH')
  const [newMedExpiry, setNewMedExpiry] = useState('')
  const [newMedTabletsPerPatch, setNewMedTabletsPerPatch] = useState('10')
  const [newMedPatchPrice, setNewMedPatchPrice] = useState('')
  const [newMedCostPrice, setNewMedCostPrice] = useState('')
  const [newMedQty, setNewMedQty] = useState('10')
  const [savingNewMed, setSavingNewMed] = useState(false)

  // Redirect states
  const [redirectCountdown, setRedirectCountdown] = useState(3)
  const [targetApptId, setTargetApptId] = useState<string | null>(null)
  const router = useRouter()

  // Detect clicks outside search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMedDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-redirect to Appointments dashboard on checkout success
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (checkoutSuccess && targetApptId && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1)
      }, 1000)
    } else if (checkoutSuccess && targetApptId && redirectCountdown === 0) {
      const invoiceParam = successInfo?.invoiceId ? `&openInvoiceId=${successInfo.invoiceId}` : ''
      router.push(`/admin?openReportsApptId=${targetApptId}${invoiceParam}`)
    }
    return () => clearTimeout(timer)
  }, [checkoutSuccess, targetApptId, redirectCountdown, successInfo, router])

  // Update selected appointment details
  useEffect(() => {
    if (selectedApptId) {
      const found = appointments.find(a => a.id === selectedApptId) || null
      setSelectedAppt(found)
    } else {
      setSelectedAppt(null)
    }
  }, [selectedApptId, appointments])

  // Handle medicine autocomplete search (TiDB Cloud)
  const handleMedSearch = async (val: string) => {
    setMedQuery(val)
    if (!val.trim()) {
      setMedResults([])
      setShowMedDropdown(false)
      return
    }

    setSearchingMeds(true)
    try {
      const res = await searchMedicines(val, selectedAppt?.branches?.slug)
      if (res.success && res.data) {
        setMedResults(res.data)
        setShowMedDropdown(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSearchingMeds(false)
    }
  }

  // Add Medicine Item
  const addMedicineItem = (med: any) => {
    const stock = Number(med.stock)
    if (stock <= 0) return

    const existingIndex = billingItems.findIndex(item => item.type === 'medicine' && item.id === med.id)
    if (existingIndex !== -1) {
      const updated = [...billingItems]
      const newQty = updated[existingIndex].quantity + 1
      if (newQty <= stock) {
        updated[existingIndex].quantity = newQty
        setBillingItems(updated)
      } else {
        alert(`Cannot add more. Only ${stock} units available in stock.`)
      }
    } else {
      const price = med.batches && med.batches.length > 0 ? Number(med.batches[0].price) : Number(med.price)
      const tabsPerPatch = Number(med.tablets_per_patch || 10)
      const newItem: BillingItem = {
        key: `med_${med.id}_${Date.now()}`,
        type: 'medicine',
        id: med.id,
        name: med.name,
        quantity: 1, // Default 1 strip
        price: price,
        maxStock: stock,
        unitType: 'strips',
        tabletsPerPatch: tabsPerPatch
      }
      setBillingItems([...billingItems, newItem])
    }
    setMedQuery('')
    setShowMedDropdown(false)
  }

  // Add Treatment Item (Fixed Price)
  const handleAddTreatment = () => {
    if (!selectedTreatmentId) return
    const treat = treatments.find(t => t.id === selectedTreatmentId)
    if (!treat) return

    const newItem: BillingItem = {
      key: `treat_${treat.id}_${Date.now()}`,
      type: 'treatment',
      id: treat.id,
      name: treat.name,
      quantity: 1,
      price: Number(treat.price)
    }

    setBillingItems([...billingItems, newItem])
    setSelectedTreatmentId('')
  }

  // Add Custom Treatment (Editable Row)
  const handleAddCustom = () => {
    const newItem: BillingItem = {
      key: `custom_${Date.now()}`,
      type: 'custom',
      name: 'Custom Dental Procedure',
      quantity: 1,
      price: 1000
    }
    setBillingItems([...billingItems, newItem])
  }

  // Add Custom Medicine (Editable Row)
  const handleAddCustomMedicine = () => {
    const newItem: BillingItem = {
      key: `custom_med_${Date.now()}`,
      type: 'medicine',
      name: 'Custom Medicine Item',
      quantity: 10,
      price: 12
    }
    setBillingItems([...billingItems, newItem])
  }

  // Update item quantity, price, unitType or custom text
  const updateItem = (key: string, field: 'quantity' | 'price' | 'name' | 'unitType', value: any) => {
    const updated = billingItems.map(item => {
      if (item.key === key) {
        if (field === 'unitType') {
          return { ...item, unitType: value }
        }
        if (field === 'quantity') {
          let val = parseFloat(value) || 1
          return { ...item, quantity: Math.max(0.1, val) }
        }
        if (field === 'price') {
          return { ...item, price: Math.max(0, parseFloat(value) || 0) }
        }
        if (field === 'name') {
          return { ...item, name: value }
        }
      }
      return item
    })
    setBillingItems(updated)
  }

  // Remove Item
  const removeItem = (key: string) => {
    setBillingItems(billingItems.filter(item => item.key !== key))
  }

  // Math Calculations
  const getItemEffectiveQty = (item: BillingItem) => {
    if (item.type === 'medicine' && item.unitType === 'strips') {
      return item.quantity * (item.tabletsPerPatch || 10)
    }
    return item.quantity
  }

  const treatmentSubtotal = billingItems
    .filter(item => item.type === 'treatment' || item.type === 'custom')
    .reduce((acc, item) => acc + (item.price * item.quantity), 0)
    
  const medicineSubtotal = billingItems
    .filter(item => item.type === 'medicine')
    .reduce((acc, item) => acc + (item.price * getItemEffectiveQty(item)), 0)

  const treatmentDiscountAmount = treatmentSubtotal * (treatmentDiscountPercent / 100)
  const medicineDiscountAmount = medicineSubtotal * (medicineDiscountPercent / 100)
  const discountAmount = treatmentDiscountAmount + medicineDiscountAmount
  const subtotal = treatmentSubtotal + medicineSubtotal
  const grandTotal = subtotal - discountAmount

  // Register new medicine stock directly from the billing screen
  const handleRegisterNewMed = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMedBarcode || !newMedName || !newMedPatchPrice || !newMedCostPrice) {
      alert('Please fill out all required fields.')
      return
    }
    setSavingNewMed(true)
    try {
      const res = await saveMedicineStock(newMedBarcode, Number(newMedQty), {
        name: newMedName,
        genericName: newMedGeneric || undefined,
        batchNumber: newMedBatch,
        expiryDate: newMedExpiry || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        patchPrice: Number(newMedPatchPrice),
        costPrice: Number(newMedCostPrice),
        tabletsPerPatch: Number(newMedTabletsPerPatch),
        branchSlug: selectedAppt?.branches?.slug || 'hazara'
      })

      if (res.success) {
        alert('Medicine stock registered successfully!')
        setShowAddMedModal(false)
        setNewMedBarcode('')
        setNewMedName('')
        setNewMedGeneric('')
        setNewMedBatch('GEN-BATCH')
        setNewMedExpiry('')
        setNewMedPatchPrice('')
        setNewMedCostPrice('')
        handleMedSearch(newMedName)
      } else {
        alert(res.error || 'Failed to register medicine stock.')
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'An error occurred.')
    } finally {
      setSavingNewMed(false)
    }
  }

  // Finalize checkout
  const handleCheckout = async () => {
    if (!selectedApptId) {
      alert('Please select a patient appointment.')
      return
    }
    if (billingItems.length === 0) {
      alert('Please add at least one medicine or treatment to the bill.')
      return
    }

    setCheckingOut(true)
    try {
      const payloadItems = billingItems.map(item => ({
        ...item,
        quantity: getItemEffectiveQty(item)
      }))

      const invoiceRes = await createInvoice(
        selectedApptId,
        payloadItems,
        subtotal,
        treatmentDiscountPercent,
        medicineDiscountPercent,
        grandTotal
      )

      if (!invoiceRes.success || !invoiceRes.invoiceId) {
        throw new Error(invoiceRes.error || 'Failed to save invoice records.')
      }

      const invoiceId = invoiceRes.invoiceId

      setSuccessInfo({
        invoiceId,
        patientName: selectedAppt?.patients?.name,
        total: grandTotal,
        logs: 'Invoice saved locally. Email delivery deferred until report submission.'
      })
      setTargetApptId(selectedApptId)
      setRedirectCountdown(3)
      setCheckoutSuccess(true)
      setBillingItems([])
      setTreatmentDiscountPercent(0)
      setMedicineDiscountPercent(0)
      setSelectedApptId('')

      router.refresh()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'An error occurred during checkout.')
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div className="perspective-stage w-full min-h-screen pb-16 pt-2 font-sans relative">
      
      {/* Ambient 3D Glowing Background Blobs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none floating-3d -z-10" />
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none floating-3d -z-10" style={{ animationDelay: '3s' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-8 max-w-6xl mx-auto"
      >
        
        {/* ═══ 3D SPATIAL HEADER DECK ═══ */}
        <div className="glass-3d rounded-3xl p-6 md:p-8 relative overflow-hidden preserve-3d shadow-2xl">
          {/* Subtle 3D grid line */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-teal-500/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <DentalLogo size={34} />
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-400/30 rounded-full text-cyan-700 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-600" />
                  3D Spatial Billing Terminal
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-serif text-slate-900 font-normal tracking-tight">
                Unified Checkout & Invoicing
              </h1>
              <p className="text-xs text-slate-500 font-light max-w-xl">
                Seamlessly compile medicine inventory from TiDB Cloud and clinical procedure fees into a scannable 3D invoice record.
              </p>
            </div>

            {/* 3D Metric Badges */}
            <div className="grid grid-cols-3 gap-3">
              {/* Badge 1 */}
              <div className="card-3d glass-3d rounded-2xl p-3 text-center border border-white/60 shadow-sm">
                <span className="text-[10px] text-slate-400 font-medium uppercase block">Active Patient</span>
                <span className="text-sm font-bold text-slate-800 truncate block max-w-[100px]">
                  {selectedAppt ? selectedAppt.patients?.name : 'None'}
                </span>
              </div>

              {/* Badge 2 */}
              <div className="card-3d glass-3d rounded-2xl p-3 text-center border border-white/60 shadow-sm">
                <span className="text-[10px] text-slate-400 font-medium uppercase block">Cart Items</span>
                <span className="text-sm font-bold text-cyan-700 block">
                  {billingItems.length} {billingItems.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              {/* Badge 3 */}
              <div className="card-3d glass-3d rounded-2xl p-3 text-center border border-cyan-200/60 bg-gradient-to-br from-cyan-50 to-teal-50 shadow-sm">
                <span className="text-[10px] text-cyan-700 font-semibold uppercase block">Grand Total</span>
                <span className="text-sm font-mono font-bold text-cyan-800 block">
                  Rs. {grandTotal.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {checkoutSuccess ? (
          /* ═══ 3D SUCCESS RECEIPT STAGE ═══ */
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, rotateX: 10 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl mx-auto glass-3d rounded-3xl p-8 shadow-2xl space-y-6 text-center preserve-3d border border-emerald-400/30"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 floating-3d">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-serif text-slate-900">Invoice Created & Attached!</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                The bill has been compiled and safely recorded in the patient file.
              </p>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-400/30 text-amber-900 text-xs rounded-2xl text-left flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-semibold block">Email Dispatch Deferred:</strong>
                <span className="text-[11px] text-amber-800 leading-normal block">
                  To send this invoice alongside the digital prescription & X-Ray in a unified PDF package, open the <strong>Reports Modal</strong> on the <strong>Appointments Dashboard</strong>.
                </span>
              </div>
            </div>

            {/* 3D Digital Receipt Card */}
            <div className="card-3d glass-3d-dark rounded-2xl p-5 text-left text-xs font-mono space-y-2 text-slate-200 shadow-2xl border border-white/10">
              <div className="flex justify-between border-b border-white/10 pb-2 mb-2 font-sans text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                <span>Invoice Verification</span>
                <span className="text-emerald-400">ACTIVE RECORD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Patient Name:</span>
                <span className="font-semibold text-white">{successInfo?.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice Code:</span>
                <span className="font-bold text-cyan-400">{successInfo?.invoiceId?.substring(0, 10).toUpperCase()}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/10 text-sm">
                <span className="text-slate-300">Total Billed:</span>
                <span className="font-bold text-emerald-400">Rs. {successInfo?.total?.toFixed(2)}</span>
              </div>
            </div>

            {/* Countdown bar */}
            <div className="p-4 bg-cyan-500/10 border border-cyan-400/30 text-cyan-800 text-xs rounded-2xl flex items-center justify-between">
              <span className="font-medium text-slate-700">Auto-redirecting to Appointments in <strong>{redirectCountdown}s</strong>...</span>
              <button
                onClick={() => {
                  const invoiceParam = successInfo?.invoiceId ? `&openInvoiceId=${successInfo.invoiceId}` : ''
                  router.push(`/admin?openReportsApptId=${targetApptId}${invoiceParam}`)
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-md transition transform hover:scale-105 shrink-0 ml-4"
              >
                Go to Reports Now →
              </button>
            </div>

            <button
              onClick={() => setCheckoutSuccess(false)}
              className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs rounded-2xl transition shadow-sm"
            >
              + Create Another Invoice
            </button>
          </motion.div>
        ) : (
          /* ═══ MAIN 3D BILLING STAGE ═══ */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* LEFT 2 COLUMNS: SELECTIONS, CATALOG & CART */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* CARD 1: PATIENT SELECTION */}
              <div className="card-3d glass-3d p-6 rounded-3xl space-y-4 shadow-xl border border-white/70">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-200/60 pb-3">
                  <div className="w-7 h-7 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center font-bold text-xs">1</div>
                  <User className="w-4 h-4 text-cyan-600" />
                  Select Patient Appointment
                </h3>
                
                <div className="space-y-3">
                  <select
                    value={selectedApptId}
                    onChange={e => setSelectedApptId(e.target.value)}
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl text-xs bg-white text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition shadow-sm"
                  >
                    <option value="">-- Select active patient appointment to begin billing --</option>
                    {appointments
                      .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
                      .map(appt => (
                        <option key={appt.id} value={appt.id}>
                          {appt.patients?.name} — {appt.branches?.name} ({appt.appointment_date} @ {appt.appointment_time.substring(0, 5)})
                        </option>
                      ))}
                  </select>

                  {/* Patient Metadata 3D Badge */}
                  {selectedAppt && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl text-xs space-y-3 shadow-lg preserve-3d"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Patient</span>
                          <strong className="text-sm font-serif font-normal text-cyan-300">{selectedAppt.patients?.name}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Assigned Doctor</span>
                          <strong className="text-slate-200">Dr. {selectedAppt.doctors?.name}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Mobile</span>
                          <span className="text-slate-300 font-mono">{selectedAppt.patients?.mobile}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Email</span>
                          <span className="text-slate-300 truncate block">{selectedAppt.patients?.email}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          selectedAppt.temp_mobile_photo || selectedAppt.prescription_url
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                        }`}>
                          Prescription: {selectedAppt.temp_mobile_photo || selectedAppt.prescription_url ? 'Attached' : 'Pending'}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          selectedAppt.xray_url
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                            : 'bg-slate-700/50 text-slate-400 border-white/10'
                        }`}>
                          X-Ray: {selectedAppt.xray_url ? 'Uploaded' : 'No X-Ray'}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* CARD 2: MEDICINE & CLINICAL PROCEDURE CATALOG */}
              {selectedApptId && (
                <div className="card-3d glass-3d p-6 rounded-3xl space-y-5 shadow-xl border border-white/70">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-200/60 pb-3">
                    <div className="w-7 h-7 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center font-bold text-xs">2</div>
                    <Activity className="w-4 h-4 text-cyan-600" />
                    Add Medicines & Procedures
                  </h3>

                  {/* Autocomplete Medicine Search */}
                  <div className="space-y-2 relative" ref={dropdownRef}>
                    <label className="block text-xs font-semibold text-slate-600">Search Medicine Inventory (TiDB Cloud)</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Type medicine name, generic ingredient, or scan barcode..."
                        value={medQuery}
                        onChange={e => handleMedSearch(e.target.value)}
                        onFocus={() => setShowMedDropdown(medResults.length > 0)}
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-xs bg-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition shadow-sm"
                      />
                      {searchingMeds && (
                        <Loader2 className="w-4 h-4 animate-spin absolute right-4 top-3.5 text-cyan-600" />
                      )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    <AnimatePresence>
                      {showMedDropdown && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl z-40 max-h-60 overflow-y-auto divide-y divide-slate-100"
                        >
                          {medResults.length === 0 ? (
                            <div className="p-4 text-xs text-slate-400 text-center font-light">No matching medicines found.</div>
                          ) : (
                            medResults.map(med => {
                              const stock = Number(med.stock)
                              const isOutOfStock = stock <= 0
                              const tabsPerPatch = Number(med.tablets_per_patch || 10)
                              const stripsStock = Math.floor(stock / tabsPerPatch)
                              const remTabsStock = stock % tabsPerPatch
                              const activeBatch = med.batches?.find((b: any) => Number(b.stock) > 0) || med.batches?.[0]
                              const displayPrice = activeBatch ? Number(activeBatch.price) : 0

                              return (
                                <div
                                  key={med.id}
                                  onClick={() => !isOutOfStock && addMedicineItem(med)}
                                  className={`flex justify-between items-center px-4 py-3.5 hover:bg-cyan-50/50 transition text-xs cursor-pointer ${
                                    isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                >
                                  <div>
                                    <p className="font-semibold text-slate-900">{med.name} <span className="text-[10px] text-slate-400 font-normal">({tabsPerPatch} tabs/strip)</span></p>
                                    <p className="text-[10px] text-slate-400 font-light">Generic: {med.generic_name || 'N/A'}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {isOutOfStock ? (
                                      <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 text-[10px] rounded-full border border-rose-200 font-semibold uppercase">
                                        Out of Stock
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded-full border border-emerald-200 font-medium">
                                        Stock: {stock} tabs ({stripsStock} strips {remTabsStock > 0 ? `+ ${remTabsStock} tabs` : ''})
                                      </span>
                                    )}
                                    <span className="font-mono font-bold text-slate-800">Rs. {displayPrice.toFixed(2)}/tab</span>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex justify-between items-center pt-1 px-1">
                      <span className="text-[10px] text-slate-400 font-light">Medicine not found in list?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewMedBarcode('')
                          setNewMedName(medQuery)
                          setShowAddMedModal(true)
                        }}
                        className="text-[10px] font-bold text-cyan-600 hover:text-cyan-700 transition"
                      >
                        + Register New Stock Batch
                      </button>
                    </div>
                  </div>

                  {/* Procedures & Custom Rows */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200/60 pt-4">
                    {/* Fixed Clinical Procedure Dropdown */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">Clinical Procedures</label>
                      <div className="flex gap-2">
                        <select
                          value={selectedTreatmentId}
                          onChange={e => setSelectedTreatmentId(e.target.value)}
                          className="flex-1 px-3.5 py-3 border border-slate-200 rounded-2xl text-xs bg-white text-slate-800 focus:outline-none focus:border-cyan-500 shadow-sm"
                        >
                          <option value="">-- Choose procedure --</option>
                          {treatments.map(t => (
                            <option key={t.id} value={t.id}>{t.name} (Rs. {t.price})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddTreatment}
                          disabled={!selectedTreatmentId}
                          className="p-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-2xl transition shadow-md disabled:opacity-40"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Custom Add Action Buttons */}
                    <div className="flex flex-col justify-end">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleAddCustom}
                          className="w-full py-3 border border-dashed border-cyan-300/80 bg-cyan-50/30 hover:bg-cyan-50 rounded-2xl text-[10px] font-bold text-cyan-700 transition flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                          + Custom Procedure
                        </button>
                        <button
                          type="button"
                          onClick={handleAddCustomMedicine}
                          className="w-full py-3 border border-dashed border-teal-300/80 bg-teal-50/30 hover:bg-teal-50 rounded-2xl text-[10px] font-bold text-teal-700 transition flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Barcode className="w-3.5 h-3.5 text-teal-600" />
                          + Custom Medicine
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD 3: COMPILED 3D CART ITEMS */}
              {selectedApptId && billingItems.length > 0 && (
                <div className="card-3d glass-3d rounded-3xl shadow-xl border border-white/70 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-cyan-50/40 flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-cyan-600" />
                      Compiled Invoice Items ({billingItems.length})
                    </h4>
                    <button
                      onClick={() => setBillingItems([])}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold underline"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {billingItems.map((item) => (
                      <div key={item.key} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-slate-50/50 transition">
                        <div className="space-y-0.5 md:max-w-xs flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                              item.type === 'medicine' ? 'bg-cyan-500 shadow-sm shadow-cyan-500/50' : item.type === 'treatment' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-purple-500 shadow-sm shadow-purple-500/50'
                            }`}></span>
                            {item.type === 'custom' || (item.type === 'medicine' && !item.id) ? (
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => updateItem(item.key, 'name', e.target.value)}
                                className="px-2.5 py-1 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 font-semibold text-slate-900 bg-white"
                              />
                            ) : (
                              <strong className="font-semibold text-slate-900">{item.name}</strong>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 capitalize font-light">Category: {item.type}</p>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Price input or label */}
                          <div className="w-24">
                            {item.type === 'custom' || (item.type === 'medicine' && !item.id) ? (
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-slate-400 font-light text-[10px]">Rs.</span>
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={e => updateItem(item.key, 'price', e.target.value)}
                                  className="w-full pl-7 pr-2 py-1 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 font-mono font-medium bg-white"
                                />
                              </div>
                            ) : (
                              <span className="font-mono font-semibold text-slate-700">Rs. {item.price.toFixed(2)}/tab</span>
                            )}
                          </div>

                          {/* Qty & Strip/Tablet toggle */}
                          {item.type === 'medicine' ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="any"
                                value={item.quantity}
                                onChange={e => updateItem(item.key, 'quantity', e.target.value)}
                                className="w-14 px-2 py-1 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 text-center font-mono font-bold text-slate-900 bg-white"
                              />
                              <select
                                value={item.unitType || 'strips'}
                                onChange={e => updateItem(item.key, 'unitType', e.target.value)}
                                className="px-2 py-1 border border-slate-200 rounded-xl text-[10px] bg-white font-medium text-slate-700 focus:outline-none"
                              >
                                <option value="strips">Strips ({item.tabletsPerPatch || 10} tabs)</option>
                                <option value="tablets">Tablets</option>
                              </select>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-mono px-3">Qty: 1</span>
                          )}

                          {/* Line total */}
                          <div className="w-24 text-right font-mono font-bold text-slate-900">
                            Rs. {(item.price * getItemEffectiveQty(item)).toFixed(2)}
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: 3D SPATIAL RECEIPT CARD & CHECKOUT SUMMARY */}
            <div className="lg:col-span-1 space-y-6">
              <div className="card-3d glass-3d p-6 rounded-3xl shadow-2xl border border-white/80 space-y-6 sticky top-6 preserve-3d">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-cyan-600" />
                    Checkout Summary
                  </h3>
                  <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-700 text-[10px] font-bold rounded-full uppercase">
                    Live Total
                  </span>
                </div>

                <div className="space-y-4 text-xs text-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="font-light">Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">Rs. {subtotal.toFixed(2)}</span>
                  </div>

                  {/* Discounts sliders / inputs */}
                  <div className="space-y-3.5 border-t border-slate-200/60 pt-3.5">
                    <div className="flex justify-between items-center">
                      <span className="font-light flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-teal-600" />
                        Treatment Disc %:
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        placeholder="0"
                        value={treatmentDiscountPercent || ''}
                        onChange={e => setTreatmentDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-20 px-2.5 py-1 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 text-center font-mono font-bold text-slate-900 bg-white"
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-light flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-cyan-600" />
                        Medicine Disc %:
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        placeholder="0"
                        value={medicineDiscountPercent || ''}
                        onChange={e => setMedicineDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-20 px-2.5 py-1 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 text-center font-mono font-bold text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  {/* Total Discounts readout */}
                  {discountAmount > 0 && (
                    <div className="space-y-1 text-rose-600 border-t border-rose-100 pt-2 text-[11px]">
                      {treatmentDiscountPercent > 0 && (
                        <div className="flex justify-between font-light">
                          <span>Treatment Discount ({treatmentDiscountPercent}%):</span>
                          <span className="font-mono font-medium">- Rs. {treatmentDiscountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {medicineDiscountPercent > 0 && (
                        <div className="flex justify-between font-light">
                          <span>Medicine Discount ({medicineDiscountPercent}%):</span>
                          <span className="font-mono font-medium">- Rs. {medicineDiscountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-t border-rose-200 pt-1">
                        <span>Total Savings:</span>
                        <span className="font-mono">- Rs. {discountAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Grand Total Highlight Box */}
                  <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white flex justify-between items-center shadow-lg">
                    <span className="text-xs uppercase font-medium tracking-wider text-slate-300">Grand Total:</span>
                    <span className="font-mono text-xl font-bold text-cyan-400">Rs. {grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Information banner */}
                <div className="p-3 bg-cyan-500/10 border border-cyan-400/20 rounded-2xl text-[10px] text-cyan-800 leading-normal flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">3D Storage Pipeline:</strong>
                    <span className="font-light text-slate-600">
                      Creating the invoice writes financial records to database and creates invoice PDF attachments.
                    </span>
                  </div>
                </div>

                {/* Finalize Checkout Action Button */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkingOut || !selectedApptId || billingItems.length === 0}
                  className="w-full py-4 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-2xl font-bold text-xs shadow-xl shadow-cyan-600/20 transition transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Finalizing Invoice & Records...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Finalize Checkout & Create Invoice
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ 3D REGISTER NEW MEDICINE MODAL ═══ */}
        <AnimatePresence>
          {showAddMedModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.9, rotateX: -10 }}
                className="glass-3d rounded-3xl p-7 max-w-md w-full shadow-2xl space-y-4 border border-white/60 text-slate-900 preserve-3d"
              >
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-cyan-600" />
                    Register Medicine to Inventory
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setShowAddMedModal(false)}
                    className="text-slate-400 hover:text-slate-700 text-sm font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleRegisterNewMed} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Barcode (GTIN) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 8901117210103"
                      value={newMedBarcode}
                      onChange={e => setNewMedBarcode(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 font-mono text-slate-900 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Medicine Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Amoxicillin 500mg"
                      value={newMedName}
                      onChange={e => setNewMedName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 text-slate-900 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Generic Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Amoxicillin"
                        value={newMedGeneric}
                        onChange={e => setNewMedGeneric(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 text-slate-900 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Batch Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="AMX2026"
                        value={newMedBatch}
                        onChange={e => setNewMedBatch(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 font-mono text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expiry Date *</label>
                      <input
                        type="date"
                        required
                        value={newMedExpiry}
                        onChange={e => setNewMedExpiry(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 text-slate-900 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tabs per Strip *</label>
                      <input
                        type="number"
                        required
                        value={newMedTabletsPerPatch}
                        onChange={e => setNewMedTabletsPerPatch(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 font-mono text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Price/Strip *</label>
                      <input
                        type="number"
                        required
                        placeholder="120"
                        value={newMedPatchPrice}
                        onChange={e => setNewMedPatchPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 font-mono text-slate-900 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cost/Strip *</label>
                      <input
                        type="number"
                        required
                        placeholder="80"
                        value={newMedCostPrice}
                        onChange={e => setNewMedCostPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 font-mono text-slate-900 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qty Strips *</label>
                      <input
                        type="number"
                        required
                        value={newMedQty}
                        onChange={e => setNewMedQty(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 font-mono text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingNewMed}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold text-xs rounded-2xl shadow-lg transition flex justify-center items-center gap-2"
                  >
                    {savingNewMed && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Stock to Inventory
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
