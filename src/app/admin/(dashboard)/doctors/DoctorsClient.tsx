'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { addDoctor, updateDoctor, deleteDoctor } from '@/app/admin/actions'
import { 
  Plus, Edit, Trash2, X, Upload, Mail, User, ShieldCheck, 
  MapPin, Loader2, AlertCircle, Sparkles, CreditCard, DollarSign, Key
} from 'lucide-react'

interface Doctor {
  id: string
  name: string
  email: string
  specialty: string | null
  picture_url: string | null
  branch_id: string | null
  branches: { id: string; name: string; slug: string } | null
  compensation_type?: string | null
  fixed_salary?: number | null
  profit_percentage?: number | null
  profit_sharing_target?: string | null
  password?: string | null
  slug?: string | null
}

interface Branch {
  id: string
  name: string
  slug: string
}

interface DoctorsClientProps {
  initialDoctors: Doctor[]
  branches: Branch[]
}

export default function DoctorsClient({ initialDoctors, branches }: DoctorsClientProps) {
  const router = useRouter()
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  
  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [branchId, setBranchId] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  // New portal & compensation states
  const [compensationType, setCompensationType] = useState('fixed')
  const [fixedSalary, setFixedSalary] = useState('0')
  const [profitPercentage, setProfitPercentage] = useState('0')
  const [profitSharingTarget, setProfitSharingTarget] = useState('both')
  const [password, setPassword] = useState('doctor123')
  const [slug, setSlug] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Open modal for Adding
  const handleOpenAdd = () => {
    setEditingDoctor(null)
    setName('')
    setEmail('')
    setSpecialty('')
    setBranchId(branches[0]?.id || '')
    setImageFile(null)
    setImagePreview(null)
    setCompensationType('fixed')
    setFixedSalary('0')
    setProfitPercentage('0')
    setProfitSharingTarget('both')
    setPassword('doctor123')
    setSlug('')
    setError(null)
    setIsModalOpen(true)
  }

  // Open modal for Editing
  const handleOpenEdit = (doc: Doctor) => {
    setEditingDoctor(doc)
    setName(doc.name)
    setEmail(doc.email)
    setSpecialty(doc.specialty || '')
    setBranchId(doc.branch_id || '')
    setImageFile(null)
    setImagePreview(doc.picture_url)
    setCompensationType(doc.compensation_type || 'fixed')
    setFixedSalary(String(doc.fixed_salary || '0'))
    setProfitPercentage(String(doc.profit_percentage || '0'))
    setProfitSharingTarget(doc.profit_sharing_target || 'both')
    setPassword(doc.password || 'doctor123')
    setSlug(doc.slug || '')
    setError(null)
    setIsModalOpen(true)
  }

  // Handle Image Change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle Form Submit (Add/Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('name', name)
    formData.append('email', email)
    formData.append('specialty', specialty)
    formData.append('branch_id', branchId)
    formData.append('compensation_type', compensationType)
    formData.append('fixed_salary', fixedSalary)
    formData.append('profit_percentage', profitPercentage)
    formData.append('profit_sharing_target', profitSharingTarget)
    formData.append('password', password)
    formData.append('slug', slug.trim().toLowerCase())
    if (imageFile) {
      formData.append('picture', imageFile)
    }

    try {
      if (editingDoctor) {
        // Edit Action
        formData.append('id', editingDoctor.id)
        formData.append('current_picture_url', editingDoctor.picture_url || '')
        
        const res = await updateDoctor(formData)
        if (res.success) {
          router.refresh()
          setIsModalOpen(false)
          window.location.reload()
        } else {
          setError(res.error || 'Failed to update doctor')
        }
      } else {
        // Add Action
        const res = await addDoctor(formData)
        if (res.success) {
          router.refresh()
          setIsModalOpen(false)
          window.location.reload()
        } else {
          setError(res.error || 'Failed to add doctor')
        }
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred during submission.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this doctor from the network?')) return

    try {
      const res = await deleteDoctor(id)
      if (res.success) {
        setDoctors(prev => prev.filter(d => d.id !== id))
        router.refresh()
      } else {
        alert(res.error || 'Failed to delete doctor')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred during deletion.')
    }
  }

  // Motion animation parameters for list grids
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.97 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 120,
        damping: 14
      }
    }
  }

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* Action Header Card (Claymorphism style) */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="clay bg-white dark:bg-[#121c19] border border-teal-950/10 dark:border-teal-900/30 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div className="space-y-0.5">
          <h2 className="text-base font-bold text-slate-850 dark:text-teal-100 tracking-tight font-serif">Doctors Directory</h2>
          <p className="text-[11px] font-medium text-slate-400 dark:text-teal-400/80">
            Showing {doctors.length} doctors currently registered in the network.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-600/10 transition-all duration-200"
        >
          <Plus className="w-4 h-4" /> Add Clinic Doctor
        </button>
      </motion.div>

      {/* Grid of Doctors */}
      {doctors.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="clay bg-white dark:bg-[#121c19] border border-slate-200/80 dark:border-teal-900/20 p-12 text-center text-slate-400 dark:text-slate-500"
        >
          <AlertCircle className="w-10 h-10 text-slate-350 dark:text-teal-850 mx-auto mb-4 animate-bounce" />
          <p className="text-sm font-semibold">No doctors registered in your network yet.</p>
          <button 
            onClick={handleOpenAdd}
            className="text-xs font-bold text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 underline mt-2 block mx-auto transition"
          >
            Register your first doctor now
          </button>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {doctors.map(doc => (
            <motion.div 
              key={doc.id}
              variants={cardVariants}
              whileHover={{ scale: 1.015, translateY: -2 }}
              className="clay bg-white dark:bg-[#121c19] border border-teal-950/10 dark:border-teal-900/30 overflow-hidden flex flex-col justify-between relative group shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6 space-y-4">
                
                {/* Doctor Avatar/Metadata header */}
                <div className="flex items-start gap-4">
                  {doc.picture_url ? (
                    <img 
                      src={doc.picture_url} 
                      alt={doc.name} 
                      className="w-14 h-14 rounded-full object-cover border-2 border-teal-500/20 dark:border-teal-900/60 bg-slate-50 shrink-0 shadow-sm" 
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-teal-50 dark:bg-[#0c1412] flex items-center justify-center text-teal-700 dark:text-teal-450 border border-teal-200 dark:border-teal-900/40 shrink-0 text-lg font-bold font-serif shadow-sm">
                      {doc.name.charAt(0)}
                    </div>
                  )}
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-slate-850 dark:text-teal-100 text-sm truncate font-serif">Dr. {doc.name}</h3>
                    <p className="text-xs text-slate-400 dark:text-teal-400/80 font-medium truncate">{doc.specialty || 'General Practitioner'}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded-md border uppercase tracking-wider ${
                        doc.branches?.slug === 'hazara' 
                          ? 'bg-teal-50 text-teal-700 border-teal-150 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/40' 
                          : 'bg-amber-50 text-amber-800 border-amber-150 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40'
                      }`}>
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        {doc.branches?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional detailed metrics summary inside dashboard card */}
                <div className="bg-slate-50/50 dark:bg-[#0c1412]/50 border border-slate-100 dark:border-teal-950/30 p-3 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[10px] text-slate-450 dark:text-teal-450">
                    <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-slate-400" /> Scheme:
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {doc.compensation_type === 'percentage' ? 'Profit Share' : 'Fixed Base'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-455 dark:text-teal-450">
                    <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-slate-400" /> Payout Value:
                    </span>
                    <span className="font-bold text-slate-800 dark:text-teal-300 font-mono">
                      {doc.compensation_type === 'percentage' 
                        ? `${doc.profit_percentage}% Share` 
                        : `INR ${(doc.fixed_salary || 0).toLocaleString()}`}
                    </span>
                  </div>
                </div>

                {/* Email link info */}
                <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-teal-400/80 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-teal-500 shrink-0" />
                  <a href={`mailto:${doc.email}`} className="hover:underline text-slate-600 dark:hover:text-teal-300 truncate">
                    {doc.email}
                  </a>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="px-6 py-3 bg-slate-50/40 dark:bg-slate-950/20 border-t border-slate-100 dark:border-teal-950/30 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(doc)}
                  className="p-2 text-slate-500 hover:text-slate-800 dark:text-teal-400 dark:hover:text-teal-200 hover:bg-slate-100/50 dark:hover:bg-white/5 rounded-xl transition cursor-pointer"
                  title="Edit details"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition cursor-pointer"
                  title="Remove doctor"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          ))}
        </motion.div>
      )}

      {/* 4. MODAL overlay for ADD/EDIT doctor */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white dark:bg-[#121c19] border border-slate-200 dark:border-teal-900/35 rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 dark:bg-[#0c1412] dark:border-teal-950/30 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-teal-200 flex items-center gap-2 font-serif">
                  <Sparkles className="w-4 h-4 text-teal-650" />
                  {editingDoctor ? 'Edit Doctor Profile' : 'Add New Doctor'}
                </h3>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh] dark:bg-[#121c19]">
                
                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-start gap-2.5 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-455">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Doctor picture upload wrapper */}
                <div className="flex flex-col items-center justify-center gap-3">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-full border-2 border-dashed border-slate-200 dark:border-teal-900/40 hover:border-teal-500 cursor-pointer flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#0c1412] relative group transition-colors"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-5 h-5 text-slate-400 dark:text-teal-700 group-hover:scale-110 transition-transform" />
                    )}
                    <div className="absolute inset-0 bg-black/40 text-[9px] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      Upload
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-teal-400/60 font-medium">Profile Image (PNG/JPG)</span>
                </div>

                {/* Standard inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Doctor Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-teal-650" />
                      <input
                        type="text"
                        required
                        placeholder="Jane Smith"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-teal-500 bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-teal-650" />
                      <input
                        type="email"
                        required
                        placeholder="dr.jane@clinic.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-teal-500 bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Specialty</label>
                    <input
                      type="text"
                      placeholder="Pediatric Orthodontist"
                      value={specialty}
                      onChange={e => setSpecialty(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-teal-500 bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Branch Assignment</label>
                    <select
                      value={branchId}
                      onChange={e => setBranchId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-teal-500 bg-white dark:bg-[#0c1412] text-slate-850 dark:text-slate-200 font-semibold"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id} className="dark:bg-[#0c1412] dark:text-slate-200">
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Compensation details */}
                <div className="border-t border-slate-100 dark:border-teal-950/30 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Compensation Type</label>
                    <select
                      value={compensationType}
                      onChange={e => setCompensationType(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-teal-500 bg-white dark:bg-[#0c1412] text-slate-850 dark:text-slate-200 font-semibold"
                    >
                      <option value="fixed" className="dark:bg-[#0c1412] dark:text-slate-200 font-medium">Fixed Salary</option>
                      <option value="percentage" className="dark:bg-[#0c1412] dark:text-slate-200 font-medium">Profit Percentage Share</option>
                    </select>
                  </div>

                  {compensationType === 'fixed' ? (
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Monthly Fixed Salary (INR)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={fixedSalary}
                        onChange={e => setFixedSalary(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-teal-500 bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 font-mono font-bold"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Branch Profit Share (%)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          max="100"
                          step="0.1"
                          value={profitPercentage}
                          onChange={e => setProfitPercentage(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-teal-500 bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Profit Sharing Target</label>
                        <select
                          value={profitSharingTarget}
                          onChange={e => setProfitSharingTarget(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-teal-500 bg-white dark:bg-[#0c1412] text-slate-850 dark:text-slate-200 font-semibold"
                        >
                          <option value="both" className="dark:bg-[#0c1412] dark:text-slate-200">Both Treatment & Medicine Profit</option>
                          <option value="treatment" className="dark:bg-[#0c1412] dark:text-slate-200">Treatment Profit Only</option>
                          <option value="medicine" className="dark:bg-[#0c1412] dark:text-slate-200">Medicine Profit Only</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">Portal Password</label>
                    <input
                      type="text"
                      required
                      placeholder="doctor123"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-teal-500 bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-teal-400">URL Slug (e.g. /doctor/name)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. aman"
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-teal-500 bg-white dark:bg-[#0c1412] text-slate-800 dark:text-slate-200 font-semibold"
                    />
                  </div>
                </div>

                {/* Form buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-teal-950/30">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-650 dark:text-teal-400 border border-slate-200 dark:border-teal-900/40 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {editingDoctor ? 'Save Changes' : 'Register Doctor'}
                  </button>
                </div>

              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
