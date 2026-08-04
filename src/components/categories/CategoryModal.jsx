import { ImagePlus, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui'
import useDialogAccessibility from '../../hooks/useDialogAccessibility'

export default function CategoryModal({ open, type, categories, item, onClose, onSave, saving, serverError, onClearError }) {
  const [name, setName] = useState('')
  const [details, setDetails] = useState('')
  const [parentId, setParentId] = useState('')
  const [logo, setLogo] = useState(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [keyPoints, setKeyPoints] = useState([])
  const [keyPoint, setKeyPoint] = useState('')
  const fileRef = useRef(null)
  const objectUrlRef = useRef('')
  const dirty = open && (name !== (item?.name || '') || details !== (item?.details || '') || String(parentId) !== String(item?.parent_id || '') || Boolean(logo) || JSON.stringify(keyPoints) !== JSON.stringify(Array.isArray(item?.key_points) ? item.key_points : []))
  const requestClose = () => { if (dirty && !window.confirm('Discard your unsaved changes?')) return; onClose() }
  const dialogRef = useDialogAccessibility(open, requestClose, saving)

  useEffect(() => { if (!dirty) return undefined; const warn = (event) => { event.preventDefault(); event.returnValue = '' }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])

  useEffect(() => {
    if (!open) return
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = ''
    setName(item?.name || '')
    setDetails(item?.details || '')
    setParentId(item?.parent_id || '')
    setLogo(null)
    setPreview(item?.logo_url || '')
    setError('')
    setKeyPoints(Array.isArray(item?.key_points) ? item.key_points : [])
    setKeyPoint('')
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = ''
    }
  }, [open, item])

  if (!open) return null

  const clearErrors = () => {
    setError('')
    onClearError()
  }

  const chooseLogo = (file) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Logo must be PNG, JPG or WebP.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Logo size must be 2 MB or less.'); return }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = URL.createObjectURL(file)
    setLogo(file)
    setPreview(objectUrlRef.current)
    clearErrors()
  }

  const submit = (event) => {
    event.preventDefault()
    if (saving) return
    if (!name.trim()) { setError('Name is required.'); return }
    if (type === 'subcategory' && !parentId) { setError('Select a parent category.'); return }
    const data = new FormData()
    data.append('name', name.trim())
    data.append('details', details.trim())
    data.append('type', type)
    if (parentId) data.append('parent_id', parentId)
    if (logo) data.append('logo', logo)
    if (type === 'subcategory') data.append('key_points_json', JSON.stringify(keyPoints))
    onSave(data)
  }

  const addKeyPoint = () => {
    const value = keyPoint.trim()
    if (!value || keyPoints.some((point) => point.toLowerCase() === value.toLowerCase())) return
    setKeyPoints((current) => [...current, value])
    setKeyPoint('')
  }

  const entityLabel = type === 'brand' ? 'Brand' : type === 'category' ? 'Category' : 'Sub Category'
  const title = `${item ? 'Edit' : 'Add'} ${entityLabel}`
  const visibleError = error || serverError

  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
    <button className="absolute inset-0 bg-slate-950/45" onClick={() => !saving && requestClose()} aria-label="Close modal"/>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="category-modal-title" className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-overlay sm:max-h-[92vh]">
      <div className="flex h-14 items-center justify-between border-b px-5">
        <h2 id="category-modal-title" className="text-base font-bold">{title}</h2>
        <button onClick={requestClose} disabled={saving} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="Close"><X className="h-4 w-4"/></button>
      </div>
      <form onSubmit={submit} className="p-5">
        <div className="space-y-4">
          {type === 'subcategory' && <div><label htmlFor="parent-category" className="mb-1.5 block text-xs font-semibold">Parent category <span className="text-red-500">*</span></label><select id="parent-category" value={parentId} onChange={(event) => { setParentId(event.target.value); clearErrors() }} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>}
          <div><label htmlFor="category-name" className="mb-1.5 block text-xs font-semibold">Name <span className="text-red-500">*</span></label><input id="category-name" value={name} onChange={(event) => { setName(event.target.value); clearErrors() }} className={`h-10 w-full rounded-md border px-3 text-sm ${visibleError ? 'border-red-400' : ''}`} placeholder={type === 'brand' ? 'e.g. Microsoft' : type === 'category' ? 'e.g. Cloud Computing' : 'e.g. Cloud Storage'} maxLength={100} autoFocus/></div>
          <div><label className="mb-1.5 block text-xs font-semibold">Logo <span className="font-normal text-slate-400">(optional)</span></label><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseLogo(event.target.files[0])} className="sr-only"/><button type="button" onClick={() => fileRef.current?.click()} className="flex min-h-24 w-full items-center justify-center rounded-md border border-dashed bg-slate-50 p-3 text-slate-500 hover:border-primary hover:bg-blue-50">{preview ? <img src={preview} alt="Logo preview" className="h-16 w-16 rounded-md object-contain"/> : <span className="flex flex-col items-center gap-1.5 text-xs"><ImagePlus className="h-5 w-5"/>Upload PNG, JPG or WebP<span className="text-[11px] text-slate-400">Maximum 2 MB</span></span>}</button></div>
          <div><label htmlFor="category-details" className="mb-1.5 block text-xs font-semibold">Details <span className="font-normal text-slate-400">(optional)</span></label><textarea id="category-details" value={details} onChange={(event) => { setDetails(event.target.value); clearErrors() }} rows="4" className="w-full resize-y rounded-md border p-3 text-sm" placeholder="Add a short description" maxLength={1000}/><div className="mt-1 text-right text-[11px] text-slate-400">{details.length}/1000</div></div>
          {type === 'subcategory' && <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3"><label className="text-xs font-semibold">Features & comparison key points</label><p className="mt-1 text-[11px] text-slate-500">Add points one by one. Vendor will tick the features available in their product.</p><div className="mt-3 flex gap-2"><input value={keyPoint} onChange={(event) => setKeyPoint(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addKeyPoint() } }} maxLength={120} placeholder="e.g. Role-Based Access Control" className="h-10 min-w-0 flex-1 rounded-md border bg-white px-3 text-sm"/><button type="button" onClick={addKeyPoint} className="inline-flex h-10 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-white"><Plus className="h-4 w-4"/>Add</button></div><div className="mt-3 flex flex-wrap gap-2">{keyPoints.map((point, index) => <span key={`${point}-${index}`} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-medium">{point}<button type="button" onClick={() => setKeyPoints((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${point}`}><X className="h-3.5 w-3.5 text-red-500"/></button></span>)}{!keyPoints.length && <span className="text-[11px] text-slate-400">No key points added yet.</span>}</div></div>}
          {visibleError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{visibleError}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t pt-4"><Button type="button" variant="secondary" onClick={requestClose} disabled={saving}>Cancel</Button><Button loading={saving}>{saving ? 'Saving' : item ? 'Save changes' : `Add ${entityLabel.toLowerCase()}`}</Button></div>
      </form>
    </div>
  </div>
}
