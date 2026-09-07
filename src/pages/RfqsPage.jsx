import { Building2, CalendarClock, Check, Download, Eye, FileCheck2, FileText, FileUp, ImageIcon, Mail, PackageSearch, Paperclip, Send, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { downloadBuyerAttachment, generatePurchaseOrder, getBuyerAttachmentPreviewUrl, getQuoteRequests, respondToVendorQuote, sendPurchaseOrder, sendVendorQuote } from '../api/rfqs'
import { useAuth } from '../auth/useAuth'
import CreateQuoteModal from '../components/rfqs/CreateQuoteModal'
import QuoteDocumentModal from '../components/rfqs/QuoteDocumentModal'
import PurchaseOrderModal from '../components/rfqs/PurchaseOrderModal'
import UploadQuoteModal from '../components/rfqs/UploadQuoteModal'

const cycleLabels = { monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-Annual', annual: 'Annual / Yearly' }
const statusStyles = {
  pending: 'bg-amber-50 text-amber-700',
  quoted: 'bg-blue-50 text-primary',
  quote_accepted: 'bg-emerald-50 text-emerald-700',
  quote_declined: 'bg-red-50 text-red-700',
  expired: 'bg-slate-100 text-slate-600',
}
const statusLabels = { pending: 'Pending', quoted: 'Awaiting Buyer', quote_accepted: 'Accepted', quote_declined: 'Declined', expired: 'Expired' }
const displayStatus = (item) => item.status === 'quoted' && item.quote_valid_until && new Date(`${item.quote_valid_until}T23:59:59`) < new Date() ? 'expired' : item.status
const currentlyUsingLabel = (value) => ({ manual: 'Manual', spreadsheet: 'Excel Sheet / Google Sheet', customized_in_house: 'Customized in-house', brand: 'Brand' }[value] || value)
const expectedUsersLabel = (value) => ({ 10: '1–10', 50: '11–50', 100: '51–100', 250: '101–250', 500: '251–500', 1000000: '500+' }[Number(value)] || Number(value).toLocaleString())

function BuyerRequirementAttachment({ request }) {
  const [preview, setPreview] = useState('')
  const isImage = String(request.buyer_attachment_mime || '').startsWith('image/')
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  if (!request.buyer_attachment_name) return null
  const open = async () => { try { setPreview(await getBuyerAttachmentPreviewUrl(request)) } catch (error) { window.alert(error.message) } }
  const size = Number(request.buyer_attachment_size || 0) / 1024 / 1024
  return <><div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-white p-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-primary">{isImage ? <ImageIcon className="h-5 w-5"/> : <Paperclip className="h-5 w-5"/>}</span><span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-800">{request.buyer_attachment_name}</b><span className="text-[10px] text-slate-400">Buyer attachment · {size.toFixed(2)} MB</span></span>{isImage && <button type="button" onClick={open} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary px-3 text-[11px] font-bold text-primary"><Eye className="h-3.5 w-3.5"/>Preview</button>}<button type="button" onClick={() => downloadBuyerAttachment(request).catch((error) => window.alert(error.message))} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[11px] font-bold text-white"><Download className="h-3.5 w-3.5"/>Download</button></div>{preview && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/80 p-5" role="dialog" aria-modal="true" aria-label="Buyer attachment preview"><button type="button" onClick={() => { URL.revokeObjectURL(preview); setPreview('') }} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700" aria-label="Close preview"><X className="h-5 w-5"/></button><img src={preview} alt={request.buyer_attachment_name} className="max-h-[88vh] max-w-[92vw] rounded-xl bg-white object-contain shadow-overlay"/></div>}</>
}

export default function RfqsPage({ quotationOnly = false }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const isVendor = user?.account_type === 'vendor'
  const isBuyer = user?.account_type === 'buyer'
  const isAdmin = !isVendor && !isBuyer
  const [requests, setRequests] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quoteRequest, setQuoteRequest] = useState(null)
  const [uploadRequest, setUploadRequest] = useState(null)
  const [saving, setSaving] = useState(false)
  const [previewRequest, setPreviewRequest] = useState(null)
  const [purchaseOrder, setPurchaseOrder] = useState(null)

  const load = () => getQuoteRequests().then(setRequests).catch((err) => setError(err.message)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])
  const visible = useMemo(() => requests.filter((item) => (!quotationOnly || Boolean(item.quoted_at)) && (!statusFilter || displayStatus(item) === statusFilter) && `${item.service?.name || ''} ${item.user?.name || ''} ${item.user?.email || ''} ${item.vendor?.company_name || ''}`.toLowerCase().includes(query.trim().toLowerCase())), [requests, query, quotationOnly, statusFilter])
  const changeStatus = (value) => { setStatusFilter(value); const next = new URLSearchParams(searchParams); if (value) next.set('status', value); else next.delete('status'); setSearchParams(next, { replace: true }) }

  const sendQuote = async (payload, request = quoteRequest) => {
    setSaving(true); setError('')
    try { const result = await sendVendorQuote(request.id, payload); setRequests((current) => current.map((item) => item.id === request.id ? { ...item, ...result.data } : item)); setQuoteRequest(null); setUploadRequest(null) } catch (err) { setError(err.message) } finally { setSaving(false) }
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

  const heading = quotationOnly ? 'Quotations' : isVendor ? 'My RFQs' : isBuyer ? 'My Quote Requests' : 'All RFQs'
  const subtitle = quotationOnly ? (isBuyer ? 'Review quotations received from solution providers.' : isVendor ? 'View and manage quotations sent to your customers.' : 'Monitor all vendor quotations and buyer responses.') : isVendor ? 'Review RFQs and send formal quotes to customers.' : isBuyer ? 'Review, accept or decline quotes received from vendors.' : 'Monitor RFQs and vendor quotation progress.'

  return <section>
    <div className="rounded-2xl bg-gradient-to-r from-[#082d66] to-primary px-6 py-7 text-white sm:px-8"><div className="flex flex-wrap items-center justify-between gap-5"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-200"><FileText className="h-4 w-4"/>{quotationOnly ? 'Procurement' : 'RFQ Inbox'}</div><h1 className="mt-2 text-2xl font-bold">{heading}</h1><p className="mt-2 max-w-2xl text-sm text-blue-100">{subtitle}</p></div><div className="rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-center"><p className="text-3xl font-bold">{visible.length}</p><p className="text-[11px] text-blue-100">{quotationOnly ? 'Total Quotations' : 'Total RFQs'}</p></div></div></div>
    <div className="mt-6 ui-toolbar shadow-subtle"><label className="relative min-w-0 flex-1"><PackageSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, customer, vendor or email..." className="h-11 w-full rounded-lg border pl-10 pr-3 text-sm outline-none focus:border-primary"/></label><select aria-label="Filter RFQs by status" value={statusFilter} onChange={(event) => changeStatus(event.target.value)} className="h-11 min-w-44 rounded-lg border bg-white px-3 text-xs font-semibold"><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    {error && !quoteRequest && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}
    {loading ? <div className="mt-6 space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 ui-skeleton ui-toolbar"><div className="h-full rounded-lg bg-slate-100"/></div>)}</div> : <div className="mt-6 space-y-3">
      {visible.map((item) => <article key={item.id} className="rounded-xl border bg-white p-5 transition hover:border-blue-200 hover:shadow-floating">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${statusStyles[displayStatus(item)] || statusStyles.pending}`}>{statusLabels[displayStatus(item)] || displayStatus(item)}</span><span className="text-[11px] text-slate-400">RFQ #{item.id}{item.quote_revision ? ` · Revision ${item.quote_revision}` : ''}</span></div><h2 className="mt-2 text-base font-bold text-slate-900">{item.service?.name}</h2><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">{!isBuyer && <><span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-primary"/>{item.user?.name}</span><a href={`mailto:${item.user?.email}`} className="inline-flex items-center gap-1.5 hover:text-primary"><Mail className="h-3.5 w-3.5 text-primary"/>{item.user?.email}</a></>}{!isVendor && <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary"/>{item.vendor?.company_name || item.vendor?.name}</span>}<span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-primary"/>{new Date(item.created_at).toLocaleString()}</span></div>
            {item.quote_purpose && <div className="mt-4 rounded-lg border bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Customer requirements</p><div className="mt-2 grid gap-3 sm:grid-cols-[1fr_150px]"><p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{item.quote_purpose}</p><div className="rounded-md bg-white p-2 text-center"><p className="text-[11px] uppercase text-slate-400">Users / Employees</p><b className="mt-1 block text-lg text-primary">{expectedUsersLabel(item.expected_users)}</b></div></div>{item.currently_using && <div className="mt-3 rounded-md border border-blue-100 bg-white px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Currently Using</p><p className="mt-1 text-xs font-semibold text-slate-700">{currentlyUsingLabel(item.currently_using)}{item.currently_using === 'brand' && item.current_brand_name ? ` — ${item.current_brand_name}` : ''}</p></div>}<BuyerRequirementAttachment request={item}/></div>}
          </div>
          <div className="shrink-0 lg:w-[320px]"><div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">{item.quoted_at ? <><div><p className="text-[11px] font-bold uppercase text-slate-400">Quotation Total</p><p className="mt-1 text-base font-bold text-primary">PKR {Number(item.quoted_price || 0).toLocaleString()}</p></div><div><p className="text-[11px] font-bold uppercase text-slate-400">Sent Date & Time</p><p className="mt-1 font-semibold leading-5 text-slate-700">{new Date(item.quoted_at).toLocaleString()}</p></div></> : <><div><p className="text-[11px] font-bold uppercase text-slate-400">Selected plan</p><p className="mt-1 font-semibold">{cycleLabels[item.service?.billing_cycle] || 'Custom'}</p></div><div><p className="text-[11px] font-bold uppercase text-slate-400">Listed price</p><p className="mt-1 font-bold text-primary">{item.service?.pricing_mode === 'flexible_price' ? 'Flexible quote' : `$${Number(item.service?.price_from || 0).toLocaleString()}`}</p></div></>}</div>
            {item.quoted_at && !isBuyer && <button type="button" onClick={() => setPreviewRequest(item)} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary bg-blue-50 text-xs font-bold text-primary hover:bg-blue-100"><Eye className="h-4 w-4"/>View Quotation</button>}
            {isVendor && ['pending', 'quoted'].includes(item.status) && <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => { setError(''); setQuoteRequest(item) }} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-white transition hover:bg-blue-700"><FileText className="h-3.5 w-3.5"/>{item.status === 'quoted' ? 'Revise' : 'Create Quote'}</button><button type="button" onClick={() => { setError(''); setUploadRequest(item) }} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary bg-white px-3 text-xs font-semibold text-primary transition hover:bg-blue-50"><FileUp className="h-3.5 w-3.5"/>{item.status === 'quoted' ? 'Upload Revision' : 'Upload Quote'}</button></div>}
            {isVendor && item.purchase_order?.status === 'sent' && <button type="button" onClick={() => setPurchaseOrder(item.purchase_order)} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-xs font-bold text-white"><FileCheck2 className="h-4 w-4"/>View Customer PO</button>}
            {isAdmin && item.purchase_order && <button type="button" onClick={() => setPurchaseOrder(item.purchase_order)} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary text-xs font-bold text-primary"><FileCheck2 className="h-4 w-4"/>View PO · {item.purchase_order.status}</button>}
            {isBuyer && item.status === 'quoted' && <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setPreviewRequest(item)} className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary bg-blue-50 text-xs font-bold text-primary hover:bg-blue-100"><Eye className="h-4 w-4"/>View Quote</button><button disabled={saving} onClick={() => respond(item, 'accept')} className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-emerald-600 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5"/>Accept</button><button disabled={saving} onClick={() => respond(item, 'decline')} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-red-200 text-xs font-semibold text-red-600 disabled:opacity-50"><X className="h-3.5 w-3.5"/>Decline</button></div>}
            {isBuyer && item.status === 'quote_accepted' && <div className="mt-3 space-y-2"><button type="button" onClick={() => setPreviewRequest(item)} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border text-xs font-semibold text-primary"><Eye className="h-4 w-4"/>View Accepted Quote</button>{item.purchase_order ? <><button type="button" onClick={() => setPurchaseOrder(item.purchase_order)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary text-xs font-bold text-primary"><FileCheck2 className="h-4 w-4"/>View Purchase Order</button>{item.purchase_order.status === 'draft' ? <button type="button" disabled={saving} onClick={() => sendPo(item)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-xs font-bold text-white disabled:opacity-50"><Send className="h-4 w-4"/>{saving ? 'Sending...' : 'Send PO to Solution Provider'}</button> : <p className="rounded-md bg-emerald-50 p-2 text-center text-[11px] font-bold text-emerald-700">PO sent to Solution Provider</p>}</> : <button type="button" disabled={saving} onClick={() => createPo(item)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-xs font-bold text-white disabled:opacity-50"><FileCheck2 className="h-4 w-4"/>{saving ? 'Generating...' : 'Generate Purchase Order'}</button>}</div>}
          </div>
        </div>
      </article>)}
      {!visible.length && <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-white text-center"><div><FileText className="mx-auto h-9 w-9 text-slate-300"/><h2 className="mt-4 text-sm font-bold">{quotationOnly ? 'No quotations found' : 'No RFQs found'}</h2><p className="mt-1 text-xs text-slate-500">{quotationOnly ? 'Sent or received quotations will appear here.' : 'New requests and vendor quotes will appear here.'}</p></div></div>}
    </div>}
    {quoteRequest && <CreateQuoteModal request={quoteRequest} saving={saving} error={error} onClose={() => { if (!saving) setQuoteRequest(null) }} onSend={sendQuote}/>}
    {uploadRequest && <UploadQuoteModal request={uploadRequest} saving={saving} error={error} onClose={() => { if (!saving) setUploadRequest(null) }} onSend={(payload) => sendQuote(payload, uploadRequest)}/>}
    {previewRequest && <QuoteDocumentModal request={previewRequest} onClose={() => setPreviewRequest(null)}/>}
    {purchaseOrder && <PurchaseOrderModal order={purchaseOrder} onClose={() => setPurchaseOrder(null)}/>}
  </section>
}
