import {
  Boxes, BriefcaseBusiness, Calculator, Cloud, GraduationCap, HeartPulse,
  Megaphone, MonitorCog, Network, Server, ShieldCheck, ShoppingBag, Users,
} from 'lucide-react'

const icons = [
  BriefcaseBusiness, Users, ShoppingBag, Calculator, GraduationCap, HeartPulse,
  Megaphone, ShieldCheck, Cloud, Server, Network, MonitorCog, Boxes,
]

export default function CategoryBrowser({ categories, selected, onSelect, loading = false }) {
  const tiles = categories.flatMap((category) =>
    (category.subcategories || []).map((subcategory) => ({
      ...subcategory,
      filter: subcategory.name,
      parent: category.name,
    }))
  )

  return <div className="mt-9 rounded-2xl border bg-white px-4 py-6 shadow-subtle sm:px-6">
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">Browse faster</p>
      <h2 className="mt-1 text-2xl font-bold">Popular solution subcategories</h2>
      <p className="mt-1 text-xs text-slate-500">Browse solutions by subcategory.</p>
    </div>
    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
      {loading && !tiles.length ? Array.from({ length: 16 }, (_, index) => <div key={index} className="flex min-h-[92px] flex-col items-center justify-center rounded-lg border bg-white"><span className="h-9 w-9 ui-skeleton rounded-lg bg-slate-100"/><span className="mt-2 h-2.5 w-16 ui-skeleton rounded bg-slate-100"/></div>) : tiles.map((item, index) => {
        const Icon = icons[index % icons.length]
        const active = selected === item.filter
        return <button
          type="button"
          key={`${item.parent || 'category'}-${item.id}`}
          onClick={() => onSelect(item.filter)}
          className={`group flex min-h-[92px] flex-col items-center justify-center rounded-lg border px-2 py-3 text-center transition ${active ? 'border-primary bg-blue-50 ring-1 ring-primary' : 'bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-floating'}`}
        >
          {item.logo_url
            ? <img src={item.logo_url} alt="" className="h-8 w-8 object-contain"/>
            : <span className={`grid h-9 w-9 place-items-center rounded-lg ${active ? 'bg-primary text-white' : 'bg-blue-50 text-primary group-hover:bg-primary group-hover:text-white'}`}><Icon className="h-5 w-5" strokeWidth={1.7}/></span>}
          <span className="mt-2 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-700">{item.name}</span>
        </button>
      })}
    </div>
    <div className="mt-5 text-center">
      <button type="button" onClick={() => onSelect('All')} className="inline-flex h-9 items-center rounded-md border border-primary px-5 text-xs font-semibold text-primary hover:bg-blue-50">
        View All Solutions
      </button>
    </div>
  </div>
}
