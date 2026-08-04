import { CalendarClock, CheckCircle2, Download, ExternalLink, Image as ImageIcon, MessageCircle, Mic, RotateCcw, Send, ShieldAlert, Square, Trash2, Video, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getDemoMessages, getDemoRequests, moderateDemoChat, sendDemoMessage, updateDemoRequest } from '../api/demoRequests'
import { useAuth } from '../auth/useAuth'
import useDialogAccessibility from '../hooks/useDialogAccessibility'

function ChatModal({ request, currentUser, onClose, onModerationChanged }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageScale, setImageScale] = useState(1)
  const [moderating, setModerating] = useState('')
  const [moderation, setModeration] = useState({
    buyer_chat_blocked: Boolean(request.buyer_chat_blocked),
    vendor_chat_blocked: Boolean(request.vendor_chat_blocked),
  })
  const dialogRef = useDialogAccessibility(!imagePreview, onClose, sending || recording)
  const imageDialogRef = useDialogAccessibility(Boolean(imagePreview), () => setImagePreview(null))
  const bottomRef = useRef(null)
  const imageInputRef = useRef(null)
  const recorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const discardRecordingRef = useRef(false)
  const isAdmin = !['buyer', 'vendor'].includes(currentUser.account_type)
  const currentUserBlocked = currentUser.account_type === 'buyer' ? moderation.buyer_chat_blocked : currentUser.account_type === 'vendor' ? moderation.vendor_chat_blocked : false

  useEffect(() => {
    let active = true
    const load = () => getDemoMessages(request.id).then((result) => {
      if (active) {
        setMessages(result.data || [])
        window.dispatchEvent(new CustomEvent('demo-chat-read'))
      }
    }).catch((err) => {
      if (active) setError(err.message)
    })
    load()
    const timer = setInterval(load, 5000)
    return () => { active = false; clearInterval(timer) }
  }, [request.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!recording) return undefined
    const timer = setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000)
    return () => clearInterval(timer)
  }, [recording])

  useEffect(() => () => {
    discardRecordingRef.current = true
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }, [])

  const send = async (payload) => {
    setSending(true)
    setError('')
    try {
      const result = await sendDemoMessage(request.id, payload)
      setMessages((current) => [...current, result.data])
      setText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (text.trim()) await send({ message: text.trim() })
  }

  const attachImage = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Please select a PNG, JPG, WebP, or GIF image.')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be 4 MB or smaller.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => send({ message: text.trim(), attachment_type: 'image', attachment_name: file.name, attachment_data: reader.result })
    reader.onerror = () => setError('Unable to read this image.')
    reader.readAsDataURL(file)
  }

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop()
      return
    }
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      discardRecordingRef.current = false
      audioChunksRef.current = []
      recorder.ondataavailable = (event) => { if (event.data.size) audioChunksRef.current.push(event.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        setRecording(false)
        setRecordingSeconds(0)
        if (discardRecordingRef.current) return
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size > 4 * 1024 * 1024) {
          setError('Voice note must be 4 MB or smaller.')
          return
        }
        const reader = new FileReader()
        reader.onload = () => send({ message: text.trim(), attachment_type: 'audio', attachment_name: `voice-note-${Date.now()}.webm`, attachment_data: reader.result })
        reader.readAsDataURL(blob)
      }
      recorderRef.current = recorder
      recorder.start()
      setRecordingSeconds(0)
      setRecording(true)
    } catch {
      setError('Microphone permission is required to record a voice note.')
    }
  }

  const cancelRecording = () => {
    discardRecordingRef.current = true
    recorderRef.current?.stop()
  }

  const formatDuration = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  const openImage = (message) => {
    setImageScale(1)
    setImagePreview({ src: message.attachment_data, name: message.attachment_name || 'chat-image' })
  }

  const toggleMessaging = async (participant) => {
    const key = `${participant}_chat_blocked`
    const blocked = !moderation[key]
    setModerating(participant)
    setError('')
    try {
      const result = await moderateDemoChat(request.id, participant, blocked)
      const next = {
        buyer_chat_blocked: Boolean(result.data.buyer_chat_blocked),
        vendor_chat_blocked: Boolean(result.data.vendor_chat_blocked),
      }
      setModeration(next)
      onModerationChanged(request.id, next)
    } catch (err) {
      setError(err.message)
    } finally {
      setModerating('')
    }
  }

  const latestSystemMessage = [...messages].reverse().find((message) => message.is_system)
  const visibleMessages = messages.filter((message) => !message.is_system || message.id === latestSystemMessage?.id)
  const meetingDate = request.demo_at ? new Date(request.demo_at) : null

  return <div className="fixed inset-0 z-[80] grid place-items-center p-4">
    <button type="button" onClick={onClose} className="absolute inset-0 bg-slate-950/45" aria-label="Close chat"/>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="demo-chat-title" className="relative flex h-[min(680px,94dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-overlay sm:h-[min(680px,90vh)]">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div><h2 id="demo-chat-title" className="font-bold">{request.service?.name} — Meeting Chat</h2><p className="mt-0.5 text-xs text-slate-500">{isAdmin ? `${request.user?.name} → ${request.vendor?.company_name || request.vendor?.name}` : new Date(request.demo_at).toLocaleString()}</p></div>
        <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button>
      </div>
      {isAdmin && <div className="flex flex-wrap items-center gap-2 border-b bg-amber-50 px-5 py-3">
        <div className="mr-auto flex items-center gap-2 text-xs font-semibold text-amber-900"><ShieldAlert className="h-4 w-4"/>Admin chat moderation</div>
        {['buyer', 'vendor'].map((participant) => {
          const blocked = moderation[`${participant}_chat_blocked`]
          return <button key={participant} type="button" disabled={Boolean(moderating)} onClick={() => toggleMessaging(participant)} className={`h-8 rounded-md px-3 text-[11px] font-semibold text-white disabled:opacity-50 ${blocked ? 'bg-emerald-600' : 'bg-red-600'}`}>{moderating === participant ? 'Updating...' : `${blocked ? 'Allow' : 'Stop'} ${participant === 'buyer' ? 'Customer' : 'Vendor'} Messages`}</button>
        })}
      </div>}
      {request.meeting_link && <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-blue-50 px-5 py-3"><div className="flex items-center gap-2 text-xs text-blue-900"><Video className="h-4 w-4 text-primary"/><span><strong>Online meeting ready</strong><span className="ml-2 text-blue-700">{meetingDate?.toLocaleDateString()} at {meetingDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span></div><a href={request.meeting_link} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[11px] font-semibold text-white hover:bg-blue-700"><ExternalLink className="h-3.5 w-3.5"/>Join Meeting</a></div>}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">
        {visibleMessages.map((message) => {
          if (message.is_system) return <div key={message.id} className="mx-auto max-w-lg overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm"><div className="flex items-center gap-2 bg-emerald-50 px-4 py-3 text-emerald-800"><CheckCircle2 className="h-5 w-5"/><div><p className="text-xs font-bold">Demo request accepted</p><p className="text-[11px] text-emerald-700">Your meeting has been confirmed by the Solution Provider.</p></div></div><div className="p-4"><div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-100 text-primary"><CalendarClock className="h-4 w-4"/></span><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Meeting date & time</p><p className="mt-0.5 text-xs font-bold text-slate-800">{meetingDate?.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} · {meetingDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div></div>{request.meeting_link && <a href={request.meeting_link} target="_blank" rel="noreferrer" className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-white hover:bg-blue-700"><Video className="h-4 w-4"/>Join Online Meeting <ExternalLink className="h-3.5 w-3.5"/></a>}</div></div>
          const mine = message.user_id === currentUser.id
          return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[78%] rounded-xl px-4 py-2.5 ${mine ? 'bg-primary text-white' : 'border bg-white text-slate-700'}`}><p className={`mb-1 text-[11px] font-semibold ${mine ? 'text-blue-100' : 'text-slate-400'}`}>{mine ? 'You' : `${message.user?.name || 'System'}${message.user?.account_type && !['buyer', 'vendor'].includes(message.user.account_type) ? ' (Admin)' : ''}`}</p>{message.attachment_type === 'image' && <button type="button" onClick={() => openImage(message)} className="group relative mb-2 block overflow-hidden rounded-lg bg-slate-900/10 text-left"><img src={message.attachment_data} alt={message.attachment_name || 'Chat attachment'} className="max-h-64 min-h-20 w-full object-contain"/><span className="absolute inset-0 grid place-items-center bg-slate-950/0 opacity-0 transition group-hover:bg-slate-950/35 group-hover:opacity-100"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow"><ZoomIn className="h-3.5 w-3.5"/>View image</span></span></button>}{message.attachment_type === 'audio' && <div className={`mb-2 rounded-lg p-2.5 ${mine ? 'bg-white/15' : 'bg-slate-50'}`}><div className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold ${mine ? 'text-blue-50' : 'text-slate-500'}`}><Mic className="h-3.5 w-3.5"/>Voice note</div><audio controls preload="metadata" className="h-9 w-[min(280px,65vw)] max-w-full" src={message.attachment_data}>Your browser does not support audio playback.</audio></div>} {message.message && <p className="whitespace-pre-wrap break-words text-xs leading-5">{message.message}</p>}<p className={`mt-1 text-right text-[11px] ${mine ? 'text-blue-100' : 'text-slate-400'}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div></div>
        })}
        {!messages.length && !error && <p className="py-10 text-center text-xs text-slate-400">No messages yet.</p>}
        <div ref={bottomRef}/>
      </div>
      {error && <div className="flex items-center gap-2 border-t bg-red-50 px-5 py-2 text-xs text-red-600"><span className="min-w-0 flex-1">{error}</span><button type="button" onClick={() => setError('')} className="rounded p-1 hover:bg-red-100" aria-label="Dismiss error"><X className="h-3.5 w-3.5"/></button></div>}
      {currentUserBlocked ? <div className="border-t bg-red-50 px-5 py-3 text-center text-xs font-semibold text-red-700">Messaging has been stopped by an administrator.</div> : <form onSubmit={submit} className="flex gap-2 border-t p-4">
        <input ref={imageInputRef} onChange={attachImage} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"/>
        {recording ? <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3"><span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"/><span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"/></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-red-700">Recording voice note</p><p className="text-[11px] tabular-nums text-red-500">{formatDuration(recordingSeconds)} · Tap stop to send</p></div><button type="button" onClick={cancelRecording} className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-white" aria-label="Cancel recording"><Trash2 className="h-4 w-4"/></button><button type="button" onClick={toggleRecording} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-3 text-[11px] font-semibold text-white hover:bg-red-700"><Square className="h-3 w-3 fill-current"/>Stop</button></div> : <><button type="button" disabled={sending} onClick={() => imageInputRef.current?.click()} className="grid h-10 w-10 shrink-0 place-items-center rounded-md border text-slate-600 hover:bg-slate-50 disabled:opacity-50" aria-label="Send picture"><ImageIcon className="h-4 w-4"/></button><button type="button" disabled={sending} onClick={toggleRecording} className="grid h-10 w-10 shrink-0 place-items-center rounded-md border text-slate-600 hover:bg-slate-50 disabled:opacity-50" aria-label="Record voice note"><Mic className="h-4 w-4"/></button><input value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder="Type a message..." className="h-10 min-w-0 flex-1 rounded-md border px-3 text-sm outline-none focus:border-primary"/><button disabled={sending || !text.trim()} className="grid h-10 w-11 place-items-center rounded-md bg-primary text-white disabled:opacity-50" aria-label="Send message"><Send className="h-4 w-4"/></button></>}
      </form>}
    </div>
    {imagePreview && <div ref={imageDialogRef} className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95" role="dialog" aria-modal="true" aria-label="Image preview">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-white"><p className="min-w-0 flex-1 truncate text-sm font-semibold">{imagePreview.name}</p><button type="button" onClick={() => setImageScale((scale) => Math.max(0.5, scale - 0.25))} className="grid h-9 w-9 place-items-center rounded-md hover:bg-white/10" aria-label="Zoom out"><ZoomOut className="h-4 w-4"/></button><button type="button" onClick={() => setImageScale((scale) => Math.min(3, scale + 0.25))} className="grid h-9 w-9 place-items-center rounded-md hover:bg-white/10" aria-label="Zoom in"><ZoomIn className="h-4 w-4"/></button><button type="button" onClick={() => setImageScale(1)} className="grid h-9 w-9 place-items-center rounded-md hover:bg-white/10" aria-label="Reset zoom"><RotateCcw className="h-4 w-4"/></button><a href={imagePreview.src} download={imagePreview.name} className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-xs font-semibold text-slate-900 hover:bg-slate-100"><Download className="h-4 w-4"/>Download</a><button type="button" onClick={() => setImagePreview(null)} className="grid h-9 w-9 place-items-center rounded-md hover:bg-white/10" aria-label="Close image"><X className="h-5 w-5"/></button></div>
      <button type="button" onClick={() => setImagePreview(null)} className="min-h-0 flex-1 overflow-auto p-6" aria-label="Close image preview"><span className="grid min-h-full place-items-center"><img onClick={(event) => event.stopPropagation()} src={imagePreview.src} alt={imagePreview.name} style={{ transform: `scale(${imageScale})` }} className="max-h-[calc(100vh-110px)] max-w-full cursor-default object-contain transition-transform"/></span></button>
    </div>}
  </div>
}

function AcceptModal({ request, saving, error, onClose, onAccept }) {
  const dialogRef = useDialogAccessibility(true, onClose, saving)
  const submit = (event) => {
    event.preventDefault()
    onAccept()
  }

  return <div className="fixed inset-0 z-[80] grid place-items-center p-4">
    <button type="button" onClick={onClose} className="absolute inset-0 bg-slate-950/45" aria-label="Close"/>
    <form ref={dialogRef} role="dialog" aria-modal="true" aria-label="Accept demo request" onSubmit={submit} className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-overlay">
      <div className="flex items-start justify-between border-b pb-4"><div><h2 className="font-bold">Accept Demo Request</h2><p className="mt-1 text-xs text-slate-500">Confirm the meeting details for the customer.</p></div><button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>
      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs"><p><span className="font-semibold">Product:</span> {request.service?.name}</p><p className="mt-2"><span className="font-semibold">Customer:</span> {request.user?.name}</p><p className="mt-2"><span className="font-semibold">Meeting time:</span> {new Date(request.demo_at).toLocaleString()}</p></div>
      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800"><p className="font-semibold">Meeting link automatically generate hoga</p><p className="mt-1">Accept karte hi unique online meeting link aur selected time customer ko email aur chat mein send ho jayega.</p></div>
      {error && <p className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-9 rounded-md border px-4 text-xs font-semibold">Cancel</button><button disabled={saving} className="h-9 rounded-md bg-emerald-600 px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Accepting...' : 'Accept & Notify'}</button></div>
    </form>
  </div>
}

function RejectModal({ request, saving, error, onClose, onReject }) {
  const [reason, setReason] = useState('')
  const closeEditor = () => { if (reason && !window.confirm('Discard this rejection reason?')) return; onClose() }
  const dialogRef = useDialogAccessibility(true, closeEditor, saving)
  const submit = (event) => {
    event.preventDefault()
    if (reason.trim().length >= 5) onReject(reason.trim())
  }

  return <div className="fixed inset-0 z-[80] grid place-items-center p-4">
    <button type="button" onClick={closeEditor} className="absolute inset-0 bg-slate-950/45" aria-label="Close"/>
    <form ref={dialogRef} role="dialog" aria-modal="true" aria-label="Reject demo request" onSubmit={submit} className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-overlay">
      <div className="flex items-start justify-between border-b pb-4"><div><h2 className="font-bold">Reject Demo Request</h2><p className="mt-1 text-xs text-slate-500">Customer ko rejection ki clear wajah batayein.</p></div><button type="button" onClick={closeEditor} className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>
      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs"><p><span className="font-semibold">Product:</span> {request.service?.name}</p><p className="mt-2"><span className="font-semibold">Customer:</span> {request.user?.name}</p><p className="mt-2"><span className="font-semibold">Requested time:</span> {new Date(request.demo_at).toLocaleString()}</p></div>
      <label className="mt-4 block text-xs font-semibold">Rejection reason *<textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={5} maxLength={1000} rows={4} autoFocus placeholder="Example: Requested time par team available nahi hai. Please doosra time select karein." className="mt-1.5 w-full resize-y rounded-lg border p-3 text-sm font-normal leading-5 outline-none focus:border-red-400"/></label>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>Minimum 5 characters</span><span>{reason.length}/1000</span></div>
      {error && <p className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={closeEditor} className="h-9 rounded-md border px-4 text-xs font-semibold">Cancel</button><button disabled={saving || reason.trim().length < 5} className="h-9 rounded-md bg-red-600 px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Rejecting...' : 'Reject & Send Reason'}</button></div>
    </form>
  </div>
}

export default function DemosPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isVendor = user?.account_type === 'vendor'
  const isBuyer = user?.account_type === 'buyer'
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState('')
  const [chatRequest, setChatRequest] = useState(null)
  const [acceptRequest, setAcceptRequest] = useState(null)
  const [rejectRequest, setRejectRequest] = useState(null)

  useEffect(() => {
    const loadRequests = () => getDemoRequests().then((result) => {
      const rows = result.data || []
      setRequests(rows)
      if (location.state?.openLatestChat) {
        const accepted = rows.filter((item) => item.status === 'accepted')
        const target = accepted.find((item) => Number(item.unread_count) > 0) || accepted[0]
        if (target) setChatRequest(target)
        navigate('/demos', { replace: true, state: null })
      }
    }).catch((err) => setError(err.message))
    loadRequests()
    const timer = setInterval(loadRequests, 15000)
    return () => clearInterval(timer)
  }, [location.state, navigate])

  const updateStatus = async (id, status, rejectionReason = '') => {
    if (status === 'rejected' && !rejectionReason) {
      setError('')
      setRejectRequest(requests.find((item) => item.id === id) || null)
      return
    }
    setUpdating(`${id}-${status}`)
    setError('')
    try {
      const result = await updateDemoRequest(id, status, rejectionReason)
      setRequests((current) => current.map((item) => item.id === id ? { ...item, ...result.data } : item))
      if (status === 'accepted') setAcceptRequest(null)
      if (status === 'rejected') setRejectRequest(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating('')
    }
  }

  const title = isBuyer ? 'My Demo Requests' : isVendor ? 'My Demo Requests' : 'Demo Requests'
  const subtitle = isBuyer ? 'Track your requested demos and chat with vendors after acceptance.' : isVendor ? 'Demo requests and selected times for your products.' : 'Review demo requests sent from marketplace products.'

  return <section>
    <div><h1 className="text-xl font-bold">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>
    {error && <p className="mt-5 text-sm text-red-600">{error}</p>}
    <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
      <table className={`demo-data-table demo-${isVendor ? 'vendor' : isBuyer ? 'buyer' : 'admin'} w-full min-w-[900px] text-left text-xs`}>
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="p-3">Product</th>{!isVendor && <th className="p-3">Vendor</th>}{!isBuyer && <><th className="p-3">Requested By</th><th className="p-3">Email</th></>}<th className="p-3">Preferred Demo Time</th><th className="p-3">Status</th><th className="p-3">Meeting / Chat</th>{isVendor && <th className="p-3">Action</th>}</tr></thead>
        <tbody>
          {requests.map((item) => <tr key={item.id} className="border-t">
            <td className="p-3 font-semibold">{item.service?.name}</td>
            {!isVendor && <td className="p-3">{item.vendor?.company_name || item.vendor?.name}</td>}
            {!isBuyer && <><td className="p-3">{item.user?.name}</td><td className="p-3 text-slate-500">{item.user?.email}</td></>}
            <td className="p-3">{item.demo_at ? new Date(item.demo_at).toLocaleString() : '-'}</td>
            <td className="p-3"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : item.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{item.status}</span>{item.status === 'rejected' && item.rejection_reason && <p className="mt-2 max-w-[230px] text-[11px] leading-4 text-red-600" title={item.rejection_reason}><span className="font-semibold">Reason:</span> {item.rejection_reason}</p>}</td>
            <td className="p-3">{item.status === 'accepted' ? <div className="flex items-center gap-2"><button type="button" onClick={() => { setChatRequest(item); setRequests((current) => current.map((row) => row.id === item.id ? { ...row, unread_count: 0 } : row)) }} className="relative inline-flex items-center gap-1.5 rounded-md border border-blue-200 px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-blue-50"><MessageCircle className="h-3.5 w-3.5"/>Chat{Number(item.unread_count) > 0 && <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">{item.unread_count > 9 ? '9+' : item.unread_count}</span>}</button>{item.meeting_link && <a href={item.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5"/>Join Meeting</a>}</div> : <span className="text-slate-400">—</span>}</td>
            {isVendor && <td className="p-3">{item.status === 'pending' ? <div className="flex gap-2"><button disabled={Boolean(updating)} onClick={() => { setError(''); setAcceptRequest(item) }} className="rounded bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">Accept</button><button disabled={Boolean(updating)} onClick={() => updateStatus(item.id, 'rejected')} className="rounded border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 disabled:opacity-50">Reject</button></div> : <span className="text-slate-400">—</span>}</td>}
          </tr>)}
          {!requests.length && <tr><td colSpan={8} className="p-10 text-center text-sm text-slate-500">No demo requests yet.</td></tr>}
        </tbody>
      </table>
    </div>
    {chatRequest && <ChatModal request={chatRequest} currentUser={user} onClose={() => setChatRequest(null)} onModerationChanged={(id, changes) => {
      setRequests((current) => current.map((row) => row.id === id ? { ...row, ...changes } : row))
      setChatRequest((current) => current?.id === id ? { ...current, ...changes } : current)
    }}/>}
    {acceptRequest && <AcceptModal request={acceptRequest} saving={Boolean(updating)} error={error} onClose={() => { if (!updating) setAcceptRequest(null) }} onAccept={() => updateStatus(acceptRequest.id, 'accepted')}/>}
    {rejectRequest && <RejectModal request={rejectRequest} saving={Boolean(updating)} error={error} onClose={() => { if (!updating) setRejectRequest(null) }} onReject={(reason) => updateStatus(rejectRequest.id, 'rejected', reason)}/>}
  </section>
}
