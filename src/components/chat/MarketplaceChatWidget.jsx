import { Bell, MessageCircle, Send, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { clearAuth } from '../../auth/session'
import { createChatConversation, createSupportConversation, getChatConversations, getChatMessages, sendChatMessage } from '../../api/marketplaceChat'

const SOUND_KEY = 'marketplace_chat_sound'
const SOUND_OPTIONS = [{ value: 'chime', label: 'Chime' }, { value: 'bell', label: 'Bell' }, { value: 'pop', label: 'Pop' }]

function otherPerson(conversation, userId) {
  return Number(conversation.buyer_id) === Number(userId) ? conversation.vendor : conversation.buyer
}

function playNotificationSound(type = 'chime') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext || type === 'off') return
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const frequencies = type === 'bell' ? [880, 1175] : type === 'pop' ? [520, 760] : [660, 880]
    oscillator.type = type === 'pop' ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(frequencies[0], context.currentTime)
    oscillator.frequency.setValueAtTime(frequencies[1], context.currentTime + 0.09)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.8, context.currentTime + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.25)
    oscillator.addEventListener('ended', () => context.close())
  } catch { /* Browser audio is optional. */ }
}

export default function MarketplaceChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sound, setSound] = useState(() => localStorage.getItem(SOUND_KEY) || 'chime')
  const previousUnread = useRef(0)
  const lastMessageId = useRef(0)
  const soundReady = useRef(false)

  const unread = useMemo(() => conversations.reduce((total, item) => total + Number(item.unread_count || 0), 0), [conversations])
  const notify = (count = 1) => { if (soundReady.current && sound !== 'off') Array.from({ length: Math.min(count, 3) }).forEach((_, index) => window.setTimeout(() => playNotificationSound(sound), index * 180)) }

  const loadConversations = async (announce = false) => {
    if (!user) return
    try {
      const result = await getChatConversations()
      const rows = result.data || []
      const nextUnread = rows.reduce((total, item) => total + Number(item.unread_count || 0), 0)
      if (announce && nextUnread > previousUnread.current) notify(nextUnread - previousUnread.current)
      previousUnread.current = nextUnread
      setConversations(rows)
    } catch (requestError) { setError(requestError.message) }
  }

  const loadMessages = async (conversation = active, announce = false) => {
    if (!conversation) return
    try {
      const result = await getChatMessages(conversation.id)
      const rows = result.data || []
      const newest = rows[rows.length - 1]
      if (announce && newest && newest.id > lastMessageId.current && newest.user_id && Number(newest.user_id) !== Number(user.id)) notify()
      if (newest) lastMessageId.current = newest.id
      setMessages(rows)
      await loadConversations(false)
    } catch (requestError) { setError(requestError.message) }
  }

  useEffect(() => {
    if (user) { loadConversations(false); soundReady.current = false }
    else { setConversations([]); setActive(null); setMessages([]); previousUnread.current = 0 }
  }, [user?.id])

  useEffect(() => {
    if (!user) return undefined
    const timer = window.setInterval(() => { loadConversations(true); if (open && active) loadMessages(active, true) }, 10000)
    return () => window.clearInterval(timer)
  }, [user?.id, open, active?.id, sound])

  useEffect(() => {
    const openRequestedChat = async (event) => {
      if (!user) { window.location.href = '/login'; return }
      const { recipientId, serviceId } = event.detail || {}
      if (!recipientId) return
      setOpen(true); setLoading(true); setError(''); soundReady.current = true
      try {
        const result = await createChatConversation({ recipient_id: recipientId, service_id: serviceId })
        const conversation = result.data
        setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)])
        setActive(conversation); setMessages([]); lastMessageId.current = 0; await loadMessages(conversation)
      } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
    }
    window.addEventListener('marketplace:open-chat', openRequestedChat)
    return () => window.removeEventListener('marketplace:open-chat', openRequestedChat)
  }, [user?.id])

  const selectConversation = async (conversation) => {
    soundReady.current = true; setActive(conversation); setMessages([]); setError(''); setLoading(true); lastMessageId.current = 0
    try { await loadMessages(conversation) } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }

  const startSupportChat = async () => {
    soundReady.current = true; setLoading(true); setError('')
    try {
      const result = await createSupportConversation()
      const conversation = result.data
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)])
      setActive(conversation); setMessages([]); lastMessageId.current = 0; await loadMessages(conversation)
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }

  const submit = async (event) => {
    event.preventDefault()
    const value = text.trim()
    if (!value || !active || sending) return
    soundReady.current = true; setSending(true); setError(''); setText('')
    try { await sendChatMessage(active.id, value); await loadMessages(active) }
    catch (requestError) {
      setText(value)
      if (requestError.status === 401) { clearAuth(); window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`; return }
      setError(requestError.message)
    } finally { setSending(false) }
  }

  const chooseSound = (value) => { setSound(value); localStorage.setItem(SOUND_KEY, value); soundReady.current = true; playNotificationSound(value) }
  const quickReply = (value) => { setText(value); window.setTimeout(() => document.getElementById('marketplace-chat-input')?.focus(), 0) }

  if (!user) return <button type="button" onClick={() => { window.location.href = '/login' }} className="fixed bottom-5 right-5 z-[70] grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg transition hover:scale-105 hover:bg-blue-700" aria-label="Open marketplace chat" title="Chat with a marketplace member"><MessageCircle className="h-5 w-5" /></button>

  return <>
    {open && <section className="fixed bottom-20 right-4 z-[70] flex h-[min(620px,calc(100vh-110px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl" aria-label="Marketplace chat">
      <header className="flex items-center justify-between bg-gradient-to-r from-[#082d66] to-primary px-4 py-3 text-white"><div><p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Marketplace chat</p><h2 className="mt-0.5 text-sm font-bold">Discuss with buyers and providers</h2></div><button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-blue-100 hover:bg-white/15" aria-label="Close chat"><X className="h-4 w-4" /></button></header>
      {!active ? <><div className="border-b bg-blue-50/60 px-4 py-3 text-xs leading-5 text-blue-800">Need help? Start a direct chat with marketplace support, or open a service page to message its vendor.</div><div className="border-b px-4 py-3"><button type="button" onClick={startSupportChat} disabled={loading} className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-3 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">{loading ? 'Starting chat...' : 'Start help chat'}</button></div><div className="min-h-0 flex-1 overflow-y-auto">{loading && <p className="p-5 text-center text-xs text-slate-400">Loading conversations...</p>}{!loading && conversations.length === 0 && <div className="p-8 text-center text-xs text-slate-500">No conversations yet.</div>}{conversations.map((conversation) => { const person = otherPerson(conversation, user.id); return <button type="button" key={conversation.id} onClick={() => selectConversation(conversation)} className="block w-full border-b px-4 py-3 text-left transition hover:bg-blue-50"><div className="flex items-center justify-between gap-3"><span className="truncate text-xs font-bold text-slate-800">{person?.company_name || person?.name || 'Marketplace member'}</span>{Number(conversation.unread_count) > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{conversation.unread_count > 9 ? '9+' : conversation.unread_count}</span>}</div><p className="mt-1 truncate text-[11px] text-slate-500">{conversation.service?.name || 'General discussion'}</p></button> })}</div></> : <><div className="flex items-center gap-2 border-b px-4 py-2.5"><button type="button" onClick={() => setActive(null)} className="text-xs font-bold text-primary hover:underline">All chats</button><span className="text-slate-300">/</span><span className="truncate text-xs font-bold text-slate-700">{otherPerson(active, user.id)?.company_name || otherPerson(active, user.id)?.name || 'Marketplace member'}</span></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">{loading && <p className="py-5 text-center text-xs text-slate-400">Loading messages...</p>}{!loading && messages.length === 0 && <div className="py-8 text-center text-xs text-slate-400">Start the discussion below.</div>}{messages.map((item) => { const mine = item.user_id && Number(item.user_id) === Number(user.id); return <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-5 ${mine ? 'bg-primary text-white' : item.is_auto ? 'border border-emerald-100 bg-emerald-50 text-emerald-800' : 'border bg-white text-slate-700'}`}><p className="whitespace-pre-wrap break-words">{item.message}</p><p className={`mt-1 text-[10px] ${mine ? 'text-blue-100' : 'text-slate-400'}`}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{mine && <span className="ml-2">{item.read_at ? 'Read' : 'Sent'}</span>}</p></div></div> })}</div><div className="border-t bg-white p-3"><div className="mb-2 flex items-center gap-2"><Bell className="h-3.5 w-3.5 text-primary" /><label className="text-[10px] font-semibold text-slate-500" htmlFor="chat-sound">Message sound</label><select id="chat-sound" value={sound} onChange={(event) => chooseSound(event.target.value)} className="ml-auto rounded border px-1.5 py-1 text-[10px] text-slate-600"><option value="off">Off</option>{SOUND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button type="button" onClick={() => { soundReady.current = true; playNotificationSound(sound) }} className="rounded p-1 text-primary hover:bg-blue-50" title="Test selected sound" aria-label="Test selected sound"><Volume2 className="h-3.5 w-3.5" /></button></div><div className="mb-2 flex gap-1.5 overflow-x-auto"><button type="button" onClick={() => quickReply('What is the price and delivery time?')} className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold text-slate-500 hover:border-primary hover:text-primary">Ask price</button><button type="button" onClick={() => quickReply('Can you share more details?')} className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold text-slate-500 hover:border-primary hover:text-primary">More details</button></div><form onSubmit={submit} className="flex gap-2"><input id="marketplace-chat-input" value={text} onChange={(event) => setText(event.target.value)} maxLength="2000" placeholder="Write a message..." className="h-10 min-w-0 flex-1 rounded-lg border px-3 text-xs outline-none focus:border-primary" /><button type="submit" disabled={sending || !text.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-white disabled:opacity-50" aria-label="Send message"><Send className="h-4 w-4" /></button></form></div></>}
      {error && <p className="border-t bg-red-50 px-4 py-2 text-[11px] text-red-700">{error}</p>}
    </section>}
    <button type="button" onClick={() => { setOpen((value) => !value); soundReady.current = true; if (!open) loadConversations() }} className="fixed bottom-5 right-5 z-[70] grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg transition hover:scale-105 hover:bg-blue-700" aria-label="Open marketplace chat" title="Marketplace chat"><MessageCircle className="h-5 w-5" />{unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread > 9 ? '9+' : unread}</span>}</button>
  </>
}

