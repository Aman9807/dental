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
  const adminDb = getAdminSupabase()
  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileExtension = file.name.split('.').pop() || 'jpg'
    const uniqueFileName = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`

    // Upload to Supabase Storage 'reports' bucket
    const { data, error } = await adminDb.storage
      .from('reports')
      .upload(uniqueFileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (error) throw error

    // Get public URL
    const { data: urlData } = adminDb.storage
      .from('reports')
      .getPublicUrl(uniqueFileName)

    return urlData.publicUrl
  } catch (error: any) {
    console.error('Error saving image to Supabase Storage:', error)
    throw new Error(`Failed to save image to cloud storage: ${error?.message || error}`)
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

// Settings: Update Branch Working Hours
export async function updateBranchHours(branchId: string, workingHours: string) {
  const adminDb = getAdminSupabase()
  try {
    const { data, error } = await adminDb
      .from('branches')
      .update({ working_hours: workingHours })
      .eq('id', branchId)
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Error updating branch hours:', err)
    return { success: false, error: err.message || 'Failed to update branch hours.' }
  }
}

// Settings: Add Time Slot
export async function addTimeSlot(timeValue: string) {
  const adminDb = getAdminSupabase()
  try {
    // Format label, e.g., '14:30' -> '02:30 PM'
    const parts = timeValue.split(':')
    let hours = parseInt(parts[0], 10)
    const minutes = parts[1] || '00'
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12
    const hoursStr = String(hours).padStart(2, '0')
    const timeLabel = `${hoursStr}:${minutes} ${ampm}`

    // Postgres time values should match HH:MM:SS
    const formattedTimeValue = parts.length === 2 ? `${timeValue}:00` : timeValue

    const { data, error } = await adminDb
      .from('time_slots')
      .insert({
        time_value: formattedTimeValue,
        time_label: timeLabel
      })
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Error adding time slot:', err)
    return { success: false, error: err.message || 'Failed to add time slot.' }
  }
}

// Settings: Delete Time Slot
export async function deleteTimeSlot(id: string) {
  const adminDb = getAdminSupabase()
  try {
    const { error } = await adminDb
      .from('time_slots')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err: any) {
    console.error('Error deleting time slot:', err)
    return { success: false, error: err.message || 'Failed to delete time slot.' }
  }
}

// ════════════════════════════════════════════════════════════════════════
// ═══ CLINICAL REPORTS & MOBILE CAMERA ACTIONS ═══
// ════════════════════════════════════════════════════════════════════════

import os from 'os'

// Action: Update branch-specific camera passcode
export async function updateCameraPasscode(branchId: string, passcode: string) {
  const adminDb = getAdminSupabase()
  try {
    const { data, error } = await adminDb
      .from('branches')
      .update({ camera_passcode: passcode })
      .eq('id', branchId)
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Error updating camera passcode:', err)
    return { success: false, error: err.message || 'Failed to update passcode.' }
  }
}

// Action: Fetch developer machine's local IP address
export async function getLocalIpAddress() {
  try {
    const interfaces = os.networkInterfaces()
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          return { success: true, ip: net.address }
        }
      }
    }
    return { success: true, ip: 'localhost' }
  } catch (err: any) {
    console.error('Error fetching IP:', err)
    return { success: false, error: err.message || 'Failed to fetch local IP' }
  }
}

// Action: Validate camera passcode for a branch
export async function validateCameraPasscode(branchSlug: string, passcode: string) {
  const adminDb = getAdminSupabase()
  try {
    const { data, error } = await adminDb
      .from('branches')
      .select('id, camera_passcode')
      .eq('slug', branchSlug)
      .single()

    if (error || !data) throw new Error('Branch not found')
    
    if (data.camera_passcode === passcode) {
      return { success: true }
    }
    return { success: false, error: 'Incorrect passcode' }
  } catch (err: any) {
    console.error('Error validating passcode:', err)
    return { success: false, error: err.message || 'Passcode verification failed.' }
  }
}

// Action: Upload mobile-captured prescription photo
export async function uploadMobilePrescription(formData: FormData) {
  const adminDb = getAdminSupabase()
  const appointmentId = formData.get('appointmentId') as string
  const branchSlug = formData.get('branchSlug') as string
  const passcode = formData.get('passcode') as string
  const photoFile = formData.get('photo') as File

  try {
    // 1. Verify passcode
    const { data: branch, error: branchErr } = await adminDb
      .from('branches')
      .select('camera_passcode')
      .eq('slug', branchSlug)
      .single()
    if (branchErr || !branch) throw new Error('Branch not found')
    if (branch.camera_passcode !== passcode) throw new Error('Unauthorized: Invalid passcode')

    // 2. Save photo file
    const imageUrl = await saveProfileImage(photoFile)

    // 3. Update appointment
    const { error: apptErr } = await adminDb
      .from('appointments')
      .update({ temp_mobile_photo: imageUrl })
      .eq('id', appointmentId)

    if (apptErr) throw apptErr
    return { success: true, url: imageUrl }
  } catch (err: any) {
    console.error('Error uploading mobile photo:', err)
    return { success: false, error: err.message || 'Failed to upload photo.' }
  }
}

// Action: Send Patient diagnosis report email via Resend
export async function sendPatientReport(formData: FormData) {
  const adminDb = getAdminSupabase()
  const appointmentId = formData.get('appointmentId') as string
  const patientEmail = formData.get('patientEmail') as string
  const prescriptionText = formData.get('prescriptionText') as string
  const xrayFile = formData.get('xrayFile') as File | null
  const prescriptionFile = formData.get('prescriptionFile') as File | null
  const tempMobilePhotoUrl = formData.get('tempMobilePhotoUrl') as string | null

  try {
    // 1. Fetch appointment details
    const { data: appt, error: apptErr } = await adminDb
      .from('appointments')
      .select('*, patients(*), branches(*), doctors(*)')
      .eq('id', appointmentId)
      .single()
    if (apptErr || !appt) throw new Error('Appointment not found')

    const patientId = appt.patients.id

    // 2. Update patient email in database if it changed
    if (patientEmail && patientEmail.trim().toLowerCase() !== appt.patients.email) {
      const { error: emailErr } = await adminDb
        .from('patients')
        .update({ email: patientEmail.trim().toLowerCase() })
        .eq('id', patientId)
      if (emailErr) throw emailErr
    }

    // 3. Save uploaded files
    let xrayUrl = appt.xray_url || ''
    if (xrayFile && xrayFile.size > 0) {
      xrayUrl = await saveProfileImage(xrayFile)
    }

    let prescriptionUrl = appt.prescription_url || tempMobilePhotoUrl || ''
    if (prescriptionFile && prescriptionFile.size > 0) {
      prescriptionUrl = await saveProfileImage(prescriptionFile)
    }

    // 4. Update appointment
    const { error: updateErr } = await adminDb
      .from('appointments')
      .update({
        prescription_text: prescriptionText || null,
        prescription_url: prescriptionUrl || null,
        xray_url: xrayUrl || null,
        report_sent_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (updateErr) throw updateErr

    // 5. Build and Send Email
    const resendApiKey = process.env.RESEND_API_KEY || 're_Z5UgQKMi_HKGRAo8rzdUHNr21n1KHcf6K'
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
        <h2 style="color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-top: 0;">Your Dental Report & Prescription</h2>
        <p style="font-size: 16px; line-height: 1.5;">Hello <strong>${appt.patients.name}</strong>,</p>
        <p style="font-size: 14px; color: #4b5563;">Your clinical report and prescription details from your visit at <strong>${appt.branches.name}</strong> are finalized.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; width: 35%;">Dentist:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">Dr. ${appt.doctors.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Date:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${appt.appointment_date}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Time:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${appt.appointment_time.substring(0, 5)}</td>
          </tr>
        </table>

        ${prescriptionText ? `
        <div style="background-color: #f0fdfa; border-left: 4px solid #0f766e; padding: 15px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
          <h4 style="margin: 0 0 8px 0; color: #0f766e; font-size: 14px; font-weight: bold;">Doctor's Prescription & Advice:</h4>
          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #374151; white-space: pre-wrap;">${prescriptionText}</p>
        </div>
        ` : ''}

        <p style="font-size: 14px; color: #4b5563; margin-bottom: 25px;">Please check the email attachments for your diagnostic X-ray and written prescription copy.</p>

        <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          This is a secure patient communication from ${appt.branches.name}.
        </p>
      </div>
    `

    const attachments = []
    const fs = require('fs/promises')
    const path = require('path')

    const getFileAttachment = async (fileUrl: string, defaultName: string) => {
      try {
        if (fileUrl.startsWith('http')) {
          const res = await fetch(fileUrl)
          if (!res.ok) throw new Error(`HTTP Error: ${res.statusText}`)
          const arrayBuffer = await res.arrayBuffer()
          const fileBuffer = Buffer.from(arrayBuffer)
          const base64Content = fileBuffer.toString('base64')
          
          const urlObj = new URL(fileUrl)
          const filename = path.basename(urlObj.pathname) || defaultName
          return {
            filename,
            content: base64Content
          }
        } else {
          const filePath = path.join(process.cwd(), 'public', fileUrl)
          const fileBuffer = await fs.readFile(filePath)
          const base64Content = fileBuffer.toString('base64')
          const filename = path.basename(filePath)
          return {
            filename,
            content: base64Content
          }
        }
      } catch (err) {
        console.error("Error reading file for attachment:", fileUrl, err)
        return null
      }
    }

    if (xrayUrl) {
      const att = await getFileAttachment(xrayUrl, 'xray.pdf')
      if (att) attachments.push(att)
    }

    if (prescriptionUrl) {
      const att = await getFileAttachment(prescriptionUrl, 'prescription.jpg')
      if (att) attachments.push(att)
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: `${appt.branches.name} <onboarding@resend.dev>`,
        to: patientEmail.trim().toLowerCase(),
        subject: `Your Dental Diagnosis & Prescription | ${appt.branches.name}`,
        html: emailHtml,
        attachments: attachments.length > 0 ? attachments : undefined
      })
    })

    if (!response.ok) {
      const resText = await response.text()
      throw new Error(`Resend Error: ${resText}`)
    }

    return { success: true }
  } catch (err: any) {
    console.error('Error in sendPatientReport:', err)
    return { success: false, error: err.message || 'Failed to send reports' }
  }
}

