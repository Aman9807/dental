'use server'

import { cookies } from 'next/headers'
import { getAdminSupabase } from '@/lib/supabase'
import { queryTiDB } from '@/lib/tidb'
import { randomUUID } from 'crypto'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { join, basename } from 'path'

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

// Handle file uploads to Supabase Storage (e.g. Doctor Profile pics, prescriptions, X-rays)
async function saveProfileImage(file: File): Promise<string> {
  const adminDb = getAdminSupabase()
  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileExtension = file.name.split('.').pop() || 'jpg'
    const uniqueFileName = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`

    // 1. Attempt upload
    let uploadRes = await adminDb.storage
      .from('reports')
      .upload(uniqueFileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    // 2. If bucket is missing, create it dynamically on the fly
    if (uploadRes.error && uploadRes.error.message.toLowerCase().includes('bucket not found')) {
      console.log("Bucket 'reports' was not found. Creating bucket 'reports' dynamically...")
      const { error: createErr } = await adminDb.storage.createBucket('reports', {
        public: true
      })

      if (createErr) {
        console.error("Failed to dynamically create bucket 'reports':", createErr)
        throw new Error(`Failed to automatically create cloud storage bucket: ${createErr.message}`)
      }

      // Retry upload after successful bucket creation
      uploadRes = await adminDb.storage
        .from('reports')
        .upload(uniqueFileName, buffer, {
          contentType: file.type,
          upsert: true
        })
    }

    if (uploadRes.error) throw uploadRes.error

    // 3. Retrieve public URL
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

  const compensationType = (formData.get('compensation_type') as string) || 'fixed'
  const fixedSalary = parseFloat(formData.get('fixed_salary') as string || '0')
  const profitPercentage = parseFloat(formData.get('profit_percentage') as string || '0')
  const password = (formData.get('password') as string) || 'doctor123'
  const slug = (formData.get('slug') as string) || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

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
        picture_url: pictureUrl || null,
        compensation_type: compensationType,
        fixed_salary: fixedSalary,
        profit_percentage: profitPercentage,
        password,
        slug
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

  const compensationType = (formData.get('compensation_type') as string) || 'fixed'
  const fixedSalary = parseFloat(formData.get('fixed_salary') as string || '0')
  const profitPercentage = parseFloat(formData.get('profit_percentage') as string || '0')
  const password = (formData.get('password') as string) || 'doctor123'
  const slug = (formData.get('slug') as string) || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

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
        picture_url: pictureUrl || null,
        compensation_type: compensationType,
        fixed_salary: fixedSalary,
        profit_percentage: profitPercentage,
        password,
        slug
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
  const xrayFile = formData.get('xray') as File | null
  const prescriptionFile = formData.get('prescription') as File | null
  const tempMobilePhotoUrl = formData.get('tempMobilePhoto') as string | null

  try {
    // 1. Fetch appointment details
    const { data: appt, error: apptErr } = await adminDb
      .from('appointments')
      .select('*, patients(*), branches(*), doctors(*)')
      .eq('id', appointmentId)
      .single()
    if (apptErr || !appt) throw new Error('Appointment not found')

    const patientId = appt.patients.id

    let finalPatientId = patientId
    let finalPatient = appt.patients

    // 2. Update patient email in database if it changed
    if (patientEmail && patientEmail.trim().toLowerCase() !== appt.patients.email) {
      const targetEmail = patientEmail.trim().toLowerCase()
      // Check if a patient with this email already exists
      const { data: existingPatient } = await adminDb
        .from('patients')
        .select('*')
        .eq('email', targetEmail)
        .maybeSingle()

      if (existingPatient) {
        // Re-link the appointment to the existing patient
        finalPatientId = existingPatient.id
        finalPatient = existingPatient
      } else {
        // Update current patient's email
        const { data: updatedPat, error: emailErr } = await adminDb
          .from('patients')
          .update({ email: targetEmail })
          .eq('id', patientId)
          .select()
          .single()
        if (emailErr) throw emailErr
        finalPatient = updatedPat
      }
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
        patient_id: finalPatientId,
        prescription_text: prescriptionText || null,
        prescription_url: prescriptionUrl || null,
        xray_url: xrayUrl || null,
        temp_mobile_photo: null, // Delete/clear temporary mobile capture once sent
        report_sent_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (updateErr) throw updateErr

    // Clear active capture ticket on branch if matched
    if (appt.branch_id) {
      await adminDb
        .from('branches')
        .update({ active_capture_appointment_id: null })
        .eq('id', appt.branch_id)
        .eq('active_capture_appointment_id', appointmentId)
    }

    // 5. Build and Send Email
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
    const getFileAttachment = async (fileUrl: string, defaultName: string) => {
      try {
        if (fileUrl.startsWith('http')) {
          const res = await fetch(fileUrl)
          if (!res.ok) throw new Error(`HTTP Error: ${res.statusText}`)
          const arrayBuffer = await res.arrayBuffer()
          const fileBuffer = Buffer.from(arrayBuffer)
          const base64Content = fileBuffer.toString('base64')
          
          const urlObj = new URL(fileUrl)
          const filename = basename(urlObj.pathname) || defaultName
          return {
            filename,
            content: base64Content
          }
        } else {
          const filePath = join(process.cwd(), 'public', fileUrl)
          const fileBuffer = await readFile(filePath)
          const base64Content = fileBuffer.toString('base64')
          const filename = basename(filePath)
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

    const brevoApiKey = process.env.BREVO_API_KEY
    if (!brevoApiKey) {
      throw new Error('Missing BREVO_API_KEY environment variable.')
    }
    const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || 'dental@flynx.site'

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify({
        sender: {
          name: appt.branches.name,
          email: brevoSenderEmail
        },
        to: [
          {
            email: patientEmail.trim().toLowerCase(),
            name: appt.patients.name
          }
        ],
        subject: `Your Dental Diagnosis & Prescription | ${appt.branches.name}`,
        htmlContent: emailHtml,
        attachment: attachments.map(a => ({
          name: a.filename,
          content: a.content
        }))
      })
    })

    if (!response.ok) {
      const resText = await response.text()
      throw new Error(`Brevo Error: ${resText}`)
    }

    return { 
      success: true, 
      updatedPatient: finalPatient,
      xrayUrl: xrayUrl || null,
      prescriptionUrl: prescriptionUrl || null
    }
  } catch (err: any) {
    console.error('Error in sendPatientReport:', err)
    return { success: false, error: err.message || 'Failed to send reports' }
  }
}

// Action: Send New Appointment alert to doctor via Brevo
export async function sendAppointmentEmail(appointmentId: string) {
  const adminDb = getAdminSupabase()
  try {
    // 1. Fetch appointment details with patient, doctor, and branch relations
    const { data: appt, error: apptErr } = await adminDb
      .from('appointments')
      .select('*, patients(*), doctors(*), branches(*)')
      .eq('id', appointmentId)
      .single()

    if (apptErr || !appt) {
      throw new Error(`Appointment not found: ${apptErr?.message || 'Unknown error'}`)
    }

    const patient = appt.patients
    const doctor = appt.doctors
    const branch = appt.branches

    if (!doctor || !doctor.email) {
      throw new Error('Doctor email is missing or not assigned.')
    }

    const brevoApiKey = process.env.BREVO_API_KEY
    if (!brevoApiKey) {
      throw new Error('Missing BREVO_API_KEY environment variable.')
    }
    const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || 'dental@flynx.site'

    const emailSubject = `[Booking Alert] New Patient Appointment - ${branch.name}`
    const problemText = appt.problem_description
      ? appt.problem_description.trim()
      : 'No problem description provided.'

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
        <h2 style="color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-top: 0;">New Appointment Details</h2>
        <p style="font-size: 16px; line-height: 1.5;">Hello Dr. <strong>${doctor.name}</strong>,</p>
        <p style="font-size: 14px; color: #4b5563; margin-bottom: 20px;">A new appointment has been scheduled for you at <strong>${branch.name}</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; width: 30%;">Patient Name:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${patient.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Age:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${patient.age} years old</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Mobile:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${patient.mobile}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Email:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;"><a href="mailto:${patient.email}">${patient.email}</a></td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Date:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${appt.appointment_date}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Time:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${appt.appointment_time}</td>
          </tr>
        </table>

        <div style="background-color: #f0fdfa; border-left: 4px solid #0f766e; padding: 15px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
          <h4 style="margin: 0 0 8px 0; color: #0f766e; font-size: 14px; font-weight: bold;">Problem Description:</h4>
          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #374151; font-style: italic;">"${problemText}"</p>
        </div>

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          This is an automated notification from the clinic dashboard. Please do not reply directly to this email.
        </p>
      </div>
    `

    console.log(`Sending booking notification email via Brevo to doctor: ${doctor.email} (Dr. ${doctor.name})`)

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify({
        sender: {
          name: branch.name,
          email: brevoSenderEmail
        },
        to: [
          {
            email: doctor.email.trim().toLowerCase(),
            name: doctor.name
          }
        ],
        subject: emailSubject,
        htmlContent: emailHtml
      })
    })

    if (!response.ok) {
      const resText = await response.text()
      throw new Error(`Brevo Error: ${resText}`)
    }

    return { success: true }
  } catch (err: any) {
    console.error('Error in sendAppointmentEmail:', err)
    return { success: false, error: err.message || 'Failed to send email to doctor.' }
  }
}

