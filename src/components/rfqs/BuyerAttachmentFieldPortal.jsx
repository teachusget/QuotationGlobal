import { Paperclip, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024

export default function BuyerAttachmentFieldPortal({ open, file, onChange, onError }) {
  const [target, setTarget] = useState(null)
  useEffect(() => { setTarget(open ? document.querySelector('form[aria-label="Request a quotation"] fieldset') : null) }, [open])
  if (!target) return null

  const selectFile = (event) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (selected.size > MAX_ATTACHMENT_SIZE) {
      onError('Attachment must be 2 MB or smaller.')
      event.target.value = ''
      return
    }
    onError('')
    onChange(selected)
  }

  return createPortal(<div className="mt-4">
    <p className="text-xs font-semibold">Supporting attachment <span className="font-normal text-slate-400">(optional)</span></p>
    {file ? <div className="mt-2 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-primary"><Paperclip className="h-4 w-4"/></span><span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-700">{file.name}</b><span className="text-[11px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span></span><button type="button" onClick={() => onChange(null)} aria-label="Remove attachment" className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button></div>
      : <label className="mt-2 flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-primary hover:bg-blue-50"><Upload className="h-5 w-5 text-primary"/><span><b className="block text-xs text-slate-700">Choose a file</b><span className="mt-0.5 block text-[10px] text-slate-400">Image, PDF, Word, Excel, CSV or text · Max 2 MB</span></span><input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.odt,.ods" className="sr-only" onChange={selectFile}/></label>}
  </div>, target)
}
