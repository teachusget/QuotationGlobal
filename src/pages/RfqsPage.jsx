import { Building2, CalendarClock, Check, Eye, FileCheck2, FileText, Mail, PackageSearch, Send, Upload, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { generatePurchaseOrder, getQuoteRequests, respondToVendorQuote, sendPurchaseOrder, sendVendorQuote } from '../api/rfqs'
import { useAuth } from '../auth/useAuth'
import CreateQuoteModal from '../components/rfqs/CreateQuoteModal'
import QuoteDocumentModal from '../components/rfqs/QuoteDocumentModal'
import PurchaseOrderModal from '../components/rfqs/PurchaseOrderModal'

const cycleLabels = { monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-Annual', annual: 'Annual / Yearly' }
const statusStyles = {
  pending: 'bg-amber-50 text-amber-700',
  quoted: 'bg-blue-50 text-primary',
  quote_accepted: 'bg-emerald-50 text-emerald-700',
  quote_declined: 'bg-red-50 text-red-700',
}
const statusLabels = { pending: 'Pending', quoted: 'Quote Sent', quote_accepted: 'Accepted', quote_declined: 'Declined' }
const expectedUsersLabel = (value) => ({ 10: '1–10', 50: '11–50', 100: '51–100', 250: '101–250', 500: '251–500', 1000000: '500+' }[Number(value)] || Number(value).toLocaleString())

function LegacyQuoteModal({ request, saving, error, onClose, onSend }) {
  const [price, setPrice] = useState(request.quoted_price || '')
  const [message, setMessage] = useState(request.quote_message || '')
  const [terms, setTerms] = useState(request.quote_terms || '')
  const [validUntil, setValidUntil] = useState(request.quote_valid_until?.slice(0, 10) || '')
  return <div className="fixed inset-0 z-[90] grid place-items-center p-4">
    <button type="button" onClick={onClose} className="absolute inset-0 bg-slate-950/50" aria-label="Close"/>
    <form onSubmit={(event) => { event.preventDefault(); onSend({ quoted_price: price, quote_message: message.trim(), quote_terms: terms.trim(), quote_valid_until: validUntil }) }} className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-overlay">
      <div className="flex items-start justify-between border-b pb-4"><div><h2 className="font-bold">Send Customer Quote</h2><p className="mt-1 text-xs text-slate-500">{request.service?.name} · {request.user?.name}</p></div><button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold">Quoted price *<div className="relative mt-1.5"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span><input type="number" min="0.01" step="0.01" required value={price} onChange={(event) => setPrice(event.target.value)} className="h-11 w-full rounded-lg border pl-7 pr-3 text-sm font-normal outline-none focus:border-primary"/></div></label>
        <label className="text-xs font-semibold">Valid until *<input type="date" required min={new Date().toISOString().slice(0, 10)} value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border px-3 text-sm font-normal outline-none focus:border-primary"/></label>
      </div>
      <label className="mt-4 block text-xs font-semibold">Message to customer *<textarea required minLength={10} maxLength={2000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Scope, delivery timeline aur quote ki important details batayein..." className="mt-1.5 w-full resize-y rounded-lg border p-3 text-sm font-normal leading-5 outline-none focus:border-primary"/></label>
      <label className="mt-4 block text-xs font-semibold">Terms & conditions<textarea maxLength={3000} rows={3} value={terms} onChange={(event) => setTerms(event.target.value)} placeholder="Payment terms, implementation requirements, taxes, etc." className="mt-1.5 w-full resize-y rounded-lg border p-3 text-sm font-normal leading-5 outline-none focus:border-primary"/></label>
      {error && <p className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-9 rounded-md border px-4 text-xs font-semibold">Cancel</button><button disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5"/>{saving ? 'Sending...' : request.quoted_at ? 'Send Revised Quote' : 'Send Quote'}</button></div>
    </form>
  </div>
}
void LegacyQuoteModal

export default function RfqsPage() {
  const { user } = useAuth()
  const isVendor = user?.account_type === 'vendor'
  const isBuyer = user?.account_type === 'buyer'
  const isAdmin = !isVendor && !isBuyer
  const [requests, setRequests] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quoteRequest, setQuoteRequest] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState({})
  const [previewRequest, setPreviewRequest] = useState(null)
  const [purchaseOrder, setPurchaseOrder] = useState(null)

  const load = () => getQuoteRequests().then(setRequests).catch((err) => setError(err.message)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])
  const visible = useMemo(() => requests.filter((item) => `${item.service?.name || ''} ${item.user?.name || ''} ${item.user?.email || ''} ${item.vendor?.company_name || ''}`.toLowerCase().includes(query.trim().toLowerCase())), [requests, query])

  const sendQuote = async (payload) => {
    setSaving(true); setError('')
    try { const result = await sendVendorQuote(quoteRequest.id, payload); setRequests((current) => current.map((item) => item.id === quoteRequest.id ? { ...item, ...result.data } : item)); setQuoteRequest(null) } catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  const respond = async (item, decision) => {
    setSaving(true); setError('')
    try { const result = await respondToVendorQuote(item.id, decision); setRequests((current) => current.map((row) => row.id === item.id ? { ...row, ...result.data } : row)) } catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  const createPo = async (item) => {
    setSaving(true); setError('')
    try { const result = await generatePurchaseOrder(item.id); setRequests((current) => current.map((row) => row.id === item.id ? { ...row, purchase_order: result.data } : row)); setPurchaseOrder(result.data) } catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  const sendPo = async (item) => {
    if (!window.confirm('Send this PO to the Solution Provider? Please review all details first.')) return
    setSaving(true); setError('')
    try { const result = await sendPurchaseOrder(item.id); setRequests((current) => current.map((row) => row.id === item.id ? { ...row, purchase_order: result.data } : row)); setPurchaseOrder(result.data) } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  const heading = isVendor ? 'My RFQs' : isBuyer ? 'My Quote Requests' : 'All RFQs'
  const subtitle = isVendor ? 'Review RFQs and send formal quotes to customers.' : isBuyer ? 'Review, accept or decline quotes received from vendors.' : 'Monitor RFQs and vendor quotation progress.'

  return <section>
    <div className="rounded-2xl bg-gradient-to-r from-[#082d66] to-primary px-6 py-7 text-white sm:px-8"><div className="flex flex-wrap items-center justify-between gap-5"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-200"><FileText className="h-4 w-4"/>RFQ Inbox</div><h1 className="mt-2 text-2xl font-bold">{heading}</h1><p className="mt-2 max-w-2xl text-sm text-blue-100">{subtitle}</p></div><div className="rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-center"><p className="text-3xl font-bold">{requests.length}</p><p className="text-[11px] text-blue-100">Total RFQs</p></div></div></div>
    <div className="mt-6 ui-toolbar shadow-subtle"><label className="relative block"><PackageSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, customer, vendor or email..." className="h-11 w-full rounded-lg border pl-10 pr-3 text-sm outline-none focus:border-primary"/></label></div>
    {error && !quoteRequest && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}
    {loading ? <div className="mt-6 space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 ui-skeleton ui-toolbar"><div className="h-full rounded-lg bg-slate-100"/></div>)}</div> : <div className="mt-6 space-y-3">
      {visible.map((item) => <article key={item.id} className="rounded-xl border bg-white p-5 transition hover:border-blue-200 hover:shadow-floating">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${statusStyles[item.status] || statusStyles.pending}`}>{statusLabels[item.status] || item.status}</span><span className="text-[11px] text-slate-400">RFQ #{item.id}</span></div><h2 className="mt-2 text-base font-bold text-slate-900">{item.service?.name}</h2><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">{!isBuyer && <><span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-primary"/>{item.user?.name}</span><a href={`mailto:${item.user?.email}`} className="inline-flex items-center gap-1.5 hover:text-primary"><Mail className="h-3.5 w-3.5 text-primary"/>{item.user?.email}</a></>}{!isVendor && <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary"/>{item.vendor?.company_name || item.vendor?.name}</span>}<span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-primary"/>{new Date(item.created_at).toLocaleString()}</span></div>
            {item.quote_purpose && <div className="mt-4 rounded-lg border bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Customer requirements</p><div className="mt-2 grid gap-3 sm:grid-cols-[1fr_150px]"><p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{item.quote_purpose}</p><div className="rounded-md bg-white p-2 text-center"><p className="text-[11px] uppercase text-slate-400">Users / Employees</p><b className="mt-1 block text-lg text-primary">{expectedUsersLabel(item.expected_users)}</b></div></div></div>}
            {item.quoted_at && <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-lg font-bold text-primary">${Number(item.quoted_price).toLocaleString()}</p><p className="text-[11px] text-slate-500">Valid until {new Date(item.quote_valid_until).toLocaleDateString()}</p></div><p className="mt-2 text-xs leading-5 text-slate-700">{item.quote_message}</p>{item.quote_terms && <details className="mt-2 text-[11px] text-slate-500"><summary className="cursor-pointer font-semibold text-primary">Terms & conditions</summary><p className="mt-1 whitespace-pre-wrap leading-4">{item.quote_terms}</p></details>}</div>}
          </div>
          <div className="shrink-0 lg:w-[290px]"><div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs"><div><p className="text-[11px] font-bold uppercase text-slate-400">Selected plan</p><p className="mt-1 font-semibold">{cycleLabels[item.service?.billing_cycle] || 'Custom'}</p></div><div><p className="text-[11px] font-bold uppercase text-slate-400">Listed price</p><p className="mt-1 font-bold text-primary">{item.service?.pricing_mode === 'flexible_price' ? 'Flexible quote' : `$${Number(item.service?.price_from || 0).toLocaleString()}`}</p></div></div>
            {isVendor && ['pending', 'quoted'].includes(item.status) && <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-primary bg-white px-2 text-center text-xs font-semibold text-primary transition hover:bg-blue-50" title={selectedDocuments[item.id]?.name || 'Upload quote document'}><Upload className="h-3.5 w-3.5"/><span className="truncate">{selectedDocuments[item.id] ? selectedDocuments[item.id].name : 'Upload Document'}</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) setSelectedDocuments((current) => ({ ...current, [item.id]: file })) }}/></label>
              <button type="button" onClick={() => { setError(''); setQuoteRequest(item) }} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-2 text-xs font-semibold text-white transition hover:bg-blue-700"><FileText className="h-3.5 w-3.5"/>{item.status === 'quoted' ? 'Revise Quote' : 'Create Quote'}</button>
            </div>}
            {isVendor && item.purchase_order?.status === 'sent' && <button type="button" onClick={() => setPurchaseOrder(item.purchase_order)} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-xs font-bold text-white"><FileCheck2 className="h-4 w-4"/>View Customer PO</button>}
            {isAdmin && item.purchase_order && <button type="button" onClick={() => setPurchaseOrder(item.purchase_order)} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary text-xs font-bold text-primary"><FileCheck2 className="h-4 w-4"/>View PO · {item.purchase_order.status}</button>}
            {isBuyer && item.status === 'quoted' && <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setPreviewRequest(item)} className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary bg-blue-50 text-xs font-bold text-primary hover:bg-blue-100"><Eye className="h-4 w-4"/>View Quote</button><button disabled={saving} onClick={() => respond(item, 'accept')} className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-emerald-600 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5"/>Accept</button><button disabled={saving} onClick={() => respond(item, 'decline')} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-red-200 text-xs font-semibold text-red-600 disabled:opacity-50"><X className="h-3.5 w-3.5"/>Decline</button></div>}
            {isBuyer && item.status === 'quote_accepted' && <div className="mt-3 space-y-2"><button type="button" onClick={() => setPreviewRequest(item)} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border text-xs font-semibold text-primary"><Eye className="h-4 w-4"/>View Accepted Quote</button>{item.purchase_order ? <><button type="button" onClick={() => setPurchaseOrder(item.purchase_order)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary text-xs font-bold text-primary"><FileCheck2 className="h-4 w-4"/>View Purchase Order</button>{item.purchase_order.status === 'draft' ? <button type="button" disabled={saving} onClick={() => sendPo(item)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-xs font-bold text-white disabled:opacity-50"><Send className="h-4 w-4"/>{saving ? 'Sending...' : 'Send PO to Solution Provider'}</button> : <p className="rounded-md bg-emerald-50 p-2 text-center text-[11px] font-bold text-emerald-700">PO sent to Solution Provider</p>}</> : <button type="button" disabled={saving} onClick={() => createPo(item)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-xs font-bold text-white disabled:opacity-50"><FileCheck2 className="h-4 w-4"/>{saving ? 'Generating...' : 'Generate Purchase Order'}</button>}</div>}
          </div>
        </div>
      </article>)}
      {!visible.length && <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-white text-center"><div><FileText className="mx-auto h-9 w-9 text-slate-300"/><h2 className="mt-4 text-sm font-bold">No RFQs found</h2><p className="mt-1 text-xs text-slate-500">New requests and vendor quotes will appear here.</p></div></div>}
    </div>}
    {quoteRequest && <CreateQuoteModal request={quoteRequest} saving={saving} error={error} onClose={() => { if (!saving) setQuoteRequest(null) }} onSend={sendQuote}/>}
    {previewRequest && <QuoteDocumentModal request={previewRequest} onClose={() => setPreviewRequest(null)}/>}
    {purchaseOrder && <PurchaseOrderModal order={purchaseOrder} onClose={() => setPurchaseOrder(null)}/>}
  </section>
}