// ════════════════════════════════════════════════════════════════════════
// ═══ DOCTOR PORTAL LOGIN & ACTIONS ═══
// ════════════════════════════════════════════════════════════════════════

export async function loginDoctor(slug: string, password: string) {
  const adminDb = getAdminSupabase()
  try {
    const { data: doctor, error } = await adminDb
      .from('doctors')
      .select('id, password, slug')
      .eq('slug', slug)
      .single()

    if (error || !doctor) {
      return { success: false, error: 'Doctor record not found.' }
    }

    if (doctor.password === password) {
      const cookieStore = await cookies()
      cookieStore.set('dental_doctor_token', doctor.slug, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 1 day expiration
        path: '/'
      })
      return { success: true }
    }
    return { success: false, error: 'Incorrect password.' }
  } catch (err: any) {
    console.error('Doctor login error:', err)
    return { success: false, error: err.message || 'Login failed.' }
  }
}

export async function logoutDoctor() {
  const cookieStore = await cookies()
  cookieStore.delete('dental_doctor_token')
  return { success: true }
}

// ════════════════════════════════════════════════════════════════════════
// ═══ OFFLINE APPOINTMENTS & FINANCES ACTIONS ═══
// ════════════════════════════════════════════════════════════════════════

export async function bookOfflineAppointment(formData: FormData) {
  const adminDb = getAdminSupabase()
  const patientName = formData.get('patientName') as string
  const patientEmail = formData.get('patientEmail') as string
  const patientMobile = formData.get('patientMobile') as string
  const patientAge = parseInt(formData.get('patientAge') as string || '0', 10)
  
  const branchId = formData.get('branchId') as string
  const doctorId = formData.get('doctorId') as string
  const appointmentDate = formData.get('appointmentDate') as string
  const appointmentTime = formData.get('appointmentTime') as string
  const problemDescription = formData.get('problemDescription') as string

  try {
    // 1. Validate date (must be within last 3 days to future)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const minDate = new Date()
    minDate.setDate(today.getDate() - 3)
    minDate.setHours(0, 0, 0, 0)
    
    const selectedDate = new Date(appointmentDate)
    selectedDate.setHours(0, 0, 0, 0)
    
    if (selectedDate < minDate) {
      return { success: false, error: 'Offline appointments can only be backdated up to 3 days.' }
    }
    
    // 2. Query / create patient by email
    const { data: existingPatient } = await adminDb
      .from('patients')
      .select('id')
      .eq('email', patientEmail.trim().toLowerCase())
      .maybeSingle()
      
    let patientId = ''
    if (existingPatient) {
      patientId = existingPatient.id
      const { error: patientUpdateErr } = await adminDb
        .from('patients')
        .update({
          name: patientName,
          mobile: patientMobile,
          age: patientAge
        })
        .eq('id', patientId)
        
      if (patientUpdateErr) throw patientUpdateErr
    } else {
      const { data: newPatient, error: patientInsertErr } = await adminDb
        .from('patients')
        .insert({
          name: patientName,
          email: patientEmail.trim().toLowerCase(),
          mobile: patientMobile,
          age: patientAge
        })
        .select('id')
        .single()
        
      if (patientInsertErr) throw patientInsertErr
      patientId = newPatient.id
    }
    
    // 3. Create appointment
    const { data: newAppt, error: apptErr } = await adminDb
      .from('appointments')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        branch_id: branchId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        problem_description: problemDescription.trim() || null,
        status: 'confirmed' // Offline bookings default to confirmed
      })
      .select()
      .single()
      
    if (apptErr) {
      if (apptErr.code === '23505') {
        return { success: false, error: 'This time slot is already booked for this doctor on this day.' }
      }
      throw apptErr
    }
    
    return { success: true, data: newAppt }
  } catch (err: any) {
    console.error('Error booking offline appointment:', err)
    return { success: false, error: err.message || 'Failed to book offline appointment.' }
  }
}

