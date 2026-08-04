import { Building2, ChevronRight, Factory, FolderTree, Menu, Scale, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMarketplaceBrands } from '../../api/brands'
import { getMarketplaceCategories } from '../../api/categories'
import { getMarketplaceIndustries } from '../../api/industries'

const sections = [
  { key: 'category', label: 'Categories', icon: FolderTree },
  { key: 'brand', label: 'Brands', icon: Building2 },
  { key: 'industry', label: 'Industries', icon: Factory },
]

export function MarketplaceMenuButton({ onClick, className = '' }) {
  return <button type="button" onClick={onClick} className={`grid h-10 w-10 place-items-center rounded-lg border text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-primary ${className}`} aria-label="Open marketplace navigation"><Menu className="h-5 w-5"/></button>
}

export default function MobileMarketplaceNavigation({ open, onClose }) {
  const [items, setItems] = useState({ category: [], brand: [], industry: [] })

  useEffect(() => {
    Promise.all([getMarketplaceCategories(), getMarketplaceBrands(), getMarketplaceIndustries()])
      .then(([category, brand, industry]) => setItems({ category, brand, industry }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const escape = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', escape)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', escape) }
  }, [open, onClose])

  const select = (type, value) => {
    window.dispatchEvent(new CustomEvent(`marketplace-${type}-selected`, { detail: value }))
    window.location.hash = 'marketplace-products'
    onClose()
  }

  return <div className={`fixed inset-0 z-[90] xl:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
    <button type="button" aria-label="Close marketplace navigation" onClick={onClose} className={`absolute inset-0 bg-slate-950/55 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}/>
    <aside aria-label="Marketplace navigation" className={`absolute inset-y-0 left-0 flex w-[min(340px,88vw)] flex-col border-r bg-white shadow-overlay transition-transform duration-180 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4"><h2 className="text-sm font-semibold text-slate-950">Browse marketplace</h2><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100" aria-label="Close navigation"><X className="h-5 w-5"/></button></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {sections.map(({ key, label, icon: Icon }) => <section key={key} className="mb-6 last:mb-0"><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><Icon className="h-4 w-4"/>{label}</div><div className="grid gap-1">{items[key].slice(0, 10).map((item) => <button type="button" key={item.id} onClick={() => select(key, item.name)} className="flex min-h-10 items-center justify-between rounded-lg px-3 text-left text-[13px] font-medium text-slate-700 hover:bg-blue-50 hover:text-primary"><span className="truncate">{item.name}</span><ChevronRight className="h-4 w-4 shrink-0"/></button>)}<button type="button" onClick={() => select(key, 'All')} className="min-h-10 rounded-lg px-3 text-left text-xs font-semibold text-primary hover:bg-blue-50">View all {label.toLowerCase()}</button></div></section>)}
      </div>
      <div className="grid gap-2 border-t p-4"><a href="#marketplace-products" onClick={onClose} className="flex h-11 items-center justify-center gap-2 rounded-lg border font-semibold text-slate-700"><Scale className="h-4 w-4"/>Compare solutions</a><a href="#marketplace-products" onClick={onClose} className="flex h-11 items-center justify-center rounded-lg bg-primary font-semibold text-white">Get free advice</a></div>
    </aside>
  </div>
}
