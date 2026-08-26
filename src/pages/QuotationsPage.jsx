import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Eye, FileText, Pencil, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getQuotations, sendVendorQuote } from '../api/rfqs'
import { useAuth } from '../auth/useAuth'
import CreateQuoteModal from '../components/rfqs/CreateQuoteModal'
import QuoteDocumentModal from '../components/rfqs/QuoteDocumentModal'
import { TableSkeleton } from '../components/ui'

const statusLabel = { quoted: 'Awaiting Buyer', quote_accepted: 'Accepted', quote_declined: 'Declined', expired: 'Expired' }
const statusStyle = { quoted: 'bg-blue-50 text-blue-700', quote_accepted: 'bg-emerald-50 text-emerald-700', quote_declined: 'bg-red-50 text-red-700', expired: 'bg-slate-100 text-slate-600' }
const effectiveStatus = (row) => row.status === 'quoted' && row.quote_valid_until && new Date(`${row.quote_valid_until}T23:59:59`) < new Date() ? 'expired' : row.status
const formatDate = (value) => value ? new Date(value).toLocaleString() : '—'

const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const parseDate = (value) => value ? new Date(`${value}T00:00:00`) : null
const shortDate = (value) => parseDate(value)?.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) || ''

function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => { const date = parseDate(from) || new Date(); return new Date(date.getFullYear(), date.getMonth(), 1) })
  const shell = useRef(null)
  useEffect(() => {
    const close = (event) => { if (!shell.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const start = parseDate(from)
  const end = parseDate(to)
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const days = Array.from({ length: firstDay.getDay() + lastDay.getDate() }, (_, index) => index < firstDay.getDay() ? null : new Date(month.getFullYear(), month.getMonth(), index - firstDay.getDay() + 1))
  const select = (date) => {
    const value = isoDate(date)
    if (!from || to) return onChange(value, '')
    if (date < start) onChange(value, from)
    else { onChange(from, value); setOpen(false) }
  }
  const label = from ? `${shortDate(from)}${to ? ` – ${shortDate(to)}` : ' – Select end'}` : 'Sent date range'
  return <div ref={shell} className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} className={`flex h-10 w-full items-center gap-2 rounded-lg border bg-white px-3 text-left text-xs ${open ? 'border-primary ring-2 ring-blue-100' : ''}`}><CalendarDays className="h-4 w-4 shrink-0 text-slate-400"/><span className={`min-w-0 flex-1 truncate ${from ? 'text-slate-700' : 'text-slate-500'}`}>{label}</span>{from ? <X onClick={(event) => { event.stopPropagation(); onChange('', '') }} className="h-4 w-4 text-slate-400 hover:text-red-500"/> : <ChevronDown className="h-4 w-4 text-slate-400"/>}</button>
    {open && <div className="absolute right-0 z-30 mt-2 w-[300px] rounded-xl border bg-white p-3 shadow-xl">
      <div className="mb-3 flex items-center justify-between"><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-md border hover:bg-slate-50"><ChevronLeft className="h-4 w-4"/></button><b className="text-sm">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-md border hover:bg-slate-50"><ChevronRight className="h-4 w-4"/></button></div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-slate-400">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day} className="py-1">{day}</span>)}</div>
      <div className="grid grid-cols-7">{days.map((date, index) => { if (!date) return <span key={`blank-${index}`}/>; const value = isoDate(date); const selected = value === from || value === to; const inRange = start && end && date > start && date < end; return <button type="button" key={value} onClick={() => select(date)} className={`h-9 text-xs ${selected ? 'rounded-md bg-primary font-bold text-white' : inRange ? 'bg-blue-50 text-primary' : 'rounded-md hover:bg-slate-100'}`}>{date.getDate()}</button> })}</div>
      <div className="mt-3 flex items-center justify-between border-t pt-3 text-[11px]"><span className="text-slate-500">{from && !to ? 'Now select the end date' : 'Select start and end date'}</span>{from && <button type="button" onClick={() => onChange('', '')} className="font-semibold text-red-500">Clear</button>}</div>
    </div>}
  </div>
}

export default function QuotationsPage() {
  const { user } = useAuth()
  const isVendor = user?.account_type === 'vendor'
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ counts: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const filters = useMemo(() => ({ page: params.get('page') || 1, per_page: params.get('per_page') || 25, search: params.get('search') || '', status: params.get('status') || '', date_from: params.get('date_from') || '', date_to: params.get('date_to') || '', sort: params.get('sort') || 'newest' }), [params])
  const change = (key, value) => setParams((current) => { const next = new URLSearchParams(current); value ? next.set(key, value) : next.delete(key); if (key !== 'page') next.set('page', '1'); return next })
  const changeDateRange = (from, to) => setParams((current) => { const next = new URLSearchParams(current); from ? next.set('date_from', from) : next.delete('date_from'); to ? next.set('date_to', to) : next.delete('date_to'); next.set('page', '1'); return next })

  useEffect(() => { const timer = window.setTimeout(() => { if (search !== filters.search) change('search', search) }, 350); return () => window.clearTimeout(timer) }, [search, filters.search])
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    getQuotations(filters).then((result) => { if (active) { setRows(result.data); setMeta(result.meta) } }).catch((err) => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters])

  const revise = async (payload) => {
    setSaving(true)
    try {
      const result = await sendVendorQuote(editing.id, payload)
      setRows((current) => current.map((row) => row.id === editing.id ? { ...row, ...result.data } : row))
      setEditing(null)
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  const countCards = [['total', 'Total'], ['awaiting', 'Awaiting'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['expired', 'Expired']]

  return <section>
    <div className="ui-page-header"><div className="flex flex-wrap items-center justify-between gap-5"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-blue-100"><FileText className="h-4 w-4"/>Procurement</p><h1 className="mt-2 text-2xl font-bold">Quotations</h1><p className="mt-2 text-sm text-blue-100">Search, filter and review quotations without loading the full archive.</p></div><div className="grid grid-cols-5 gap-2">{countCards.map(([key, label]) => <div key={key} className="min-w-16 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-center"><b className="block text-lg">{meta.counts?.[key] || 0}</b><span className="text-[10px] text-blue-100">{label}</span></div>)}</div></div></div>
    <div className="mt-6 rounded-xl border bg-white p-4 shadow-subtle"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_170px_260px_170px_100px]"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search quote, customer, service or vendor..." className="h-10 w-full rounded-lg border pl-10 pr-3 text-xs"/></label><select value={filters.status} onChange={(event) => change('status', event.target.value)} className="h-10 rounded-lg border px-3 text-xs"><option value="">All statuses</option><option value="quoted">Awaiting Buyer</option><option value="quote_accepted">Accepted</option><option value="quote_declined">Declined</option><option value="expired">Expired</option></select><DateRangePicker from={filters.date_from} to={filters.date_to} onChange={changeDateRange}/><select value={filters.sort} onChange={(event) => change('sort', event.target.value)} className="h-10 rounded-lg border px-3 text-xs"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount_high">Highest amount</option><option value="amount_low">Lowest amount</option><option value="expiry">Expiry date</option></select><select value={filters.per_page} onChange={(event) => change('per_page', event.target.value)} className="h-10 rounded-lg border px-2 text-xs"><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></div></div>
    {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>}
    {loading ? <div className="mt-5"><TableSkeleton columns={10}/></div> : <div className="mt-5 ui-table-shell"><div className="overflow-x-auto"><table className="w-full min-w-[1280px] text-left text-xs"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="p-4">Quotation</th><th className="p-4">Request Type</th><th className="p-4">Customer</th><th className="p-4">Service</th><th className="p-4">Vendor</th><th className="p-4">Total</th><th className="p-4">Quote Status</th><th className="p-4">Sent By</th><th className="p-4">Sent Date</th><th className="p-4">Actions</th></tr></thead><tbody>{rows.map((row) => { const status = effectiveStatus(row); return <tr key={row.id} className="border-t hover:bg-slate-50"><td className="p-4"><b className="text-primary">{row.quote_data?.quotation_no || `Q-${String(row.id).padStart(5, '0')}`}</b><p className="mt-1 text-[10px] text-slate-400">Revision {row.quote_revision || 1}</p></td><td className="p-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${row.request_type === 'demo' ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'}`}>{row.request_type === 'demo' ? 'Demo Request' : 'Quote Request'}</span></td><td className="p-4"><b>{row.user?.name}</b><p className="mt-1 text-[10px] text-slate-500">{row.user?.email}</p></td><td className="p-4 font-semibold">{row.service?.name}</td><td className="p-4">{row.vendor?.company_name || row.vendor?.name}</td><td className="p-4 font-bold text-primary">PKR {Number(row.quoted_price || 0).toLocaleString()}</td><td className="p-4"><span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold ${statusStyle[status] || statusStyle.quoted}`}>{statusLabel[status] || status}</span></td><td className="p-4"><b>{row.quote_sender?.name || row.vendor?.company_name}</b><p className="mt-1 text-[10px] capitalize text-slate-400">{row.quote_sender?.account_type || 'vendor'}</p></td><td className="p-4 whitespace-nowrap">{formatDate(row.quoted_at)}<p className="mt-1 text-[10px] text-slate-400">Valid: {row.quote_valid_until ? new Date(row.quote_valid_until).toLocaleDateString() : '—'}</p></td><td className="p-4"><div className="flex gap-2"><button onClick={() => setPreview(row)} className="inline-flex h-8 items-center gap-1 rounded-md border border-primary px-2.5 font-semibold text-primary"><Eye className="h-3.5 w-3.5"/>View</button>{isVendor && row.status === 'quoted' && <button onClick={() => setEditing(row)} className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 font-semibold text-white"><Pencil className="h-3.5 w-3.5"/>Revise</button>}</div></td></tr>})}{!rows.length && <tr><td colSpan="10" className="p-12 text-center text-slate-500">No quotations match these filters.</td></tr>}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-slate-500"><span>Showing {meta.from || 0}–{meta.to || 0} of {meta.total || 0}</span><div className="flex items-center gap-2"><button disabled={Number(filters.page) <= 1} onClick={() => change('page', Number(filters.page) - 1)} className="grid h-8 w-8 place-items-center rounded-md border disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button><span>Page {meta.current_page || 1} of {meta.last_page || 1}</span><button disabled={Number(filters.page) >= Number(meta.last_page || 1)} onClick={() => change('page', Number(filters.page) + 1)} className="grid h-8 w-8 place-items-center rounded-md border disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button></div></div></div>}
    {preview && <QuoteDocumentModal request={preview} onClose={() => setPreview(null)}/>} 
    {editing && <CreateQuoteModal request={editing} saving={saving} error={error} onClose={() => { if (!saving) setEditing(null) }} onSend={revise}/>} 
  </section>
}