export async function updateAppointmentFinances(appointmentId: string, amountCharged: number, treatmentCost: number) {
  const adminDb = getAdminSupabase()
  try {
    const { data, error } = await adminDb
      .from('appointments')
      .update({
        amount_charged: amountCharged,
        treatment_cost: treatmentCost
      })
      .eq('id', appointmentId)
      .select()
      
    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Error updating appointment finances:', err)
    return { success: false, error: err.message || 'Failed to update financials.' }
  }
}

export async function upsertMonthlyElectricity(branchId: string, monthYear: string, bill: number) {
  const adminDb = getAdminSupabase()
  try {
    const { data: existing } = await adminDb
      .from('monthly_expenses')
      .select('id')
      .eq('branch_id', branchId)
      .eq('month_year', monthYear)
      .maybeSingle()
      
    if (existing) {
      const { data, error } = await adminDb
        .from('monthly_expenses')
        .update({ electricity_bill: bill })
        .eq('id', existing.id)
        .select()
      if (error) throw error
      return { success: true, data }
    } else {
      const { data, error } = await adminDb
        .from('monthly_expenses')
        .insert({
          branch_id: branchId,
          month_year: monthYear,
          electricity_bill: bill
        })
        .select()
      if (error) throw error
      return { success: true, data }
    }
  } catch (err: any) {
    console.error('Error updating electricity bill:', err)
    return { success: false, error: err.message || 'Failed to update electricity bill.' }
  }
}

