import { Bell, Download, FileText, ImagePlus, MessageCircle, Mic, Phone, PhoneCall, Send, Smile, Video, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { authHeaders, clearAuth } from '../../auth/session'
import { createSupportConversation, getChatConversations, getChatMessages, sendChatMessage } from '../../api/marketplaceChat'

const SOUND_KEY = 'marketplace_chat_sound'
const SOUNDS = [{ value: 'chime', label: 'Chime' }, { value: 'bell', label: 'Bell' }, { value: 'pop', label: 'Pop' }]
const EMOJI_GROUPS = {
  Smileys: '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🤑 🤠'.split(' '),
  People: '👋 🤚 🖐️ ✋ 👌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤝 🙏 💪 👀 👄 💋 🧠 👶 🧒 👦 👧 🧑 👨 👩 🧔 👴 👵'.split(' '),
  Nature: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐙 🦄 🐝 🦋 🐢 🐍 🦎 🐳 🐬 🐟 🐠 🦈 🐘 🦒 🦓 🌸 🌹 🌻 🌞 🌈 ⭐ ⚡ 🔥 ❄️ 🌙 ☀️'.split(' '),
  Food: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🍍 🥝 🍅 🥑 🍔 🍟 🍕 🌭 🌮 🌯 🥗 🍿 🍩 🍪 🎂 🍰 🍫 🍬 🍭 ☕ 🍵 🥤 🍺 🍻 🍷'.split(' '),
  Symbols: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ✅ ❌ ❗ ❓ ⁉️ 💯 🔥 ✨ ⭐ 🌟 💫 🎉 🎊 ✔️ ➕ ➖'.split(' '),
  Animals: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🦏 🦛 🐪 🐫 🦒 🦘 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🐈 🐓 🦃 🕊️ 🐇 🐁 🐀 🐿️ 🦔'.split(' '),
  Travel: '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🚲 🛴 🚨 🚔 🚍 🚘 🚖 ✈️ 🛫 🛬 🛩️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛳️ 🚢 ⚓ 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛱️ 🏖️ 🏝️ 🏜️ 🏕️ ⛰️ 🏔️ 🗻 🌋 🏠 🏡 🏢 🏥 🏦 🏨 🏪 🏫 ⛪ 🕌 🛕 🕍'.split(' '),
  Activities: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🧩 🎮 🕹️ 🎲 ♟️ 🎯 🎳 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻'.split(' '),
  Objects: '⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💾 💿 📷 📸 📹 🎥 📞 ☎️ 📺 📻 🎙️ ⏰ ⏱️ ⌛ 🔋 🔌 💡 🔦 🕯️ 🧯 🛒 💰 💳 💎 ⚖️ 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🧲 🔫 💣 🧨 🔪 🗡️ 🛡️ 🚬 ⚰️ ⚱️ 🔮 📿 💈 ⚗️ 🔭 🔬 🧪 💊 💉 🩹 🧸 🪆 🎁 🎈 🎀 🪄 🧵 🧶 📚 📖 ✏️ 📝 📌 📍 📎 📐 ✂️ 🔒 🔑 🔑'.split(' '),
  Flags: '🏁 🚩 🎌 🏴 🏳️ 🏳️‍🌈 🏴‍☠️ 🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇵🇰 🇮🇳 🇦🇪 🇸🇦 🇹🇷 🇩🇪 🇫🇷 🇮🇹 🇪🇸 🇯🇵 🇨🇳 🇰🇷 🇧🇷 🇿🇦 🇳🇬 🇪🇬 🇲🇾 🇸🇬 🇮🇩 🇧🇩 🇳🇵 🇱🇰 🇶🇦 🏳️‍⚧️'.split(' '),
}

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
  const [previewImage, setPreviewImage] = useState(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiGroup, setEmojiGroup] = useState('Smileys')
  const [emojiSearch, setEmojiSearch] = useState('')
  const [recentEmojis, setRecentEmojis] = useState(() => JSON.parse(localStorage.getItem('marketplace_recent_emojis') || '[]'))
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('')
  const [sound, setSound] = useState(() => localStorage.getItem(SOUND_KEY) || 'chime')
  const previousUnread = useRef(0)
  const lastMessageId = useRef(0)
  const soundReady = useRef(false)
  const pollInFlight = useRef(false)
  const loadedAttachments = useRef(new Set())
  const recorder = useRef(null)
  const recordingChunks = useRef([])
  const recordingTimer = useRef(null)

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
    const poll = async () => {
      if (document.hidden || pollInFlight.current) return
      pollInFlight.current = true
      try {
        await loadConversations(true)
        if (open && active) await loadMessages(active, true)
      } finally { pollInFlight.current = false }
    }
    const handleVisibility = () => { if (!document.hidden) poll() }
    const timer = setInterval(poll, 2000)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', handleVisibility) }
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

  useEffect(() => {
    const scrollers = document.querySelectorAll('.bg-slate-50.p-3')
    scrollers.forEach((element) => { element.scrollTop = element.scrollHeight })
  }, [messages, active?.id])

  useEffect(() => {
    const handleImageClick = (event) => {
      const image = event.target.closest?.('img')
      if (!image || (!image.src.startsWith('blob:') && !image.src.includes('/api/marketplace-chat/'))) return
      setPreviewImage({ url: image.currentSrc || image.src, name: image.alt || 'chat-image' })
    }
    document.addEventListener('click', handleImageClick)
    return () => document.removeEventListener('click', handleImageClick)
  }, [])

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
    try { await sendChatMessage(active.id, value, file); setText(''); setFile(null); setAudioPreviewUrl(''); await loadMessages(active) }
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
    setError(''); setFile(next); setAudioPreviewUrl(''); event.target.value = ''
  }

  const insertEmoji = (emoji) => {
    setText((current) => `${current}${emoji}`)
    setRecentEmojis((current) => { const next = [emoji, ...current.filter((item) => item !== emoji)].slice(0, 24); localStorage.setItem('marketplace_recent_emojis', JSON.stringify(next)); return next })
    setEmojiOpen(false)
    setEmojiSearch('')
  }

  const toggleRecording = async () => {
    if (recording) { recorder.current?.stop(); return }
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Microphone requires a secure HTTPS connection.')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/ogg;codecs=opus'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      recordingChunks.current = []
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) recordingChunks.current.push(event.data) }
      mediaRecorder.onstop = () => {
        const extension = mimeType.startsWith('audio/ogg') ? 'ogg' : 'webm'
        const voiceFile = new File([new Blob(recordingChunks.current, { type: mimeType })], `voice-message-${Date.now()}.${extension}`, { type: mimeType })
        setFile(voiceFile)
        setAudioPreviewUrl(URL.createObjectURL(voiceFile))
        stream.getTracks().forEach((track) => track.stop())
        clearInterval(recordingTimer.current)
        setRecording(false)
        setRecordingSeconds(0)
        setError('')
      }
      recorder.current = mediaRecorder
      mediaRecorder.start()
      setRecordingSeconds(0)
      recordingTimer.current = setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000)
      setRecording(true)
      setError('')
    } catch (requestError) {
      if (requestError.name === 'NotAllowedError' || requestError.name === 'PermissionDeniedError') {
        setError('Microphone is blocked. Click Try again and choose Allow in the browser permission prompt.')
      } else {
        setError(requestError.message || 'Microphone permission is required to record a voice message.')
      }
    }
  }

  const openMicrophoneSettings = () => {
    const scheme = /Edg/i.test(navigator.userAgent) ? 'edge' : 'chrome'
    const settingsUrl = `${scheme}://settings/content/siteDetails?site=${encodeURIComponent(window.location.origin)}`
    window.open(settingsUrl, '_blank', 'noopener,noreferrer')
  }

  const visibleEmojis = (emojiSearch.trim() ? Object.values(EMOJI_GROUPS).flat() : emojiGroup === 'Recent' ? recentEmojis : EMOJI_GROUPS[emojiGroup]).filter(Boolean)
  const microphoneBlocked = !recording && error.toLowerCase().includes('microphone')

  if (!user) return <button type="button" onClick={() => { window.location.href = '/login' }} className="fixed bottom-5 right-5 z-[70] grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg" aria-label="Open marketplace chat"><MessageCircle className="h-5 w-5" /></button>

  return <>{emojiOpen && <div className="fixed bottom-24 right-4 z-[80] w-[min(560px,calc(100vw-24px))] overflow-hidden rounded-2xl border bg-white shadow-2xl"><div className="flex items-center gap-2 border-b px-4 py-3"><span className="text-xl">😀</span><input autoFocus value={emojiSearch} onChange={(event) => setEmojiSearch(event.target.value)} placeholder="Search emoji" className="min-w-0 flex-1 rounded-full bg-slate-100 px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30" /><button type="button" onClick={() => { setEmojiOpen(false); setEmojiSearch('') }} className="text-lg text-slate-400" aria-label="Close emoji picker">×</button></div><div className="flex items-center gap-1 overflow-x-auto border-b px-2 py-1.5">{['Recent', ...Object.keys(EMOJI_GROUPS)].map((group) => <button key={group} type="button" onClick={() => { setEmojiGroup(group); setEmojiSearch('') }} className={emojiGroup === group ? 'flex h-9 min-w-10 shrink-0 items-center justify-center rounded-lg border-b-2 border-emerald-500 text-base text-slate-900' : 'flex h-9 min-w-10 shrink-0 items-center justify-center rounded-lg text-base text-slate-500 hover:bg-slate-100'} title={group}>{group === 'Recent' ? '◷' : group === 'Smileys' ? '☺️' : group === 'People' ? '🖐️' : group === 'Nature' ? '🐻' : group === 'Food' ? '🍔' : group === 'Animals' ? '🐶' : group === 'Travel' ? '🚗' : group === 'Activities' ? '⚽' : group === 'Objects' ? '💡' : group === 'Symbols' ? '💖' : '🏁'}</button>)}</div><div className="min-h-[250px] max-h-[320px] overflow-y-auto p-3">{!visibleEmojis.length ? <p className="py-12 text-center text-xs text-slate-400">No emoji found</p> : <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">{visibleEmojis.map((emoji, index) => <button key={emoji + index} type="button" onClick={() => insertEmoji(emoji)} className="rounded-lg p-1.5 text-2xl leading-none hover:bg-slate-100" title="Add emoji">{emoji}</button>)}</div>}</div><div className="flex items-center justify-center gap-0 border-t bg-slate-50 py-2"><button type="button" className="border-b-2 border-slate-800 px-8 py-1 text-base" title="Emoji">☺️</button><button type="button" onClick={() => setError('GIF picker coming soon.')} className="px-8 py-1 text-xs font-bold text-slate-500 hover:text-slate-800" title="GIF">GIF</button><button type="button" onClick={() => setError('Sticker picker coming soon.')} className="px-8 py-1 text-base text-slate-500 hover:text-slate-800" title="Stickers">◫</button></div></div>}<button type="button" onClick={() => setEmojiOpen((value) => !value)} className={`fixed bottom-5 right-20 z-[80] grid h-12 w-12 place-items-center rounded-full border bg-white shadow-lg hover:bg-blue-50 ${emojiOpen ? 'text-primary' : 'text-slate-600'}`} title="Choose emoji" aria-label="Choose emoji"><Smile className="h-5 w-5" /></button>
    {previewImage && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Image preview" onClick={() => setPreviewImage(null)}><div className="relative flex max-h-full max-w-5xl flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setPreviewImage(null)} className="absolute -right-2 -top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-slate-700 shadow" aria-label="Close image preview"><X className="h-5 w-5" /></button><img src={previewImage.url} alt={previewImage.name} className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl" /><a href={previewImage.url} download={previewImage.name} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-bold text-primary shadow hover:bg-blue-50"><Download className="h-4 w-4" />Download image</a></div></div>}
    {open && <section className="fixed bottom-20 right-4 z-[70] flex h-[min(620px,calc(100vh-110px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
      <header className="flex items-center justify-between bg-gradient-to-r from-[#082d66] to-primary px-4 py-3 text-white">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Marketplace chat</p><h2 className="mt-0.5 text-sm font-bold">Discuss with buyers and providers</h2></div>
        <div className="flex items-center gap-1">{active && <><a href={`https://meet.jit.si/QuotationGlobalChat-${active.id}#config.startWithVideoMuted=true&config.startWithAudioMuted=false`} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15" title="Start audio call" aria-label="Start audio call"><PhoneCall className="h-4 w-4" /></a><a href={`https://meet.jit.si/QuotationGlobalChat-${active.id}`} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15" title="Start audio/video call" aria-label="Start audio/video call"><Video className="h-4 w-4" /></a>{otherPerson(active, user.id)?.phone && <a href={`tel:${otherPerson(active, user.id).phone}`} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15" title="Call by phone" aria-label="Call by phone"><Phone className="h-4 w-4" /></a>}</>}<button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15" aria-label="Close chat"><X className="h-4 w-4" /></button></div>
      </header>
      {!active ? <div className="min-h-0 flex-1 overflow-y-auto"><div className="border-b bg-blue-50/60 px-4 py-3 text-xs leading-5 text-blue-800">Need help? Start a direct chat with marketplace support, or open a service page to message its vendor.</div><div className="border-b px-4 py-3"><button type="button" onClick={startSupport} disabled={loading} className="h-10 w-full rounded-lg bg-primary text-xs font-bold text-white">{loading ? 'Starting chat...' : 'Start help chat'}</button></div>{loading && <p className="p-5 text-center text-xs text-slate-400">Loading conversations...</p>}{!loading && !conversations.length && <p className="p-8 text-center text-xs text-slate-500">No conversations yet.</p>}{conversations.map((conversation) => { const person = otherPerson(conversation, user.id); return <button type="button" key={conversation.id} onClick={() => openConversation(conversation)} className="block w-full border-b px-4 py-3 text-left hover:bg-blue-50"><div className="flex items-center justify-between"><b className="truncate text-xs">{person?.company_name || person?.name || 'Marketplace member'}</b>{Number(conversation.unread_count) > 0 && <span className="rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold text-white">{conversation.unread_count > 9 ? '9+' : conversation.unread_count} unread</span>}</div><p className="mt-1 text-[11px] text-slate-500">{conversation.service?.name || 'General discussion'}</p></button>})}</div> : <><div className="flex items-center gap-2 border-b px-4 py-2.5"><button type="button" onClick={() => setActive(null)} className="text-xs font-bold text-primary">All chats</button><span className="text-slate-300">/</span><span className="truncate text-xs font-bold text-slate-700">{otherPerson(active, user.id)?.company_name || otherPerson(active, user.id)?.name || 'Marketplace member'}</span></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">{loading && <p className="py-5 text-center text-xs text-slate-400">Loading messages...</p>}{messages.map((item, index) => { const mine = item.user_id && Number(item.user_id) === Number(user.id); const previous = messages[index - 1]; const unreadDivider = !mine && !item.read_at && (index === 0 || previous?.read_at); return <div key={item.id}>{unreadDivider && <div className="my-2 text-center text-[10px] font-bold uppercase tracking-wider text-red-500">Unread messages</div>}<div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-5 ${mine ? 'bg-primary text-white' : item.is_auto ? 'border border-emerald-100 bg-emerald-50 text-emerald-800' : 'border bg-white text-slate-700'}`}>{item.attachment_url && (item.attachment_mime || '').startsWith('image/') && <img src={item.attachment_url} alt={item.attachment_name || 'Chat image'} className="mb-2 max-h-48 max-w-full rounded-lg object-contain" />}{item.attachment_url && (item.attachment_mime || '').startsWith('audio/') && <audio controls preload="metadata" src={item.attachment_url} className="mb-2 max-w-full" aria-label={item.attachment_name || 'Voice message'} />}{item.attachment_url && !(item.attachment_mime || '').startsWith('image/') && !(item.attachment_mime || '').startsWith('audio/') && <a href={item.attachment_url} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-1 font-semibold underline"><FileText className="h-3.5 w-3.5" />{item.attachment_name || 'View attachment'}</a>}{item.message && <p className="whitespace-pre-wrap break-words">{item.message}</p>}<p className={`mt-1 text-[10px] ${mine ? 'text-blue-100' : 'text-slate-400'}`}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{mine && <span className="ml-2">{item.read_at ? 'Read' : 'Sent'}</span>}</p></div></div></div>})}</div><div className="border-t bg-white p-3"><div className="mb-2 flex items-center gap-2"><Bell className="h-3.5 w-3.5 text-primary" /><select value={sound} onChange={(event) => { setSound(event.target.value); localStorage.setItem(SOUND_KEY, event.target.value); soundReady.current = true; playSound(event.target.value) }} className="ml-auto rounded border px-1.5 py-1 text-[10px]"><option value="off">Off</option>{SOUNDS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button type="button" onClick={() => playSound(sound)} className="rounded p-1 text-primary" title="Test sound"><Volume2 className="h-3.5 w-3.5" /></button></div>{file && <div className="mb-2 flex items-center gap-2 rounded-lg bg-blue-50 px-2 py-1.5 text-[11px] text-primary">{audioPreviewUrl ? <audio controls preload="metadata" src={audioPreviewUrl} className="h-8 max-w-[190px]" aria-label="Listen to voice message preview" /> : <ImagePlus className="h-4 w-4" />}<span className="flex-1 truncate">{file.name}</span><button type="button" onClick={() => { setFile(null); setAudioPreviewUrl('') }} className="font-bold">×</button></div>}{recording && <span className="mb-2 block text-center text-xs font-semibold text-red-600">Recording {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')} — click microphone to stop</span>}<form onSubmit={submit} className="flex gap-2"><button type="button" onClick={() => setEmojiOpen((value) => !value)} className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border hover:bg-blue-50 ${emojiOpen ? 'border-primary bg-blue-50 text-primary' : 'text-slate-500'}`} title="Choose emoji" aria-label="Choose emoji"><Smile className="h-4 w-4" /></button><button type="button" onClick={toggleRecording} className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border hover:bg-red-50 ${recording ? 'border-red-400 bg-red-50 text-red-600' : 'text-slate-500'}`} title={recording ? 'Stop recording' : 'Record voice message'} aria-label={recording ? 'Stop recording' : 'Record voice message'}><Mic className="h-4 w-4" /></button><label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg border text-primary hover:bg-blue-50" title="Attach image or file"><ImagePlus className="h-4 w-4" /><input type="file" accept="image/*,.pdf,.doc,.docx" onChange={chooseFile} className="sr-only" /></label><input value={text} onChange={(event) => setText(event.target.value)} maxLength="2000" placeholder="Write a message..." className="h-10 min-w-0 flex-1 rounded-lg border px-3 text-xs outline-none focus:border-primary" /><button type="submit" disabled={sending || (!text.trim() && !file)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-white disabled:opacity-50" aria-label="Send message"><Send className="h-4 w-4" /></button></form></div></>}
      {error && <div className="flex items-center gap-2 border-t bg-red-50 px-4 py-2 text-[11px] text-red-700"><p className="min-w-0 flex-1">{error}</p>{microphoneBlocked && <button type="button" onClick={toggleRecording} className="shrink-0 rounded border border-red-200 bg-white px-2 py-1 font-semibold text-red-700 hover:bg-red-100">Try again</button>}</div>}{microphoneBlocked && <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="microphone-help-title"><div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-3 flex items-start justify-between"><div><h3 id="microphone-help-title" className="text-sm font-bold text-slate-900">Enable microphone</h3><p className="mt-1 text-xs text-slate-500">Your browser blocked microphone access for this website.</p></div><button type="button" onClick={() => setError('')} className="text-lg text-slate-400" aria-label="Close microphone help">×</button></div><ol className="space-y-2 text-xs leading-5 text-slate-600"><li><b>1.</b> Click the settings/lock icon beside the website address.</li><li><b>2.</b> Set <b>Microphone</b> to <b>Allow</b>.</li><li><b>3.</b> Reload the page, then press the microphone icon again.</li></ol><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={openMicrophoneSettings} className="flex-1 rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary hover:bg-blue-50">Open browser settings</button><button type="button" onClick={toggleRecording} className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:opacity-90">Try again</button><button type="button" onClick={() => setError('')} className="rounded-lg border px-3 py-2 text-xs font-semibold text-slate-600">Close</button></div></div></div>}
    </section>}
    <button type="button" onClick={() => { setOpen((value) => !value); soundReady.current = true; if (!open) loadConversations() }} className="fixed bottom-5 right-5 z-[70] grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg" aria-label="Open marketplace chat">{unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}<MessageCircle className="h-5 w-5" /></button>
  </>
}

