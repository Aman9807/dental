'use server'

import { cookies } from 'next/headers'
import { getAdminSupabase } from '@/lib/supabase'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// Admin Cookie Login
export async function loginAdmin(password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  
  if (password === adminPassword) {
    const cookieStore = await cookies()
    cookieStore.set('dental_admin_token', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day expiration
      path: '/admin',
    })
    return { success: true }
  }
  return { success: false, error: 'Incorrect password credentials' }
}

// Admin Cookie Logout
export async function logoutAdmin() {
  const cookieStore = await cookies()
  cookieStore.delete('dental_admin_token')
  return { success: true }
}

// Handle local file uploads for Doctor Profile Pictures
async function saveProfileImage(file: File): Promise<string> {
  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure upload folder exists in public/uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    // Generate unique file name
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const uniqueFileName = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`
    const filePath = join(uploadDir, uniqueFileName)

    await writeFile(filePath, buffer)
    return `/uploads/${uniqueFileName}`
  } catch (error) {
    console.error('Error saving doctor image file:', error)
    throw new Error('Failed to save profile image.')
  }
}

// Doctor Management: CREATE (Upsert/Add)
export async function addDoctor(formData: FormData) {
  const adminDb = getAdminSupabase()
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const specialty = formData.get('specialty') as string
  const branchId = formData.get('branch_id') as string
  const imageFile = formData.get('picture') as File | null

  try {
    let pictureUrl = ''
    if (imageFile && imageFile.size > 0) {
      pictureUrl = await saveProfileImage(imageFile)
    }

    const { data, error } = await adminDb
      .from('doctors')
      .insert({
        name,
        email: email.trim().toLowerCase(),
        specialty: specialty || null,
        branch_id: branchId || null,
        picture_url: pictureUrl || null
      })
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Error adding doctor:', err)
    return { success: false, error: err.message || 'Failed to create doctor record.' }
  }
}

// Doctor Management: UPDATE
export async function updateDoctor(formData: FormData) {
  const adminDb = getAdminSupabase()
  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const specialty = formData.get('specialty') as string
  const branchId = formData.get('branch_id') as string
  const imageFile = formData.get('picture') as File | null
  const currentPictureUrl = formData.get('current_picture_url') as string

  try {
    let pictureUrl = currentPictureUrl
    if (imageFile && imageFile.size > 0) {
      pictureUrl = await saveProfileImage(imageFile)
    }

    const { data, error } = await adminDb
      .from('doctors')
      .update({
        name,
        email: email.trim().toLowerCase(),
        specialty: specialty || null,
        branch_id: branchId || null,
        picture_url: pictureUrl || null
      })
      .eq('id', id)
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Error updating doctor:', err)
    return { success: false, error: err.message || 'Failed to update doctor record.' }
  }
}

// Doctor Management: DELETE
export async function deleteDoctor(id: string) {
  const adminDb = getAdminSupabase()
  try {
    const { error } = await adminDb
      .from('doctors')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err: any) {
    console.error('Error deleting doctor:', err)
    return { success: false, error: err.message || 'Failed to delete doctor.' }
  }
}

// Appointment Management: UPDATE STATUS
export async function updateAppointmentStatus(id: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled') {
  const adminDb = getAdminSupabase()
  try {
    const { data, error } = await adminDb
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Error updating appointment status:', err)
    return { success: false, error: err.message || 'Failed to update appointment status.' }
  }
}

// Settings: Update Admin Password
export async function changeAdminPassword(newPassword: string) {
  // Normally this would update process.env or a settings config,
  // but since process.env is read-only at runtime in Node, we advise that it's set in .env.local
  // or we can simulate success.
  return { 
    success: true, 
    message: 'To permanently change the password, please update the ADMIN_PASSWORD variable in your .env.local file.' 
  }
}
