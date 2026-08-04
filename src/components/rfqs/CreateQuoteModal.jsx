import { FileText, Image, Paperclip, Plus, Save, Trash2, Truck, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import useDialogAccessibility from '../../hooks/useDialogAccessibility'

const today = () => new Date().toISOString().slice(0, 10)
const addDays = (days) => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10) }
const blankItem = (name = '') => ({ id: crypto.randomUUID(), name, description: '', quantity: 1, rate: '', tax: 0 })

function Field({ label, className = '', ...props }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span><input {...props} className="h-10 w-full rounded-lg border bg-white px-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"/></label>
}

function AddressCard({ title, name, setName, email, setEmail }) {
  return <div className="rounded-xl border bg-slate-50/60 p-4"><h3 className="mb-3 text-sm font-bold text-slate-900">{title}</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Business name *" value={name} onChange={(e) => setName(e.target.value)} className="sm:col-span-2"/><Field label="Country" defaultValue="Pakistan"/><Field label="Phone" placeholder="+92"/><Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="sm:col-span-2"/><Field label="Address" placeholder="Street address (optional)" className="sm:col-span-2"/><Field label="City" placeholder="City (optional)"/><Field label="Postal / ZIP code" placeholder="Postal code"/></div></div>
}

export default function CreateQuoteModal({ request, saving, error, onClose, onSend }) {
  const [touched, setTouched] = useState(false)
  const closeEditor = () => { if (touched && !window.confirm('Discard this unsaved quotation?')) return; onClose() }
  const dialogRef = useDialogAccessibility(true, closeEditor, saving)
  useEffect(() => { if (!touched) return undefined; const warn = (event) => { event.preventDefault(); event.returnValue = '' }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [touched])
  const [quotationNo, setQuotationNo] = useState(`Q-${String(request.id).padStart(5, '0')}`)
  const [quotationDate, setQuotationDate] = useState(today())
  const [dueDate, setDueDate] = useState(request.quote_valid_until?.slice(0, 10) || addDays(30))
  const [businessName, setBusinessName] = useState(request.vendor?.company_name || request.vendor?.name || '')
  const [businessEmail, setBusinessEmail] = useState(request.vendor?.email || '')
  const [clientName, setClientName] = useState(request.user?.company_name || request.user?.name || '')
  const [clientEmail, setClientEmail] = useState(request.user?.email || '')
  const [shipping, setShipping] = useState(false)
  const [transport, setTransport] = useState(false)
  const [items, setItems] = useState([blankItem(request.service?.name || '')])
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState(request.quote_message || '')
  const [terms, setTerms] = useState(request.quote_terms || 'Applicable taxes will be extra.\nWork will resume after advance payment.')
  const [logo, setLogo] = useState(null)
  const [attachment, setAttachment] = useState(null)
  const [validation, setValidation] = useState([])

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0)
    const tax = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0) * Number(item.tax || 0) / 100, 0)
    const discountAmount = subtotal * Number(discount || 0) / 100
    return { subtotal, tax, discountAmount, total: Math.max(0, subtotal + tax - discountAmount) }
  }, [items, discount])

  const updateItem = (id, key, value) => setItems((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item))
  const submit = (event) => {
    event.preventDefault()
    const issues = []
    if (!businessName.trim()) issues.push('Your Business Name is required.')
    if (!clientName.trim()) issues.push('Client Business Name is required.')
    if (!items.some((item) => item.name.trim() && Number(item.rate) > 0)) issues.push('At least one item with a valid rate is required.')
    if (totals.total <= 0) issues.push('Quotation total must be greater than zero.')
    setValidation(issues)
    if (issues.length) return
    const itemSummary = items.filter((item) => item.name.trim()).map((item) => `${item.name}: ${item.quantity} x PKR ${Number(item.rate).toLocaleString()}${item.tax ? ` + ${item.tax}% tax` : ''}`).join('\n')
    const quoteItems = items.filter((item) => item.name.trim()).map((item) => { const amount = Number(item.quantity) * Number(item.rate); return { name: item.name.trim(), description: item.description.trim(), quantity: Number(item.quantity), rate: Number(item.rate), tax: Number(item.tax || 0), amount, total: amount * (1 + Number(item.tax || 0) / 100) } })
    onSend({ quoted_price: totals.total.toFixed(2), quote_valid_until: dueDate, quote_message: `${notes.trim() || 'Formal quotation for the requested solution.'}\n\n${itemSummary}`.slice(0, 2000), quote_terms: terms.trim().slice(0, 3000), quote_data: { quotation_no: quotationNo, quotation_date: quotationDate, business_name: businessName.trim(), client_name: clientName.trim(), currency: 'PKR', discount_percent: Number(discount || 0), subtotal: totals.subtotal, tax_total: totals.tax, discount_amount: totals.discountAmount, items: quoteItems } })
  }

  return <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-100/95 backdrop-blur-sm">
    <form ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="create-quote-title" onChange={() => setTouched(true)} onSubmit={submit} className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="mb-7 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">RFQ #{request.id}</p><h1 id="create-quote-title" className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Create Your Quotation</h1><div className="mt-4 flex items-center gap-3 text-xs"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary font-bold text-white">1</span><b>Quotation Details</b><span className="h-px w-10 bg-slate-300"/><span className="grid h-6 w-6 place-items-center rounded-full border text-slate-500">2</span><span className="text-slate-500">Review & Share</span></div></div><button type="button" onClick={closeEditor} className="grid h-10 w-10 place-items-center rounded-full border bg-white text-slate-500 shadow-sm hover:text-slate-900"><X className="h-5 w-5"/></button></div>

      <div className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-8">
        <div className="mb-7 flex items-center justify-center gap-2"><FileText className="h-6 w-6 text-primary"/><h2 className="border-b border-dashed text-2xl font-bold">Quotation</h2></div>
        <div className="grid gap-6 lg:grid-cols-[1fr_240px]"><div className="grid gap-4 sm:grid-cols-3"><Field label="Quotation No. *" value={quotationNo} onChange={(e) => setQuotationNo(e.target.value)}/><Field label="Quotation Date *" type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)}/><Field label="Due Date *" type="date" min={quotationDate} value={dueDate} onChange={(e) => setDueDate(e.target.value)}/></div><label className="grid min-h-28 cursor-pointer place-items-center rounded-xl border border-dashed bg-slate-50 p-3 text-center text-xs text-slate-500 hover:border-primary"><span><Image className="mx-auto mb-2 h-6 w-6 text-primary"/>{logo ? logo.name : 'Add Business Logo'}<small className="mt-1 block">PNG or JPEG, up to 1080×1080px</small></span><input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => setLogo(e.target.files?.[0] || null)}/></label></div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2"><AddressCard title="Your Details" name={businessName} setName={setBusinessName} email={businessEmail} setEmail={setBusinessEmail}/><AddressCard title="Client's Details" name={clientName} setName={setClientName} email={clientEmail} setEmail={setClientEmail}/></div>

        <label className="mt-6 flex cursor-pointer items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={shipping} onChange={(e) => setShipping(e.target.checked)} className="h-4 w-4 accent-primary"/>Add Shipping Details</label>
        {shipping && <div className="mt-3 grid gap-4 lg:grid-cols-2"><AddressCard title="Shipped From" name={businessName} setName={setBusinessName} email={businessEmail} setEmail={setBusinessEmail}/><AddressCard title="Shipped To" name={clientName} setName={setClientName} email={clientEmail} setEmail={setClientEmail}/></div>}

        <label className="mt-6 flex cursor-pointer items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={transport} onChange={(e) => setTransport(e.target.checked)} className="h-4 w-4 accent-primary"/>Add Transport Details</label>
        {transport && <div className="mt-3 max-w-lg rounded-xl border bg-slate-50 p-4"><h3 className="flex items-center gap-2 text-sm font-bold"><Truck className="h-4 w-4 text-primary"/>Transport Details</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Transporter" placeholder="Transporter name"/><Field label="Distance" placeholder="Distance"/><Field label="Mode of transport" placeholder="Road / Air / Sea"/><Field label="Vehicle number" placeholder="Vehicle number"/></div></div>}

        <div className="mt-7 flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-base font-bold">Items & Pricing</h3><p className="mt-1 text-xs text-slate-500">Currency: Pakistani Rupee (PKR)</p></div><Field label="Discount %" type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-36"/></div>
        <div className="mt-3 overflow-x-auto rounded-xl border"><div className="min-w-[800px]"><div className="grid grid-cols-[2fr_90px_100px_120px_120px_42px] gap-3 bg-gradient-to-r from-primary to-indigo-600 px-4 py-3 text-[11px] font-bold text-white"><span>Item</span><span>Tax Rate</span><span>Quantity</span><span>Rate</span><span>Total</span><span/></div>{items.map((item, index) => { const amount = Number(item.quantity || 0) * Number(item.rate || 0); const total = amount * (1 + Number(item.tax || 0) / 100); return <div key={item.id} className="grid grid-cols-[2fr_90px_100px_120px_120px_42px] gap-3 border-t p-4"><div><input required value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} placeholder={`Item ${index + 1} name`} className="h-9 w-full border-b bg-transparent px-1 text-xs outline-none focus:border-primary"/><input value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder="Add description" className="mt-2 h-8 w-full bg-transparent px-1 text-[11px] text-slate-500 outline-none"/></div><input type="number" min="0" max="100" value={item.tax} onChange={(e) => updateItem(item.id, 'tax', e.target.value)} className="h-9 rounded border px-2 text-xs"/><input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="h-9 rounded border px-2 text-xs"/><input type="number" min="0" step="0.01" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} placeholder="PKR" className="h-9 rounded border px-2 text-xs"/><strong className="pt-2 text-xs">PKR {total.toLocaleString()}</strong><button type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))} className="grid h-9 place-items-center text-slate-400 hover:text-red-500 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button></div>})}<button type="button" onClick={() => setItems((current) => [...current, blankItem()])} className="m-3 flex h-10 w-[calc(100%-24px)] items-center justify-center gap-2 rounded-lg border border-dashed text-xs font-semibold text-primary hover:bg-blue-50"><Plus className="h-4 w-4"/>Add New Line</button></div></div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]"><div className="space-y-3"><label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-xs font-semibold hover:border-primary"><Paperclip className="h-4 w-4 text-primary"/>{attachment ? attachment.name : 'Add Attachments'}<input type="file" className="sr-only" onChange={(e) => setAttachment(e.target.files?.[0] || null)}/></label><label className="block text-xs font-semibold">Notes<textarea rows="5" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add customer notes, delivery timeline or other details..." className="mt-1.5 w-full rounded-lg border p-3 text-xs outline-none focus:border-primary"/></label></div><div className="rounded-xl bg-slate-50 p-5"><h3 className="text-sm font-bold">Quotation Total</h3><div className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><span>Amount</span><b>PKR {totals.subtotal.toLocaleString()}</b></div><div className="flex justify-between"><span>Tax</span><b>PKR {totals.tax.toLocaleString()}</b></div>{totals.discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount ({discount}%)</span><b>- PKR {totals.discountAmount.toLocaleString()}</b></div>}<div className="border-t pt-4 text-lg font-bold"><div className="flex justify-between"><span>Total (PKR)</span><span>PKR {totals.total.toLocaleString()}</span></div></div></div></div></div>

        <label className="mt-6 block text-xs font-semibold">Terms and Conditions<textarea rows="5" value={terms} onChange={(e) => setTerms(e.target.value)} className="mt-2 w-full rounded-xl border bg-slate-50 p-4 text-xs leading-6 outline-none focus:border-primary"/></label>
        {validation.length > 0 && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"><p className="font-bold">Please fill the following details:</p><ol className="mt-2 list-inside list-decimal space-y-1">{validation.map((issue) => <li key={issue}>{issue}</li>)}</ol></div>}
        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">{error}</p>}
        <div className="mt-7 flex flex-wrap justify-center gap-3"><button type="button" onClick={onClose} className="h-11 rounded-lg border px-6 text-xs font-semibold">Cancel</button><button disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-7 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50"><Save className="h-4 w-4"/>{saving ? 'Saving...' : 'Save & Send Quote'}</button></div>
      </div>
    </form>
  </div>
}
