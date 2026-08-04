import { ArrowLeft, ArrowRight, Boxes, CheckCircle2, Cpu, HardDrive, Search, Wrench } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getMarketplaceServices } from '../api/marketplace'

const types = {
  software: {
    label: 'Software & SaaS',
    singular: 'software solution',
    description: 'Discover business software selected and published by verified marketplace vendors.',
    icon: Cpu,
    gradient: 'from-blue-700 via-blue-600 to-cyan-500',
  },
  hardware: {
    label: 'Hardware Solutions',
    singular: 'hardware solution',
    description: 'Compare business hardware, infrastructure and technology equipment from marketplace vendors.',
    icon: HardDrive,
    gradient: 'from-slate-800 via-blue-800 to-blue-500',
  },
  services: {
    label: 'Professional Services',
    singular: 'professional service',
    description: 'Find implementation, consulting, support and managed services offered by technology partners.',
    icon: Wrench,
    gradient: 'from-violet-700 via-indigo-600 to-blue-500',
  },
}

export default function ServiceTypePage() {
  const { type } = useParams()
  const config = types[type]
  const [services, setServices] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!config) return
    setLoading(true)
    getMarketplaceServices()
      .then(setServices)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [config, type])

  const products = useMemo(() => Object.values(services
    .filter((service) => service.service_type === type)
    .reduce((all, service) => {
      const key = `${service.vendor_id}|${service.name}|${service.service_type}`
      if (!all[key]) all[key] = { ...service, plans: [] }
      all[key].plans.push(service)
      return all
    }, {})), [services, type])

  const visible = products.filter((product) => `${product.name} ${product.vendor?.company_name || ''} ${product.category?.name || ''} ${product.subcategory?.name || ''}`.toLowerCase().includes(query.trim().toLowerCase()))

  if (!config) return <Navigate to="/marketplace" replace/>
  const Icon = config.icon

  return <section className="pb-10">
    <div className={`overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} text-white shadow-lg`}>
      <div className="grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-12">
        <div>
          <Link to="/marketplace" className="inline-flex items-center gap-2 text-xs font-semibold text-white/80 hover:text-white"><ArrowLeft className="h-4 w-4"/>Back to Marketplace</Link>
          <div className="mt-6 flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur"><Icon className="h-7 w-7"/></span>
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Smart Discovery</p><h1 className="mt-1 text-3xl font-bold sm:text-4xl">{config.label}</h1></div>
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/80">{config.description}</p>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-5 text-center backdrop-blur">
          <p className="text-3xl font-bold">{products.length}</p>
          <p className="mt-1 text-xs text-white/75">Available {products.length === 1 ? config.singular : `${config.singular}s`}</p>
        </div>
      </div>
    </div>

    <div className="mt-7 flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-subtle sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${config.label.toLowerCase()}...`} className="h-11 w-full rounded-lg border pl-10 pr-3 text-sm outline-none focus:border-primary"/></div>
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-500"/>{visible.length} verified result{visible.length === 1 ? '' : 's'}</div>
    </div>

    {error && <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</p>}
    {loading ? <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="overflow-hidden rounded-xl border bg-white"><div className="h-48 animate-pulse bg-slate-100"/><div className="space-y-3 p-5"><div className="h-4 w-2/3 animate-pulse rounded bg-slate-100"/><div className="h-3 w-1/2 animate-pulse rounded bg-slate-100"/><div className="h-9 w-28 animate-pulse rounded bg-slate-100"/></div></div>)}</div> : <div className="mt-6 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map((product) => {
        const plan = product.plans[0]
        return <Link to={`/marketplace/services/${product.id}`} key={product.id} className="group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl">
          <div className="grid h-48 place-items-center overflow-hidden border-b bg-gradient-to-br from-white to-slate-50 p-4">
            {product.images?.[0]?.image_url ? <img src={product.images[0].image_url} alt={product.name} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"/> : <Boxes className="h-11 w-11 text-primary/40"/>}
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-primary">{product.category?.name || config.label}</span><span className="text-[10px] font-semibold text-slate-400">{product.plans.length} plan{product.plans.length === 1 ? '' : 's'}</span></div>
            <h2 className="mt-3 min-h-10 text-base font-bold text-slate-900 group-hover:text-primary">{product.name}</h2>
            <p className="mt-1 text-xs text-slate-500">by {product.vendor?.company_name || product.vendor?.name || 'Verified vendor'}</p>
            <div className="mt-auto pt-5"><p className="text-sm font-bold text-slate-900">{plan ? `Starting From $${Number(plan.price_from).toLocaleString()}` : 'Price on request'}</p><span className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-white group-hover:bg-blue-700">{product.service_type === 'services' ? 'View service' : 'View product'} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"/></span></div>
          </div>
        </Link>
      })}
      {!visible.length && <div className="col-span-full grid min-h-64 place-items-center rounded-xl border border-dashed bg-white text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100"><Search className="h-5 w-5 text-slate-400"/></span><h2 className="mt-4 text-sm font-bold">No {config.label.toLowerCase()} found</h2><p className="mt-1 text-xs text-slate-500">Try a different search or check back when vendors publish new products.</p><button type="button" onClick={() => setQuery('')} className="mt-4 text-xs font-semibold text-primary hover:underline">Clear search</button></div></div>}
    </div>}
  </section>
}
