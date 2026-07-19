'use client'

import React, { useState, useEffect, useRef } from 'react'
import { searchMedicines, createInvoice, triggerDeliverAndCleanup } from '@/app/admin/actions'
import { 
  Receipt, User, Search, PlusCircle, Trash2, Loader2, 
  CheckCircle, Percent, AlertCircle, ShoppingCart, Activity, ShieldAlert, Sparkles, Send, Barcode
} from 'lucide-react'

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
  const [discountPercent, setDiscountPercent] = useState<number>(0)

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
      const res = await searchMedicines(val)
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
    // Check if out of stock
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
      // Find oldest active batch price
      const price = med.batches && med.batches.length > 0 ? Number(med.batches[0].price) : Number(med.price)
      const newItem: BillingItem = {
        key: `med_${med.id}_${Date.now()}`,
        type: 'medicine',
        id: med.id,
        name: med.name,
        quantity: 1,
        price: price,
        maxStock: stock
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
      name: 'Custom Dental Work',
      quantity: 1,
      price: 1000
    }
    setBillingItems([...billingItems, newItem])
  }

  // Add Custom Medicine (Editable Row for manual additions)
  const handleAddCustomMedicine = () => {
    const newItem: BillingItem = {
      key: `custom_med_${Date.now()}`,
      type: 'medicine',
      name: 'Custom Medicine Name',
      quantity: 10, // Default to standard strip size
      price: 12 // Default tablet price
    }
    setBillingItems([...billingItems, newItem])
  }

  // Update item quantity or custom text
  const updateItem = (key: string, field: 'quantity' | 'price' | 'name', value: any) => {
    const updated = billingItems.map(item => {
      if (item.key === key) {
        if (field === 'quantity') {
          let val = parseInt(value) || 1
          if (item.type === 'medicine' && item.maxStock) {
            val = Math.min(val, item.maxStock)
          }
          return { ...item, quantity: Math.max(1, val) }
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
  const subtotal = billingItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const discountAmount = subtotal * (discountPercent / 100)
  const grandTotal = subtotal - discountAmount

  // Finalize checkout and trigger auto delivery/cleanup pipeline
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
      // 1. Create Invoice on Supabase and deduct stock from TiDB
      const invoiceRes = await createInvoice(
        selectedApptId,
        billingItems,
        subtotal,
        discountPercent,
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
      setCheckoutSuccess(true)
      setBillingItems([])
      setDiscountPercent(0)
      setSelectedApptId('')
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'An error occurred during checkout.')
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans max-w-5xl">
      
      {/* ═══ PAGE HEADER ═══ */}
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
        <h1 className="text-2xl font-serif text-slate-900 font-normal flex items-center gap-2">
          <Receipt className="w-6 h-6 text-slate-700" />
          Unified Billing & Checkout
        </h1>
        <p className="text-xs text-slate-400 font-light uppercase tracking-wider">
          Compile medicine stock & clinical procedures into a single finalized invoice.
        </p>
      </div>

      {checkoutSuccess ? (
        /* ═══ SUCCESS ALERT CONTAINER ═══ */
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center max-w-xl mx-auto space-y-6 animate-scale-in">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-sm animate-pulse-glow">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-serif text-slate-800">Bill Generated & Saved!</h3>
            <p className="text-xs text-slate-500 leading-relaxed px-4">
              The invoice has been created and attached to the patient's record. The invoice details are saved below.
            </p>
            <div className="mx-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xl font-normal leading-relaxed text-left flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <span>
                <strong>Email delivery is deferred:</strong> This bill has not been emailed yet. Go to the <strong>Appointments</strong> tab and open the <strong>"Reports"</strong> modal for this patient to send this bill along with their prescription and X-ray in a single combined email.
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border p-4 rounded-2xl text-left text-xs font-mono space-y-1.5 text-slate-600">
            <div className="flex justify-between border-b pb-1 mb-1 font-bold text-slate-700">
              <span>Pipeline Target</span>
              <span>Status</span>
            </div>
            <div className="flex justify-between">
              <span>Patient Invoice</span>
              <span>Rs. {successInfo?.total?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Invoice ID</span>
              <span className="font-bold text-slate-700">{successInfo?.invoiceId?.substring(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>State</span>
              <span className="text-amber-600 font-semibold">Saved / Awaiting Report Dispatch</span>
            </div>
          </div>

          <button
            onClick={() => setCheckoutSuccess(false)}
            className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition"
          >
            Create Another Invoice
          </button>
        </div>
      ) : (
        /* ═══ MAIN BILLING LAYOUT ═══ */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: SELECTIONS & SEARCH */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Patient selection card */}
            <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b pb-3">
                <User className="w-4 h-4 text-cyan-600" />
                1. Select Patient Appointment
              </h3>
              
              <div className="space-y-3">
                <select
                  value={selectedApptId}
                  onChange={e => setSelectedApptId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:border-cyan-600"
                >
                  <option value="">-- Choose active appointment to bill --</option>
                  {appointments
                    .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
                    .map(appt => (
                      <option key={appt.id} value={appt.id}>
                        {appt.patients?.name} - {appt.branches?.name} ({appt.appointment_date} @ {appt.appointment_time.substring(0, 5)})
                      </option>
                    ))}
                </select>

                {/* Display active patient documents/status */}
                {selectedAppt && (
                  <div className="p-4 bg-slate-50 border rounded-2xl text-xs space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div><strong className="text-slate-700">Patient:</strong> {selectedAppt.patients?.name}</div>
                      <div><strong className="text-slate-700">Doctor:</strong> Dr. {selectedAppt.doctors?.name}</div>
                      <div><strong className="text-slate-700">Mobile:</strong> {selectedAppt.patients?.mobile}</div>
                      <div><strong className="text-slate-700">Email:</strong> {selectedAppt.patients?.email}</div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        selectedAppt.temp_mobile_photo || selectedAppt.prescription_url
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        Prescription: {selectedAppt.temp_mobile_photo || selectedAppt.prescription_url ? 'Attached' : 'Pending'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        selectedAppt.xray_url
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-50 text-slate-500 border-slate-100'
                      }`}>
                        X-Ray: {selectedAppt.xray_url ? 'Uploaded' : 'No X-Ray'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Medicine & Treatment inventory search */}
            {selectedApptId && (
              <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm space-y-5">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b pb-3">
                  <Activity className="w-4 h-4 text-cyan-600" />
                  2. Add Medicine & Treatments
                </h3>

                {/* Autocomplete Medicine Search (TiDB) */}
                <div className="space-y-1.5 relative" ref={dropdownRef}>
                  <label className="block text-xs font-medium text-slate-500">Search Medicines (TiDB Cloud Inventory)</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type medicine name, generic name, or scan barcode..."
                      value={medQuery}
                      onChange={e => handleMedSearch(e.target.value)}
                      onFocus={() => setShowMedDropdown(medResults.length > 0)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-cyan-600"
                    />
                    {searchingMeds && (
                      <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-cyan-600" />
                    )}
                  </div>

                  {showMedDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto">
                      {medResults.length === 0 ? (
                        <div className="p-4 text-xs text-slate-400 text-center font-light">No matches in inventory.</div>
                      ) : (
                        medResults.map(med => {
                          const stock = Number(med.stock)
                          const isOutOfStock = stock <= 0
                          const tabsPerPatch = Number(med.tablets_per_patch || 10)
                          const stripsStock = Math.floor(stock / tabsPerPatch)
                          const remTabsStock = stock % tabsPerPatch
                          return (
                            <div
                              key={med.id}
                              onClick={() => !isOutOfStock && addMedicineItem(med)}
                              className={`flex justify-between items-center px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition text-xs cursor-pointer ${
                                isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              <div>
                                <p className="font-semibold text-slate-800">{med.name} <span className="text-[10px] text-slate-400 font-normal">({tabsPerPatch} tabs/strip)</span></p>
                                <p className="text-[10px] text-slate-400 font-light">Generic: {med.generic_name || 'N/A'}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isOutOfStock ? (
                                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] rounded-full border border-rose-100 font-semibold uppercase">
                                    Out of Stock
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded-full border border-emerald-100 font-medium">
                                    Stock: {stock} tabs ({stripsStock} strips {remTabsStock > 0 ? `+ ${remTabsStock} tabs` : ''})
                                  </span>
                                )}
                                <span className="font-mono font-bold text-slate-655">Rs. {Number(med.price).toFixed(2)}/tab</span>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  {/* Select Treatment dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500">Fixed Clinical Procedures</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedTreatmentId}
                        onChange={e => setSelectedTreatmentId(e.target.value)}
                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:border-cyan-600"
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
                        className="p-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition disabled:opacity-40"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Add custom buttons */}
                  <div className="flex flex-col justify-end">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleAddCustom}
                        className="w-full py-3 border border-dashed border-slate-300 hover:border-cyan-600 hover:bg-slate-50 rounded-xl text-[10px] font-semibold text-slate-600 hover:text-cyan-700 transition flex items-center justify-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        + Custom Procedure
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomMedicine}
                        className="w-full py-3 border border-dashed border-slate-300 hover:border-teal-650 hover:bg-teal-50/20 rounded-xl text-[10px] font-semibold text-slate-600 hover:text-teal-700 transition flex items-center justify-center gap-1"
                      >
                        <Barcode className="w-3.5 h-3.5 text-teal-650" />
                        + Custom Medicine
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Compiled invoice lines list */}
            {selectedApptId && billingItems.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-fade-in">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-slate-500" />
                    Invoice Items ({billingItems.length})
                  </h4>
                  <button
                    onClick={() => setBillingItems([])}
                    className="text-[10px] text-rose-600 hover:text-rose-800 font-medium underline"
                  >
                    Clear All
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {billingItems.map((item, idx) => (
                    <div key={item.key} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                      <div className="space-y-0.5 md:max-w-xs flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            item.type === 'medicine' ? 'bg-cyan-500' : item.type === 'treatment' ? 'bg-emerald-500' : 'bg-purple-500'
                          }`}></span>
                          {item.type === 'custom' || (item.type === 'medicine' && !item.id) ? (
                            <input
                              type="text"
                              value={item.name}
                              onChange={e => updateItem(item.key, 'name', e.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-cyan-500 font-semibold text-slate-800"
                            />
                          ) : (
                            <strong className="font-semibold text-slate-800">{item.name}</strong>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 capitalize font-light">Category: {item.type}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Price field */}
                        <div className="w-24">
                          {item.type === 'custom' || (item.type === 'medicine' && !item.id) ? (
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-slate-400 font-light text-[10px]">Rs.</span>
                              <input
                                type="number"
                                value={item.price}
                                onChange={e => updateItem(item.key, 'price', e.target.value)}
                                className="w-full pl-6 pr-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-cyan-500 font-mono font-medium"
                              />
                            </div>
                          ) : (
                            <span className="font-mono font-semibold text-slate-600 font-medium">Rs. {item.price.toFixed(2)}/tab</span>
                          )}
                        </div>

                        {/* Qty multiplier */}
                        {item.type === 'medicine' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={e => updateItem(item.key, 'quantity', e.target.value)}
                              className="w-12 px-1.5 py-1 border border-slate-200 rounded focus:outline-none focus:border-cyan-500 text-center font-mono font-medium"
                            />
                            {item.maxStock !== undefined ? (
                              <span className="text-[10px] text-slate-400 font-light">/ {item.maxStock} tabs</span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-light">tabs</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-mono px-3">Qty: 1</span>
                        )}

                        {/* Line Total */}
                        <div className="w-20 text-right font-mono font-bold text-slate-800">
                          Rs. {(item.price * item.quantity).toFixed(2)}
                        </div>

                        {/* Remove line */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: DISCOUNT & GRAND TOTALS */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Totals Calculation Summary */}
            <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm space-y-6 sticky top-6">
              <h3 className="text-sm font-semibold text-slate-850 flex items-center gap-2 border-b pb-3">
                <Receipt className="w-4 h-4 text-slate-500" />
                Checkout Summary
              </h3>

              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="font-light">Subtotal:</span>
                  <span className="font-mono font-semibold text-slate-800">Rs. {subtotal.toFixed(2)}</span>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-3.5">
                  <div className="flex justify-between items-center">
                    <span className="font-light flex items-center gap-1">
                      <Percent className="w-3 h-3 text-cyan-600" />
                      Discount %:
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={discountPercent || ''}
                      onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-16 px-2 py-1 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-500 text-center font-mono font-bold"
                    />
                  </div>
                </div>

                {discountPercent > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span className="font-light">Discount Value ({discountPercent}%):</span>
                    <span className="font-mono font-bold">- Rs. {discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-slate-200 pt-4 text-base font-bold text-slate-800">
                  <span>Grand Total:</span>
                  <span className="font-mono text-cyan-700">Rs. {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* PDF Invoice generation message */}
              <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-[10px] text-cyan-700 leading-normal flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Automated Delivery & Clean Up Trigger:</strong>
                  <p className="mt-0.5 font-light">
                    Finalizing checkout generates the invoice PDF in storage, sends it via Email & WhatsApp, and automatically deletes files/medical records to satisfy security policies.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkingOut || !selectedApptId || billingItems.length === 0}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-cyan-600/10 transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {checkingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finalizing & Purging...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Finalize & Purge Records
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
