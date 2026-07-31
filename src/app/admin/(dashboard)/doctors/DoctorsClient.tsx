'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { addDoctor, updateDoctor, deleteDoctor } from '@/app/admin/actions'
import { 
  Plus, Edit, Trash2, X, Upload, Mail, User, ShieldCheck, 
  MapPin, Loader2, AlertCircle, Sparkles
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
          // Re-fetch or update state locally
          router.refresh()
          setIsModalOpen(false)
          // Simple visual refresh state trigger
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      className="space-y-6"
    >
      
      {/* Action Header */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-light text-slate-500">
          Showing {doctors.length} doctors currently registered.
        </span>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-all duration-200"
        >
          <Plus className="w-4 h-4" /> Add Clinic Doctor
        </button>
      </div>

      {/* Grid of Doctors */}
      {doctors.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-light">No doctors registered in your network yet.</p>
          <button 
            onClick={handleOpenAdd}
            className="text-xs font-medium text-slate-800 underline mt-2 block mx-auto"
          >
            Register your first doctor now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map(doc => (
            <div 
              key={doc.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                
                {/* Doctor Avatar/Metadata header */}
                <div className="flex items-start gap-4">
                  {doc.picture_url ? (
                    <img 
                      src={doc.picture_url} 
                      alt={doc.name} 
                      className="w-16 h-16 rounded-full object-cover border border-slate-200/60 bg-slate-50 shrink-0" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0 text-xl font-serif">
                      {doc.name.charAt(0)}
                    </div>
                  )}
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-800 text-sm">Dr. {doc.name}</h3>
                    <p className="text-xs text-slate-400 font-light">{doc.specialty || 'General Practitioner'}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                        doc.branches?.slug === 'hazara' 
                          ? 'bg-teal-50 text-teal-700 border-teal-100' 
                          : 'bg-amber-50 text-amber-800 border-amber-100'
                      }`}>
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        {doc.branches?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 font-light">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a href={`mailto:${doc.email}`} className="hover:underline text-slate-600 truncate">
                    {doc.email}
                  </a>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(doc)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  title="Edit details"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                  title="Remove doctor"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* 4. MODAL overlay for ADD/EDIT doctor */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white border border-slate-200 dark:bg-[var(--card)] dark:border-teal-900/35 rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 dark:bg-slate-950/20 dark:border-teal-900/25 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-teal-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-500 dark:text-teal-400" />
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
              <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                
                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-start gap-2.5 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Doctor picture upload wrapper */}
                <div className="flex flex-col items-center justify-center gap-3">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-full border-2 border-dashed border-slate-200 dark:border-teal-900/40 hover:border-slate-450 cursor-pointer flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#121c19] relative group transition-colors"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-6 h-6 text-slate-400 dark:text-slate-500 group-hover:scale-110 transition-transform" />
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
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-light">Doctor Profile Image (PNG/JPG)</span>
                </div>

                {/* Standard inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Doctor Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="Jane Smith"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="dr.jane@clinic.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Specialty</label>
                    <input
                      type="text"
                      placeholder="Pediatric Orthodontist"
                      value={specialty}
                      onChange={e => setSpecialty(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Branch Assignment</label>
                    <select
                      value={branchId}
                      onChange={e => setBranchId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-850 dark:text-slate-200 font-semibold"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id} className="dark:bg-[#121c19] dark:text-slate-200">
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Compensation details */}
                <div className="border-t border-slate-100 dark:border-teal-900/20 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Compensation Type</label>
                    <select
                      value={compensationType}
                      onChange={e => setCompensationType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-850 dark:text-slate-200 font-semibold"
                    >
                      <option value="fixed" className="dark:bg-[#121c19] dark:text-slate-200">Fixed Salary</option>
                      <option value="percentage" className="dark:bg-[#121c19] dark:text-slate-200">Profit Percentage Share</option>
                    </select>
                  </div>

                  {compensationType === 'fixed' ? (
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Fixed Salary (INR)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={fixedSalary}
                        onChange={e => setFixedSalary(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-mono font-bold"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Branch Profit Share (%)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          max="100"
                          step="0.1"
                          value={profitPercentage}
                          onChange={e => setProfitPercentage(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Profit Sharing Target</label>
                        <select
                          value={profitSharingTarget}
                          onChange={e => setProfitSharingTarget(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-850 dark:text-slate-200 font-semibold"
                        >
                          <option value="both" className="dark:bg-[#121c19] dark:text-slate-200">Both Treatment & Medicine Profit</option>
                          <option value="treatment" className="dark:bg-[#121c19] dark:text-slate-200">Treatment Profit Only</option>
                          <option value="medicine" className="dark:bg-[#121c19] dark:text-slate-200">Medicine Profit Only</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Portal Password</label>
                    <input
                      type="text"
                      required
                      placeholder="doctor123"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">URL Slug (e.g. /doctor/name)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. aman"
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs focus:outline-none focus:border-cyan-500 bg-white dark:bg-[#121c19] text-slate-800 dark:text-slate-200 font-semibold"
                    />
                  </div>
                </div>

                {/* Form buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-teal-900/20">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-450 border border-slate-200 dark:border-teal-900/40 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-700 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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

    </motion.div>
  )
}
