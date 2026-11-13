import {
  Boxes, BriefcaseBusiness, Calculator, Cloud, GraduationCap, HeartPulse,
  LoaderCircle, Megaphone, MonitorCog, Network, Search, Server, ShieldCheck, ShoppingBag, Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const icons = [
  BriefcaseBusiness, Users, ShoppingBag, Calculator, GraduationCap, HeartPulse,
  Megaphone, ShieldCheck, Cloud, Server, Network, MonitorCog, Boxes,
]

export default function CategoryBrowser({ categories, selected, onSelect, loading = false }) {
  const tiles = useMemo(() => categories.flatMap((category) =>
    (category.subcategories || []).map((subcategory) => ({
      ...subcategory,
      filter: subcategory.name,
      parent: category.name,
      logo_url: subcategory.logo_url || category.logo_url,
    }))
  ).sort((a, b) => (Number(b.click_count) || 0) - (Number(a.click_count) || 0)), [categories])
  const [visibleCount, setVisibleCount] = useState(12)
  const [search, setSearch] = useState('')
  const filteredTiles = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return tiles
    return tiles.filter((item) => `${item.name} ${item.parent}`.toLowerCase().includes(term))
  }, [tiles, search])
  useEffect(() => setVisibleCount(12), [categories, search])
  const visibleTiles = filteredTiles.slice(0, visibleCount)
  const firstRows = visibleTiles.slice(0, 12)
  const additionalRows = visibleTiles.slice(12)
  const hasMore = visibleCount < filteredTiles.length

  return <div className="marketplace-category-browser mt-4 rounded-2xl border bg-white px-4 py-5 shadow-subtle sm:px-5">
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">Browse faster</p>
      <h2 className="mt-1 text-2xl font-bold">Popular solution subcategories</h2>
      <p className="mt-1 text-xs text-slate-500">Browse solutions by subcategory.</p>
    </div>
    <div className="mx-auto mt-4 max-w-xl">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subcategories..." aria-label="Search subcategories" className="h-10 w-full rounded-lg border bg-slate-50 pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:bg-white" />
      </label>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {loading && !tiles.length ? Array.from({ length: 12 }, (_, index) => <div key={index} className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border bg-white"><span className="h-9 w-9 ui-skeleton rounded-lg bg-slate-100"/><span className="mt-2 h-2.5 w-16 ui-skeleton rounded bg-slate-100"/></div>) : firstRows.map((item, index) => {
        const Icon = icons[index % icons.length]
        const active = selected === item.filter
        return <button
          type="button"
          key={`${item.parent || 'category'}-${item.id}`}
          onClick={() => onSelect(item.filter, item.id)}
          className={`group flex min-h-[80px] flex-col items-center justify-center rounded-lg border px-2 py-2.5 text-center transition ${active ? 'border-primary bg-blue-50 ring-1 ring-primary' : 'bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-floating'}`}
        >
          {item.logo_url
            ? <img src={item.logo_url} alt="" className="h-8 w-8 object-contain"/>
            : <span className={`grid h-9 w-9 place-items-center rounded-lg ${active ? 'bg-primary text-white' : 'bg-blue-50 text-primary group-hover:bg-primary group-hover:text-white'}`}><Icon className="h-5 w-5" strokeWidth={1.7}/></span>}
          <span className="mt-2 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-700">{item.name}</span>
        </button>
      })}
      {!loading && !visibleTiles.length && <p className="col-span-full rounded-lg border border-dashed p-8 text-center text-xs text-slate-500">No matching subcategories found.</p>}
    </div>
    {!!additionalRows.length && <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-8">
      {additionalRows.map((item, index) => {
        const tileIndex = index + 12
        const Icon = icons[tileIndex % icons.length]
        const active = selected === item.filter
        return <button
          type="button"
          key={item.id}
          onClick={() => onSelect(item.filter, item.id)}
          className={'flex min-h-[80px] flex-col items-center justify-center rounded-lg border px-2 py-2.5 text-center transition hover:-translate-y-0.5 hover:border-primary hover:shadow-floating ' + (active ? 'border-primary bg-blue-50 ring-1 ring-primary' : 'bg-white')}
        >
          {item.logo_url
            ? <img src={item.logo_url} alt="" className="h-8 w-8 object-contain"/>
            : <span className={'grid h-9 w-9 place-items-center rounded-lg ' + (active ? 'bg-primary text-white' : 'bg-blue-50 text-primary')}><Icon className="h-4 w-4"/></span>}
          <span className="mt-2 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-700">{item.name}</span>
        </button>
      })}
    </div>}
    {hasMore && <div className="mt-4 text-center">
      <button type="button" onClick={() => setVisibleCount(filteredTiles.length)} className="inline-flex h-9 items-center gap-2 rounded-md border border-primary px-5 text-xs font-semibold text-primary hover:bg-blue-50">
        <LoaderCircle className="h-4 w-4" />View all
      </button>
    </div>}
  </div>
}
