import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCategories } from '../api/categories'
import { createSpecification, deleteSpecification, getSpecifications, updateSpecification } from '../api/specifications'

const empty = { service_type: '', category_id: '', subcategory_id: '', field_type: 'boolean', options_text: '', unit: '', is_required: false, is_comparable: true }

export default function SpecificationTemplatesPage() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [subs, setSubs] = useState([])
  const [form, setForm] = useState(empty)
  const [point, setPoint] = useState('')
  const [points, setPoints] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const load = () => getSpecifications().then((result) => setItems(result.data || [])).catch((err) => setError(err.message))
  useEffect(() => { load(); getCategories().then((result) => setCategories(result.data || [])); getCategories('subcategory').then((result) => setSubs(result.data || [])) }, [])
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value, ...(key === 'category_id' ? { subcategory_id: '' } : {}) }))
  const addPoint = () => { const value = point.trim(); if (!value || points.some((item) => item.toLowerCase() === value.toLowerCase())) return; setPoints((current) => [...current, value]); setPoint('') }
  const save = async (event) => {
    event.preventDefault()
    if (!points.length) return setError('Add at least one specification.')
    setSaving(true); setError('')
    const shared = { ...form, service_type: form.service_type || null, category_id: form.category_id || null, subcategory_id: form.subcategory_id || null, options: form.options_text.split(',').map((item) => item.trim()).filter(Boolean) }
    try { if (editing) await updateSpecification(editing.id, { ...shared, name: points[0], sort_order: editing.sort_order || 0 }); else await Promise.all(points.map((name, index) => createSpecification({ ...shared, name, sort_order: items.length + index }))); setPoints([]); setPoint(''); setForm(empty); setEditing(null); await load() } catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  const edit = (item) => { setEditing(item); setPoints([item.name]); setPoint(''); setError(''); setForm({ service_type: item.service_type || '', category_id: item.category_id ? String(item.category_id) : '', subcategory_id: item.subcategory_id ? String(item.subcategory_id) : '', field_type: item.field_type, options_text: (item.options || []).join(', '), unit: item.unit || '', is_required: Boolean(item.is_required), is_comparable: Boolean(item.is_comparable) }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const cancelEdit = () => { setEditing(null); setPoints([]); setPoint(''); setForm(empty); setError('') }
  const remove = async (item) => { if (!confirm(`Delete ${item.name}? Existing saved values will also be removed.`)) return; await deleteSpecification(item.id); load() }
  const filteredSubs = subs.filter((item) => !form.category_id || String(item.parent_id) === String(form.category_id))
  const categoryName = (id) => categories.find((item) => String(item.id) === String(id))?.name
  const subcategoryName = (id) => subs.find((item) => String(item.id) === String(id))?.name

  return <section>
    <div><h1 className="text-xl font-bold">Specification Templates</h1><p className="mt-1 text-sm text-slate-500">Select the scope once, add multiple specifications, then save them together.</p></div>
    <form onSubmit={save} className="mt-5 rounded-lg border bg-white p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-semibold">Solution type<select value={form.service_type} onChange={(e) => set('service_type', e.target.value)} className="mt-1.5 h-10 w-full rounded border bg-white px-3 text-sm font-normal"><option value="">All types</option><option value="software">Software</option><option value="hardware">Hardware</option><option value="services">Services</option></select></label>
        <label className="text-xs font-semibold">Category<select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} className="mt-1.5 h-10 w-full rounded border bg-white px-3 text-sm font-normal"><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-xs font-semibold">Subcategory<select value={form.subcategory_id} onChange={(e) => set('subcategory_id', e.target.value)} className="mt-1.5 h-10 w-full rounded border bg-white px-3 text-sm font-normal"><option value="">All subcategories</option>{filteredSubs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-xs font-semibold">Answer type<select value={form.field_type} onChange={(e) => set('field_type', e.target.value)} className="mt-1.5 h-10 w-full rounded border bg-white px-3 text-sm font-normal"><option value="boolean">Checkbox (Available / Not available)</option><option value="text">Text</option><option value="number">Number</option><option value="duration">Duration (Days / Months / Years)</option><option value="select">Dropdown</option><option value="multiselect">Multi-select / text</option></select></label>
        <label className="text-xs font-semibold">Dropdown options<input value={form.options_text} onChange={(e) => set('options_text', e.target.value)} disabled={!['select', 'multiselect'].includes(form.field_type)} placeholder="Cloud, On-premise, Hybrid" className="mt-1.5 h-10 w-full rounded border px-3 text-sm font-normal disabled:bg-slate-100"/></label>
        <label className="text-xs font-semibold">Unit<input value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="GB, users, days" className="mt-1.5 h-10 w-full rounded border px-3 text-sm font-normal"/></label>
      </div>
      <div className="mt-4 flex gap-5"><label className="flex gap-2 text-xs font-semibold"><input type="checkbox" checked={form.is_required} onChange={(e) => set('is_required', e.target.checked)}/>Required</label><label className="flex gap-2 text-xs font-semibold"><input type="checkbox" checked={form.is_comparable} onChange={(e) => set('is_comparable', e.target.checked)}/>Show in comparison</label></div>
      <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50/50 p-4"><h2 className="text-xs font-bold">Specifications / feature points</h2><p className="mt-1 text-[11px] text-slate-500">Add all points one by one. The settings selected above apply to every point in this batch.</p><div className="mt-3 flex gap-2"><input value={point} onChange={(e) => setPoint(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPoint() } }} maxLength={120} placeholder="e.g. Role-Based Access Control" className="h-10 min-w-0 flex-1 rounded-md border bg-white px-3 text-sm"/><button type="button" onClick={addPoint} className="inline-flex h-10 items-center gap-1 rounded bg-primary px-4 text-xs font-semibold text-white"><Plus className="h-4 w-4"/>Add</button></div><div className="mt-3 flex flex-wrap gap-2">{points.map((item, index) => <span key={`${item}-${index}`} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-medium">{item}<button type="button" onClick={() => setPoints((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X className="h-3.5 w-3.5 text-red-500"/></button></span>)}{!points.length && <span className="text-[11px] text-slate-400">No specifications added yet.</span>}</div></div>
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">{editing && <button type="button" onClick={cancelEdit} className="h-10 rounded border px-5 text-xs font-semibold">Cancel Edit</button>}<button disabled={saving || !points.length} className="inline-flex h-10 items-center gap-2 rounded bg-primary px-5 text-xs font-semibold text-white disabled:opacity-50">{editing ? <Pencil className="h-4 w-4"/> : <Plus className="h-4 w-4"/>}{saving ? 'Saving...' : editing ? 'Save Changes' : `Save All Specifications (${points.length})`}</button></div>
    </form>
    <div className="mt-5 overflow-x-auto rounded-lg border bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="p-3">Specification</th><th>Scope</th><th>Field</th><th>Required</th><th>Compare</th><th>Action</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className={`border-t ${editing?.id === item.id ? 'bg-blue-50' : ''}`}><td className="p-3 font-semibold">{item.name}</td><td>{item.service_type || 'All types'}{item.category_id ? ` / ${categoryName(item.category_id) || `Category #${item.category_id}`}` : ''}{item.subcategory_id ? ` / ${subcategoryName(item.subcategory_id) || `Subcategory #${item.subcategory_id}`}` : ''}</td><td className="capitalize">{item.field_type}{item.unit ? ` (${item.unit})` : ''}</td><td>{item.is_required ? 'Yes' : 'No'}</td><td>{item.is_comparable ? 'Yes' : 'No'}</td><td><div className="flex gap-3"><button onClick={() => edit(item)} className="inline-flex gap-1 font-semibold text-primary"><Pencil className="h-3.5 w-3.5"/>Edit</button><button onClick={() => remove(item)} className="inline-flex gap-1 text-red-600"><Trash2 className="h-3.5 w-3.5"/>Delete</button></div></td></tr>)}</tbody></table></div>
  </section>
}
