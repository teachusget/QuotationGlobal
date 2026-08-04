import { ChevronDown, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { getBrands } from '../api/brands'
import { getCategories } from '../api/categories'
import { getIndustries } from '../api/industries'
import { createService, deleteService, deleteServiceProduct, getServices, updateServiceProduct } from '../api/services'
import { getVendors } from '../api/vendors'
import { getSpecifications } from '../api/specifications'
import { useAuth } from '../auth/useAuth'
import useDialogAccessibility from '../hooks/useDialogAccessibility'

const subscriptionPlans = [{ value: 'monthly', label: 'Monthly', months: 1 }, { value: 'quarterly', label: 'Quarterly', months: 3 }, { value: 'semi_annual', label: 'Semi-Annual', months: 6 }, { value: 'annual', label: 'Annual / Yearly', months: 12 }]
const servicePlans = [{ value: 'hourly', label: 'Hourly', months: 1 / 720 }, { value: 'daily', label: 'Daily', months: 1 / 30 }, { value: 'monthly', label: 'Monthly', months: 1 }, { value: 'annual', label: 'Yearly', months: 12 }]
let pricingServiceType = ''
const plans = { map: (callback) => (pricingServiceType === 'services' ? servicePlans : subscriptionPlans).map(callback) }
const blank = { vendor_id: '', name: '', features: '', specifications: {}, service_type: '', ai_enabled: '', pricing_mode: 'starting_price', category_id: '', subcategory_id: '', industry_ids: [], brand_id: '', monthly_price: '', billing_cycles: [], discounts: {} }

export default function ServicesPage() {
  const { user } = useAuth()
  const isVendor = user?.account_type === 'vendor'
  const [services, setServices] = useState([]); const [categories, setCategories] = useState([]); const [subs, setSubs] = useState([]); const [industries, setIndustries] = useState([]); const [brands, setBrands] = useState([]); const [vendors, setVendors] = useState([]); const [form, setForm] = useState(blank); const [open, setOpen] = useState(false); const [editingId, setEditingId] = useState(null); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const [imageFiles, setImageFiles] = useState([]); const [editorTouched, setEditorTouched] = useState(false)
  const closeEditor = () => { if (editorTouched && !window.confirm('Discard your unsaved service changes?')) return; setOpen(false) }
  const dialogRef = useDialogAccessibility(open, closeEditor, saving)
  useEffect(() => { if (!editorTouched) return undefined; const warn = (event) => { event.preventDefault(); event.returnValue = '' }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [editorTouched])
  useEffect(() => {
    const load = async () => {
      const results = await Promise.allSettled([getServices(), getCategories(), getCategories('subcategory'), getIndustries(), getBrands()])
      const [serviceResult, categoryResult, subcategoryResult, industryResult, brandResult] = results
      if (serviceResult.status === 'fulfilled') setServices(serviceResult.value.data || [])
      if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value.data || [])
      if (subcategoryResult.status === 'fulfilled') setSubs(subcategoryResult.value.data || [])
      if (industryResult.status === 'fulfilled') setIndustries(industryResult.value || [])
      if (brandResult.status === 'fulfilled') setBrands((brandResult.value.data || []).filter((item) => item.status === 'approved'))
      if (!isVendor) {
        try { setVendors((await getVendors()).map((vendor) => ({ id: vendor.id, name: vendor.company_name || vendor.name }))) } catch (err) { setError(err.message) }
      }
      const failure = results.find((result) => result.status === 'rejected')
      if (failure) setError(failure.reason.message)
    }
    load()
  }, [isVendor])
  useEffect(() => {
    const addImages = (event) => { setEditorTouched(true); setImageFiles((current) => [...current, ...event.detail].slice(0, 8)) }
    const setAiEnabled = (event) => set('ai_enabled', event.detail)
    const editProduct = (event) => {
      const service = event.detail
      pricingServiceType = service.service_type
      const discounts = Object.fromEntries(service.plans.map((plan) => [plan.billing_cycle, Number(plan.discount_percent || 0)]))
      const specifications = Object.fromEntries((service.specification_values || []).map((item) => [item.specification_definition_id, item.value]))
      setForm({ vendor_id: String(service.vendor_id), name: service.name, features: service.features || '', specifications, service_type: service.service_type, ai_enabled: Boolean(service.ai_enabled), pricing_mode: service.pricing_mode, category_id: String(service.category_id), subcategory_id: String(service.subcategory_id), industry_ids: (service.industries || []).map((item) => String(item.id)), brand_id: (service.brands || []).map((item) => String(item.id)), monthly_price: String(service.monthly_price || 0), billing_cycles: service.plans.map((plan) => plan.billing_cycle), discounts })
      setEditingId(service.id); setError(''); setEditorTouched(false); setOpen(true)
      setTimeout(() => { window.dispatchEvent(new CustomEvent('service-ai-editor-value', { detail: Boolean(service.ai_enabled) })); window.dispatchEvent(new CustomEvent('service-specification-editor-value', { detail: { context: service, values: specifications } })) }, 0)
    }
    window.addEventListener('service-images-selected', addImages)
    window.addEventListener('service-ai-selected', setAiEnabled)
    window.addEventListener('service-edit-requested', editProduct)
    const setSpecifications = (event) => set('specifications', event.detail)
    window.addEventListener('service-specifications-changed', setSpecifications)
    return () => {
      window.removeEventListener('service-images-selected', addImages)
      window.removeEventListener('service-ai-selected', setAiEnabled)
      window.removeEventListener('service-edit-requested', editProduct)
      window.removeEventListener('service-specifications-changed', setSpecifications)
    }
  // Event listeners are intentionally registered once for this editor lifecycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const set = (key, value) => { setEditorTouched(true); if (key === 'service_type') pricingServiceType = value; const context = { ...form, [key]: value, ...(key === 'category_id' ? { subcategory_id: '' } : {}) }; setForm((old) => ({ ...old, [key]: value, ...(key === 'service_type' ? { specifications: {}, billing_cycles: value === 'services' ? servicePlans.map((plan) => plan.value) : [], discounts: {} } : {}), ...(key === 'category_id' ? { subcategory_id: '', specifications: {} } : {}), ...(key === 'subcategory_id' ? { specifications: {} } : {}) })); if (['service_type', 'category_id', 'subcategory_id'].includes(key)) setTimeout(() => { window.dispatchEvent(new CustomEvent('service-specification-context', { detail: context })); if (key === 'service_type') window.dispatchEvent(new CustomEvent('service-type-changed', { detail: value })) }, 0) }
  const remove = async (id) => { if (!window.confirm('Delete this billing plan?')) return; try { await deleteService(id); setServices((current) => current.filter((item) => item.id !== id)) } catch (err) { setError(err.message) } }
  const save = async (event) => { event.preventDefault(); if (form.ai_enabled === '') return setError('Please select whether this service is AI enabled.'); if (!form.industry_ids.length) return setError('Select at least one industry.'); if (!form.billing_cycles.length) return setError('Select at least one billing plan.'); setSaving(true); setError(''); try { const image_datas = await Promise.all(imageFiles.map((file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) }))); const payload = { ...form, features: form.features.trim(), image_datas, brand_ids: Array.isArray(form.brand_id) ? form.brand_id : form.brand_id ? [form.brand_id] : [] }; const result = editingId ? await updateServiceProduct(editingId, payload) : await createService(payload); if (editingId) return window.location.reload(); setServices((old) => [...result.data, ...old]); setOpen(false); setEditingId(null); setForm(blank); setImageFiles([]) } catch (err) { setError(err.message) } finally { setSaving(false) } }
  const flexible = form.pricing_mode === 'flexible_price'; const price = Number(form.monthly_price || 0); const filteredSubs = subs.filter((item) => String(item.parent_id) === String(form.category_id))
  return <section><div className="flex items-end justify-between"><div><h1 className="text-xl font-bold">{isVendor ? 'My Services' : 'Solutions / Services'}</h1><p className="mt-1 text-sm text-slate-500">{isVendor ? 'Manage your services and pricing.' : 'Review and manage all vendor services.'}</p></div><button onClick={() => { setError(''); setEditorTouched(false); setOpen(true) }} className="flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-xs font-semibold text-white"><Plus className="h-4 w-4"/>Add Service</button></div><ServiceTable services={services} onDelete={remove} showVendor={!isVendor}/>{open && <div className="fixed inset-0 z-[70] grid place-items-center p-4"><button onClick={closeEditor} className="absolute inset-0 bg-slate-950/45"/><form ref={dialogRef} role="dialog" aria-modal="true" aria-label="Service editor" onSubmit={save} className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-5"><div className="flex items-center justify-between border-b pb-3"><h2 className="font-bold">Add Service</h2><button type="button" onClick={closeEditor}><X className="h-5 w-5"/></button></div><div className="mt-4 grid gap-4 sm:grid-cols-2">{!isVendor && <Drop label="Vendor" value={form.vendor_id} onChange={(v) => set('vendor_id', v)} options={vendors} required wide/>}<Text label="Service Name" value={form.name} onChange={(v) => set('name', v)} required wide/><div className="sm:col-span-2"><label className="text-xs font-semibold">Features & Details <span className="font-normal text-slate-400">(one point per line)</span><textarea value={form.features} onChange={(event) => set('features', event.target.value)} maxLength={5000} rows="5" placeholder={'Cloud-based access\nAutomated reports and dashboards\nMobile app support\nImplementation and training included'} className="mt-1.5 w-full resize-y rounded-md border p-3 text-sm font-normal leading-5 outline-none focus:border-primary"/></label><p className="mt-1 text-right text-[11px] text-slate-400">{form.features.length}/5000</p></div><Drop label="Category" value={form.category_id} onChange={(v) => set('category_id', v)} options={categories} required/><Drop label="Subcategory" value={form.subcategory_id} onChange={(v) => set('subcategory_id', v)} options={filteredSubs} required/><MultiIndustries options={industries} value={form.industry_ids} onChange={(v) => set('industry_ids', v)}/><Drop label="Service Type" value={form.service_type} onChange={(v) => set('service_type', v)} options={['software', 'hardware', 'services'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} required/><Drop label="Brand" value={form.brand_id} onChange={(v) => set('brand_id', v)} options={brands}/><div className="sm:col-span-2"><label className="text-xs font-semibold">Price Display *</label><div className="mt-1.5 inline-flex rounded-md border p-1"><button type="button" onClick={() => set('pricing_mode', 'starting_price')} className={`rounded px-4 py-2 text-xs font-semibold ${!flexible ? 'bg-primary text-white' : ''}`}>Fixed Price</button><button type="button" onClick={() => set('pricing_mode', 'flexible_price')} className={`rounded px-4 py-2 text-xs font-semibold ${flexible ? 'bg-primary text-white' : ''}`}>Flexible Price</button></div></div><Text label={flexible ? 'Flexible Starting Price (USD)' : 'Fixed Monthly Price (USD)'} value={form.monthly_price} onChange={(v) => set('monthly_price', v)} type="number" required/></div><div className="mt-5 rounded-md border p-3"><h3 className="text-xs font-bold">Billing Plans & Discounts</h3>{plans.map((plan) => { const checked = form.billing_cycles.includes(plan.value); const discount = Number(form.discounts[plan.value] || 0); const total = price * plan.months * (1 - discount / 100); return <div key={plan.value} className="mt-2 grid grid-cols-[auto_1fr_90px] gap-3 rounded border p-2"><input type="checkbox" checked={checked} onChange={() => set('billing_cycles', checked ? form.billing_cycles.filter((item) => item !== plan.value) : [...form.billing_cycles, plan.value])}/><span className="text-xs"><b>{plan.label}</b><br/>{flexible ? `Flexible from $${total.toFixed(2)}` : `$${total.toFixed(2)}`}</span><label className="text-[11px]">Discount %<input type="number" min="0" max="100" disabled={!checked} value={form.discounts[plan.value] || ''} onChange={(e) => set('discounts', { ...form.discounts, [plan.value]: e.target.value })} className="mt-1 h-8 w-full border px-2"/></label></div> })}</div>{error && <p className="mt-4 text-xs text-red-600">{error}</p>}<div className="mt-5 text-right"><button disabled={saving} className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-white">Save Service</button></div></form></div>}</section>
}
const editProduct = (service) => window.dispatchEvent(new CustomEvent('service-edit-requested', { detail: service }))

async function deleteProduct(service) {
  const result = await Swal.fire({ icon: 'warning', title: 'Delete complete service?', text: `${service.name} and all of its pricing plans will be permanently deleted.`, showCancelButton: true, confirmButtonText: 'Delete service', confirmButtonColor: '#dc2626' })
  if (!result.isConfirmed) return
  try { await deleteServiceProduct(service.id); window.location.reload() } catch (error) { Swal.fire({ icon: 'error', title: 'Delete failed', text: error.message }) }
}

function ServiceTable({ services, showVendor = false }) {
  const planLabels = { hourly: 'Hourly', daily: 'Daily', monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-Annual', annual: 'Annual / Yearly' }
  const grouped = Object.values(services.reduce((all, service) => {
    const key = [service.name, service.service_type, service.category_id, service.subcategory_id, service.pricing_mode].join('|')
    if (!all[key]) all[key] = { ...service, plans: [] }
    all[key].plans.push(service)
    return all
  }, {}))
  return <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
    <table className={`service-data-table ${showVendor ? 'with-vendor' : ''} w-full min-w-[940px] text-left text-xs`}>
      <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="p-3">Service</th>{showVendor && <th className="p-3">Vendor</th>}<th className="p-3">Type</th><th className="p-3">Industries</th><th className="p-3">Brand</th><th className="p-3">Pricing Plans</th><th className="p-3">Action</th></tr></thead>
      <tbody>{grouped.map((service) => <tr key={service.id} className="border-t align-top">
        <td className="p-3 font-semibold">{service.name}</td>
        {showVendor && <td className="p-3 text-slate-600">{service.vendor?.company_name || service.vendor?.name || '-'}</td>}
        <td className="p-3 capitalize">{service.service_type}</td>
        <td className="max-w-44 p-3 leading-5">{service.industries?.map((industry) => industry.name).join(', ') || '-'}</td>
        <td className="p-3">{service.brands?.map((brand) => brand.name).join(', ') || '-'}</td>
        <td className="p-3"><div className="flex max-w-sm flex-wrap gap-1.5">{service.plans.map((plan) => <span key={plan.id} className="rounded bg-slate-100 px-2 py-1 leading-5"><b>{planLabels[plan.billing_cycle]}</b> <strong className="ml-1 text-primary">{plan.pricing_mode === 'flexible_price' ? `Flexible $${Number(plan.price_from).toLocaleString()}` : `$${Number(plan.price_from).toLocaleString()}`}</strong>{Number(plan.discount_percent || 0) > 0 && <em className="ml-1 not-italic text-emerald-700">{plan.discount_percent}% OFF</em>}</span>)}</div></td>
        <td className="p-3"><div className="flex gap-3"><button type="button" onClick={() => editProduct(service)} className="font-semibold text-primary hover:underline">Edit Service</button><button type="button" onClick={() => deleteProduct(service)} className="font-semibold text-red-600 hover:underline">Delete Service</button></div></td>
      </tr>)}{!grouped.length && <tr><td colSpan={showVendor ? 7 : 6} className="p-10 text-center text-sm text-slate-500">No services added yet.</td></tr>}</tbody>
    </table>
  </div>
}
function MultiIndustries({ options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const toggle = (id) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id])
  const filtered = options.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
  const allVisibleSelected = filtered.length > 0 && filtered.every((item) => value.includes(String(item.id)) || value.includes(item.id))
  const toggleAll = () => {
    const visibleIds = filtered.map((item) => String(item.id))
    onChange(allVisibleSelected ? value.filter((id) => !visibleIds.includes(String(id))) : [...new Set([...value.map(String), ...visibleIds])])
  }
  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!rootRef.current?.contains(event.target)) { setOpen(false); setQuery('') } }
    const escape = (event) => { if (event.key === 'Escape') { setOpen(false); setQuery('') } }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [open])
  return <div ref={rootRef} className="relative"><label className="text-xs font-semibold">Industry *</label><button type="button" onClick={() => { setOpen(!open); if (open) setQuery('') }} className="mt-1.5 flex h-10 w-full items-center justify-between rounded-md border px-3 text-left text-sm"><span>{value.length ? `${value.length} industries selected` : 'Select industries'}</span><ChevronDown className="h-4 w-4"/></button>{open && <div className="absolute z-30 mt-1 w-full rounded-md border bg-white p-2 shadow-floating"><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search industries..." className="mb-2 h-9 w-full rounded border px-3 text-sm outline-none focus:border-primary"/>{filtered.length ? <><button type="button" onClick={toggleAll} className="mb-2 w-full rounded bg-blue-50 px-2 py-2 text-left text-xs font-semibold text-primary hover:bg-blue-100">{allVisibleSelected ? 'Clear All' : 'Select All'}</button><div className="max-h-48 overflow-y-auto">{filtered.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-slate-50"><input type="checkbox" checked={value.includes(String(item.id)) || value.includes(item.id)} onChange={() => toggle(String(item.id))}/>{item.name}</label>)}</div></> : <p className="px-2 py-3 text-xs text-slate-500">No industries found.</p>}</div>}</div>
}
function Text({ label, value, onChange, required, type = 'text', wide }) {
  const [previews, setPreviews] = useState([])
  const [serviceType, setServiceType] = useState(pricingServiceType)
  useEffect(() => { const changed = (event) => setServiceType(event.detail); window.addEventListener('service-type-changed', changed); return () => window.removeEventListener('service-type-changed', changed) }, [])
  const selectImages = (event) => {
    const added = [...event.target.files]
    const files = [...previews.map((image) => image.file), ...added].slice(0, 8)
    setPreviews(files.map((file) => ({ file, name: file.name, url: URL.createObjectURL(file) })))
    window.dispatchEvent(new CustomEvent('service-images-selected', { detail: added }))
    event.target.value = ''
  }
  const shownLabel = serviceType === 'services' && type === 'number' ? (label.startsWith('Flexible') ? 'Flexible Monthly Base Rate (USD)' : 'Fixed Monthly Base Rate (USD)') : label
  return <div className={`text-xs font-semibold ${wide ? 'sm:col-span-2' : ''}`}>
    <label>{shownLabel}{required && ' *'}<input type={type} value={value} required={required} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} onChange={(e) => onChange(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border px-3 text-sm font-normal"/></label>
    {label === 'Service Name' && <label className="mt-3 block">Service Images <span className="font-normal text-slate-500">(up to 8 PNG, JPG or WebP files)</span><input id="service-image" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={selectImages} className="mt-1.5 block w-full text-xs font-normal"/>{previews.length > 0 && <span className="mt-3 grid grid-cols-4 gap-2">{previews.map((image) => <img key={image.url} src={image.url} alt={image.name} className="h-16 w-full rounded border object-cover"/>)}</span>}</label>}
  </div>
}

function AiAndSpecifications() {
  const [aiEnabled, setAiEnabled] = useState('')
  useEffect(() => { const load = (event) => setAiEnabled(event.detail ? 'yes' : 'no'); window.addEventListener('service-ai-editor-value', load); return () => window.removeEventListener('service-ai-editor-value', load) }, [])
  const selectAi = (selected) => { setAiEnabled(selected); window.dispatchEvent(new CustomEvent('service-ai-selected', { detail: selected === 'yes' })) }
  return <><fieldset className="rounded-md border border-blue-100 bg-blue-50/60 p-3"><legend className="px-1 text-xs font-semibold">Is this service AI enabled? *</legend><div className="mt-1 flex gap-5">{['yes', 'no'].map((option) => <label key={option} className="flex cursor-pointer items-center gap-2 text-sm font-medium capitalize"><input required type="radio" name="ai_enabled" value={option} checked={aiEnabled === option} onChange={() => selectAi(option)} className="h-4 w-4"/>{option}</label>)}</div></fieldset><StructuredSpecifications/></>
}

function StructuredSpecifications() {
  const [definitions, setDefinitions] = useState([])
  const [values, setValues] = useState({})
  const [expanded, setExpanded] = useState(true)
  const load = (context = {}) => {
    if (!context.service_type) { setDefinitions([]); return }
    getSpecifications({ service_type: context.service_type, category_id: context.category_id, subcategory_id: context.subcategory_id }).then((result) => {
      setDefinitions(result.data || [])
    }).catch(() => setDefinitions([]))
  }
  useEffect(() => {
    const contextChanged = (event) => load(event.detail)
    const editorValue = (event) => { setValues(event.detail.values || {}); load(event.detail.context) }
    window.addEventListener('service-specification-context', contextChanged)
    window.addEventListener('service-specification-editor-value', editorValue)
    return () => { window.removeEventListener('service-specification-context', contextChanged); window.removeEventListener('service-specification-editor-value', editorValue) }
  }, [])
  const change = (id, value) => { const next = { ...values, [id]: value }; setValues(next); window.dispatchEvent(new CustomEvent('service-specifications-changed', { detail: next })) }
  if (!definitions.length) return null
  return <section className="mt-4 overflow-hidden rounded-lg border border-blue-100 bg-blue-50/40"><button type="button" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded} className="flex w-full items-center justify-between bg-white/70 px-4 py-3 text-left text-xs font-bold text-slate-800 hover:bg-blue-50"><span>Features & Details</span><ChevronDown className={`h-4 w-4 text-primary transition-transform ${expanded ? 'rotate-180' : ''}`}/></button>{expanded && <div className="border-t border-blue-100 p-3"><p className="mb-3 text-[11px] font-normal text-slate-500">Complete the specifications available in this product. Leave unavailable features unchecked.</p><div className="grid gap-2 sm:grid-cols-2">{definitions.map((item) => <SpecificationInput key={item.id} item={item} value={values[item.id] ?? ''} onChange={(value) => change(item.id, value)}/>)}</div></div>}</section>
}

