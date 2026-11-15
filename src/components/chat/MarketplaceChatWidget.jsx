import { Bell, FileText, ImagePlus, MessageCircle, Phone, PhoneCall, Send, Video, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { authHeaders, clearAuth } from '../../auth/session'
import { createSupportConversation, getChatConversations, getChatMessages, sendChatMessage } from '../../api/marketplaceChat'

const SOUND_KEY = 'marketplace_chat_sound'
const SOUNDS = [{ value: 'chime', label: 'Chime' }, { value: 'bell', label: 'Bell' }, { value: 'pop', label: 'Pop' }]

const playSound = (type) => {
  if (type === 'off') return
  try {
    const Context = window.AudioContext || window.webkitAudioContext
    const context = new Context()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const tones = type === 'bell' ? [880, 1175] : type === 'pop' ? [520, 760] : [660, 880]
    oscillator.type = type === 'pop' ? 'square' : 'triangle'
    oscillator.frequency.setValueAtTime(tones[0], context.currentTime)
    oscillator.frequency.setValueAtTime(tones[1], context.currentTime + 0.09)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(1.5, context.currentTime + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(); oscillator.stop(context.currentTime + 0.31)
    oscillator.addEventListener('ended', () => context.close())
  } catch { /* Browser audio is best effort. */ }
}

function otherPerson(conversation, userId) {
  return Number(conversation.buyer_id) === Number(userId) ? conversation.vendor : conversation.buyer
}

export default function MarketplaceChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sound, setSound] = useState(() => localStorage.getItem(SOUND_KEY) || 'chime')
  const previousUnread = useRef(0)
  const lastMessageId = useRef(0)
  const soundReady = useRef(false)
  const loadedAttachments = useRef(new Set())

  const unread = useMemo(() => conversations.reduce((sum, row) => sum + Number(row.unread_count || 0), 0), [conversations])
  const notify = (count = 1) => { if (soundReady.current && sound !== 'off') Array.from({ length: Math.min(count, 3) }, (_, index) => setTimeout(() => playSound(sound), index * 180)) }

  const loadConversations = async (announce = false) => {
    if (!user) return
    try {
      const result = await getChatConversations()
      const rows = result.data || []
      const nextUnread = rows.reduce((sum, row) => sum + Number(row.unread_count || 0), 0)
      if (announce && nextUnread > previousUnread.current) notify(nextUnread - previousUnread.current)
      previousUnread.current = nextUnread
      setConversations(rows)
    } catch (requestError) { setError(requestError.message) }
  }

  const loadMessages = async (conversation = active, announce = false) => {
    if (!conversation) return
    try {
      const rows = (await getChatMessages(conversation.id)).data || []
      const newest = rows[rows.length - 1]
      if (announce && newest?.id > lastMessageId.current && newest.user_id && Number(newest.user_id) !== Number(user.id)) notify()
      if (newest) lastMessageId.current = newest.id
      setMessages(rows)
      await loadConversations(false)
    } catch (requestError) { setError(requestError.message) }
  }

  useEffect(() => {
    if (user) loadConversations()
    else { setConversations([]); setActive(null); setMessages([]) }
    // The polling callbacks intentionally capture the current authenticated user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!user) return undefined
    const timer = setInterval(() => { loadConversations(true); if (open && active) loadMessages(active, true) }, 2000)
    return () => clearInterval(timer)
    // The polling callbacks intentionally use the current chat state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, open, active?.id, sound])

  useEffect(() => {
    let cancelled = false
    messages.filter((item) => item.attachment_url && !loadedAttachments.current.has(item.id)).forEach(async (item) => {
      try {
        const response = await fetch(item.attachment_url, { headers: { ...authHeaders() } })
        if (!response.ok) return
        const url = URL.createObjectURL(await response.blob())
        loadedAttachments.current.add(item.id)
        if (!cancelled) setMessages((current) => current.map((row) => row.id === item.id ? { ...row, attachment_url: url } : row))
      } catch { /* Attachment preview is best effort. */ }
    })
    return () => { cancelled = true }
  }, [messages])

  const openConversation = async (conversation) => {
    soundReady.current = true; setActive(conversation); setMessages([]); setError(''); setLoading(true); lastMessageId.current = 0
    try { await loadMessages(conversation) } finally { setLoading(false) }
  }

  const startSupport = async () => {
    soundReady.current = true; setLoading(true); setError('')
    try { const result = await createSupportConversation(); const conversation = result.data; setActive(conversation); setMessages([]); await loadMessages(conversation) }
    catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }

  const submit = async (event) => {
    event.preventDefault()
    const value = text.trim()
    if ((!value && !file) || !active || sending) return
    setSending(true); setError('')
    try { await sendChatMessage(active.id, value, file); setText(''); setFile(null); await loadMessages(active) }
    catch (requestError) {
      if (requestError.status === 401) { clearAuth(); window.location.href = '/login'; return }
      setError(requestError.message)
    } finally { setSending(false) }
  }

  const chooseFile = (event) => {
    const next = event.target.files?.[0]
    if (!next) return
    if (/\.(exe|msi|apk|bat|cmd|sh|js|php|dll)$/i.test(next.name)) { setError('Executable files are not allowed.'); return }
    if (next.size > 10 * 1024 * 1024) { setError('Attachment must be smaller than 10 MB.'); return }
    setError(''); setFile(next); event.target.value = ''
  }

  if (!user) return <button type="button" onClick={() => { window.location.href = '/login' }} className="fixed bottom-5 right-5 z-[70] grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg" aria-label="Open marketplace chat"><MessageCircle className="h-5 w-5" /></button>

  return <>
    {open && <section className="fixed bottom-20 right-4 z-[70] flex h-[min(620px,calc(100vh-110px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
      <header className="flex items-center justify-between bg-gradient-to-r from-[#082d66] to-primary px-4 py-3 text-white">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Marketplace chat</p><h2 className="mt-0.5 text-sm font-bold">Discuss with buyers and providers</h2></div>
        <div className="flex items-center gap-1">{active && <><a href={`https://meet.jit.si/QuotationGlobalChat-${active.id}#config.startWithVideoMuted=true&config.startWithAudioMuted=false`} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15" title="Start audio call" aria-label="Start audio call"><PhoneCall className="h-4 w-4" /></a><a href={`https://meet.jit.si/QuotationGlobalChat-${active.id}`} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15" title="Start audio/video call" aria-label="Start audio/video call"><Video className="h-4 w-4" /></a>{otherPerson(active, user.id)?.phone && <a href={`tel:${otherPerson(active, user.id).phone}`} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15" title="Call by phone" aria-label="Call by phone"><Phone className="h-4 w-4" /></a>}</>}<button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15" aria-label="Close chat"><X className="h-4 w-4" /></button></div>
      </header>
      {!active ? <div className="min-h-0 flex-1 overflow-y-auto"><div className="border-b bg-blue-50/60 px-4 py-3 text-xs leading-5 text-blue-800">Need help? Start a direct chat with marketplace support, or open a service page to message its vendor.</div><div className="border-b px-4 py-3"><button type="button" onClick={startSupport} disabled={loading} className="h-10 w-full rounded-lg bg-primary text-xs font-bold text-white">{loading ? 'Starting chat...' : 'Start help chat'}</button></div>{loading && <p className="p-5 text-center text-xs text-slate-400">Loading conversations...</p>}{!loading && !conversations.length && <p className="p-8 text-center text-xs text-slate-500">No conversations yet.</p>}{conversations.map((conversation) => { const person = otherPerson(conversation, user.id); return <button type="button" key={conversation.id} onClick={() => openConversation(conversation)} className="block w-full border-b px-4 py-3 text-left hover:bg-blue-50"><div className="flex items-center justify-between"><b className="truncate text-xs">{person?.company_name || person?.name || 'Marketplace member'}</b>{Number(conversation.unread_count) > 0 && <span className="rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold text-white">{conversation.unread_count > 9 ? '9+' : conversation.unread_count} unread</span>}</div><p className="mt-1 text-[11px] text-slate-500">{conversation.service?.name || 'General discussion'}</p></button>})}</div> : <><div className="flex items-center gap-2 border-b px-4 py-2.5"><button type="button" onClick={() => setActive(null)} className="text-xs font-bold text-primary">All chats</button><span className="text-slate-300">/</span><span className="truncate text-xs font-bold text-slate-700">{otherPerson(active, user.id)?.company_name || otherPerson(active, user.id)?.name || 'Marketplace member'}</span></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">{loading && <p className="py-5 text-center text-xs text-slate-400">Loading messages...</p>}{messages.map((item, index) => { const mine = item.user_id && Number(item.user_id) === Number(user.id); const previous = messages[index - 1]; const unreadDivider = !mine && !item.read_at && (index === 0 || previous?.read_at); return <div key={item.id}>{unreadDivider && <div className="my-2 text-center text-[10px] font-bold uppercase tracking-wider text-red-500">Unread messages</div>}<div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-5 ${mine ? 'bg-primary text-white' : item.is_auto ? 'border border-emerald-100 bg-emerald-50 text-emerald-800' : 'border bg-white text-slate-700'}`}>{item.attachment_url && (item.attachment_mime || '').startsWith('image/') && <img src={item.attachment_url} alt={item.attachment_name || 'Chat image'} className="mb-2 max-h-48 max-w-full rounded-lg object-contain" />}{item.attachment_url && !(item.attachment_mime || '').startsWith('image/') && <a href={item.attachment_url} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-1 font-semibold underline"><FileText className="h-3.5 w-3.5" />{item.attachment_name || 'View attachment'}</a>}{item.message && <p className="whitespace-pre-wrap break-words">{item.message}</p>}<p className={`mt-1 text-[10px] ${mine ? 'text-blue-100' : 'text-slate-400'}`}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{mine && <span className="ml-2">{item.read_at ? 'Read' : 'Sent'}</span>}</p></div></div></div>})}</div><div className="border-t bg-white p-3"><div className="mb-2 flex items-center gap-2"><Bell className="h-3.5 w-3.5 text-primary" /><select value={sound} onChange={(event) => { setSound(event.target.value); localStorage.setItem(SOUND_KEY, event.target.value); soundReady.current = true; playSound(event.target.value) }} className="ml-auto rounded border px-1.5 py-1 text-[10px]"><option value="off">Off</option>{SOUNDS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button type="button" onClick={() => playSound(sound)} className="rounded p-1 text-primary" title="Test sound"><Volume2 className="h-3.5 w-3.5" /></button></div>{file && <div className="mb-2 flex items-center gap-2 rounded-lg bg-blue-50 px-2 py-1.5 text-[11px] text-primary"><ImagePlus className="h-4 w-4" /><span className="flex-1 truncate">{file.name}</span><button type="button" onClick={() => setFile(null)} className="font-bold">×</button></div>}<form onSubmit={submit} className="flex gap-2"><label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg border text-primary hover:bg-blue-50" title="Attach image or file"><ImagePlus className="h-4 w-4" /><input type="file" accept="image/*,.pdf,.doc,.docx" onChange={chooseFile} className="sr-only" /></label><input value={text} onChange={(event) => setText(event.target.value)} maxLength="2000" placeholder="Write a message..." className="h-10 min-w-0 flex-1 rounded-lg border px-3 text-xs outline-none focus:border-primary" /><button type="submit" disabled={sending || (!text.trim() && !file)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-white disabled:opacity-50" aria-label="Send message"><Send className="h-4 w-4" /></button></form></div></>}
      {error && <p className="border-t bg-red-50 px-4 py-2 text-[11px] text-red-700">{error}</p>}
    </section>}
    <button type="button" onClick={() => { setOpen((value) => !value); soundReady.current = true; if (!open) loadConversations() }} className="fixed bottom-5 right-5 z-[70] grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg" aria-label="Open marketplace chat">{unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}<MessageCircle className="h-5 w-5" /></button>
  </>
}