export async function addHelperBoy(
  name: string,
  shift1Rate: number,
  shift2Rate: number,
  shift1Enabled: boolean,
  shift2Enabled: boolean,
  sundayEnabled: boolean,
  branchId: string
) {
  const adminDb = getAdminSupabase()
  try {
    const { data, error } = await adminDb
      .from('helper_boys')
      .insert({
        name,
        shift_1_rate: shift1Rate,
        shift_2_rate: shift2Rate,
        shift_1_enabled: shift1Enabled,
        shift_2_enabled: shift2Enabled,
        sunday_enabled: sundayEnabled,
        branch_id: branchId
      })
      .select()
      
    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Error adding helper boy:', err)
    return { success: false, error: err.message || 'Failed to add helper boy.' }
  }
}

export async function deleteHelperBoy(helperId: string) {
  const adminDb = getAdminSupabase()
  try {
    const { error } = await adminDb
      .from('helper_boys')
      .delete()
      .eq('id', helperId)
      
    if (error) throw error
    return { success: true }
  } catch (err: any) {
    console.error('Error deleting helper boy:', err)
    return { success: false, error: err.message || 'Failed to delete helper boy.' }
  }
}

export async function updateHelperAttendance(
  helperBoyId: string,
  date: string,
  shift: number,
  status: 'present' | 'absent'
) {
  const adminDb = getAdminSupabase()
  try {
    if (status === 'absent') {
      const { data, error } = await adminDb
        .from('helper_attendance')
        .upsert(
          { helper_boy_id: helperBoyId, date, shift, status },
          { onConflict: 'helper_boy_id,date,shift' }
        )
        .select()
      if (error) throw error
      return { success: true, data }
    } else {
      const { error } = await adminDb
        .from('helper_attendance')
        .delete()
        .eq('helper_boy_id', helperBoyId)
        .eq('date', date)
        .eq('shift', shift)
      if (error) throw error
      return { success: true }
    }
  } catch (err: any) {
    console.error('Error updating helper attendance:', err)
    return { success: false, error: err.message || 'Failed to update helper attendance.' }
  }
}

