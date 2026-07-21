'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { validateCameraPasscode, uploadMobilePrescription, saveMedicineStock, getMedicineByBarcode } from '@/app/admin/actions'
import { Camera, ShieldAlert, Loader2, CheckCircle2, RefreshCw, Calendar, Clock, ChevronRight, User, Barcode, Scan, X } from 'lucide-react'

export default function MobileCapturePage() {
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranchSlug, setSelectedBranchSlug] = useState('')
  const [passcode, setPasscode] = useState('')
  const [isValidated, setIsValidated] = useState(false)
  const [validating, setValidating] = useState(false)
  const [passcodeError, setPasscodeError] = useState<string | null>(null)

  // Appointment states
  const [appointments, setAppointments] = useState<any[]>([])
  const [loadingAppts, setLoadingAppts] = useState(false)
  const [selectedApptId, setSelectedApptId] = useState('')
  
  // Camera capture states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [compressing, setCompressing] = useState(false)

  // Sync ticket states
  const [activeTicketApptId, setActiveTicketApptId] = useState<string | null>(null)
  const [ticketAppt, setTicketAppt] = useState<any | null>(null)

  // Mode selection state: prescription or barcode receiving
  const [mode, setMode] = useState<'prescription' | 'barcode'>('prescription')

  // Barcode scanner states
  const [barcodeInput, setBarcodeInput] = useState('')
  const [parsedGtin, setParsedGtin] = useState('')
  const [parsedBatch, setParsedBatch] = useState('')
  const [parsedExpiry, setParsedExpiry] = useState('')
  const [medName, setMedName] = useState('')
  const [medGeneric, setMedGeneric] = useState('')
  const [medPrice, setMedPrice] = useState('120') // Selling price of 1 patch
  const [costPrice, setCostPrice] = useState('80')   // Cost price of 1 patch (new field!)
  const [tabletsPerPatch, setTabletsPerPatch] = useState('10') // Tablets in 1 patch (new field!)
  const [medQty, setMedQty] = useState('10') // Quantity of patches/strips to receive
  const [registeringStock, setRegisteringStock] = useState(false)
  const [stockSuccess, setStockSuccess] = useState(false)
  const [cameraScanActive, setCameraScanActive] = useState(false)

  // GS1 DataMatrix and standard 1D/2D parser
  const parseGS1Barcode = (rawText: string) => {
    let str = rawText.replace(/^\]d2/, '').trim()
    const result = { gtin: '', batch: '', expiry: '' }

    // Case 1: Parentheses format, e.g. (01)08901117210103(17)280731(10)ABC123
    if (str.includes('(01)') || str.includes('(17)') || str.includes('(10)')) {
      const gtinMatch = str.match(/\(01\)(\d{14})/)
      const expiryMatch = str.match(/\(17\)(\d{6})/)
      const batchMatch = str.match(/\(10\)([^()]+)/)
      
      if (gtinMatch) result.gtin = gtinMatch[1]
      if (expiryMatch) result.expiry = expiryMatch[1]
      if (batchMatch) result.batch = batchMatch[1]
    } else {
      // Case 2: Concatenated format, e.g. 01089011172101031728073110ABC123
      let index = 0
      while (index < str.length) {
        if (str.substring(index, index + 2) === '01') {
          result.gtin = str.substring(index + 2, index + 16)
          index += 16
        } else if (str.substring(index, index + 2) === '17') {
          result.expiry = str.substring(index + 2, index + 8)
          index += 8
        } else if (str.substring(index, index + 2) === '10') {
          const gsIndex = str.indexOf('\u001d', index + 2)
          const gsIndexAlt = str.indexOf('\\u001d', index + 2)
          const endIdx = gsIndex !== -1 ? gsIndex : (gsIndexAlt !== -1 ? gsIndexAlt : str.length)
          result.batch = str.substring(index + 2, endIdx)
          index = endIdx
          if (gsIndex !== -1) index += 1
          else if (gsIndexAlt !== -1) index += 6
        } else {
          index++
        }
      }
    }

    // Fallback: If it's a simple 1D barcode/QR (no GTIN AI found), treat entire raw string as GTIN
    if (!result.gtin && str.length > 0) {
      result.gtin = str
    }

    return result
  }

  // Convert YYMMDD to YYYY-MM-DD
  const formatExpiryDate = (yymmdd: string) => {
    if (!yymmdd || yymmdd.length !== 6) {
      const defaultDate = new Date()
      defaultDate.setFullYear(defaultDate.getFullYear() + 1)
      return defaultDate.toISOString().split('T')[0]
    }
    const year = parseInt(yymmdd.substring(0, 2)) + 2000
    const month = yymmdd.substring(2, 4)
    const day = yymmdd.substring(4, 6)
    return `${year}-${month}-${day}`
  }

  // Helper to dynamically query database for barcode information
  const fetchMedicineDetails = async (gtinCode: string) => {
    try {
      const res = await getMedicineByBarcode(gtinCode)
      if (res.success && res.data) {
        setMedName(res.data.name)
        setMedGeneric(res.data.generic_name || '')
        setTabletsPerPatch(String(res.data.tablets_per_patch || 10))
      } else {
        // If not found in DB, search local mock fallback list
        if (gtinCode === '8901117210103') {
          setMedName('Amoxicillin 500mg')
          setMedGeneric('Amoxicillin')
          setTabletsPerPatch('10')
        } else if (gtinCode === '8901234567890') {
          setMedName('Paracetamol 650mg')
          setMedGeneric('Paracetamol')
          setTabletsPerPatch('10')
        } else if (gtinCode === '8901122334455') {
          setMedName('Ibuprofen 400mg')
          setMedGeneric('Ibuprofen')
          setTabletsPerPatch('10')
        } else if (gtinCode === '8901030704944') {
          setMedName('Sensodyne Rapid Relief')
          setMedGeneric('Potassium Nitrate')
          setTabletsPerPatch('1')
        } else {
          setMedName('')
          setMedGeneric('')
          setTabletsPerPatch('10')
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Handle barcode input change
  const handleBarcodeChange = async (val: string) => {
    setBarcodeInput(val)
    if (!val) return

    const parsed = parseGS1Barcode(val)
    setParsedGtin(parsed.gtin)
    setParsedBatch(parsed.batch)
    
    if (parsed.expiry) {
      setParsedExpiry(formatExpiryDate(parsed.expiry))
    } else {
      setParsedExpiry(formatExpiryDate(''))
    }

    if (parsed.gtin) {
      await fetchMedicineDetails(parsed.gtin)
    }
  }

  // Handle register stock
  const handleRegisterStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parsedGtin || !medName) return
    setRegisteringStock(true)

    try {
      const res = await saveMedicineStock(parsedGtin, parseInt(medQty), {
        name: medName,
        genericName: medGeneric || undefined,
        batchNumber: parsedBatch || 'GEN-BATCH',
        expiryDate: parsedExpiry,
        patchPrice: parseFloat(medPrice),
        costPrice: parseFloat(costPrice),
        tabletsPerPatch: parseInt(tabletsPerPatch)
      })

      if (res.success) {
        setStockSuccess(true)
        setBarcodeInput('')
        setParsedGtin('')
        setParsedBatch('')
        setParsedExpiry('')
        setMedName('')
        setMedGeneric('')
        setMedPrice('120')
        setCostPrice('80')
        setTabletsPerPatch('10')
        setMedQty('10')
      } else {
        alert(res.error || 'Failed to register stock')
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'An error occurred')
    } finally {
      setRegisteringStock(false)
    }
  }

  // Real Camera Barcode scanner mount using html5-qrcode
  useEffect(() => {
    let html5QrcodeScanner: any;
    if (cameraScanActive) {
      import('html5-qrcode').then((module) => {
        const Html5Qrcode = module.Html5Qrcode;
        html5QrcodeScanner = new Html5Qrcode("reader");
        html5QrcodeScanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (width: number, height: number) => {
              const minEdge = Math.min(width, height);
              const size = Math.floor(minEdge * 0.7);
              return { width: size, height: Math.floor(size * 0.5) };
            }
          },
          (decodedText: string) => {
            handleBarcodeChange(decodedText);
            setCameraScanActive(false);
          },
          () => {
            // ignore scan failure noise logs
          }
        ).catch((err: any) => {
          console.error("Camera scanner start failed:", err);
        });
      }).catch((err: any) => {
        console.error("Error loading html5-qrcode dynamically:", err);
      });
    }

    return () => {
      if (html5QrcodeScanner) {
        try {
          if (html5QrcodeScanner.isScanning) {
            html5QrcodeScanner.stop().catch((e: any) => console.error("Error stopping scanner:", e));
          }
        } catch (err: any) {
          console.error(err);
        }
      }
    };
  }, [cameraScanActive]);

  // Fetch branches on mount
  useEffect(() => {
    async function loadBranches() {
      const { data } = await supabase.from('branches').select('id, name, slug')
      setBranches(data || [])
      
      const searchParams = new URLSearchParams(window.location.search)
      const branchParam = searchParams.get('branch')

      if (data && data.length > 0) {
        const found = data.find(b => b.slug === branchParam)
        if (found) {
          setSelectedBranchSlug(found.slug)
        } else {
          setSelectedBranchSlug(data[0].slug)
        }
      }
    }
    loadBranches()
  }, [])

  // Poll for active sync tickets in the branch
  useEffect(() => {
    let interval: any
    if (isValidated && selectedBranchSlug) {
      const pollTicket = async () => {
        try {
          const { data: branchData, error: branchErr } = await supabase
            .from('branches')
            .select('active_capture_appointment_id')
            .eq('slug', selectedBranchSlug)
            .single()

          if (branchErr) throw branchErr

          const ticketId = branchData?.active_capture_appointment_id || null
          setActiveTicketApptId(ticketId)

          if (ticketId) {
            // Fetch patient details for this ticket
            const { data: apptData } = await supabase
              .from('appointments')
              .select(`
                id,
                appointment_date,
                appointment_time,
                patients (name),
                doctors (name)
              `)
              .eq('id', ticketId)
              .maybeSingle()

            if (apptData) {
              setTicketAppt(apptData)
              setSelectedApptId(ticketId) // Lock the selection to the ticket
              setAppointments(prev => {
                if (!prev.some(a => a.id === ticketId)) {
                  return [apptData, ...prev]
                }
                return prev
              })
            }
          } else {
            setTicketAppt(null)
          }
        } catch (err) {
          console.error('Error polling for ticket:', err)
        }
      }

      pollTicket()
      interval = setInterval(pollTicket, 3000)
    } else {
      setActiveTicketApptId(null)
      setTicketAppt(null)
    }

    return () => clearInterval(interval)
  }, [isValidated, selectedBranchSlug])

  // Fetch appointments for the selected branch (Next 3 Days + specific synced appointment)
  const fetchAppointments = async (branchSlug: string) => {
    setLoadingAppts(true)
    try {
      const branchId = branches.find(b => b.slug === branchSlug)?.id
      if (!branchId) return

      const searchParams = new URLSearchParams(window.location.search)
      const appointmentIdParam = searchParams.get('appointment')

      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const dayAfterTomorrow = new Date()
      dayAfterTomorrow.setDate(today.getDate() + 2)
      const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          patients (
            name
          ),
          doctors (
            name
          )
        `)
        .eq('branch_id', branchId)
        .gte('appointment_date', todayStr)
        .lte('appointment_date', dayAfterTomorrowStr)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

      if (error) throw error

      let list = data || []

      // Fetch specific appointment if passed via active ticket or URL parameter and not in the main list
      const targetApptId = activeTicketApptId || appointmentIdParam
      if (targetApptId && !list.some(a => a.id === targetApptId)) {
        const { data: specificData } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            patients (
              name
            ),
            doctors (
              name
            )
          `)
          .eq('id', targetApptId)
          .maybeSingle()

        if (specificData) {
          list = [specificData, ...list]
        }
      }

      setAppointments(list)

      if (targetApptId && list.some(a => a.id === targetApptId)) {
        setSelectedApptId(targetApptId)
      } else if (list.length > 0) {
        setSelectedApptId(list[0].id)
      } else {
        setSelectedApptId('')
      }
    } catch (err) {
      console.error('Error loading appointments:', err)
    } finally {
      setLoadingAppts(false)
    }
  }

  // Handle Passcode Validation
  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidating(true)
    setPasscodeError(null)

    try {
      const res = await validateCameraPasscode(selectedBranchSlug, passcode)
      if (res.success) {
        setIsValidated(true)
        await fetchAppointments(selectedBranchSlug)
      } else {
        setPasscodeError(res.error || 'Invalid passcode credentials')
      }
    } catch (err) {
      setPasscodeError('An error occurred during verification')
    } finally {
      setValidating(false)
    }
  }

  // Handle Native Camera Trigger with local canvas image compression
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCompressing(true)
      setUploadSuccess(false)
      
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Downscale high-resolution mobile camera pictures (max 1200px width/height)
          const max_size = 1200
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width
              width = max_size
            }
          } else {
            if (height > max_size) {
              width *= max_size / height
              height = max_size
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name || 'prescription.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              setSelectedFile(compressedFile)
              setPreviewUrl(URL.createObjectURL(compressedFile))
            }
            setCompressing(false)
          }, 'image/jpeg', 0.8) // 0.8 quality handles file compression perfectly
        }
        img.onerror = () => {
          setCompressing(false)
          setSelectedFile(file)
          setPreviewUrl(URL.createObjectURL(file))
        }
        img.src = event.target?.result as string
      }
      reader.onerror = () => {
        setCompressing(false)
        setSelectedFile(file)
        setPreviewUrl(URL.createObjectURL(file))
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle Photo Upload
  const handleUploadPhoto = async () => {
    if (!selectedApptId || !selectedFile) return
    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('appointmentId', selectedApptId)
      formData.append('branchSlug', selectedBranchSlug)
      formData.append('passcode', passcode)
      formData.append('photo', selectedFile)

      const res = await uploadMobilePrescription(formData)
      if (res.success) {
        setUploadSuccess(true)
        setSelectedFile(null)
        setPreviewUrl(null)
      } else {
        alert(res.error || 'Failed to upload photo')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred during upload')
    } finally {
      setUploading(false)
    }
  }

  const selectedPatientName = appointments.find(a => a.id === selectedApptId)?.patients?.name || ''

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 font-sans text-slate-800">
      
      {/* ═══ HEADER ═══ */}
      <header className="py-4 text-center border-b border-slate-200/60 bg-white rounded-2xl shadow-sm mb-6">
        <h1 className="text-lg font-serif font-normal text-slate-900 flex items-center justify-center gap-2">
          <Camera className="w-5 h-5 text-cyan-600" />
          Prescription Camera Capture
        </h1>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Dental Clinic Mobile Portal</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        
        {/* ═══ STEP 1: AUTHENTICATION ═══ */}
        {!isValidated && (
          <div className="w-full bg-white p-6 border border-slate-200 rounded-3xl shadow-lg space-y-6 animate-fade-in-up">
            <div className="text-center space-y-2">
              <ShieldAlert className="w-10 h-10 text-cyan-600 mx-auto" />
              <h2 className="text-base font-semibold text-slate-800">Branch Authentication Required</h2>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Please select your branch and enter the branch passcode configured in the settings dashboard.
              </p>
            </div>

            <form onSubmit={handleVerifyPasscode} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Select Branch</label>
                <select
                  value={selectedBranchSlug}
                  onChange={e => setSelectedBranchSlug(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-cyan-600"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.slug}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Branch Passcode</label>
                <input
                  type="password"
                  required
                  placeholder="Enter branch camera passcode"
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white text-center font-mono focus:outline-none focus:border-cyan-600"
                />
              </div>

              {passcodeError && (
                <p className="text-xs text-rose-600 text-center font-medium bg-rose-50 border border-rose-100 py-2 rounded-xl">
                  {passcodeError}
                </p>
              )}

              <button
                type="submit"
                disabled={validating || !passcode}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/10"
              >
                {validating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Unlock Camera Portal
              </button>
            </form>
          </div>
        )}

        {/* ═══ STEP 2: PATIENT & UPLOAD INTERFACE ═══ */}
        {isValidated && (
          <div className="w-full bg-white p-6 border border-slate-200 rounded-3xl shadow-lg space-y-6 animate-fade-in-up">
            
            {/* Header / Info */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {branches.find(b => b.slug === selectedBranchSlug)?.name}
                </h3>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-semibold uppercase">
                  Connected
                </span>
              </div>
              <button 
                onClick={() => {
                  setIsValidated(false)
                  setPasscode('')
                  setAppointments([])
                  setSelectedFile(null)
                  setPreviewUrl(null)
                  setUploadSuccess(false)
                  setStockSuccess(false)
                }}
                className="text-[10px] text-slate-400 hover:text-slate-600 underline font-light"
              >
                Change Branch
              </button>
            </div>

            {/* Dual Options Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/40">
              <button
                type="button"
                onClick={() => setMode('prescription')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all duration-300 ${
                  mode === 'prescription'
                    ? 'bg-white text-cyan-700 shadow-sm border border-slate-200/10'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Capture Prescription
              </button>
              <button
                type="button"
                onClick={() => setMode('barcode')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all duration-300 ${
                  mode === 'barcode'
                    ? 'bg-white text-cyan-700 shadow-sm border border-slate-200/10'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Scan Medicine Barcode
              </button>
            </div>

            {/* Mode 1: Capture Prescription */}
            {mode === 'prescription' && (
              <>
                {/* Upload Success Alert */}
                {uploadSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex flex-col gap-1 items-center text-center animate-fade-in">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    <h4 className="text-xs font-bold mt-1">Prescription Uploaded Successfully!</h4>
                    <p className="text-[10px] text-emerald-700/80 font-light leading-relaxed">
                      The photo is now instantly loaded inside the admin panel report card. You can capture another prescription or close this page.
                    </p>
                    <button
                      onClick={() => setUploadSuccess(false)}
                      className="mt-2 text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50/50 transition"
                    >
                      Capture Another
                    </button>
                  </div>
                )}

                {!uploadSuccess && (
                  <div className="space-y-6">
                    {/* 1. Appointment Selection Dropdown */}
                    <div className="space-y-3">
                      {ticketAppt && (
                        <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-2xl flex flex-col gap-1 items-start text-left animate-fade-in">
                          <div className="flex items-center gap-1.5 text-cyan-800 font-bold text-xs uppercase tracking-wide">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                            <span>Active Sync Ticket</span>
                          </div>
                          <p className="text-[11px] text-cyan-700 leading-normal font-medium mt-1">
                            Dentist/Admin has requested a photo for: <strong className="text-cyan-900 font-bold">{ticketAppt?.patients?.name}</strong>
                          </p>
                          <p className="text-[9px] text-cyan-500 font-light">
                            The screen has locked onto this patient. snap and upload below.
                          </p>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-semibold text-slate-700">Select Patient Appointment</label>
                          <button
                            type="button"
                            onClick={() => fetchAppointments(selectedBranchSlug)}
                            disabled={loadingAppts || !!activeTicketApptId}
                            className="text-cyan-600 hover:text-cyan-800 transition disabled:opacity-30"
                            title="Reload appointments"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingAppts ? 'animate-spin' : ''}`} />
                          </button>
                        </div>

                        {loadingAppts ? (
                          <div className="flex justify-center items-center py-4">
                            <Loader2 className="w-4 h-4 text-cyan-600 animate-spin" />
                          </div>
                        ) : appointments.length === 0 ? (
                          <p className="text-xs text-slate-400 bg-slate-50 border p-4 rounded-2xl text-center font-light leading-relaxed">
                            No appointments found for today, tomorrow, or the day after tomorrow.
                          </p>
                        ) : (
                          <select
                            value={selectedApptId}
                            disabled={!!activeTicketApptId}
                            onChange={e => setSelectedApptId(e.target.value)}
                            className={`w-full px-4 py-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-cyan-600 ${
                              activeTicketApptId ? 'bg-slate-100 cursor-not-allowed opacity-80' : 'bg-white'
                            }`}
                          >
                            {appointments.map(appt => (
                              <option key={appt.id} value={appt.id}>
                                {appt.patients?.name} ({appt.appointment_date} @ {appt.appointment_time.substring(0, 5)})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* 2. Photo capture inputs */}
                    {selectedApptId && (
                      <div className="space-y-4">
                        {!previewUrl ? (
                          <div className="space-y-2">
                            {compressing ? (
                              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-cyan-300 rounded-3xl bg-cyan-50/20 text-center animate-pulse">
                                <Loader2 className="w-10 h-10 text-cyan-600 mb-3 animate-spin" />
                                <span className="text-xs font-semibold text-slate-800">Processing & Compressing Photo...</span>
                                <span className="text-[10px] text-slate-400 font-light mt-1">Optimizing image size for instant uploads</span>
                              </div>
                            ) : (
                              <>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  id="camera-input"
                                  onChange={handlePhotoCapture}
                                  className="hidden"
                                />
                                <label
                                  htmlFor="camera-input"
                                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 hover:border-cyan-500 rounded-3xl cursor-pointer hover:bg-slate-50/50 transition duration-300"
                                >
                                  <Camera className="w-10 h-10 text-cyan-600 mb-3 animate-pulse" />
                                  <span className="text-xs font-semibold text-slate-800">Launch Mobile Camera</span>
                                  <span className="text-[10px] text-slate-400 font-light mt-1 text-center">
                                    Snap a picture of the written prescription paper
                                  </span>
                                </label>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4 animate-fade-in">
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-900 flex items-center justify-center">
                              <img
                                src={previewUrl}
                                alt="Captured prescription preview"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            
                            <div className="bg-slate-50 border p-3 rounded-2xl flex items-start gap-2 text-xs">
                              <User className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold text-slate-800">Confirm Patient</p>
                                <p className="text-slate-500 text-[11px] font-light">
                                  Uploading prescription for: <strong className="text-cyan-700 font-semibold">{selectedPatientName}</strong>
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFile(null)
                                  setPreviewUrl(null)
                                }}
                                className="flex-1 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl font-semibold text-xs transition text-center"
                              >
                                Retake Photo
                              </button>
                              
                              <button
                                type="button"
                                onClick={handleUploadPhoto}
                                disabled={uploading}
                                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/10"
                              >
                                {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Confirm & Upload
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Mode 2: Scan Medicine Barcode (TiDB Cloud inventory) */}
            {mode === 'barcode' && (
              <div className="space-y-6 animate-fade-in">
                {stockSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex flex-col gap-1 items-center text-center animate-fade-in">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    <h4 className="text-xs font-bold mt-1">Stock Registered Successfully!</h4>
                    <p className="text-[10px] text-emerald-700/80 font-light leading-relaxed">
                      The medicine inventory has been updated in TiDB Cloud. You can scan/receive another item or toggle back to prescriptions.
                    </p>
                    <button
                      onClick={() => setStockSuccess(false)}
                      className="mt-2 text-xs font-bold text-emerald-800 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50/50 transition"
                    >
                      Receive More Stock
                    </button>
                  </div>
                )}

                {!stockSuccess && (
                  <form onSubmit={handleRegisterStock} className="space-y-5">
                    {/* Barcode input scanning section */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">Scan or Enter Barcode</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Barcode className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Scan gun code or type 1D/2D GS1 barcode..."
                            value={barcodeInput}
                            onChange={e => handleBarcodeChange(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-cyan-600"
                            autoFocus
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setCameraScanActive(!cameraScanActive)}
                          className={`p-3 border rounded-xl transition ${
                            cameraScanActive ? 'bg-cyan-50 border-cyan-300 text-cyan-600' : 'bg-white border-slate-200 text-slate-500'
                          }`}
                          title="Use device camera to scan"
                        >
                          <Scan className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Camera scan stream view */}
                    {cameraScanActive && (
                      <div className="relative rounded-2xl overflow-hidden border border-cyan-200 aspect-[4/3] bg-slate-900 flex flex-col justify-between animate-scale-in">
                        {/* Target container for camera video stream */}
                        <div id="reader" className="w-full h-full object-cover"></div>
                        
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                          <button
                            type="button"
                            onClick={() => {
                              handleBarcodeChange('01089011172101031728073110ABC123')
                              setCameraScanActive(false)
                            }}
                            className="px-3 py-1.5 bg-cyan-600/90 text-white text-[10px] font-semibold rounded-lg hover:bg-cyan-700 transition backdrop-blur-sm shadow"
                          >
                            Simulate GS1 Scan
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleBarcodeChange('8901234567890')
                              setCameraScanActive(false)
                            }}
                            className="px-3 py-1.5 bg-slate-800/90 text-white text-[10px] font-semibold rounded-lg hover:bg-slate-700 transition backdrop-blur-sm shadow"
                          >
                            Simulate 1D Scan
                          </button>
                          <button
                            type="button"
                            onClick={() => setCameraScanActive(false)}
                            className="px-3 py-1.5 bg-rose-600/90 text-white text-[10px] font-semibold rounded-lg hover:bg-rose-700 transition backdrop-blur-sm shadow"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Placeholder when no barcode has been scanned yet */}
                    {!parsedGtin && (
                      <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs font-light space-y-2 animate-pulse">
                        <Barcode className="w-8 h-8 mx-auto text-slate-300" />
                        <p>Waiting for medicine barcode scan...</p>
                        <p className="text-[10px] text-slate-400/80">Scan with barcode gun, type code, or click scanner icon above to unlock details form.</p>
                      </div>
                    )}

                    {/* Parsed & Auto-filled details form unlocked upon scanning (Popup Modal) */}
                    {parsedGtin && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 relative">
                          
                          {/* Close Modal Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setParsedGtin('')
                              setBarcodeInput('')
                              setCameraScanActive(false)
                            }}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition"
                          >
                            <X className="w-5 h-5" />
                          </button>

                          <div className="pr-10 border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-800 text-lg">Register Scanned Medicine</h3>
                            <p className="text-xs text-slate-500 font-light mt-1">Please fill out any missing details for stock entry.</p>
                          </div>

                          <div className="space-y-5">
                        {/* Parsed Details Card (Glassmorphism layout) */}
                        {(parsedBatch || parsedExpiry) && (
                          <div className="p-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl space-y-3 text-xs">
                            <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-1.5">Parsed GS1 Scanner Fields</h4>
                            
                            <div className="grid grid-cols-2 gap-3 text-[11px]">
                              <div>
                                <span className="text-slate-400 font-light block uppercase text-[9px] tracking-wide">GTIN / Code</span>
                                <span className="font-mono text-slate-850 font-bold">{parsedGtin}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-light block uppercase text-[9px] tracking-wide">Batch No</span>
                                <span className="font-mono text-slate-850 font-bold">{parsedBatch || 'GEN-BATCH'}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-slate-400 font-light block uppercase text-[9px] tracking-wide">Expiry Date</span>
                                <span className="font-mono text-slate-850 font-bold">{parsedExpiry || 'Default Expiry'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Stock Registration Fields */}
                        <div className="space-y-3.5 border-t border-slate-100 pt-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-slate-700">Medicine Name</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Amoxicillin 500mg"
                                value={medName}
                                onChange={e => setMedName(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-cyan-600"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-slate-700">Generic Name</label>
                              <input
                                type="text"
                                placeholder="e.g. Amoxicillin"
                                value={medGeneric}
                                onChange={e => setMedGeneric(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-cyan-600"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-slate-650">Tablets in 1 Patch</label>
                              <input
                                type="number"
                                required
                                placeholder="10"
                                value={tabletsPerPatch}
                                onChange={e => setTabletsPerPatch(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-cyan-600 font-mono"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-slate-650">Cost Price / Patch (INR)</label>
                              <input
                                type="number"
                                required
                                placeholder="80"
                                value={costPrice}
                                onChange={e => setCostPrice(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-cyan-600 font-mono"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-slate-650">Selling Price / Patch (INR)</label>
                              <input
                                type="number"
                                required
                                placeholder="120"
                                value={medPrice}
                                onChange={e => setMedPrice(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-cyan-600 font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="block text-xs font-medium text-slate-500">Patches to Receive</label>
                              <input
                                type="number"
                                required
                                placeholder="10"
                                value={medQty}
                                onChange={e => setMedQty(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-cyan-600 font-mono"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-medium text-slate-500">Batch Number</label>
                              <input
                                type="text"
                                placeholder="e.g. AMX2026"
                                value={parsedBatch}
                                onChange={e => setParsedBatch(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white font-mono focus:outline-none focus:border-cyan-600"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-medium text-slate-500">Expiry Date</label>
                              <input
                                type="date"
                                required
                                value={parsedExpiry}
                                onChange={e => setParsedExpiry(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white font-mono focus:outline-none focus:border-cyan-600"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs bg-cyan-50/50 border border-cyan-150 p-3.5 rounded-2xl">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-light uppercase">Quantity in Tablets</span>
                              <span className="font-mono font-bold text-slate-700">{(parseInt(medQty) || 0) * (parseInt(tabletsPerPatch) || 1)} tablets</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-light uppercase">Unit Price per Tablet</span>
                              <span className="font-mono font-bold text-slate-700">Rs. {((parseFloat(medPrice) || 0) / (parseInt(tabletsPerPatch) || 1)).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={registeringStock || !parsedGtin || !medName}
                          className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {registeringStock && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Register Medicine Stock (TiDB)
                        </button>
                      </div>
                        </div>
                      </div>
                    )}
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-6 text-center border-t border-slate-200/40 text-[10px] text-slate-400 font-light mt-6">
        <p>© 2026 Dental Clinics. Private Clinical Portal.</p>
      </footer>
    </div>
  )
}
