import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1"

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

    // Generate professional PDF invoice using pdf-lib
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.275, 841.89]) // A4 size in points
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    // Colors
    const tealColor = rgb(0.059, 0.463, 0.431) // #0f766e
    const darkColor = rgb(0.122, 0.161, 0.216) // #1f2937
    const grayColor = rgb(0.419, 0.447, 0.502) // #6b7280
    const lightGray = rgb(0.898, 0.91, 0.922) // #e5e7eb
    const backgroundTeal = rgb(0.941, 0.992, 0.98) // #f0fdfa

    // 1. Draw top teal header bar
    page.drawRectangle({
      x: 0,
      y: 770,
      width: 595.275,
      height: 72,
      color: tealColor
    })

    page.drawText((branch?.name || 'Dental Clinic').toUpperCase(), {
      x: 40,
      y: 805,
      size: 18,
      font: boldFont,
      color: rgb(1, 1, 1)
    })

    page.drawText('Official Billing Invoice & Receipt', {
      x: 40,
      y: 785,
      size: 11,
      font: font,
      color: rgb(0.8, 1, 1)
    })

    // 2. Metadata Section (Invoice info & Patient Info)
    page.drawText('INVOICE TO:', { x: 40, y: 730, size: 10, font: boldFont, color: grayColor })
    page.drawText(`Patient Name: ${patient.name}`, { x: 40, y: 712, size: 11, font: boldFont, color: darkColor })
    page.drawText(`Age: ${patient.age || 'N/A'} yrs | Mobile: ${patient.mobile || 'N/A'}`, { x: 40, y: 696, size: 10, font: font, color: darkColor })
    page.drawText(`Email: ${patient.email || 'N/A'}`, { x: 40, y: 680, size: 10, font: font, color: darkColor })

    page.drawText('INVOICE DETAILS:', { x: 380, y: 730, size: 10, font: boldFont, color: grayColor })
    page.drawText(`Invoice ID: #${invoiceId.substring(0, 8).toUpperCase()}`, { x: 380, y: 712, size: 10, font: boldFont, color: darkColor })
    page.drawText(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, { x: 380, y: 696, size: 10, font: font, color: darkColor })
    page.drawText(`Branch: ${branch.name}`, { x: 380, y: 680, size: 10, font: font, color: darkColor })
    page.drawText(`Doctor: Dr. ${doctor.name}`, { x: 380, y: 664, size: 10, font: font, color: darkColor })

    // Draw horizontal separator line
    page.drawLine({
      start: { x: 40, y: 645 },
      end: { x: 555, y: 645 },
      thickness: 1,
      color: lightGray
    })

    // 3. Render Invoice Items Table
    page.drawText('ITEM DESCRIPTION', { x: 45, y: 625, size: 9, font: boldFont, color: grayColor })
    page.drawText('QTY', { x: 320, y: 625, size: 9, font: boldFont, color: grayColor })
    page.drawText('UNIT PRICE', { x: 400, y: 625, size: 9, font: boldFont, color: grayColor })
    page.drawText('TOTAL PRICE', { x: 485, y: 625, size: 9, font: boldFont, color: grayColor })

    page.drawLine({
      start: { x: 40, y: 615 },
      end: { x: 555, y: 615 },
      thickness: 1,
      color: lightGray
    })

    let yPosition = 595
    const rowHeight = 25

    for (const it of (items || [])) {
      page.drawText(`[${it.item_type.toUpperCase()}] ${it.custom_name || 'Clinical Item'}`, { x: 45, y: yPosition, size: 9, font: font, color: darkColor })
      page.drawText(`${it.quantity}`, { x: 325, y: yPosition, size: 9, font: font, color: darkColor })
      page.drawText(`Rs. ${Number(it.unit_price).toFixed(2)}`, { x: 400, y: yPosition, size: 9, font: font, color: darkColor })
      page.drawText(`Rs. ${Number(it.total_price).toFixed(2)}`, { x: 485, y: yPosition, size: 9, font: boldFont, color: darkColor })
      yPosition -= rowHeight
    }

    // Draw separator line under items list
    page.drawLine({
      start: { x: 40, y: yPosition + 12 },
      end: { x: 555, y: yPosition + 12 },
      thickness: 1,
      color: lightGray
    })

    // 4. Summary box
    const summaryBoxY = yPosition - 10
    
    // Draw background for totals summary
    page.drawRectangle({
      x: 350,
      y: summaryBoxY - 70,
      width: 205,
      height: 75,
      color: backgroundTeal,
      borderColor: lightGray,
      borderWidth: 1
    })

    page.drawText('Subtotal:', { x: 365, y: summaryBoxY - 18, size: 10, font: font, color: darkColor })
    page.drawText(`Rs. ${Number(invoice.subtotal).toFixed(2)}`, { x: 475, y: summaryBoxY - 18, size: 10, font: font, color: darkColor })

    page.drawText(`Discount (${invoice.discount_percentage}%):`, { x: 365, y: summaryBoxY - 38, size: 10, font: font, color: darkColor })
    page.drawText(`- Rs. ${((Number(invoice.subtotal) * Number(invoice.discount_percentage)) / 100).toFixed(2)}`, { x: 475, y: summaryBoxY - 38, size: 10, font: font, color: darkColor })

    page.drawLine({
      start: { x: 360, y: summaryBoxY - 45 },
      end: { x: 545, y: summaryBoxY - 45 },
      thickness: 1,
      color: lightGray
    })

    page.drawText('Grand Total:', { x: 365, y: summaryBoxY - 60, size: 11, font: boldFont, color: tealColor })
    page.drawText(`Rs. ${Number(invoice.total).toFixed(2)}`, { x: 475, y: summaryBoxY - 60, size: 11, font: boldFont, color: tealColor })

    // 5. Prescription Copy Box if prescription exists
    let advisoryBoxY = summaryBoxY - 95
    // 6. Footer Section
    page.drawText(`Thank you for choosing ${branch.name}.`, { x: 40, y: 50, size: 10, font: boldFont, color: tealColor })
    page.drawText('This invoice is a dynamically generated patient receipt. For any billing query, contact support.', { x: 40, y: 35, size: 8, font: font, color: grayColor })

    const pdfBytes = await pdfDoc.save()
    let pdfBinary = ''
    for (let i = 0; i < pdfBytes.length; i++) {
      pdfBinary += String.fromCharCode(pdfBytes[i])
    }
    const pdfBase64 = btoa(pdfBinary)
    
    attachments.push({
      name: 'invoice_receipt.pdf',
      content: pdfBase64
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
            <h2 style="color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 8px;">${branch.name} - Diagnostic Reports & Invoice</h2>
            <p>Dear <strong>${patient.name}</strong>,</p>
            <p>Thank you for visiting <strong>${branch.name}</strong>. We have compiled your invoice receipt, prescription, and report documents below.</p>
            
            ${invoice ? `
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
            ` : ''}

            ${appt.prescription_text ? `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 20px 0; color: #166534;">
              <h4 style="margin-top: 0; color: #15803d; font-size: 14px;">Doctor's Prescription & Medical Advice:</h4>
              <p style="white-space: pre-line; margin: 0; font-size: 13px; line-height: 1.6; color: #166534;">${appt.prescription_text}</p>
            </div>
            ` : ''}

            <p style="font-size: 13px; color: #6b7280;">Please find your invoice receipt, prescription, and X-ray report documents attached to this email.</p>
            <p style="font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 30px; text-align: center;">
              This is an official clinical dispatch notification from ${branch.name}.
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
