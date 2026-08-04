import { ImagePlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui'
import useDialogAccessibility from '../../hooks/useDialogAccessibility'

export default function IndustryModal({ open, industry, saving, serverError, onClose, onSave, onClearError }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('active')
  const [logo, setLogo] = useState(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const objectUrlRef = useRef('')
  const dirty = open && (name !== (industry?.name || '') || description !== (industry?.description || '') || status !== (industry?.status || 'active') || Boolean(logo))
  const requestClose = () => { if (dirty && !window.confirm('Discard your unsaved changes?')) return; onClose() }
  const dialogRef = useDialogAccessibility(open, requestClose, saving)
  useEffect(() => { if (!dirty) return undefined; const warn = (event) => { event.preventDefault(); event.returnValue = '' }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])

  useEffect(() => {
    if (!open) return
    setName(industry?.name || '')
    setDescription(industry?.description || '')
    setStatus(industry?.status || 'active')
    setLogo(null)
    setPreview(industry?.logo_url || '')
    setError('')

    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = ''
    }
  }, [open, industry])

  if (!open) return null

  const clearErrors = () => {
    setError('')
    onClearError()
  }

  const chooseLogo = (file) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Logo must be PNG, JPG or WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo size must be 2 MB or less.')
      return
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = URL.createObjectURL(file)
    setLogo(file)
    setPreview(objectUrlRef.current)
    clearErrors()
  }

  const submit = (event) => {
    event.preventDefault()
    if (saving) return
    if (!name.trim()) {
      setError('Industry name is required.')
      return
    }

    const data = new FormData()
    data.append('name', name.trim())
    data.append('description', description.trim())
    data.append('status', status)
    if (logo) data.append('logo', logo)
    onSave(data)
  }

  const visibleError = error || serverError

  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
    <button className="absolute inset-0 bg-slate-950/45" onClick={() => !saving && requestClose()} aria-label="Close modal"/>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="industry-modal-title" className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-overlay sm:max-h-[92vh]">
      <div className="flex h-14 items-center justify-between border-b px-5">
        <h2 id="industry-modal-title" className="text-base font-bold">{industry ? 'Edit Industry' : 'Add Industry'}</h2>
        <button type="button" onClick={requestClose} disabled={saving} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="Close"><X className="h-4 w-4"/></button>
      </div>
      <form onSubmit={submit} className="p-5">
        <div className="space-y-4">
          <div>
            <label htmlFor="industry-name" className="mb-1.5 block text-xs font-semibold">Industry Name <span className="text-red-500">*</span></label>
            <input id="industry-name" value={name} onChange={(event) => { setName(event.target.value); clearErrors() }} className={`h-10 w-full rounded-md border px-3 text-sm ${visibleError ? 'border-red-400' : ''}`} placeholder="e.g. Healthcare" maxLength={100} autoFocus/>
          </div>
          <div>
            <label htmlFor="industry-description" className="mb-1.5 block text-xs font-semibold">Description <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea id="industry-description" value={description} onChange={(event) => { setDescription(event.target.value); clearErrors() }} className="min-h-24 w-full rounded-md border px-3 py-2 text-sm" placeholder="Short industry description" maxLength={1000}/>
          </div>
          <div>
            <label htmlFor="industry-status" className="mb-1.5 block text-xs font-semibold">Status <span className="text-red-500">*</span></label>
            <select id="industry-status" value={status} onChange={(event) => { setStatus(event.target.value); clearErrors() }} className="h-10 w-full rounded-md border bg-white px-3 text-sm">
              <option value="active">Active</option>
              <option value="deactive">Deactive</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Logo <span className="font-normal text-slate-400">(optional)</span></label>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseLogo(event.target.files[0])} className="sr-only"/>
            <button type="button" onClick={() => fileRef.current?.click()} className="flex min-h-28 w-full items-center justify-center rounded-md border border-dashed bg-slate-50 p-3 text-slate-500 hover:border-primary hover:bg-blue-50">
              {preview ? <img src={preview} alt="Industry logo preview" className="h-20 w-20 rounded-md object-contain"/> : <span className="flex flex-col items-center gap-1.5 text-xs"><ImagePlus className="h-5 w-5"/>Upload PNG, JPG or WebP<span className="text-[11px] text-slate-400">Maximum 2 MB</span></span>}
            </button>
          </div>
          {visibleError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{visibleError}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="secondary" onClick={requestClose} disabled={saving}>Cancel</Button>
          <Button loading={saving}>{industry ? 'Save Changes' : 'Add Industry'}</Button>
        </div>
      </form>
    </div>
  </div>
}
