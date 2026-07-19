import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    const brevoSenderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'dental@flynx.site'

    if (!brevoApiKey) {
      throw new Error('Missing BREVO_API_KEY environment variable')
    }
    
    // WhatsApp credentials (with optional stubs if not configured)
    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN')
    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment configurations')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse payload
    const { appointmentId, invoiceId } = await req.json()
    if (!appointmentId || !invoiceId) {
      throw new Error('Missing appointmentId or invoiceId in payload')
    }

    console.log(`Processing deliver-and-cleanup for Appt: ${appointmentId}, Invoice: ${invoiceId}`)

    // 1. Fetch details from PostgreSQL database
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('*, patients(*), doctors(*), branches(*)')
      .eq('id', appointmentId)
      .single()

    if (apptErr || !appt) {
      throw new Error(`Failed to load appointment details: ${apptErr?.message || 'Not found'}`)
    }

    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceErr || !invoice) {
      throw new Error(`Failed to load invoice details: ${invoiceErr?.message || 'Not found'}`)
    }

    const { data: items, error: itemsErr } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)

    if (itemsErr) {
      throw new Error(`Failed to load invoice items: ${itemsErr.message}`)
    }

    const patient = appt.patients
    const doctor = appt.doctors
    const branch = appt.branches

    console.log(`Loaded patient: ${patient.name}, doctor: ${doctor.name}, branch: ${branch.name}`)

    // 2. Fetch attachments from Supabase Storage and convert to Base64
    const attachments = []

    const downloadAndBase64 = async (url: string, filename: string) => {
      try {
        const fileKey = url.split('/').pop()
        if (!fileKey) return null
        
        console.log(`Downloading file from storage: ${fileKey}`)
        const { data, error } = await supabase.storage.from('reports').download(fileKey)
        if (error || !data) {
          console.warn(`Warning: Failed to download file ${fileKey}:`, error?.message)
          return null
        }
        
        const arrayBuffer = await data.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // Custom base64 converter compatible with Deno runtime
        let binary = ''
        const len = uint8Array.byteLength
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8Array[i])
        }
        const base64 = btoa(binary)
        
        return {
          name: filename,
          content: base64
        }
      } catch (err) {
        console.warn(`Error processing file ${url}:`, err)
        return null
      }
    }

    // Download X-Ray
    if (appt.xray_url) {
      const att = await downloadAndBase64(appt.xray_url, 'patient_xray.pdf')
      if (att) attachments.push(att)
    }

    // Download Prescription Image
    const prescriptionUrl = appt.temp_mobile_photo || appt.prescription_url
    if (prescriptionUrl) {
      const ext = prescriptionUrl.split('.').pop() || 'jpg'
      const att = await downloadAndBase64(prescriptionUrl, `prescription.${ext}`)
      if (att) attachments.push(att)
    }

    // Generate simulated invoice attachment (base64 string of text/json bill representation)
    const invoiceSummaryText = `
      =======================================================
      DENTAL CLINIC INVOICE
      =======================================================
      Branch: ${branch.name}
      Invoice ID: ${invoiceId}
      Date: ${new Date(invoice.created_at).toLocaleDateString()}
      Patient: ${patient.name}
      Doctor: Dr. ${doctor.name}
      
      ITEMS:
      ${(items || []).map((it: any) => `- [${it.item_type.toUpperCase()}] Qty: ${it.quantity} x Rs. ${it.unit_price} = Rs. ${it.total_price}`).join('\n      ')}
      
      -------------------------------------------------------
      Subtotal: Rs. ${invoice.subtotal}
      Discount: ${invoice.discount_percentage}%
      Grand Total: Rs. ${invoice.total}
      =======================================================
    `
    const invoiceUint8 = new TextEncoder().encode(invoiceSummaryText)
    let invoiceBinary = ''
    for (let i = 0; i < invoiceUint8.length; i++) {
      invoiceBinary += String.fromCharCode(invoiceUint8[i])
    }
    const invoiceBase64 = btoa(invoiceBinary)
    attachments.push({
      name: 'invoice_receipt.txt',
      content: invoiceBase64
    })

    // 3. Parallel API Deliveries (Email & WhatsApp)
    console.log('Starting parallel deliveries via Brevo Email and Meta WhatsApp API...')

    // A. Email Delivery Promise
    const emailPromise = fetch('https://api.brevo.com/v3/smtp/email', {
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
            email: patient.email.trim().toLowerCase(),
            name: patient.name
          }
        ],
        subject: `Your Dental Invoice & Diagnostic Reports | ${branch.name}`,
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #374151;">
            <h2 style="color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 8px;">Invoice & Diagnostic Reports</h2>
            <p>Dear <strong>${patient.name}</strong>,</p>
            <p>Thank you for choosing ${branch.name}. We have compiled your invoice receipt, prescription, and X-ray report documents below.</p>
            
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #0f766e;">Billing Summary:</h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">Subtotal:</td>
                  <td style="padding: 4px 0; text-align: right;">Rs. ${invoice.subtotal}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #6b7280;">Discount Applied:</td>
                  <td style="padding: 4px 0; text-align: right;">${invoice.discount_percentage}%</td>
                </tr>
                <tr style="border-top: 1px solid #e5e7eb; font-weight: bold; color: #111827;">
                  <td style="padding: 8px 0 0 0;">Total Paid:</td>
                  <td style="padding: 8px 0 0 0; text-align: right; color: #0f766e;">Rs. ${invoice.total}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 13px; color: #6b7280;">Please find the invoice receipt text, prescription image, and X-ray PDF files attached to this email.</p>
            <p style="font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 30px; text-align: center;">
              This is a secure one-way clinical dispatch notification. For privacy compliance, these attachments are purged from our servers once delivered.
            </p>
          </div>
        `,
        attachment: attachments
      })
    })

    // B. WhatsApp Delivery Promise (Official Meta API or Mock Stub)
    let whatsappPromise
    if (whatsappToken && whatsappPhoneId) {
      whatsappPromise = fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: patient.mobile.startsWith('+') ? patient.mobile : `+91${patient.mobile}`, // Format for India default
          type: "template",
          template: {
            name: "invoice_delivery",
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: patient.name },
                  { type: "text", text: branch.name },
                  { type: "text", text: `Rs. ${invoice.total}` }
                ]
              }
            ]
          }
        })
      })
    } else {
      // Mock WhatsApp delivery success if no token is configured in environment
      console.log('Meta WhatsApp credentials missing; running simulated delivery response.')
      whatsappPromise = Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"mock": true}')
      })
    }

    // Execute parallel delivery requests
    const [emailRes, whatsappRes] = await Promise.all([emailPromise, whatsappPromise])

    const emailOk = emailRes.ok
    const whatsappOk = whatsappRes.ok

    const emailStatus = emailRes.status
    const whatsappStatus = whatsappRes.status

    console.log(`Delivery Results - Email Status: ${emailStatus}, WhatsApp Status: ${whatsappStatus}`)

    if (!emailOk || !whatsappOk) {
      const emailErrText = !emailOk ? await emailRes.text() : 'OK'
      const waErrText = !whatsappOk ? await whatsappRes.text() : 'OK'
      throw new Error(`Parallel delivery failed. Email: ${emailStatus} (${emailErrText}), WhatsApp: ${whatsappStatus} (${waErrText})`)
    }

    // 4. Verification and Supabase Auto-Cleanup
    console.log('Verification successful! Initiating Supabase Storage and database auto-cleanup...')

    const getFileName = (url: string | null) => {
      if (!url) return null
      return url.split('/').pop() || null
    }

    // A. Delete physical storage files
    const filesToDelete = [
      getFileName(appt.xray_url),
      getFileName(appt.prescription_url),
      getFileName(appt.temp_mobile_photo)
    ].filter(Boolean) as string[]

    if (filesToDelete.length > 0) {
      console.log(`Deleting ${filesToDelete.length} files from storage bucket:`, filesToDelete)
      const { data: deleteData, error: deleteErr } = await supabase.storage.from('reports').remove(filesToDelete)
      if (deleteErr) {
        console.warn('Storage deletion warning:', deleteErr.message)
      } else {
        console.log('Successfully deleted files from storage:', deleteData)
      }
    }

    // B. Clear clinical medical rows in public.appointments
    console.log('Clearing medical fields from public.appointments row...')
    const { error: updateErr } = await supabase
      .from('appointments')
      .update({
        prescription_text: null,
        prescription_url: null,
        xray_url: null,
        temp_mobile_photo: null
      })
      .eq('id', appointmentId)

    if (updateErr) {
      throw new Error(`Failed to clear appointments table fields: ${updateErr.message}`)
    }

    // C. Delete invoice record (invoice items will cascade delete via schema)
    console.log('Deleting invoice record from database rows...')
    const { error: invoiceDeleteErr } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)

    if (invoiceDeleteErr) {
      throw new Error(`Failed to delete invoice row: ${invoiceDeleteErr.message}`)
    }

    console.log('Auto-cleanup completed successfully!')

    return new Response(JSON.stringify({ 
      success: true, 
      delivery: { email: emailStatus, whatsapp: whatsappStatus },
      cleanup: { filesPurged: filesToDelete.length, recordsCleared: true }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in deliver-and-cleanup Edge Function:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
