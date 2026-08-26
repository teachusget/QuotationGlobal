import { CalendarDays, FileUp, Paperclip, X } from 'lucide-react'
import { useState } from 'react'

const allowed = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp'

export default function UploadQuoteModal({ request, saving, error, onClose, onSend }) {
  const [file, setFile] = useState(null)
  const [amount, setAmount] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('Please review the attached formal quotation.')
  const [validation, setValidation] = useState('')
  const submit = (event) => {
    event.preventDefault()
    if (!file) return setValidation('Please select a quotation file.')
    if (!amount || Number(amount) <= 0) return setValidation('Enter the quotation total amount.')
    if (!validUntil) return setValidation('Select the quotation validity date.')
    if (notes.trim().length < 10) return setValidation('Notes must contain at least 10 characters.')
    setValidation('')
    onSend({ quoted_price: Number(amount).toFixed(2), quote_valid_until: validUntil, quote_message: notes.trim(), quote_terms: 'Terms and conditions are included in the uploaded quotation.', vendor_attachment: file })
  }
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Upload quotation">
    <form onSubmit={submit} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-overlay">
      <div className="flex items-start justify-between border-b px-6 py-5"><div><h2 className="text-lg font-bold text-slate-900">Upload Quotation</h2><p className="mt-1 text-xs text-slate-500">{request.service?.name} · RFQ #{request.id}</p></div><button type="button" disabled={saving} onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border text-slate-500"><X className="h-4 w-4"/></button></div>
      <div className="space-y-5 p-6">
        <label className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition hover:border-primary hover:bg-blue-50/40 ${file ? 'border-primary bg-blue-50' : 'border-slate-200'}`}><FileUp className="h-7 w-7 text-primary"/><b className="mt-2 max-w-full truncate text-xs text-slate-700">{file?.name || 'Choose quotation file'}</b><span className="mt-1 text-[10px] text-slate-400">PDF, DOC, XLS or image · Maximum 1 MB</span><input type="file" className="sr-only" accept={allowed} onChange={(event) => { const selected = event.target.files?.[0]; if (selected?.size > 1024 * 1024) { setValidation('Quotation file must be smaller than 1 MB.'); event.target.value = ''; setFile(null); return } setValidation(''); setFile(selected || null) }}/></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Quotation total (PKR)<span className="text-red-500"> *</span><div className="relative mt-1.5"><Paperclip className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 45000" className="h-11 w-full rounded-lg border pl-10 pr-3 outline-none focus:border-primary"/></div></label><label className="text-xs font-semibold text-slate-700">Valid until<span className="text-red-500"> *</span><div className="relative mt-1.5"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input type="date" min={new Date().toISOString().slice(0, 10)} value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="h-11 w-full rounded-lg border pl-10 pr-3 outline-none focus:border-primary"/></div></label></div>
        <label className="block text-xs font-semibold text-slate-700">Message to buyer<span className="text-red-500"> *</span><textarea rows="3" value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1.5 w-full rounded-lg border p-3 text-xs outline-none focus:border-primary"/></label>
        {(validation || error) && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">{validation || error}</p>}
      </div>
      <div className="flex justify-end gap-3 border-t bg-slate-50 px-6 py-4"><button type="button" disabled={saving} onClick={onClose} className="h-10 rounded-lg border bg-white px-5 text-xs font-semibold text-slate-600">Cancel</button><button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold text-white disabled:opacity-50"><FileUp className="h-4 w-4"/>{saving ? 'Uploading...' : 'Upload & Send'}</button></div>
    </form>
  </div>
}
