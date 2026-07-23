'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  sendBroadcastCampaignAction, 
  triggerSameDayRemindersAction, 
  triggerBirthdayWishesAction, 
  getMessageLogsAction 
} from '@/app/admin/actions'
import { 
  MessageSquare, Send, Gift, Bell, 
  CheckCircle, Loader2, RefreshCw, FileText, Users, Paperclip
} from 'lucide-react'

export default function MessagingCampaignPage() {
  // Broadcast state
  const [targetAudience, setTargetAudience] = useState('all')
  const [campaignText, setCampaignText] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null)

  // Trigger states
  const [runningReminders, setRunningReminders] = useState(false)
  const [runningBirthdays, setRunningBirthdays] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null)

  // Message Logs state
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await getMessageLogsAction()
      if (res.success && res.data) {
        setLogs(res.data)
      }
    } catch (err) {
      console.error('Error fetching logs:', err)
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaignText) return
    setSendingBroadcast(true)
    setBroadcastResult(null)
    try {
      const res = await sendBroadcastCampaignAction(targetAudience, campaignText, attachmentUrl)
      if (res.success) {
        setBroadcastResult(`Campaign sent successfully to ${res.count} patients via active WhatsApp & Email channels!`)
        setCampaignText('')
        setAttachmentUrl('')
        await fetchLogs()
      } else {
        alert(res.error || 'Failed to send broadcast campaign.')
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.')
    } finally {
      setSendingBroadcast(false)
    }
  }

  const handleRunReminders = async () => {
    setRunningReminders(true)
    setTriggerMsg(null)
    try {
      const res = await triggerSameDayRemindersAction()
      if (res.success) {
        setTriggerMsg(`Same-day reminders processed! Sent to ${res.count} patients.`)
        await fetchLogs()
      }
    } catch (err: any) {
      alert(err.message || 'Error triggering reminders.')
    } finally {
      setRunningReminders(false)
    }
  }

  const handleRunBirthdays = async () => {
    setRunningBirthdays(true)
    setTriggerMsg(null)
    try {
      const res = await triggerBirthdayWishesAction()
      if (res.success) {
        setTriggerMsg(`Birthday wishes processed! Sent greetings to ${res.count} patients today.`)
        await fetchLogs()
      }
    } catch (err: any) {
      alert(err.message || 'Error triggering birthday wishes.')
    } finally {
      setRunningBirthdays(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.1, ease: [0.25, 0.1, 0.25, 1] }}
      className="perspective-stage space-y-7 font-sans max-w-6xl"
    >
      
      {/* ══ HEADER ══ */}
      <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-white/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-emerald-400 shadow-md">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2">
              WhatsApp & Email Broadcast Terminal
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Broadcast campaigns, trigger automated same-day reminders, birthday greetings, and inspect live delivery logs.
            </p>
          </div>
        </div>
      </div>

      {/* ══ AUTOMATED QUICK RUNNERS ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        
        {/* Same-Day Reminders */}
        <div className="card-3d glass-3d p-5 rounded-3xl shadow-lg border border-white/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-50 text-cyan-700 rounded-2xl border border-cyan-100">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Same-Day Reminders</h4>
              <p className="text-[10px] text-slate-500 font-medium">Send reminders for today's booked appointments.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRunReminders}
            disabled={runningReminders}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition shrink-0 flex items-center gap-1.5"
          >
            {runningReminders ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            Run Reminders
          </button>
        </div>

        {/* Birthday Greetings */}
        <div className="card-3d glass-3d p-5 rounded-3xl shadow-lg border border-white/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Birthday Wishes</h4>
              <p className="text-[10px] text-slate-500 font-medium">Send greetings to patients celebrating today.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRunBirthdays}
            disabled={runningBirthdays}
            className="px-4 py-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition shrink-0 flex items-center gap-1.5"
          >
            {runningBirthdays ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
            Send Greetings
          </button>
        </div>

      </div>

      {triggerMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-2xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          {triggerMsg}
        </div>
      )}

      {/* ══ CAMPAIGN BROADCAST COMPOSER & LOGS GRID ══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
        
        {/* Campaign Composer */}
        <div className="md:col-span-1">
          <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-white/80 space-y-4 sticky top-6">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-200/60 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              Compose Broadcast Campaign
            </h3>

            {broadcastResult && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl">
                {broadcastResult}
              </div>
            )}

            <form onSubmit={handleSendCampaign} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" /> Target Audience
                </label>
                <select
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-500 shadow-sm"
                >
                  <option value="all">All Clinic Patients</option>
                  <option value="hazara">Hazara Branch Patients Only</option>
                  <option value="family">Family Branch Patients Only</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Campaign Announcement Text</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Type announcement message (e.g. Special 20% discount on Teeth Whitening this week!)..."
                  value={campaignText}
                  onChange={e => setCampaignText(e.target.value)}
                  className="w-full p-3.5 border border-slate-200 rounded-2xl text-xs bg-white text-slate-800 font-medium focus:outline-none focus:border-emerald-500 shadow-sm resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Paperclip className="w-3 h-3 text-slate-400" /> Attachment URL (Optional PDF / Image)
                </label>
                <input
                  type="url"
                  placeholder="https://... image or offer banner link"
                  value={attachmentUrl}
                  onChange={e => setAttachmentUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-500 shadow-sm"
                />
              </div>

              <button
                type="submit"
                disabled={sendingBroadcast || !campaignText}
                className="w-full py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-emerald-400 rounded-2xl text-xs font-bold shadow-xl shadow-slate-900/15 transition transform hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sendingBroadcast ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Send className="w-4 h-4" />}
                Broadcast Campaign Now
              </button>
            </form>
          </div>
        </div>

        {/* Message Delivery Logs */}
        <div className="md:col-span-2">
          <div className="card-3d glass-3d p-6 rounded-3xl shadow-xl border border-white/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Live Messaging Delivery Audit Logs
              </h3>
              <button
                onClick={fetchLogs}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                title="Refresh Logs"
              >
                <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingLogs ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-emerald-600 animate-spin" /></div>
            ) : (
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden text-xs shadow-sm bg-white/80 max-h-[500px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                      <th className="p-3.5">Recipient Info</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">WhatsApp Status</th>
                      <th className="p-3.5">Email Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400 font-light">
                          No recent message delivery records logged. Broadcast campaigns or automated triggers will appear here.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-slate-50/70 transition text-slate-800">
                          <td className="p-3.5">
                            <p className="font-bold text-slate-900">{log.recipient_name || 'Patient'}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{log.recipient_phone || log.recipient_email}</p>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-700 uppercase text-[10px]">
                            {log.message_type?.replace(/_/g, ' ')}
                          </td>
                          <td className="p-3.5 font-mono">
                            <span className={`px-2 py-0.5 rounded-xl text-[10px] font-bold border ${
                              String(log.whatsapp_status).includes('sent') 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                            }`}>
                              {log.whatsapp_status}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono">
                            <span className="px-2 py-0.5 rounded-xl text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {log.email_status || 'sent_live'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

    </motion.div>
  )
}
