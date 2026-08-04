import { ChevronDown, ImageIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getMarketplaceBrands } from '../../api/brands'
import { getMarketplaceCategories } from '../../api/categories'
import { getMarketplaceIndustries } from '../../api/industries'
import CategoryHierarchyMenu from '../marketplace/CategoryHierarchyMenu'

function Dropdown({ label, items, categories = false, onSelect }) {
  const [open, setOpen] = useState(false); const root = useRef(null)
  useEffect(() => { if (!open) return undefined; const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close) }, [open])
  const select = (value) => { setOpen(false); onSelect(value) }
  return <div ref={root} className="relative"><button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1.5 hover:text-primary">{label}<ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`}/></button>{open && <div className="absolute left-0 top-7 z-50 w-[min(620px,calc(100vw-32px))] rounded-xl border bg-white p-4 shadow-overlay"><div className="mb-3 flex items-center justify-between"><b className="text-sm text-slate-900">Browse {label}</b><button onClick={() => select('All')} className="text-[11px] font-semibold text-primary">View all</button></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{items.map((item) => <button type="button" key={item.id} onClick={() => select(item.name)} className="flex min-h-14 items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-left hover:border-blue-200 hover:bg-blue-50"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100">{item.logo_url ? <img src={item.logo_url} alt="" className="h-full w-full rounded-md object-contain"/> : <ImageIcon className="h-4 w-4 text-slate-400"/>}</span><span className="min-w-0"><b className="block truncate text-xs text-slate-700">{item.name}</b>{categories && item.subcategories?.[0] && <span className="mt-1 block truncate text-[11px] font-normal text-slate-500">{item.subcategories[0].name}</span>}</span></button>)}</div></div>}</div>
}

export default function PublicMarketplaceNavigation() {
  const [categories, setCategories] = useState([]); const [brands, setBrands] = useState([]); const [industries, setIndustries] = useState([])
  useEffect(() => { getMarketplaceCategories().then(setCategories).catch(() => {}); getMarketplaceBrands().then(setBrands).catch(() => {}); getMarketplaceIndustries().then(setIndustries).catch(() => {}) }, [])
  const select = (type, value) => { window.dispatchEvent(new CustomEvent(`marketplace-${type}-selected`, { detail: value })); window.location.hash = 'marketplace-products' }
  return <nav className="flex items-center gap-5 text-xs font-semibold text-slate-600 xl:gap-7"><CategoryHierarchyMenu categories={categories} onSelect={(value) => select('category', value)}/><Dropdown label="Brands" items={brands} onSelect={(value) => select('brand', value)}/><Dropdown label="Industry" items={industries} onSelect={(value) => select('industry', value)}/><a href="#marketplace-products" className="hover:text-primary">Compare</a><a href="#marketplace-products" className="hover:text-primary">Ask Question</a><a href="#marketplace-products" className="hover:text-primary">Blog</a><a href="#marketplace-products" className="rounded-full bg-primary px-5 py-2.5 text-white hover:bg-blue-700">Get Free Advice</a></nav>
}
