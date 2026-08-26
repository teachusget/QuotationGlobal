import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const options = [
  { value: 'manual', label: 'Manual' },
  { value: 'spreadsheet', label: 'Excel Sheet / Google Sheet' },
  { value: 'customized_in_house', label: 'Customized in-house' },
  { value: 'brand', label: 'Brand' },
]

export default function CurrentlyUsingFieldPortal({ open, value, brandName, onChange, onBrandNameChange }) {
  const [target, setTarget] = useState(null)
  useEffect(() => {
    if (!open) { setTarget(null); return undefined }
    const fieldset = document.querySelector('form[aria-label="Request a quotation"] fieldset')
    if (!fieldset?.parentNode) return undefined
    const mount = document.createElement('div')
    fieldset.parentNode.insertBefore(mount, fieldset)
    setTarget(mount)
    return () => { setTarget(null); mount.remove() }
  }, [open])
  if (!target) return null

  return createPortal(<div className="mt-4">
    <p className="text-xs font-semibold">Currently using *</p>
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{options.map((option) => <label key={option.value} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${value === option.value ? 'border-primary bg-blue-50 text-primary ring-1 ring-primary' : 'text-slate-600 hover:border-blue-300'}`}><input type="radio" name="currently_using" required value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"/><span>{option.label}</span></label>)}</div>
    {value === 'brand' && <label className="mt-3 block text-xs font-semibold">Brand / product name *<input required maxLength={150} value={brandName} onChange={(event) => onBrandNameChange(event.target.value)} placeholder="e.g. SAP, Oracle, QuickBooks" className="mt-1.5 h-10 w-full rounded-md border px-3 text-sm font-normal outline-none focus:border-primary"/></label>}
  </div>, target)
}