function SpecificationInput({ item, value, onChange }) {
  if (item.field_type === 'boolean') return <label className={`flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-xs font-semibold ${value === 'yes' ? 'border-primary bg-white text-primary' : 'border-slate-200 bg-white/70 text-slate-600'}`}><input type="checkbox" checked={value === 'yes'} onChange={(event) => onChange(event.target.checked ? 'yes' : '')} className="h-4 w-4 rounded border-slate-300 text-primary"/>{item.name}</label>
  let duration = { amount: '', unit: 'Days' }
  if (item.field_type === 'duration' && value) { try { duration = { ...duration, ...JSON.parse(value) } } catch { duration.amount = value } }
  if (item.field_type === 'duration') {
    const update = (part, nextValue) => onChange(nextValue === '' && part === 'amount' ? '' : JSON.stringify({ ...duration, [part]: nextValue }))
    return <label className="text-xs font-semibold">{item.name}{item.is_required && ' *'}<span className="mt-1 flex"><input required={item.is_required} type="number" min="0" step="1" value={duration.amount} onChange={(event) => update('amount', event.target.value)} placeholder="e.g. 30" className="h-9 min-w-0 flex-1 rounded-l border px-2 font-normal"/><select value={duration.unit} onChange={(event) => update('unit', event.target.value)} className="h-9 rounded-r border border-l-0 bg-white px-2 font-normal"><option>Days</option><option>Months</option><option>Years</option></select></span></label>
  }
  return <label className="text-xs font-semibold">{item.name}{item.is_required && ' *'}{item.field_type === 'select' ? <select required={item.is_required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full rounded border bg-white px-2 font-normal"><option value="">Select</option>{(item.options || []).map((option) => <option key={option}>{option}</option>)}</select> : <input required={item.is_required} type={item.field_type === 'number' ? 'number' : 'text'} value={value} onChange={(event) => onChange(event.target.value)} placeholder={item.unit || ''} className="mt-1 h-9 w-full rounded border bg-white px-2 font-normal"/>}</label>
}
function Drop({ label, value, onChange, options, required }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const root = useRef(null)
  const multi = label === 'Brand'
  const selected = Array.isArray(value) ? value : []
  const list = options.filter((item) => String(item.name || item.label).toLowerCase().includes(query.toLowerCase()))
  useEffect(() => { if (!open) return undefined; const close = (event) => !root.current?.contains(event.target) && setOpen(false); document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close) }, [open])
  if (multi) {
    const all = list.length && list.every((item) => selected.includes(String(item.id)))
    const toggle = (id) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
    return <><div ref={root} className="relative"><label className="text-xs font-semibold">Brand</label><button type="button" onClick={() => setOpen(!open)} className="mt-1.5 flex h-10 w-full items-center justify-between rounded-md border px-3 text-left text-sm"><span>{selected.length ? `${selected.length} brands selected` : 'Select brands'}</span><ChevronDown className="h-4 w-4"/></button>{open && <div className="absolute z-30 mt-1 w-full rounded border bg-white p-2 shadow-floating"><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search brands..." className="mb-2 h-9 w-full rounded border px-2 text-sm"/><button type="button" onClick={() => onChange(all ? selected.filter((id) => !list.some((item) => String(item.id) === String(id))) : [...new Set([...selected, ...list.map((item) => String(item.id))])])} className="mb-2 w-full rounded bg-blue-50 px-2 py-2 text-left text-xs font-semibold text-primary">{all ? 'Clear All' : 'Select All'}</button><div className="max-h-40 overflow-y-auto">{list.map((item) => <label key={item.id} className="flex gap-2 px-2 py-2 text-sm"><input type="checkbox" checked={selected.includes(String(item.id))} onChange={() => toggle(String(item.id))}/>{item.name}</label>)}</div></div>}</div><div className="sm:col-span-2"><AiAndSpecifications/></div></>
  }
  return <label className="text-xs font-semibold">{label}{required && ' *'}<select value={value} required={required} onChange={(e) => onChange(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-white px-3 text-sm font-normal"><option value="">Select {label}</option>{options.map((item) => <option key={item.id || item.value} value={item.id || item.value}>{item.name || item.label}</option>)}</select></label>
}