export async function updateDoctorAttendance(
  doctorId: string,
  date: string,
  status: 'present' | 'absent'
) {
  const adminDb = getAdminSupabase()
  try {
    if (status === 'absent') {
      const { data, error } = await adminDb
        .from('doctor_attendance')
        .upsert(
          { doctor_id: doctorId, date, status },
          { onConflict: 'doctor_id,date' }
        )
        .select()
      if (error) throw error
      return { success: true, data }
    } else {
      const { error } = await adminDb
        .from('doctor_attendance')
        .delete()
        .eq('doctor_id', doctorId)
        .eq('date', date)
      if (error) throw error
      return { success: true }
    }
  } catch (err: any) {
    console.error('Error updating doctor attendance:', err)
    return { success: false, error: err.message || 'Failed to update doctor attendance.' }
  }
}

export async function addExtraExpense(amount: number, note: string, date: string, branchId: string) {
  const adminDb = getAdminSupabase()
  if (!note || note.trim() === '') {
    return { success: false, error: 'A description/note is compulsory for extra expenses.' }
  }
  try {
    const { data, error } = await adminDb
      .from('extra_expenses')
      .insert({
        amount,
        note: note.trim(),
        expense_date: date,
        branch_id: branchId
      })
      .select()
      
    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Error adding extra expense:', err)
    return { success: false, error: err.message || 'Failed to add extra expense.' }
  }
}

export async function createCaptureTicket(branchId: string, appointmentId: string) {
  const adminDb = getAdminSupabase()
  try {
    const { error } = await adminDb
      .from('branches')
      .update({ active_capture_appointment_id: appointmentId })
      .eq('id', branchId)
    if (error) throw error
    return { success: true }
  } catch (err: any) {
    console.error('Error creating capture ticket:', err)
    return { success: false, error: err.message || 'Failed to create capture ticket.' }
  }
}

export async function clearCaptureTicket(branchId: string) {
  const adminDb = getAdminSupabase()
  try {
    const { error } = await adminDb
      .from('branches')
      .update({ active_capture_appointment_id: null })
      .eq('id', branchId)
    if (error) throw error
    return { success: true }
  } catch (err: any) {
    console.error('Error clearing capture ticket:', err)
    return { success: false, error: err.message || 'Failed to clear capture ticket.' }
  }
}

// Action: Search medicines from TiDB Cloud MySQL database
export async function searchMedicines(query: string) {
  try {
    const searchQuery = `%${query.trim()}%`
    
    // Find medicines matching name, generic_name, or barcode
    // Compliant with ONLY_FULL_GROUP_BY by grouping by all selected columns
    const sql = `
      SELECT m.id, m.name, m.generic_name, m.barcode, m.tablets_per_patch, m.created_at, COALESCE(SUM(b.stock), 0) as stock
      FROM medicines m
      LEFT JOIN medicine_batches b ON m.id = b.medicine_id
      WHERE m.name LIKE ? OR m.generic_name LIKE ? OR m.barcode = ?
      GROUP BY m.id, m.name, m.generic_name, m.barcode, m.tablets_per_patch, m.created_at
    `
    const medicines = await queryTiDB(sql, [searchQuery, searchQuery, query.trim()])

    // For each medicine, get its active batches sorted by oldest expiry date (FIFO)
    for (const medicine of medicines) {
      const batchSql = `
        SELECT id, batch_number, expiry_date, price, stock
        FROM medicine_batches
        WHERE medicine_id = ? AND stock > 0 AND expiry_date >= CURDATE()
        ORDER BY expiry_date ASC
      `
      const batches = await queryTiDB(batchSql, [medicine.id])
      medicine.batches = batches
    }

    return { success: true, data: medicines }
  } catch (err: any) {
    console.error('Error searching medicines:', err)
    return { success: false, error: err.message || 'Failed to search medicines.' }
  }
}

// Action: Get all procedures/treatments from Supabase
export async function getTreatments() {
  const adminDb = getAdminSupabase()
  try {
    const { data, error } = await adminDb
      .from('treatments')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Error fetching treatments:', err)
    return { success: false, error: err.message || 'Failed to fetch treatments.' }
  }
}

