import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface InventoryItemPDF {
  id: string
  name: string
  generic_name?: string
  barcode?: string
  category?: string
  supplier?: string
  stock: number
  unitPrice?: number
  costPrice?: number
  reorderLevel?: number
  stockStatus?: string
}

/**
 * Generate PDF report for Out of Stock items (Stock = 0)
 */
export function generateOutOfStockPDF(items: InventoryItemPDF[], clinicName: string = 'Hazara & Family Dental Clinic') {
  const outOfStockItems = items.filter(item => Number(item.stock || 0) === 0)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // Header Colors & Typography
  const primaryColor = [225, 29, 72] // Crimson/Rose red
  const darkTextColor = [30, 41, 59] // Slate 800
  const lightGrayColor = [241, 245, 249] // Slate 100

  // 1. Top Decorative Bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, 210, 6, 'F')

  // 2. Clinic Header & Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2])
  doc.text(clinicName.toUpperCase(), 14, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('INVENTORY MANAGEMENT SYSTEM • AUDIT & REORDER REPORT', 14, 24)

  // Report Title Badge Box
  doc.setFillColor(254, 242, 242)
  doc.roundedRect(14, 28, 182, 14, 3, 3, 'F')
  doc.setDrawColor(252, 165, 165)
  doc.roundedRect(14, 28, 182, 14, 3, 3, 'D')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(225, 29, 72)
  doc.text('CRITICAL OUT OF STOCK REPORT (0 UNITS AVAILABLE)', 18, 37)

  // Date & Summary Metadata
  const nowStr = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(`Generated On: ${nowStr}`, 14, 48)
  doc.text(`Total Out-Of-Stock Items: ${outOfStockItems.length}`, 130, 48)

  // Table Columns & Data Rows
  const tableHeaders = ['#', 'Product / Item Name', 'SKU / Barcode', 'Category', 'Supplier', 'Est. Unit Cost', 'Status']

  let totalReorderCostEstimate = 0

  const tableRows = outOfStockItems.map((item, index) => {
    const estCost = Number(item.costPrice || item.unitPrice || 15)
    totalReorderCostEstimate += estCost * 20 // Estimate for reordering 20 units

    return [
      (index + 1).toString(),
      item.name + (item.generic_name ? ` (${item.generic_name})` : ''),
      item.barcode || `DEN-${1000 + index}`,
      item.category || 'Clinical Supply',
      item.supplier || 'DentalCorp',
      `INR ${estCost.toFixed(2)}`,
      'OUT OF STOCK'
    ]
  })

  if (outOfStockItems.length === 0) {
    tableRows.push(['-', 'No items are currently out of stock. All inventory items are available.', '-', '-', '-', '-', 'OK'])
  }

  // Generate Table using jspdf-autotable
  autoTable(doc, {
    startY: 53,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [225, 29, 72],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 52 },
      2: { cellWidth: 32 },
      3: { cellWidth: 32 },
      4: { cellWidth: 28 },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 24, fontStyle: 'bold', textColor: [225, 29, 72], halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  })

  // Summary Footer Card
  const finalY = (doc as any).lastAutoTable.finalY || 100
  doc.setFillColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2])
  doc.roundedRect(14, finalY + 8, 182, 22, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2])
  doc.text('REORDER COST SUMMARY', 18, finalY + 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(`Total Deficit Items: ${outOfStockItems.length} Products`, 18, finalY + 23)
  doc.text(`Estimated Reorder Budget (20 units default target): INR ${totalReorderCostEstimate.toLocaleString()}`, 95, finalY + 23)

  // Signature Block & Footer Page Numbers
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Page ${i} of ${pageCount}`, 14, 287)
    doc.text('Authorized Inventory Manager Signature: _______________________', 110, 287)
  }

  // Save File
  doc.save(`Out_Of_Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Generate PDF report for items with stock below a user-provided threshold number
 */
export function generateLowStockPDF(items: InventoryItemPDF[], threshold: number, clinicName: string = 'Hazara & Family Dental Clinic') {
  const lowStockItems = items.filter(item => Number(item.stock || 0) < threshold)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const headerColor = [217, 119, 6] // Amber / Orange
  const darkTextColor = [30, 41, 59]

  // 1. Top Decorative Bar
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2])
  doc.rect(0, 0, 210, 6, 'F')

  // 2. Clinic Header & Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2])
  doc.text(clinicName.toUpperCase(), 14, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('INVENTORY STOCK THRESHOLD AUDIT REPORT', 14, 24)

  // Title Box
  doc.setFillColor(254, 243, 199)
  doc.roundedRect(14, 28, 182, 14, 3, 3, 'F')
  doc.setDrawColor(252, 211, 77)
  doc.roundedRect(14, 28, 182, 14, 3, 3, 'D')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(180, 83, 9)
  doc.text(`LOW STOCK REPORT — ITEMS BELOW ${threshold} UNITS`, 18, 37)

  // Metadata
  const nowStr = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(`Generated On: ${nowStr}`, 14, 48)
  doc.text(`Items Below ${threshold} Units: ${lowStockItems.length}`, 130, 48)

  // Table Columns & Rows
  const tableHeaders = ['#', 'Product / Item Name', 'SKU / Barcode', 'Category', 'Supplier', 'Stock', 'Deficit', 'Status']

  let totalDeficitUnits = 0

  const tableRows = lowStockItems.map((item, index) => {
    const currentStock = Number(item.stock || 0)
    const deficit = Math.max(0, threshold - currentStock)
    totalDeficitUnits += deficit

    const statusText = currentStock === 0 ? 'OUT OF STOCK' : 'LOW STOCK'

    return [
      (index + 1).toString(),
      item.name + (item.generic_name ? ` (${item.generic_name})` : ''),
      item.barcode || `DEN-${1000 + index}`,
      item.category || 'Consumables',
      item.supplier || 'Urban Deals',
      `${currentStock} units`,
      `+${deficit} units`,
      statusText
    ]
  })

  if (lowStockItems.length === 0) {
    tableRows.push(['-', `No items have stock below ${threshold} units. All stock levels are sufficient.`, '-', '-', '-', '-', '-', 'NORMAL'])
  }

  // Generate Table
  autoTable(doc, {
    startY: 53,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [217, 119, 6],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [254, 252, 232]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 28 },
      3: { cellWidth: 30 },
      4: { cellWidth: 26 },
      5: { cellWidth: 18, fontStyle: 'bold', halign: 'right' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 22, fontStyle: 'bold', textColor: [180, 83, 9], halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  })

  // Summary Footer Card
  const finalY = (doc as any).lastAutoTable.finalY || 100
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, finalY + 8, 182, 22, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2])
  doc.text('STOCK DEFICIT SUMMARY', 18, finalY + 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(`Total Low Stock Products: ${lowStockItems.length}`, 18, finalY + 23)
  doc.text(`Total Additional Units Needed To Reach ${threshold} Units: ${totalDeficitUnits} Units`, 95, finalY + 23)

  // Page Numbers & Signature
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Page ${i} of ${pageCount}`, 14, 287)
    doc.text('Authorized Inventory Auditor Signature: _______________________', 110, 287)
  }

  // Save PDF
  doc.save(`Low_Stock_Below_${threshold}_Report_${new Date().toISOString().split('T')[0]}.pdf`)
}
