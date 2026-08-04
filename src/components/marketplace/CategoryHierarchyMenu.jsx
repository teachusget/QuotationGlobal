import { ChevronDown, ChevronRight, ImageIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

const types = [
  { value: 'software', label: 'Software & SaaS' },
  { value: 'hardware', label: 'Hardware solutions' },
  { value: 'services', label: 'Professional services' },
]

export default function CategoryHierarchyMenu({ categories, onSelect }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('software')
  const [categoryId, setCategoryId] = useState('')
  const root = useRef(null)
  const availableCategories = useMemo(() => categories.filter((category) =>
    (category.service_types || []).includes(type)
      || (category.subcategories || []).some((subcategory) => (subcategory.service_types || []).includes(type))
  ), [categories, type])
  const category = availableCategories.find((item) => String(item.id) === String(categoryId)) || availableCategories[0]
  const subcategories = (category?.subcategories || []).filter((item) => (item.service_types || []).includes(type))

  useEffect(() => { setCategoryId('') }, [type])
  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    const escape = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [open])
  const choose = (value) => { if (value === 'All') window.dispatchEvent(new CustomEvent('marketplace-service-type-selected', { detail: 'All' })); onSelect(value); setOpen(false) }
  const chooseType = (value) => { setType(value); window.dispatchEvent(new CustomEvent('marketplace-service-type-selected', { detail: value })) }

  return <div ref={root} className="relative"><button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 hover:text-primary">Categories<ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`}/></button>{open && <div className="absolute left-0 top-6 z-50 w-[min(760px,calc(100vw-24px))] overflow-hidden rounded-xl border bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-4 py-3"><div><p className="text-sm font-bold text-slate-900">Browse solutions</p><p className="text-[10px] font-normal text-slate-500">Select type, category and subcategory</p></div><button type="button" onClick={() => choose('All')} className="text-[11px] font-semibold text-primary">View all solutions</button></div><div className="grid min-h-64 grid-cols-[190px_1fr_1fr]"><div className="border-r bg-slate-50 p-3">{types.map((item) => <button type="button" key={item.value} onClick={() => chooseType(item.value)} className={`mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${type === item.value ? 'bg-primary text-white' : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-primary'}`}>{item.label}<ChevronRight className="h-3.5 w-3.5"/></button>)}</div><div className="border-r p-3"><p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Categories</p>{availableCategories.map((item) => <button type="button" key={item.id} onMouseEnter={() => setCategoryId(String(item.id))} onClick={() => setCategoryId(String(item.id))} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold ${category?.id === item.id ? 'bg-blue-50 text-primary' : 'text-slate-700 hover:bg-slate-50'}`}>{item.logo_url ? <img src={item.logo_url} alt="" className="h-7 w-7 rounded object-contain"/> : <span className="grid h-7 w-7 place-items-center rounded bg-slate-100"><ImageIcon className="h-3.5 w-3.5 text-slate-400"/></span>}<span className="min-w-0 flex-1 truncate">{item.name}</span><ChevronRight className="h-3.5 w-3.5"/></button>)}{!availableCategories.length && <p className="p-3 text-xs text-slate-400">No categories available.</p>}</div><div className="p-3"><p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Subcategories</p>{subcategories.map((item) => <button type="button" key={item.id} onClick={() => choose(item.name)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-600 hover:bg-blue-50 hover:text-primary">{item.logo_url ? <img src={item.logo_url} alt="" className="h-7 w-7 rounded object-contain"/> : <span className="grid h-7 w-7 place-items-center rounded bg-slate-100"><ImageIcon className="h-3.5 w-3.5 text-slate-400"/></span>}<span className="truncate">{item.name}</span></button>)}{category && !subcategories.length && <p className="p-3 text-xs text-slate-400">No subcategories for this type.</p>}</div></div></div>}</div>
}