// Action: Add new procedure/treatment
export async function addTreatment(name: string, price: number) {
  const adminDb = getAdminSupabase()
  try {
    if (!name || name.trim() === '') {
      return { success: false, error: 'Procedure name is required.' }
    }
    if (isNaN(price) || price < 0) {
      return { success: false, error: 'Price must be a positive number.' }
    }

    const { data, error } = await adminDb
      .from('treatments')
      .insert([{ name: name.trim(), price }])
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Error adding treatment:', err)
    return { success: false, error: err.message || 'Failed to add procedure.' }
  }
}

// Action: Update procedure/treatment price
export async function updateTreatmentPrice(id: string, price: number) {
  const adminDb = getAdminSupabase()
  try {
    if (!id) {
      return { success: false, error: 'Procedure ID is required.' }
    }
    if (isNaN(price) || price < 0) {
      return { success: false, error: 'Price must be a positive number.' }
    }

    const { data, error } = await adminDb
      .from('treatments')
      .update({ price })
      .eq('id', id)
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Error updating treatment price:', err)
    return { success: false, error: err.message || 'Failed to update procedure price.' }
  }
}

// Action: Scan / Receive stock for medicine in TiDB Cloud
export async function saveMedicineStock(barcode: string, quantityPatches: number, details: {
  name: string
  genericName?: string
  batchNumber: string
  expiryDate: string // YYYY-MM-DD
  patchPrice: number // Price of 1 patch
  costPrice?: number // Cost price of 1 patch
  tabletsPerPatch: number // Tablets in 1 patch
}) {
  try {
    // 1. Look up if medicine exists by barcode
    let medicineId: string
    const medicines = await queryTiDB('SELECT id FROM medicines WHERE barcode = ?', [barcode])
    
    const tabletsPerPatch = Number(details.tabletsPerPatch || 1)
    
    if (medicines.length > 0) {
      medicineId = medicines[0].id
      // Update medicine name, generic name, and tablets_per_patch
      await queryTiDB(
        'UPDATE medicines SET name = ?, generic_name = ?, tablets_per_patch = ? WHERE id = ?',
        [details.name, details.genericName || null, tabletsPerPatch, medicineId]
      )
    } else {
      // Create new medicine product
      medicineId = randomUUID()
      await queryTiDB(
        'INSERT INTO medicines (id, name, generic_name, barcode, tablets_per_patch) VALUES (?, ?, ?, ?, ?)',
        [medicineId, details.name, details.genericName || null, barcode, tabletsPerPatch]
      )
    }

    // Convert patches to single tablet stock and price for FIFO
    const totalTablets = Number(quantityPatches) * tabletsPerPatch
    const singleTabletPrice = Number(details.patchPrice) / tabletsPerPatch

    // 2. Insert or update stock in medicine_batches
    const batches = await queryTiDB(
      'SELECT id, stock FROM medicine_batches WHERE medicine_id = ? AND batch_number = ?',
      [medicineId, details.batchNumber]
    )

    if (batches.length > 0) {
      // Update existing batch stock and price
      const newStock = Number(batches[0].stock) + totalTablets
      await queryTiDB(
        'UPDATE medicine_batches SET stock = ?, price = ?, expiry_date = ? WHERE id = ?',
        [newStock, singleTabletPrice, details.expiryDate, batches[0].id]
      )
    } else {
      // Insert new batch
      const batchId = randomUUID()
      await queryTiDB(
        'INSERT INTO medicine_batches (id, medicine_id, batch_number, expiry_date, price, stock) VALUES (?, ?, ?, ?, ?, ?)',
        [batchId, medicineId, details.batchNumber, details.expiryDate, singleTabletPrice, totalTablets]
      )
    }

    return { success: true, medicineId }
  } catch (err: any) {
    console.error('Error saving medicine stock:', err)
    return { success: false, error: err.message || 'Failed to save medicine stock.' }
  }
}

