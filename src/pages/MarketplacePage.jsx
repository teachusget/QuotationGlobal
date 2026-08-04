import { ArrowRight, BadgeCheck, Boxes, Headphones, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMarketplaceBrands } from '../api/brands'
import { getMarketplaceCategories } from '../api/categories'
import { getMarketplaceServices } from '../api/marketplace'
import CategoryBrowser from '../components/marketplace/CategoryBrowser'

export default function MarketplacePage() {
  const [services, setServices] = useState([])
  const [brands, setBrands] = useState([])
  const [marketplaceCategories, setMarketplaceCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [brand, setBrand] = useState('All')
  const [industry, setIndustry] = useState('All')
  const [serviceType, setServiceType] = useState('All')

  useEffect(() => {
    getMarketplaceServices()
      .then((items) => setServices(items.map((item) => ({
        ...item,
        images: (item.images || []).map((image) => ({ ...image, image_data: image.image_url || image.image_data })),
      }))))
      .catch((err) => setError(err.message))
    getMarketplaceBrands().then(setBrands).catch(() => setBrands([]))
    getMarketplaceCategories().then(setMarketplaceCategories).catch(() => setMarketplaceCategories([])).finally(() => setCategoriesLoading(false))
  }, [])

  useEffect(() => {
    const selectCategory = (event) => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      setCategory(event.detail || 'All')
      setBrand('All')
      setIndustry('All')
      setQuery('')
    }
    const selectBrand = (event) => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      setBrand(event.detail || 'All')
      setCategory('All')
      setIndustry('All')
      setQuery('')
    }
    const selectIndustry = (event) => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      setIndustry(event.detail || 'All')
      setCategory('All')
      setBrand('All')
      setQuery('')
    }
    window.addEventListener('marketplace-category-selected', selectCategory)
    window.addEventListener('marketplace-brand-selected', selectBrand)
    window.addEventListener('marketplace-industry-selected', selectIndustry)
    const selectServiceType = (event) => setServiceType(event.detail || 'All')
    window.addEventListener('marketplace-service-type-selected', selectServiceType)
    return () => {
      window.removeEventListener('marketplace-category-selected', selectCategory)
      window.removeEventListener('marketplace-brand-selected', selectBrand)
      window.removeEventListener('marketplace-industry-selected', selectIndustry)
      window.removeEventListener('marketplace-service-type-selected', selectServiceType)
    }
  }, [])

  const grouped = useMemo(() => Object.values(services.reduce((all, service) => {
    const key = `${service.vendor_id}|${service.name}|${service.service_type}`
    if (!all[key]) all[key] = { ...service, plans: [] }
    all[key].plans.push(service)
    return all
  }, {})), [services])

  const visible = grouped.filter((service) => {
    const text = `${service.name} ${service.vendor?.company_name || ''} ${service.category?.name || ''} ${service.subcategory?.name || ''} ${service.service_type}`.toLowerCase()
    const brandNames = [...(service.brands || []), service.brand].filter(Boolean).map((item) => item.name)
    const industryNames = (service.industries || []).map((item) => item.name)
    const categoryMatches = category === 'All' || service.category?.name === category || service.subcategory?.name === category
    return categoryMatches
      && (serviceType === 'All' || service.service_type === serviceType)
      && (brand === 'All' || brandNames.includes(brand))
      && (industry === 'All' || industryNames.includes(industry))
      && text.includes(query.trim().toLowerCase())
  })

  const price = (service) => {
    const plan = service.plans[0]
    return plan ? `Starting From $${Number(plan.price_from).toLocaleString()}` : 'Price on request'
  }

  const selectCategory = (value) => {
    setCategory(value)
    setBrand('All')
    setIndustry('All')
    setQuery('')
    if (value !== 'All') document.getElementById('marketplace-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return <section className="pb-7">
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#06285e] via-[#0755bd] to-[#0797c6] px-5 pt-10 text-white sm:px-8 lg:px-12 lg:pt-14">
      <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5"/>Technology marketplace</span>
          <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">Find the right technology solution for your business.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100">Discover verified software, hardware and professional services. Compare plans, request a demo or get a tailored quote.</p>
          <form onSubmit={(event) => event.preventDefault()} className="mt-7 flex max-w-2xl overflow-hidden rounded-xl bg-white p-1.5 shadow-xl">
            <Search className="ml-3 mt-2.5 h-5 w-5 shrink-0 text-slate-400"/>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search software, services or vendors" className="min-w-0 flex-1 px-3 py-2 text-sm text-slate-800 outline-none"/>
            <button className="rounded-lg bg-primary px-5 text-sm font-semibold text-white">Search</button>
          </form>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-blue-100">
            <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4"/>Verified vendors</span>
            <span className="inline-flex items-center gap-1.5"><Headphones className="h-4 w-4"/>Demo support</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4"/>Transparent pricing</span>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="relative mx-auto h-64 max-w-sm rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur">
            <div className="rounded-2xl bg-white p-4 text-slate-900 shadow-xl">
              <div className="flex items-center justify-between"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-primary">SMART DISCOVERY</span><Boxes className="h-5 w-5 text-primary"/></div>
              <p className="mt-5 text-lg font-bold">Compare the plans that fit your business.</p>
              <div className="mt-4 space-y-2">
                {[['Software & SaaS', 'software'], ['Hardware solutions', 'hardware'], ['Professional services', 'services']].map(([label, value]) => <Link to={`/marketplace/type/${value}`} key={value} className="group flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left text-xs font-semibold transition hover:bg-blue-50 hover:text-primary"><span>{label}</span><ArrowRight className="h-3.5 w-3.5 text-primary transition-transform group-hover:translate-x-0.5"/></Link>)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="brand-marquee relative -mx-5 mt-8 min-h-[73px] overflow-hidden border-t border-white/15 bg-slate-950/15 py-3 sm:-mx-8 lg:-mx-12">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#084aa1] to-transparent"/>
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0788bf] to-transparent"/>
        {brands.length > 0 ? <div className="brand-marquee-track flex w-max items-center">
          {[0, 1].map((copy) => <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-10 px-5">
            {brands.map((item) => <div key={`${copy}-${item.id}`} className="group/brand relative grid h-12 w-36 shrink-0 place-items-center">
              <img src={item.logo_url} alt={copy === 0 ? item.name : ''} loading="eager" decoding="async" fetchPriority={copy === 0 ? 'high' : 'auto'} className="h-11 w-full object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.18)] transition-transform duration-200 group-hover/brand:scale-110"/>
              <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-slate-950 px-2.5 py-1.5 text-[10px] font-semibold text-white opacity-0 shadow-lg transition group-hover/brand:translate-y-0 group-hover/brand:opacity-100">{item.name}</span>
            </div>)}
          </div>)}
        </div> : <div className="flex h-12 items-center gap-10 overflow-hidden px-5" aria-label="Loading brands">{Array.from({ length: 8 }, (_, index) => <span key={index} className="h-8 w-32 shrink-0 animate-pulse rounded-md bg-white/10"/>)}</div>}
      </div>
    </div>

    <CategoryBrowser categories={marketplaceCategories} selected={category} onSelect={selectCategory} loading={categoriesLoading}/>

    <div id="marketplace-products" className="mt-10 scroll-mt-20 rounded-2xl border bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Marketplace</p>
          <h2 className="mt-1 text-2xl font-bold">{category === 'All' ? 'Featured solutions' : `${category} solutions`}</h2>
          <p className="mt-1 text-sm text-slate-500">Compare plans, view product details and connect with the Solution Provider.</p>
        </div>
        <span className="text-xs font-semibold text-slate-500">{visible.length} solution{visible.length === 1 ? '' : 's'} found</span>
      </div>
      {error && <p className="mt-5 text-sm text-red-600">{error}</p>}
      <div className="mt-6 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((service) => <Link to={`/marketplace/services/${service.id}`} key={service.id} aria-label={`View ${service.name}`} className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-white transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg">
          <div className="grid h-48 shrink-0 place-items-center overflow-hidden border-b bg-gradient-to-br from-white to-slate-50 p-4">
            {service.images?.[0]?.image_data ? <img src={service.images[0].image_data} alt={service.name} className="h-full w-full object-contain"/> : <Boxes className="h-10 w-10 text-primary/50"/>}
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-primary">{service.service_type}</span>
              {service.category?.name && <span className="max-w-[55%] truncate text-[10px] font-semibold text-slate-400">{service.category.name}</span>}
            </div>
            <h3 className="mt-3 min-h-10 text-base font-bold text-slate-900 group-hover:text-primary">{service.name}</h3>
            <p className="mt-1 min-h-4 text-xs text-slate-500">by {service.vendor?.company_name || service.vendor?.name || 'Verified vendor'}</p>
            <div className="mt-auto pt-4">
              <p className="text-sm font-bold text-slate-900">{price(service)}</p>
              <p className="mt-1 text-[11px] text-slate-500">{service.plans.length} pricing plan{service.plans.length === 1 ? '' : 's'} available</p>
              <span className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-white group-hover:bg-blue-700">{service.service_type === 'services' ? 'View service' : 'View product'} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"/></span>
            </div>
          </div>
        </Link>)}
        {!visible.length && <div className="col-span-full grid min-h-48 place-items-center rounded-xl border border-dashed text-center">
          <div><Search className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-3 text-sm font-semibold">No solutions found</p><button onClick={() => { setQuery(''); setCategory('All') }} className="mt-2 text-xs font-semibold text-primary">Clear filters</button></div>
        </div>}
      </div>
    </div>

    <div className="mt-10 grid gap-4 md:grid-cols-3">
      {[[BadgeCheck, 'Verified vendors', 'Discover services from registered vendors and trusted partners.'], [Headphones, 'Book a demo', 'Choose a convenient time and send your request directly to the Solution Provider.'], [ShieldCheck, 'Clear pricing', 'See available billing plans, pricing and discounts before you decide.']].map(([Icon, title, detail]) => <div key={title} className="rounded-xl border bg-white p-5">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-primary"><Icon className="h-5 w-5"/></span>
        <h3 className="mt-4 text-sm font-bold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
      </div>)}
    </div>
  </section>
}
