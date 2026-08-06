'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Search, Filter, Plus, FileDown, MoreVertical,
  AlertTriangle, CheckCircle2, XCircle, ArrowUpDown, ChevronDown,
  Layers, Building2, Calendar, RefreshCw, Trash2, Edit3, ShieldAlert,
  Download, Sparkles, Box, Check, X, Bell, Clock
} from 'lucide-react'
import { generateOutOfStockPDF, generateLowStockPDF } from '@/lib/pdfGenerator'
import { saveMedicineStock, deleteInventoryItem } from '@/app/admin/actions'

interface Branch {
  id: string
  name: string
  slug: string
}

interface InventoryItem {
  id: string
  name: string
  generic_name?: string
  barcode?: string
  tablets_per_patch?: number
  created_at?: string
  stock: number
  unitPrice?: number
  costPrice?: number
  mrp?: number
  category?: string
  supplier?: string
  reorderLevel?: number
  stockStatus?: string
  batches?: any[]
}

interface Props {
  initialItems: InventoryItem[]
  branches: Branch[]
}

export default function InventoryClient({ initialItems, branches }: Props) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems)
  const [selectedBranch, setSelectedBranch] = useState<string>(branches[0]?.slug || 'hazara')

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSupplier, setSelectedSupplier] = useState('all')
  const [selectedStockLevel, setSelectedStockLevel] = useState('all')
  const [selectedDateRange, setSelectedDateRange] = useState('all')

  // UI Modals
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [customThreshold, setCustomThreshold] = useState<string>('20')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)

  // Add/Edit Form states
  const [formName, setFormName] = useState('')
  const [formGeneric, setFormGeneric] = useState('')
  const [formBarcode, setFormBarcode] = useState('')
  const [formCategory, setFormCategory] = useState('Medicines')
  const [formSupplier, setFormSupplier] = useState('Urban Deals')
  const [formQuantity, setFormQuantity] = useState('50')
  const [formBatch, setFormBatch] = useState('BATCH-001')
  const [formExpiry, setFormExpiry] = useState(() => {
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 2)
    return nextYear.toISOString().split('T')[0]
  })
  const [formCostPrice, setFormCostPrice] = useState('12')
  const [formSellingPrice, setFormSellingPrice] = useState('18')
  const [formMrp, setFormMrp] = useState('22')
  const [isSaving, setIsSaving] = useState(false)

  // Active Dropdown Row Menu ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  // Derived Filter lists
  const categories = Array.from(new Set(items.map(i => i.category || 'Medicines'))).filter(Boolean)
  const suppliers = Array.from(new Set(items.map(i => i.supplier || 'Urban Deals'))).filter(Boolean)

  // Filtered Inventory List
  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.generic_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.barcode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.supplier || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesSupplier = selectedSupplier === 'all' || item.supplier === selectedSupplier

    let matchesStockLevel = true
    const stockVal = Number(item.stock || 0)
    if (selectedStockLevel === 'out_of_stock') matchesStockLevel = stockVal === 0
    else if (selectedStockLevel === 'low') matchesStockLevel = stockVal > 0 && stockVal <= 30
    else if (selectedStockLevel === 'medium') matchesStockLevel = stockVal > 30 && stockVal <= 100
    else if (selectedStockLevel === 'high') matchesStockLevel = stockVal > 100

    return matchesSearch && matchesCategory && matchesSupplier && matchesStockLevel
  })

  // KPI Calculations
  const totalProducts = items.length
  const totalStockUnits = items.reduce((acc, curr) => acc + Number(curr.stock || 0), 0)
  const outOfStockCount = items.filter(i => Number(i.stock || 0) === 0).length
  const lowStockCount = items.filter(i => Number(i.stock || 0) > 0 && Number(i.stock || 0) <= 30).length

  // Trigger PDF Generation for Out of Stock Items
  const handleExportOutOfStockPdf = () => {
    setIsGeneratingPdf(true)
    try {
      const activeBranchName = branches.find(b => b.slug === selectedBranch)?.name || 'Hazara & Family Dental Clinic'
      generateOutOfStockPDF(items, activeBranchName)
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'Failed to generate Out of Stock PDF report.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Trigger PDF Generation for Low Stock Items below Custom Threshold
  const handleExportLowStockThresholdPdf = (e: React.FormEvent) => {
    e.preventDefault()
    const thresholdNum = parseInt(customThreshold || '20', 10)
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      alert('Please enter a valid positive number for the stock threshold.')
      return
    }

    setIsGeneratingPdf(true)
    try {
      const activeBranchName = branches.find(b => b.slug === selectedBranch)?.name || 'Hazara & Family Dental Clinic'
      generateLowStockPDF(items, thresholdNum, activeBranchName)
      setShowPdfModal(false)
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'Failed to generate Low Stock PDF report.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Open Modal for New Product
  const handleOpenAddModal = () => {
    setEditingItem(null)
    setFormName('')
    setFormGeneric('')
    setFormBarcode(`SKU-${Math.floor(100000 + Math.random() * 900000)}`)
    setFormCategory('Medicines')
    setFormSupplier('Urban Deals')
    setFormQuantity('50')
    setFormBatch(`BATCH-${Math.floor(100 + Math.random() * 900)}`)
    setFormCostPrice('12')
    setFormSellingPrice('18')
    setFormMrp('22')
    setShowAddModal(true)
  }

  // Open Modal for Edit Stock / Audit
  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item)
    setFormName(item.name)
    setFormGeneric(item.generic_name || '')
    setFormBarcode(item.barcode || '')
    setFormCategory(item.category || 'Medicines')
    setFormSupplier(item.supplier || 'Urban Deals')
    setFormQuantity(String(item.stock || 0))
    setFormBatch(item.batches?.[0]?.batch_number || 'BATCH-001')
    setFormCostPrice(String(item.costPrice || 12))
    setFormSellingPrice(String(item.unitPrice || 18))
    setFormMrp(String(item.mrp || 22))
    setShowAddModal(true)
  }

  // Submit Add / Edit Stock Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      alert('Product Name is required.')
      return
    }

    setIsSaving(true)
    try {
      const qtyPatches = Math.ceil(parseFloat(formQuantity || '0'))
      const res = await saveMedicineStock(
        formBarcode,
        qtyPatches,
        {
          name: formName.trim(),
          genericName: formGeneric.trim(),
          tabletsPerPatch: 1,
          batchNumber: formBatch,
          expiryDate: formExpiry,
          patchPrice: parseFloat(formSellingPrice || '0'),
          costPrice: parseFloat(formCostPrice || '0'),
          mrp: parseFloat(formMrp || '0'),
          branchSlug: selectedBranch
        }
      )

      if (res.success) {
        alert(editingItem ? 'Stock updated successfully!' : 'Inventory item added successfully!')
        
        // Optimistic UI state update
        const updatedStock = parseFloat(formQuantity || '0')
        const stockStatus = updatedStock === 0 ? 'Out of Stock' : updatedStock <= 30 ? 'Low' : updatedStock <= 100 ? 'Medium' : 'High'
        
        setItems(prev => {
          const exists = prev.some(i => i.name.toLowerCase() === formName.trim().toLowerCase() || i.barcode === formBarcode)
          if (exists) {
            return prev.map(i => {
              if (i.name.toLowerCase() === formName.trim().toLowerCase() || i.barcode === formBarcode) {
                return {
                  ...i,
                  name: formName,
                  generic_name: formGeneric,
                  stock: updatedStock,
                  unitPrice: parseFloat(formSellingPrice || '0'),
                  costPrice: parseFloat(formCostPrice || '0'),
                  category: formCategory,
                  supplier: formSupplier,
                  stockStatus
                }
              }
              return i
            })
          } else {
            return [
              {
                id: res.medicineId || Math.random().toString(),
                name: formName,
                generic_name: formGeneric,
                barcode: formBarcode,
                stock: updatedStock,
                unitPrice: parseFloat(formSellingPrice || '0'),
                costPrice: parseFloat(formCostPrice || '0'),
                mrp: parseFloat(formMrp || '0'),
                category: formCategory,
                supplier: formSupplier,
                stockStatus
              },
              ...prev
            ]
          }
        })

        setShowAddModal(false)
      } else {
        alert(res.error || 'Failed to save inventory item.')
      }
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'An error occurred while saving inventory item.')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete Item
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) return

    try {
      const res = await deleteInventoryItem(id)
      if (res.success) {
        setItems(prev => prev.filter(i => i.id !== id))
        alert('Inventory item deleted.')
      } else {
        alert(res.error || 'Failed to delete item.')
      }
    } catch (err: any) {
      console.error(err)
      alert('An error occurred during deletion.')
    }
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-[#091210] font-sans text-slate-800 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">

      {/* ════ SECTION 1: TOP BREADCRUMB & HEADER BAR ════ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Admin</span>
            <span>/</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">Inventory & Stock</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Inventory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40">
              {totalProducts} Products
            </span>
          </div>
        </div>

        {/* Action Controls & Store Selector */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Branch Switcher */}
          <div className="relative">
            <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="pl-9 pr-8 py-2 bg-white dark:bg-[#12221e] border border-slate-200 dark:border-teal-900/40 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 shadow-sm cursor-pointer"
            >
              {branches.map(b => (
                <option key={b.id} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Export PDF Modal Button */}
          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-600/15 transition-all duration-300 ease-out hover:scale-[1.02] cursor-pointer"
          >
            <FileDown className="w-4 h-4" /> Export PDF Reports
          </button>

          {/* Reorder Button */}
          <button
            onClick={() => {
              setSelectedStockLevel('low')
              setShowPdfModal(true)
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-bold shadow-md shadow-amber-500/15 transition-all duration-300 ease-out hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Reorder Stock
          </button>

          {/* Add Product Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-cyan-600/15 transition-all duration-300 ease-out hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* ════ SECTION 2: STATS OVERVIEW CARDS ════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0f1d19] p-5 rounded-3xl border border-slate-200/70 dark:border-teal-900/30 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">Total Products</p>
            <Box className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{totalProducts.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Catalog items across all categories</p>
        </div>

        <div className="bg-white dark:bg-[#0f1d19] p-5 rounded-3xl border border-slate-200/70 dark:border-teal-900/30 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">Total Stock Units</p>
            <Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{totalStockUnits.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Combined inventory unit count</p>
        </div>

        <div 
          onClick={() => setSelectedStockLevel('out_of_stock')}
          className="bg-rose-50/60 dark:bg-rose-950/20 p-5 rounded-3xl border border-rose-200/70 dark:border-rose-900/40 shadow-sm space-y-1 cursor-pointer hover:border-rose-400 transition"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Out of Stock</p>
            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">{outOfStockCount}</p>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-300 font-medium">Items requiring urgent reorder</p>
        </div>

        <div 
          onClick={() => setSelectedStockLevel('low')}
          className="bg-amber-50/60 dark:bg-amber-950/20 p-5 rounded-3xl border border-amber-200/70 dark:border-amber-900/40 shadow-sm space-y-1 cursor-pointer hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Low Stock Alert</p>
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{lowStockCount}</p>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-300 font-medium">Items with stock &lt; 30 units</p>
        </div>
      </div>

      {/* ════ SECTION 3: SEARCH & FILTERS TOOLBAR (MATCHING UI SCREENSHOT) ════ */}
      <div className="bg-white dark:bg-[#0f1d19] p-4 rounded-3xl border border-slate-200/70 dark:border-teal-900/30 shadow-sm space-y-3">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-teal-900/20 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedStockLevel('all')
                setSelectedCategory('all')
                setSelectedSupplier('all')
                setSearchQuery('')
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
                selectedStockLevel === 'all' && selectedCategory === 'all'
                  ? 'bg-slate-900 text-white dark:bg-teal-500 dark:text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              All products ({items.length})
            </button>

            <button
              onClick={() => setSelectedStockLevel('out_of_stock')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition ${
                selectedStockLevel === 'out_of_stock'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              Out of stock ({outOfStockCount})
            </button>

            <button
              onClick={() => setSelectedStockLevel('low')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition ${
                selectedStockLevel === 'low'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              Low stock ({lowStockCount})
            </button>
          </div>

          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 rounded-xl transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> PDF Reports
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Search Input Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search product, SKU barcode, generic, supplier..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#132520] border border-slate-200 dark:border-teal-900/40 rounded-2xl text-xs font-medium focus:outline-none focus:border-cyan-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <select
              value={selectedDateRange}
              onChange={e => setSelectedDateRange(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 dark:bg-[#132520] border border-slate-200 dark:border-teal-900/40 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Date: All Time</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>

          {/* Category Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 dark:bg-[#132520] border border-slate-200 dark:border-teal-900/40 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Category: All</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Supplier Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 dark:bg-[#132520] border border-slate-200 dark:border-teal-900/40 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Supplier: All</option>
              {suppliers.map(sup => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>
          </div>

          {/* Stock Level Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedStockLevel}
              onChange={e => setSelectedStockLevel(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 dark:bg-[#132520] border border-slate-200 dark:border-teal-900/40 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Stock level: All</option>
              <option value="out_of_stock">Out of stock (0)</option>
              <option value="low">Low stock (&le; 30)</option>
              <option value="medium">Medium stock (30-100)</option>
              <option value="high">High stock (&gt; 100)</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(searchQuery || selectedCategory !== 'all' || selectedSupplier !== 'all' || selectedStockLevel !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setSelectedSupplier('all')
                setSelectedStockLevel('all')
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ════ SECTION 4: DATA TABLE (MATCHING DESIGN REFERENCE SCREENSHOT) ════ */}
      <div className="bg-white dark:bg-[#0f1d19] rounded-3xl border border-slate-200/70 dark:border-teal-900/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-[#132520] border-b border-slate-200/80 dark:border-teal-900/30 text-xs font-bold text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">Product name</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Current Stock</th>
                <th className="py-3.5 px-4 text-right">Unit Price</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-teal-900/20 text-xs font-medium text-slate-700 dark:text-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No inventory products match your active search filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const stockNum = Number(item.stock || 0)
                  const isOut = stockNum === 0
                  const isLow = stockNum > 0 && stockNum <= 30
                  const isHigh = stockNum > 100

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-[#132621]/50 transition">
                      {/* Product Name & Icon */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-teal-950/60 border border-slate-200 dark:border-teal-900/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold shrink-0">
                            {item.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.name}</p>
                            {item.generic_name && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-400 line-clamp-1">{item.generic_name}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU / Barcode Badge */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-teal-950/50 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-teal-900/30">
                          {item.barcode || `SKU-${item.id.substring(0, 6)}`}
                        </span>
                      </td>

                      {/* Category Tag */}
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-teal-900/20 px-2.5 py-1 rounded-full border border-slate-200/60 dark:border-teal-900/30">
                          {item.category || 'Medicines'}
                        </span>
                      </td>

                      {/* Supplier Icon + Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                          <span>{item.supplier || 'Urban Deals'}</span>
                        </div>
                      </td>

                      {/* Current Stock + Stock Bar Indicator */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-w-[140px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-bold ${isOut ? 'text-rose-600 dark:text-rose-400' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>
                              {stockNum} unit
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isOut ? 'text-rose-600 dark:text-rose-400' : isLow ? 'text-amber-600 dark:text-amber-400' : isHigh ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                              • {isOut ? 'Out of Stock' : isLow ? 'Low' : isHigh ? 'High' : 'Medium'}
                            </span>
                          </div>
                          
                          {/* Stock Level Bar Indicator */}
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-teal-950 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isOut
                                  ? 'bg-rose-500 w-full'
                                  : isLow
                                  ? 'bg-rose-500 w-1/4'
                                  : isHigh
                                  ? 'bg-emerald-500 w-full'
                                  : 'bg-amber-500 w-2/4'
                              }`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3.5 px-4 text-right">
                        <p className="font-mono font-bold text-slate-900 dark:text-white">INR {(item.unitPrice || 18).toFixed(2)}</p>
                        {item.costPrice && (
                          <p className="font-mono text-[10px] text-slate-400">Cost: INR {item.costPrice.toFixed(2)}</p>
                        )}
                      </td>

                      {/* Action Dropdown Menu */}
                      <td className="py-3.5 px-4 text-center relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition cursor-pointer text-slate-500 dark:text-slate-400"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        <AnimatePresence>
                          {activeMenuId === item.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 5 }}
                              className="absolute right-6 top-10 w-44 bg-white dark:bg-[#12221e] border border-slate-200 dark:border-teal-900/50 rounded-2xl shadow-xl z-50 overflow-hidden text-left p-1"
                            >
                              <button
                                onClick={() => {
                                  setActiveMenuId(null)
                                  handleOpenEditModal(item)
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl flex items-center gap-2 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-cyan-600" /> Audit / Edit Stock
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuId(null)
                                  setShowPdfModal(true)
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl flex items-center gap-2 cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-amber-600" /> Reorder Stock
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuId(null)
                                  handleDelete(item.id, item.name)
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove Item
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════ SECTION 5: PDF REPORT GENERATION DIALOG MODAL ════ */}
      <AnimatePresence>
        {showPdfModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-[#11201c] border border-slate-200 dark:border-teal-900/40 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-teal-900/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Export Inventory PDF Reports</h3>
                </div>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                
                {/* PDF Option 1: Out of Stock PDF */}
                <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 rounded-2xl space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> 1-Click Out of Stock PDF
                    </h4>
                    <p className="text-[11px] text-rose-600/80 dark:text-rose-300 mt-1">
                      Generates a printable PDF of all items with exactly 0 units in stock for urgent reordering.
                    </p>
                  </div>
                  <button
                    onClick={handleExportOutOfStockPdf}
                    disabled={isGeneratingPdf}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download Out of Stock PDF ({outOfStockCount} items)
                  </button>
                </div>

                {/* PDF Option 2: Custom Threshold Low Stock PDF */}
                <form onSubmit={handleExportLowStockThresholdPdf} className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-2xl space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Export Items Below Custom Stock Number
                    </h4>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-300 mt-1">
                      Enter a custom threshold number (e.g. 15, 20, 50). The system will generate a PDF listing all items with stock below that number.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Enter Stock Threshold Limit:
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={customThreshold}
                      onChange={e => setCustomThreshold(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full px-3 py-2 bg-white dark:bg-[#182d27] border border-amber-300 dark:border-amber-900/50 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isGeneratingPdf}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download PDF (Stock &lt; {customThreshold || '20'})
                  </button>
                </form>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════ SECTION 6: ADD / EDIT PRODUCT & AUDIT MODAL ════ */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-[#11201c] border border-slate-200 dark:border-teal-900/40 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-teal-900/30 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  {editingItem ? `Audit Stock: ${editingItem.name}` : 'Add New Inventory Product'}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Product Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Composite Resin A2"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182d27] border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Generic Name / Subtitle</label>
                    <input
                      type="text"
                      placeholder="e.g. Microhybrid Restorative"
                      value={formGeneric}
                      onChange={e => setFormGeneric(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182d27] border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">SKU / Barcode</label>
                    <input
                      type="text"
                      value={formBarcode}
                      onChange={e => setFormBarcode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182d27] border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Current Stock Units *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formQuantity}
                      onChange={e => setFormQuantity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182d27] border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Category</label>
                    <select
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182d27] border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="Medicines">Medicines</option>
                      <option value="Surgical & Clinical Supplies">Surgical & Clinical Supplies</option>
                      <option value="Consumables">Consumables</option>
                      <option value="PPE & Safety">PPE & Safety</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Dental Implants">Dental Implants</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Supplier</label>
                    <select
                      value={formSupplier}
                      onChange={e => setFormSupplier(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182d27] border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="Urban Deals">Urban Deals</option>
                      <option value="DealZone">DealZone</option>
                      <option value="BuyRight Dental">BuyRight Dental</option>
                      <option value="DentalCorp">DentalCorp</option>
                      <option value="Trendline">Trendline</option>
                      <option value="MetroShop">MetroShop</option>
                      <option value="MediCare Labs">MediCare Labs</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Unit Cost Price (INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formCostPrice}
                      onChange={e => setFormCostPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182d27] border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Unit Selling Price (INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formSellingPrice}
                      onChange={e => setFormSellingPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182d27] border border-slate-200 dark:border-teal-900/40 rounded-xl text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-teal-900/20">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-teal-900/40 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 rounded-xl shadow-md transition cursor-pointer"
                  >
                    {isSaving ? 'Saving...' : 'Save Product Stock'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
