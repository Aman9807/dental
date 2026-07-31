'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { validateCameraPasscode, uploadMobilePrescription, saveMedicineStock, getMedicineByBarcode } from '@/app/admin/actions'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, ShieldAlert, Loader2, CheckCircle2, RefreshCw, Calendar, Clock, 
  ChevronRight, User, Barcode, Scan, X, Sparkles, Check
} from 'lucide-react'

export default function MobileCapturePage() {
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranchSlug, setSelectedBranchSlug] = useState('')
  const [passcode, setPasscode] = useState('')
  const [isValidated, setIsValidated] = useState(false)
  const [validating, setValidating] = useState(false)
  const [passcodeError, setPasscodeError] = useState<string | null>(null)
  const [allowCaptureMedicine, setAllowCaptureMedicine] = useState(false)

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
  const [costPrice, setCostPrice] = useState('80')   // Cost price of 1 patch
  const [tabletsPerPatch, setTabletsPerPatch] = useState('10') // Tablets in 1 patch
  const [medQty, setMedQty] = useState('10') // Quantity of patches/strips to receive
  const [registeringStock, setRegisteringStock] = useState(false)
  const [stockSuccess, setStockSuccess] = useState(false)
  const [cameraScanActive, setCameraScanActive] = useState(false)

  // GS1 DataMatrix and standard 1D/2D parser
  const parseGS1Barcode = (rawText: string) => {
    let str = rawText.replace(/^\]d2/, '').trim()
    const result = { gtin: '', batch: '', expiry: '' }

    if (str.includes('(01)') || str.includes('(17)') || str.includes('(10)')) {
      const gtinMatch = str.match(/\(01\)(\d{14})/)
      const expiryMatch = str.match(/\(17\)(\d{6})/)
      const batchMatch = str.match(/\(10\)([^()]+)/)
      
      if (gtinMatch) result.gtin = gtinMatch[1]
      if (expiryMatch) result.expiry = expiryMatch[1]
      if (batchMatch) result.batch = batchMatch[1]
    } else {
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

  const fetchMedicineDetails = async (gtinCode: string) => {
    try {
      const res = await getMedicineByBarcode(gtinCode, selectedBranchSlug, passcode)
      if (res.success && res.data) {
        setMedName(res.data.name)
        setMedGeneric(res.data.generic_name || '')
        setTabletsPerPatch(String(res.data.tablets_per_patch || 10))
      } else {
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
        tabletsPerPatch: parseInt(tabletsPerPatch),
        branchSlug: selectedBranchSlug
      }, passcode)

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

  useEffect(() => {
    let html5QrcodeScanner: any = null;
    let isMounted = true;

    if (cameraScanActive) {
      import('html5-qrcode').then((module) => {
        if (!isMounted) return;
        const Html5Qrcode = module.Html5Qrcode;
        const scanner = new Html5Qrcode("reader");
        html5QrcodeScanner = scanner;

        scanner.start(
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
            if (isMounted) {
              handleBarcodeChange(decodedText);
              setCameraScanActive(false);
            }
          },
          () => {}
        ).catch((err: any) => {
          console.error("Camera scanner start failed:", err);
        });
      }).catch((err: any) => {
        console.error("Error loading html5-qrcode dynamically:", err);
      });
    }

    return () => {
      isMounted = false;
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

  useEffect(() => {
    if (isValidated && mode === 'barcode' && !allowCaptureMedicine) {
      setMode('prescription')
    }
  }, [isValidated, mode, allowCaptureMedicine])

  useEffect(() => {
    async function loadBranches() {
      const { data } = await supabase.from('branches').select('id, name, slug, allow_capture_medicine')
      setBranches(data || [])
      
      const searchParams = new URLSearchParams(window.location.search)
      const branchParam = searchParams.get('branch')

      if (data && data.length > 0) {
        const found = data.find(b => b.slug === branchParam)
        if (found) {
          setSelectedBranchSlug(found.slug)
          setAllowCaptureMedicine(!!found.allow_capture_medicine)
        } else {
          setSelectedBranchSlug(data[0].slug)
          setAllowCaptureMedicine(!!data[0].allow_capture_medicine)
        }
      }
    }
    loadBranches()
  }, [])

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
              setSelectedApptId(ticketId)
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
          patients (name),
          doctors (name)
        `)
        .eq('branch_id', branchId)
        .gte('appointment_date', todayStr)
        .lte('appointment_date', dayAfterTomorrowStr)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

      if (error) throw error

      let list = data || []
      const targetApptId = activeTicketApptId || appointmentIdParam
      if (targetApptId && !list.some(a => a.id === targetApptId)) {
        const { data: specificData } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            patients (name),
            doctors (name)
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

  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidating(true)
    setPasscodeError(null)

    try {
      const res = await validateCameraPasscode(selectedBranchSlug, passcode)
      if (res.success) {
        setIsValidated(true)
        const found = branches.find(b => b.slug === selectedBranchSlug)
        setAllowCaptureMedicine(!!found?.allow_capture_medicine)
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
          }, 'image/jpeg', 0.8)
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#070c0a] flex flex-col justify-between p-4 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* ═══ HEADER (Claymorphic card) ═══ */}
      <header className="py-4 text-center border border-teal-950/10 dark:border-teal-900/30 bg-white dark:bg-[#121c19] rounded-2xl clay mb-6 animate-scale-in">
        <h1 className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-teal-100 flex items-center justify-center gap-2">
          <Camera className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          Prescription Camera Capture
        </h1>
        <p className="text-[9px] text-slate-400 dark:text-teal-400 font-bold uppercase tracking-wider mt-1">Dental Clinic Mobile Portal</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        
        {/* ═══ STEP 1: AUTHENTICATION ═══ */}
        {!isValidated && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white dark:bg-[#121c19] p-6 border border-slate-200 dark:border-teal-900/30 rounded-3xl clay space-y-6"
          >
            <div className="text-center space-y-2">
              <ShieldAlert className="w-9 h-9 text-teal-650 dark:text-teal-400 mx-auto" />
              <h2 className="text-base font-bold text-slate-800 dark:text-teal-100 font-serif">Branch Authentication</h2>
              <p className="text-xs text-slate-400 dark:text-teal-400/80 font-medium leading-relaxed">
                Select your branch clinic and input the camera authorization key configured in settings.
              </p>
            </div>

            <form onSubmit={handleVerifyPasscode} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-teal-450">Select Branch</label>
                <select
                  value={selectedBranchSlug}
                  onChange={e => {
                    const slug = e.target.value
                    setSelectedBranchSlug(slug)
                    const found = branches.find(b => b.slug === slug)
                    setAllowCaptureMedicine(!!found?.allow_capture_medicine)
                  }}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-semibold"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.slug} className="dark:bg-[#0c1412]">{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-teal-450">Branch Passcode</label>
                <input
                  type="password"
                  required
                  placeholder="Enter branch camera passcode"
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 text-center font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              {passcodeError && (
                <p className="text-xs text-rose-600 text-center font-bold bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-455 py-2.5 rounded-xl">
                  {passcodeError}
                </p>
              )}

              <button
                type="submit"
                disabled={validating || !passcode}
                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/10 cursor-pointer disabled:opacity-50"
              >
                {validating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Unlock Camera Portal
              </button>
            </form>
          </motion.div>
        )}

        {/* ═══ STEP 2: PATIENT & UPLOAD INTERFACE ═══ */}
        {isValidated && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white dark:bg-[#121c19] p-6 border border-slate-200 dark:border-teal-900/30 rounded-3xl clay space-y-6"
          >
            
            {/* Header / Connected Info */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-teal-950/30 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-850 dark:text-teal-100 font-serif">
                  {branches.find(b => b.slug === selectedBranchSlug)?.name}
                </h3>
                <span className="text-[9px] text-teal-600 bg-teal-50 dark:bg-teal-950/20 dark:text-teal-400 px-2.5 py-0.5 rounded-full border border-teal-100 dark:border-teal-900/40 font-bold uppercase tracking-wider mt-1 inline-block">
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
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:text-teal-450 dark:hover:text-teal-300 underline font-semibold"
              >
                Change Branch
              </button>
            </div>

            {/* Dual Options Toggle */}
            <div className="flex bg-slate-100 dark:bg-[#0c1412] p-1 rounded-2xl border border-slate-250/20 dark:border-teal-950/40">
              <button
                type="button"
                onClick={() => setMode('prescription')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 ${
                  mode === 'prescription'
                    ? 'bg-white dark:bg-[#121c19] text-teal-650 dark:text-teal-400 shadow-sm border border-slate-200/10'
                    : 'text-slate-500 hover:text-slate-700 dark:text-teal-400/60 dark:hover:text-teal-300'
                }`}
              >
                Capture Prescription
              </button>
              {allowCaptureMedicine && (
                <button
                  type="button"
                  onClick={() => setMode('barcode')}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 ${
                    mode === 'barcode'
                      ? 'bg-white dark:bg-[#121c19] text-teal-650 dark:text-teal-400 shadow-sm border border-slate-200/10'
                      : 'text-slate-500 hover:text-slate-700 dark:text-teal-400/60 dark:hover:text-teal-300'
                  }`}
                >
                  Scan Medicine Barcode
                </button>
              )}
            </div>

            {/* Mode 1: Capture Prescription */}
            {mode === 'prescription' && (
              <div className="space-y-6">
                {uploadSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 dark:bg-emerald-950/10 dark:border-emerald-900/30 dark:text-emerald-455 rounded-2xl flex flex-col gap-1 items-center text-center"
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-650 dark:text-emerald-400" />
                    <h4 className="text-xs font-bold mt-1.5">Prescription Uploaded Successfully!</h4>
                    <p className="text-[10px] text-emerald-700/80 dark:text-emerald-450/80 font-medium leading-relaxed max-w-xs mt-0.5">
                      The document has been synced to the billing console report card. You may now load another capture ticket.
                    </p>
                    <button
                      onClick={() => setUploadSuccess(false)}
                      className="mt-3 text-[10px] font-bold text-emerald-800 bg-white border border-emerald-250 px-4.5 py-2 rounded-xl hover:bg-emerald-50/50 transition cursor-pointer"
                    >
                      Capture Another
                    </button>
                  </motion.div>
                )}

                {!uploadSuccess && (
                  <div className="space-y-6">
                    {/* Active Sync Ticket Indicator */}
                    {ticketAppt && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 bg-cyan-50 border border-cyan-100 dark:bg-cyan-950/10 dark:border-cyan-900/30 rounded-2xl flex flex-col gap-1 items-start text-left"
                      >
                        <div className="flex items-center gap-1.5 text-cyan-800 dark:text-cyan-400 font-bold text-xs uppercase tracking-wider">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                          </span>
                          <span>Active Sync Ticket</span>
                        </div>
                        <p className="text-[11px] text-cyan-705 dark:text-cyan-300 leading-normal font-bold mt-1.5">
                          Billing console has locked onto: <strong className="text-cyan-900 dark:text-cyan-100 font-extrabold">{ticketAppt?.patients?.name}</strong>
                        </p>
                        <p className="text-[9px] text-cyan-500 dark:text-cyan-450 font-semibold">
                          Please capture the prescription slip and confirm below.
                        </p>
                      </motion.div>
                    )}

                    {/* Patient Appointment Selection */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-slate-700 dark:text-teal-400">Select Patient Appointment</label>
                        <button
                          type="button"
                          onClick={() => fetchAppointments(selectedBranchSlug)}
                          disabled={loadingAppts || !!activeTicketApptId}
                          className="text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-350 transition disabled:opacity-30 cursor-pointer p-1"
                          title="Reload appointments list"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingAppts ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {loadingAppts ? (
                        <div className="flex justify-center items-center py-6">
                          <Loader2 className="w-5 h-5 text-teal-650 dark:text-teal-400 animate-spin" />
                        </div>
                      ) : appointments.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-teal-500/60 bg-slate-50 dark:bg-[#0c1412] border border-slate-205/30 dark:border-teal-950/40 p-5 rounded-2xl text-center font-medium leading-relaxed">
                          No appointments found for the next 3 days.
                        </p>
                      ) : (
                        <select
                          value={selectedApptId}
                          disabled={!!activeTicketApptId}
                          onChange={e => setSelectedApptId(e.target.value)}
                          className={`w-full px-4 py-3 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-semibold ${
                            activeTicketApptId ? 'bg-slate-100 dark:bg-[#0c1412] cursor-not-allowed opacity-80' : 'bg-white dark:bg-[#0c1412]'
                          }`}
                        >
                          {appointments.map(appt => (
                            <option key={appt.id} value={appt.id} className="dark:bg-[#0c1412]">
                              {appt.patients?.name} ({appt.appointment_date} @ {appt.appointment_time.substring(0, 5)})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Camera Capture Controls */}
                    {selectedApptId && (
                      <div className="space-y-4">
                        {!previewUrl ? (
                          <div className="space-y-2">
                            {compressing ? (
                              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-teal-300 dark:border-teal-850 rounded-3xl bg-teal-50/20 dark:bg-teal-950/10 text-center animate-pulse">
                                <Loader2 className="w-8 h-8 text-teal-650 dark:text-teal-400 mb-3 animate-spin" />
                                <span className="text-xs font-bold text-slate-850 dark:text-teal-100">Compressing Image File...</span>
                                <span className="text-[9px] text-slate-400 dark:text-teal-450 mt-1">Optimizing sizes for fast syncing</span>
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
                                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-250 dark:border-teal-900/30 hover:border-teal-500 rounded-3xl cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/5 transition duration-300"
                                >
                                  <Camera className="w-9 h-9 text-teal-605 dark:text-teal-405 mb-2.5 animate-pulse" />
                                  <span className="text-xs font-bold text-slate-850 dark:text-teal-100">Launch Device Camera</span>
                                  <span className="text-[9px] text-slate-400 dark:text-teal-450 mt-1 text-center font-medium max-w-xs">
                                    Capture a clear high-res photo of the prescription slip
                                  </span>
                                </label>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4 animate-scale-in">
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-teal-900/40 aspect-[4/3] bg-slate-900 dark:bg-black flex items-center justify-center">
                              <img
                                src={previewUrl}
                                alt="Captured prescription preview"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-[#0c1412] border border-slate-205/30 dark:border-teal-950/40 p-3.5 rounded-2xl flex items-start gap-2 text-xs">
                              <User className="w-4 h-4 text-slate-405 dark:text-teal-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-slate-850 dark:text-teal-100">Upload Target Details</p>
                                <p className="text-slate-500 dark:text-teal-400 text-[10px] font-medium mt-0.5">
                                  Patient Account: <strong className="text-teal-650 dark:text-teal-400 font-extrabold">{selectedPatientName}</strong>
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
                                className="flex-1 py-3 border border-slate-250 dark:border-teal-900/40 text-slate-600 dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl font-bold text-xs transition text-center cursor-pointer"
                              >
                                Retake Photo
                              </button>
                              
                              <button
                                type="button"
                                onClick={handleUploadPhoto}
                                disabled={uploading}
                                className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/10 cursor-pointer disabled:opacity-50"
                              >
                                {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Sync to Console
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Scan Medicine Barcode (System inventory) */}
            {mode === 'barcode' && (
              <div className="space-y-6">
                {stockSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 dark:bg-emerald-950/10 dark:border-emerald-900/30 dark:text-emerald-455 rounded-2xl flex flex-col gap-1 items-center text-center animate-fade-in"
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-650 dark:text-emerald-400" />
                    <h4 className="text-xs font-bold mt-1.5">Stock Registered Successfully!</h4>
                    <p className="text-[10px] text-emerald-700/80 dark:text-emerald-450/80 font-medium leading-relaxed max-w-xs mt-0.5">
                      The medicine inventory records have been compiled and updated successfully.
                    </p>
                    <button
                      onClick={() => setStockSuccess(false)}
                      className="mt-3 text-xs font-bold text-emerald-800 bg-white border border-emerald-250 px-4 py-2 rounded-xl hover:bg-emerald-50/50 transition cursor-pointer"
                    >
                      Receive More Stock
                    </button>
                  </motion.div>
                )}

                {!stockSuccess && (
                  <form onSubmit={handleRegisterStock} className="space-y-5">
                    {/* Barcode input scanning section */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-teal-400">Scan or Enter Barcode</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Barcode className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 dark:text-teal-700" />
                          <input
                            type="text"
                            placeholder="Scan gun code or type barcode..."
                            value={barcodeInput}
                            onChange={e => handleBarcodeChange(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs bg-slate-50 dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-semibold"
                            autoFocus
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setCameraScanActive(!cameraScanActive)}
                          className={`p-3 border rounded-xl transition cursor-pointer ${
                            cameraScanActive 
                              ? 'bg-teal-50 border-teal-300 text-teal-605 dark:bg-teal-950/20 dark:border-teal-800/60 dark:text-teal-400' 
                              : 'bg-white border-slate-200 text-slate-500 dark:bg-[#0c1412] dark:border-teal-900/40 dark:text-teal-500'
                          }`}
                          title="Use device camera to scan"
                        >
                          <Scan className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Camera scan stream view */}
                    {cameraScanActive && (
                      <div className="relative rounded-2xl overflow-hidden border border-teal-200 dark:border-teal-900/40 aspect-[4/3] bg-slate-900 dark:bg-black flex flex-col justify-between animate-scale-in">
                        <div id="reader" className="w-full h-full object-cover"></div>
                        
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                          <button
                            type="button"
                            onClick={() => {
                              handleBarcodeChange('01089011172101031728073110ABC123')
                              setCameraScanActive(false)
                            }}
                            className="px-3 py-1.5 bg-teal-600/90 text-white text-[9px] font-bold rounded-lg hover:bg-teal-700 transition backdrop-blur-sm shadow cursor-pointer uppercase tracking-wider"
                          >
                            Simulate GS1 Scan
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleBarcodeChange('8901234567890')
                              setCameraScanActive(false)
                            }}
                            className="px-3 py-1.5 bg-slate-800/90 text-white text-[9px] font-bold rounded-lg hover:bg-slate-700 transition backdrop-blur-sm shadow cursor-pointer uppercase tracking-wider"
                          >
                            Simulate 1D Scan
                          </button>
                          <button
                            type="button"
                            onClick={() => setCameraScanActive(false)}
                            className="px-3 py-1.5 bg-rose-605/95 text-white text-[9px] font-bold rounded-lg hover:bg-rose-700 transition backdrop-blur-sm shadow cursor-pointer uppercase tracking-wider"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Placeholder when no barcode has been scanned yet */}
                    {!parsedGtin && (
                      <div className="p-8 border border-dashed border-slate-205 dark:border-teal-900/30 rounded-2xl text-center text-slate-400 dark:text-teal-500/60 text-xs font-medium space-y-2">
                        <Barcode className="w-8 h-8 mx-auto text-slate-300 dark:text-teal-900/50" />
                        <p>Waiting for medicine barcode scan...</p>
                        <p className="text-[10px] text-slate-400/80 dark:text-teal-500/50 leading-relaxed font-light">
                          Position barcode in camera viewfinder, or use scanning device.
                        </p>
                      </div>
                    )}

                    {/* Parsed & Auto-filled details form unlocked upon scanning (Popup Modal) */}
                    <AnimatePresence>
                      {parsedGtin && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                          <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            transition={{ type: 'spring', duration: 0.4 }}
                            className="bg-white dark:bg-[#121c19] w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-200 dark:border-teal-900/35 p-6 space-y-5 relative clay"
                          >
                            
                            {/* Close Modal Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setParsedGtin('')
                                setBarcodeInput('')
                                setCameraScanActive(false)
                              }}
                              className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white rounded-full transition cursor-pointer"
                            >
                              <X className="w-5 h-5" />
                            </button>

                            <div className="pr-10 border-b border-slate-100 dark:border-teal-950/30 pb-3">
                              <h3 className="font-bold text-slate-800 dark:text-teal-200 text-base font-serif">Register Scanned Medicine</h3>
                              <p className="text-[11px] text-slate-500 dark:text-teal-400/85 font-medium mt-1">Please confirm or update pricing breakdown fields.</p>
                            </div>

                            <div className="space-y-5">
                              {/* Parsed Details Card (Glassmorphism layout) */}
                              {(parsedBatch || parsedExpiry) && (
                                <div className="p-3.5 bg-slate-50/50 dark:bg-[#0c1412]/50 border border-slate-200/60 dark:border-teal-950/40 rounded-2xl space-y-2 text-[11px]">
                                  <h4 className="font-bold text-slate-700 dark:text-teal-300 border-b border-slate-200 dark:border-teal-950/30 pb-1.5 uppercase text-[9px] tracking-wider">Parsed GS1 Scanner Fields</h4>
                                  
                                  <div className="grid grid-cols-2 gap-3 font-mono">
                                    <div>
                                      <span className="text-slate-400 dark:text-teal-500/70 block uppercase text-[8px] tracking-wide">GTIN / Code</span>
                                      <span className="text-slate-850 dark:text-slate-200 font-bold truncate block">{parsedGtin}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 dark:text-teal-500/70 block uppercase text-[8px] tracking-wide">Batch No</span>
                                      <span className="text-slate-850 dark:text-slate-200 font-bold truncate block">{parsedBatch || 'GEN-BATCH'}</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-slate-400 dark:text-teal-500/70 block uppercase text-[8px] tracking-wide">Expiry Date</span>
                                      <span className="text-slate-850 dark:text-slate-200 font-bold">{parsedExpiry || 'Default Expiry'}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Stock Registration Fields */}
                              <div className="space-y-3.5 border-t border-slate-100 dark:border-teal-950/30 pt-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Medicine Name</label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="e.g. Amoxicillin 500mg"
                                      value={medName}
                                      onChange={e => setMedName(e.target.value)}
                                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-teal-500"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Generic Name</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Amoxicillin"
                                      value={medGeneric}
                                      onChange={e => setMedGeneric(e.target.value)}
                                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-teal-500"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Tablets / Patch</label>
                                    <input
                                      type="number"
                                      required
                                      value={tabletsPerPatch}
                                      onChange={e => setTabletsPerPatch(e.target.value)}
                                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 font-mono font-bold focus:outline-none focus:border-teal-500"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Cost Price / Patch</label>
                                    <input
                                      type="number"
                                      required
                                      value={costPrice}
                                      onChange={e => setCostPrice(e.target.value)}
                                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 font-mono font-bold focus:outline-none focus:border-teal-500"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Retail / Patch</label>
                                    <input
                                      type="number"
                                      required
                                      value={medPrice}
                                      onChange={e => setMedPrice(e.target.value)}
                                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 font-mono font-bold focus:outline-none focus:border-teal-500"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Qty to Receive</label>
                                    <input
                                      type="number"
                                      required
                                      value={medQty}
                                      onChange={e => setMedQty(e.target.value)}
                                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 font-mono font-bold focus:outline-none focus:border-teal-500"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Batch Number</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. AMX2026"
                                      value={parsedBatch}
                                      onChange={e => setParsedBatch(e.target.value)}
                                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs bg-white dark:bg-[#0c1412] text-slate-850 dark:text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Expiry Date</label>
                                    <input
                                      type="date"
                                      required
                                      value={parsedExpiry}
                                      onChange={e => setParsedExpiry(e.target.value)}
                                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs bg-white dark:bg-[#0c1412] text-slate-850 dark:text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs bg-teal-50/50 dark:bg-[#0c1412]/50 border border-teal-150/40 dark:border-teal-950/40 p-3.5 rounded-2xl">
                                  <div>
                                    <span className="text-[9px] text-slate-400 dark:text-teal-450 block font-bold uppercase tracking-wider">Total Tablets</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-teal-300">{(parseInt(medQty) || 0) * (parseInt(tabletsPerPatch) || 1)} tablets</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-400 dark:text-teal-450 block font-bold uppercase tracking-wider">Price / Tablet</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-teal-300">Rs. {((parseFloat(medPrice) || 0) / (parseInt(tabletsPerPatch) || 1)).toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="submit"
                                disabled={registeringStock || !parsedGtin || !medName}
                                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {registeringStock && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Register Medicine Stock
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-6 text-center border-t border-slate-200/40 dark:border-teal-950/20 text-[10px] text-slate-400 dark:text-teal-500/50 font-medium mt-6">
        <p>© 2026 Dental Clinics. Private Clinical Portal. Developed by Flynx.site developer Khan Tafazzul</p>
      </footer>
    </div>
  )
}
