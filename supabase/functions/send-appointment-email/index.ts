import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    const brevoSenderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'dental@flynx.site'

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials in environment')
    }

    if (!brevoApiKey) {
      throw new Error('Missing BREVO_API_KEY in environment')
    }

    // Initialize Supabase Client with service role key to bypass RLS policies
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the webhook payload
    const payload = await req.json()
    console.log('Webhook payload received:', JSON.stringify(payload))

    // Verify this is an INSERT trigger
    if (payload.type !== 'INSERT') {
      return new Response(JSON.stringify({ message: `Ignored operation type: ${payload.type}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const appointment = payload.record
    if (!appointment) {
      throw new Error('No record found in payload')
    }

    // Fetch patient details
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('name, age, mobile, email')
      .eq('id', appointment.patient_id)
      .single()

    if (patientError || !patient) {
      throw new Error(`Failed to fetch patient: ${patientError?.message || 'Not found'}`)
    }

    // Fetch doctor details
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('name, email')
      .eq('id', appointment.doctor_id)
      .single()

    if (doctorError || !doctor) {
      throw new Error(`Failed to fetch doctor: ${doctorError?.message || 'Not found'}`)
    }

    // Fetch branch details
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('name')
      .eq('id', appointment.branch_id)
      .single()

    if (branchError || !branch) {
      throw new Error(`Failed to fetch branch: ${branchError?.message || 'Not found'}`)
    }

    // Construct the email body
    const emailSubject = `[Booking Alert] New Patient Appointment - ${branch.name}`
    
    // Formatting problem description
    const problemText = appointment.problem_description 
      ? appointment.problem_description.trim() 
      : 'No problem description provided.';

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
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${appointment.appointment_date}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Time:</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${appointment.appointment_time}</td>
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

    console.log(`Sending email to doctor: ${doctor.email} (Dr. ${doctor.name})`)

    // Send the email via Brevo API
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: branch.name,
          email: brevoSenderEmail,
        },
        to: [
          {
            email: doctor.email.trim().toLowerCase(),
            name: doctor.name
          }
        ],
        subject: emailSubject,
        htmlContent: emailHtml,
      }),
    })

    const brevoResult = await brevoResponse.json()
    console.log('Brevo Response:', JSON.stringify(brevoResult))

    if (!brevoResponse.ok) {
      throw new Error(`Brevo email dispatch failed: ${JSON.stringify(brevoResult)}`)
    }

    return new Response(JSON.stringify({ success: true, messageId: brevoResult.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in send-appointment-email Edge Function:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
