import React from 'react'
import InventoryClient from './InventoryClient'
import { getInventoryItems } from '@/app/admin/actions'
import { getAdminSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const adminDb = getAdminSupabase()
  
  // 1. Fetch initial inventory items
  const inventoryRes = await getInventoryItems('hazara')
  const initialItems = inventoryRes.success ? (inventoryRes.data || []) : []

  // 2. Fetch branches for store switcher
  const { data: branchesData } = await adminDb
    .from('branches')
    .select('id, name, slug')
    .order('name', { ascending: true })

  const branches = branchesData || [
    { id: 'hazara', name: 'Hazara Clinic', slug: 'hazara' },
    { id: 'family', name: 'Family Dental Clinic', slug: 'family' }
  ]

  return (
    <InventoryClient 
      initialItems={initialItems} 
      branches={branches} 
    />
  )
}