// Action: Create and save invoice in Supabase and deduct stock from TiDB (FIFO)
export async function createInvoice(
  appointmentId: string,
  items: any[], // { type: 'medicine'|'treatment'|'custom', id?: string, name?: string, quantity: number, price: number }
  subtotal: number,
  discountPercent: number,
  total: number
) {
  const adminDb = getAdminSupabase()
  try {
    // 1. Fetch patient ID from appointment
    const { data: appt, error: apptErr } = await adminDb
      .from('appointments')
      .select('patient_id')
      .eq('id', appointmentId)
      .single()
      
    if (apptErr || !appt) {
      throw new Error(`Appointment not found: ${apptErr?.message || 'Unknown'}`)
    }

    const patientId = appt.patient_id

    // 2. Insert Invoice row in Supabase
    const { data: invoice, error: invoiceErr } = await adminDb
      .from('invoices')
      .insert({
        appointment_id: appointmentId,
        patient_id: patientId,
        subtotal,
        discount_percentage: discountPercent,
        total
      })
      .select('id')
      .single()

    if (invoiceErr || !invoice) {
      throw invoiceErr
    }

    const invoiceId = invoice.id

    // 3. Save line items and perform FIFO stock deduction for medicines
    for (const item of items) {
      if (item.type === 'medicine') {
        const medicineId = item.id
        let remainingQtyToDeduct = item.quantity

        // Query active batches for this medicine in TiDB, sorted by expiry_date (FIFO)
        const batches = await queryTiDB(
          'SELECT id, stock FROM medicine_batches WHERE medicine_id = ? AND stock > 0 AND expiry_date >= CURDATE() ORDER BY expiry_date ASC',
          [medicineId]
        )

        let totalDeducted = 0
        for (const batch of batches) {
          if (remainingQtyToDeduct <= 0) break

          const batchStock = Number(batch.stock)
          const deduct = Math.min(batchStock, remainingQtyToDeduct)

          // Deduct from batch in TiDB
          await queryTiDB(
            'UPDATE medicine_batches SET stock = stock - ? WHERE id = ?',
            [deduct, batch.id]
          )

          remainingQtyToDeduct -= deduct
          totalDeducted += deduct
        }

        // Save invoice item line in Supabase
        const { error: itemErr } = await adminDb
          .from('invoice_items')
          .insert({
            invoice_id: invoiceId,
            item_type: 'medicine',
            medicine_id: medicineId,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.quantity * item.price
          })

        if (itemErr) throw itemErr
      } else if (item.type === 'treatment') {
        const { error: itemErr } = await adminDb
          .from('invoice_items')
          .insert({
            invoice_id: invoiceId,
            item_type: 'treatment',
            treatment_id: item.id,
            quantity: 1,
            unit_price: item.price,
            total_price: item.price
          })

        if (itemErr) throw itemErr
      } else if (item.type === 'custom') {
        const { error: itemErr } = await adminDb
          .from('invoice_items')
          .insert({
            invoice_id: invoiceId,
            item_type: 'custom',
            custom_name: item.name,
            quantity: 1,
            unit_price: item.price,
            total_price: item.price
          })

        if (itemErr) throw itemErr
      }
    }

    return { success: true, invoiceId }
  } catch (err: any) {
    console.error('Error creating invoice:', err)
    return { success: false, error: err.message || 'Failed to create invoice.' }
  }
}

// Action: Trigger delivering the reports via edge function and running Supabase auto-cleanup
export async function triggerDeliverAndCleanup(appointmentId: string, invoiceId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jmifnlqtcfdctvldukdw.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment')
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/deliver-and-cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        appointmentId,
        invoiceId
      })
    })

    const result = await response.json()
    console.log('deliver-and-cleanup Edge Function Response:', JSON.stringify(result))

    if (!response.ok) {
      throw new Error(`Edge function failed: ${result.error || JSON.stringify(result)}`)
    }

    return { success: true, data: result }
  } catch (err: any) {
    console.error('Error triggering delivery & cleanup:', err)
    return { success: false, error: err.message || 'Failed to run delivery and cleanup pipeline.' }
  }
}

// Action: Fetch medicine record from TiDB Cloud by barcode
export async function getMedicineByBarcode(barcode: string) {
  try {
    const sql = 'SELECT * FROM medicines WHERE barcode = ?'
    const rows = await queryTiDB(sql, [barcode.trim()])
    if (rows && rows.length > 0) {
      return { success: true, data: rows[0] }
    }
    return { success: true, data: null }
  } catch (err: any) {
    console.error('Error fetching medicine by barcode:', err)
    return { success: false, error: err.message || 'Failed to look up medicine.' }
  }
}

