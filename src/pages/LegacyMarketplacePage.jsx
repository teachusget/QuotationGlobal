import { ArrowRight, BadgeCheck, Boxes, CalendarDays, FileText, GitCompareArrows, Globe2, Headphones, Search, ShieldCheck, Sparkles, Tag, UsersRound, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { getMarketplaceBrands } from '../api/brands'
import { getMarketplaceCategories } from '../api/categories'
import { getMarketplaceServices, prefetchMarketplaceService } from '../api/marketplace'
import CategoryBrowser from '../components/marketplace/CategoryBrowser'
import FeaturedAdsCarousel from '../components/marketplace/FeaturedAdsCarousel'
import MarketplaceAdvancedSearchPortal from '../components/marketplace/MarketplaceAdvancedSearchPortal'
import { Skeleton } from '../components/ui'
import { getPublishedMarketplacePage } from '../api/marketplaceBuilder'
import { loadMarketplaceTheme } from '../themes/registry'

function Link({ to, onMouseEnter, onFocus, onTouchStart, ...props }) {
  const productId = typeof to === 'string' ? to.match(/^\/marketplace\/services\/(\d+)$/)?.[1] : null
  const preload = (handler) => (event) => {
    if (productId) { import('./ProductPage'); prefetchMarketplaceService(productId) }
    handler?.(event)
  }
  return <RouterLink to={to} onMouseEnter={preload(onMouseEnter)} onFocus={preload(onFocus)} onTouchStart={preload(onTouchStart)} {...props}/>
}

function MarketplaceProductCard({ service, selected, disabled, onCompare }) {
  return <article className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-white transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-floating ${selected ? 'border-primary ring-2 ring-primary/20' : ''}`}>
    <button type="button" disabled={disabled && !selected} onClick={() => onCompare(service)} className={`absolute right-3 top-3 z-10 inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold shadow-sm transition ${selected ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white/95 text-slate-700 hover:border-primary hover:text-primary'} disabled:cursor-not-allowed disabled:opacity-45`}><span className={`grid h-4 w-4 place-items-center rounded border ${selected ? 'border-white bg-white text-primary' : 'border-slate-300'}`}>{selected && <CheckMark/>}</span>{selected ? 'Selected' : 'Compare'}</button>
    <Link to={`/marketplace/services/${service.id}`} className="flex h-full flex-col"><div className="grid h-48 shrink-0 place-items-center overflow-hidden border-b bg-gradient-to-br from-white to-slate-50 p-4">{service.images?.[0]?.image_data ? <img loading="lazy" src={service.images[0].image_data} alt={service.name} className="h-full w-full object-contain"/> : <Boxes className="h-10 w-10 text-primary/50"/>}</div><div className="flex flex-1 flex-col p-5"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-primary">{service.service_type}</span>{service.category?.name && <span className="max-w-[55%] truncate text-xs font-semibold text-slate-400">{service.category.name}</span>}</div><h3 className="mt-3 min-h-10 text-base font-bold text-slate-900 group-hover:text-primary">{service.name}</h3><p className="mt-1 text-xs text-slate-500">by {service.vendor?.company_name || service.vendor?.name || 'Verified vendor'}</p><div className="mt-auto pt-4"><p className="text-sm font-bold">{service.plans[0] ? `Starting From $${Number(service.plans[0].price_from).toLocaleString()}` : 'Price on request'}</p><p className="mt-1 text-xs text-slate-500">{service.plans.length} pricing plan{service.plans.length === 1 ? '' : 's'} available</p><span className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-white">View {service.service_type === 'services' ? 'service' : 'product'}<ArrowRight className="h-3.5 w-3.5"/></span></div></div></Link>
  </article>
}

function CheckMark() { return <span className="text-[10px] font-black">✓</span> }

const specificationValues = (service, pattern) => (service.specification_values || []).filter((item) => pattern.test(item.definition?.name || '')).map((item) => String(item.value || '').trim()).filter(Boolean)
const marketplaceParam = (name, fallback = 'All') => new URLSearchParams(window.location.search).get(name) || fallback

/** Preserved pre-builder marketplace. It is intentionally independent of CMS data. */
export default function LegacyMarketplacePage() {
  const [services, setServices] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState(() => marketplaceParam('q', ''))
  const [category, setCategory] = useState(() => marketplaceParam('category'))
  const [brand, setBrand] = useState(() => marketplaceParam('brand'))
  const [industry, setIndustry] = useState(() => marketplaceParam('industry'))
  const [serviceType, setServiceType] = useState(() => marketplaceParam('type'))
  const [deployment, setDeployment] = useState(() => marketplaceParam('deployment'))
  const [companySize, setCompanySize] = useState(() => marketplaceParam('company_size'))
  const [budget, setBudget] = useState(() => marketplaceParam('budget'))
  const [sellingCountry, setSellingCountry] = useState(() => localStorage.getItem('marketplace-selling-country') || 'Global')
  const [featuredAds, setFeaturedAds] = useState(undefined)
  const [adCatalogServices, setAdCatalogServices] = useState([])
  const [advertisementsLoading, setAdvertisementsLoading] = useState(true)
  const [adPlacements, setAdPlacements] = useState({ center: [], footer: [] })
  const [adVisibility, setAdVisibility] = useState({ banner: true, catalog: true, footer: true })
  const [themePreset, setThemePreset] = useState('neon-nexus')
  const [compareIds, setCompareIds] = useState(() => { try { return JSON.parse(localStorage.getItem('compare-services') || '[]').slice(0, 3) } catch { return [] } })
  const [compareNotice, setCompareNotice] = useState('')
  useEffect(() => { loadMarketplaceTheme(themePreset).catch(() => {}) }, [themePreset])

  useEffect(() => {
    getMarketplaceServices()
      .then((items) => setServices(items.map((item) => ({
        ...item,
        images: (item.images || []).map((image) => ({ ...image, image_data: image.image_url || image.image_data })),
      }))))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
    getMarketplaceBrands().then(setBrands).catch(() => setBrands([]))
    getMarketplaceCategories().then(setCategories).catch(() => setCategories([])).finally(() => setCategoriesLoading(false))
    getPublishedMarketplacePage().then((result) => { const document = result.data?.document; const hero = document?.sections?.find((block) => block.type === 'hero'); setFeaturedAds(Array.isArray(hero?.settings?.featured_ads) ? hero.settings.featured_ads : []); setAdCatalogServices(result.data?.catalog?.services || []); setAdPlacements({ center: document?.advertisements?.center || [], footer: document?.advertisements?.footer || [] }); setAdVisibility({ banner: document?.advertisements_visibility?.banner !== false, catalog: document?.advertisements_visibility?.catalog !== false, footer: document?.advertisements_visibility?.footer !== false }); setThemePreset(document?.theme?.preset || 'neon-nexus') }).catch(() => { setFeaturedAds(null); setAdCatalogServices([]); setAdPlacements({ center: [], footer: [] }); setAdVisibility({ banner: true, catalog: true, footer: true }) }).finally(() => setAdvertisementsLoading(false))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    const values = { q: query, category, brand, industry, type: serviceType, deployment, company_size: companySize, budget }
    Object.entries(values).forEach(([key, value]) => { if (value && value !== 'All') params.set(key, value) })
    const next = `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`
    window.history.replaceState(window.history.state, '', next)
  }, [query, category, brand, industry, serviceType, deployment, companySize, budget])

  useEffect(() => {
    const handlers = {
      category: (event) => { setCategory(event.detail || 'All'); setBrand('All'); setIndustry('All'); setQuery('') },
      brand: (event) => { const value = event.detail || 'All'; window.location.assign(value === 'All' ? '/marketplace/brands' : `/marketplace/brands/${value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`) },
      industry: (event) => { setIndustry(event.detail || 'All'); setCategory('All'); setBrand('All'); setQuery('') },
      'service-type': (event) => setServiceType(event.detail || 'All'),
      search: (event) => setQuery(event.detail || ''),
      country: (event) => setSellingCountry(event.detail || 'Global'),
    }
    Object.entries(handlers).forEach(([key, handler]) => window.addEventListener(`marketplace-${key}-selected`, handler))
    return () => Object.entries(handlers).forEach(([key, handler]) => window.removeEventListener(`marketplace-${key}-selected`, handler))
  }, [])

  const grouped = useMemo(() => Object.values(services.reduce((all, service) => {
    const key = `${service.vendor_id}|${service.name}|${service.service_type}`
    if (!all[key]) all[key] = { ...service, plans: [] }
    all[key].plans.push(service)
    return all
  }, {})), [services])
  const countryEligible = sellingCountry === 'Global' ? grouped : grouped.filter((service) => service.sell_globally && (service.selling_countries || []).includes(sellingCountry))
  const carouselServices = useMemo(() => [...new Map([...countryEligible, ...adCatalogServices].map((service) => [Number(service.id), service])).values()], [countryEligible, adCatalogServices])
  const bannerAds = Array.isArray(featuredAds) ? featuredAds : countryEligible.slice(0, 5).map((service) => ({ service_id: service.id, duration_seconds: 6 }))
  const advancedOptions = useMemo(() => {
    const industries = [...new Set(grouped.flatMap((service) => (service.industries || []).map((item) => item.name)))].sort()
    const deployments = [...new Set(grouped.flatMap((service) => specificationValues(service, /deployment|hosting/i)))].sort()
    const companySizes = [...new Set(grouped.flatMap((service) => specificationValues(service, /company size|users|employees|user capacity/i)))].sort()
    return { industries, deployments, companySizes }
  }, [grouped])
  const visible = countryEligible.filter((service) => {
    const allSpecifications = (service.specification_values || []).map((item) => `${item.definition?.name || ''} ${item.value || ''}`).join(' ')
    const text = `${service.name} ${service.vendor?.company_name || ''} ${service.category?.name || ''} ${service.subcategory?.name || ''} ${service.service_type} ${(service.brands || []).map((item) => item.name).join(' ')} ${(service.industries || []).map((item) => item.name).join(' ')} ${allSpecifications}`.toLowerCase()
    const brandNames = [...(service.brands || []), service.brand].filter(Boolean).map((item) => item.name)
    const industryNames = (service.industries || []).map((item) => item.name)
    const deploymentValues = specificationValues(service, /deployment|hosting/i)
    const companySizeValues = specificationValues(service, /company size|users|employees|user capacity/i)
    const prices = (service.plans || []).map((plan) => Number(plan.price_from)).filter(Number.isFinite)
    const withinBudget = budget === 'All' || (prices.length > 0 && Math.min(...prices) <= Number(budget))
    return (category === 'All' || service.category?.name === category || service.subcategory?.name === category) && (serviceType === 'All' || service.service_type === serviceType) && (brand === 'All' || brandNames.includes(brand)) && (industry === 'All' || industryNames.includes(industry)) && (deployment === 'All' || deploymentValues.includes(deployment)) && (companySize === 'All' || companySizeValues.includes(companySize)) && withinBudget && text.includes(query.trim().toLowerCase())
  })
  const clearFilters = () => { setCategory('All'); setBrand('All'); setIndustry('All'); setServiceType('All'); setDeployment('All'); setCompanySize('All'); setBudget('All'); setSellingCountry('Global'); localStorage.setItem('marketplace-selling-country', 'Global'); window.dispatchEvent(new CustomEvent('marketplace-country-selected', { detail: 'Global' })); setQuery('') }
  const selectCategory = (value) => { setCategory(value); setBrand('All'); setIndustry('All'); setQuery(''); if (value !== 'All') document.getElementById('marketplace-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const compareProducts = compareIds.map((id) => grouped.find((item) => String(item.id) === String(id))).filter(Boolean)
  const toggleCompare = (service) => {
    if (compareIds.map(String).includes(String(service.id))) { const next = compareIds.filter((id) => String(id) !== String(service.id)); setCompareIds(next); localStorage.setItem('compare-services', JSON.stringify(next)); setCompareNotice(''); return }
    const first = compareProducts[0]
    if (first && (first.service_type !== service.service_type || String(first.subcategory_id) !== String(service.subcategory_id))) { setCompareNotice(`Choose another ${first.subcategory?.name || first.service_type} solution for a fair comparison.`); return }
    if (compareIds.length >= 3) { setCompareNotice('Maximum 3 solutions can be compared. Remove one first.'); return }
    const next = [...compareIds, service.id]; setCompareIds(next); localStorage.setItem('compare-services', JSON.stringify(next)); setCompareNotice('')
  }
  const clearCompare = () => { setCompareIds([]); localStorage.removeItem('compare-services'); setCompareNotice('') }

  return <section className={`marketplace-page-${themePreset} pb-7`}>
    <div className={`legacy-marketplace-hero marketplace-theme-${themePreset} overflow-hidden rounded-2xl px-5 pb-5 pt-6 text-white sm:px-8 lg:px-12 lg:pt-7`}>
      <div className="hero-discovery flex flex-wrap items-center gap-2"><span className="mr-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-400/50 bg-indigo-500/20 px-4 py-2 text-xs font-bold shadow-[0_0_24px_rgba(99,102,241,.28)]"><Sparkles className="h-3.5 w-3.5"/>Smart Discovery</span>{[['Software & SaaS', 'software'], ['Hardware solutions', 'hardware'], ['Professional services', 'services']].map(([label, value]) => <Link to={`/marketplace/type/${value}`} key={value} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-blue-100 transition hover:bg-white/10 hover:text-white">{label}<ArrowRight className="h-3.5 w-3.5"/></Link>)}</div>
      <div className={`relative mt-9 grid items-center gap-10 ${adVisibility.banner && (advertisementsLoading || bannerAds.length > 0) ? 'lg:grid-cols-[1.08fr_.92fr] lg:gap-14' : ''}`}>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100"><Tag className="h-3.5 w-3.5"/>Technology marketplace</span>
          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.12] sm:text-5xl">Find the right<br/>technology solution<br/>for <span className="hero-gradient-text">your business.</span></h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100/90">Discover verified software, hardware and professional services.<br className="hidden sm:block"/> Compare plans, request a demo or get a tailored quote.</p>
          <div className="mt-6 grid max-w-lg grid-cols-3 gap-3">{[[BadgeCheck, 'Verified', 'vendors'], [Headphones, 'Demo', 'support'], [Tag, 'Transparent', 'pricing']].map(([Icon, top, bottom]) => <div key={top} className="flex items-center gap-2.5 text-xs text-blue-100"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10"><Icon className="h-4 w-4"/></span><span>{top}<br/>{bottom}</span></div>)}</div>
          <div className="mt-7 flex flex-wrap gap-3"><a href="#marketplace-products" className="inline-flex h-11 items-center gap-3 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 px-6 text-xs font-bold text-white shadow-[0_12px_30px_rgba(76,29,149,.35)]">Explore Solutions<ArrowRight className="h-4 w-4"/></a><a href="#marketplace-products" className="inline-flex h-11 items-center gap-3 rounded-full border border-white/30 bg-white/5 px-6 text-xs font-semibold text-white backdrop-blur"><CalendarDays className="h-4 w-4"/>Request a Demo</a></div>
        </div>
        {adVisibility.banner && (advertisementsLoading || bannerAds.length > 0) && <div className="hero-ad-stage relative hidden min-h-[390px] items-center lg:flex"><span className="hero-neon-cube hero-neon-cube-one"/><span className="hero-neon-cube hero-neon-cube-two"/><span className="hero-neon-orb"/>{advertisementsLoading ? <div aria-label="Loading featured advertisement" className="mx-auto h-72 w-full max-w-md animate-pulse rounded-3xl border border-white/20 bg-white/10"/> : <FeaturedAdsCarousel ads={bannerAds} services={carouselServices}/>}</div>}
      </div>
      <div className="hero-stats mt-9 grid overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">{[[Boxes, `${grouped.length || 0}+`, 'Solutions', 'blue'], [UsersRound, `${brands.length || 0}+`, 'Verified Vendors', 'emerald'], [FileText, `${categories.length || 0}+`, 'Categories', 'amber'], [Globe2, 'Global', 'Worldwide Reach', 'violet']].map(([Icon, value, label, tone]) => <div key={label} className="flex items-center gap-4 border-white/15 px-6 py-4 lg:border-r lg:last:border-r-0"><span className={`hero-stat-icon hero-stat-${tone}`}><Icon className="h-5 w-5"/></span><span><b className="block text-lg">{value}</b><small className="text-xs text-blue-100/75">{label}</small></span></div>)}</div>
    </div>

    <CategoryBrowser categories={categories} selected={category} onSelect={selectCategory} loading={categoriesLoading}/>

    <div id="marketplace-products" className="mt-8 scroll-mt-20 overflow-hidden rounded-3xl border border-blue-100 bg-white p-4 shadow-[0_24px_70px_-40px_rgba(30,64,175,.35)] sm:p-6">
      <MarketplaceAdvancedSearchPortal filters={{ query, industry, serviceType, deployment, companySize, budget }} setters={{ query: setQuery, industry: setIndustry, serviceType: setServiceType, deployment: setDeployment, companySize: setCompanySize, budget: setBudget }} options={advancedOptions} resultCount={visible.length}/>
      <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-7"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Marketplace</p><h2 className="mt-1 text-2xl font-bold">{category === 'All' ? 'Featured solutions' : `${category} solutions`}</h2><p className="mt-1 text-sm text-slate-500">Compare plans, view product details and connect with the Solution Provider.</p></div></div>
      {error && <p role="alert" className="mt-5 text-sm text-red-600">{error}</p>}
      <div className="mt-6 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {loading && Array.from({ length: 6 }, (_, index) => <div key={index} className="overflow-hidden rounded-xl border"><Skeleton className="h-48 rounded-none"/><div className="p-5"><Skeleton className="h-3 w-20"/><Skeleton className="mt-4 h-5 w-4/5"/><Skeleton className="mt-7 h-9 w-32"/></div></div>)}
        {visible.map((service, index) => <Fragment key={service.id}><MarketplaceProductCard service={service} selected={compareIds.map(String).includes(String(service.id))} disabled={compareIds.length >= 3} onCompare={toggleCompare}/>{index === Math.min(2, visible.length - 1) && adVisibility.catalog && adPlacements.center.length > 0 && <div className="col-span-full my-2 rounded-3xl bg-gradient-to-r from-[#06285e] to-primary p-4 sm:p-6"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-blue-100">Sponsored solution</p><FeaturedAdsCarousel placement="center" ads={adPlacements.center} services={countryEligible}/></div>}</Fragment>)}
        {!loading && !visible.length && <div className="col-span-full grid min-h-48 place-items-center rounded-xl border border-dashed text-center"><div><Search className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-3 text-sm font-semibold">No solutions found</p><button onClick={clearFilters} className="mt-2 text-xs font-semibold text-primary">Clear filters</button></div></div>}
      </div>
    </div>

    {compareNotice && <div role="alert" className="fixed bottom-28 left-1/2 z-[65] w-[min(520px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-semibold text-amber-800 shadow-floating">{compareNotice}</div>}
    {compareProducts.length > 0 && <aside aria-label="Selected products for comparison" className="fixed bottom-4 left-1/2 z-[60] w-[min(900px,calc(100vw-24px))] -translate-x-1/2 rounded-2xl border border-blue-200 bg-white/95 p-3 shadow-overlay backdrop-blur"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary"><GitCompareArrows className="h-5 w-5"/></span><div><b className="block text-sm text-slate-900">Compare solutions</b><span className="text-[11px] text-slate-500">{compareProducts.length}/3 selected · minimum 2 required</span></div></div><div className="flex min-w-0 flex-1 gap-2 overflow-x-auto sm:justify-center">{compareProducts.map((product) => <span key={product.id} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"><span className="max-w-32 truncate">{product.name}</span><button type="button" onClick={() => toggleCompare(product)} aria-label={`Remove ${product.name}`} className="text-slate-400 hover:text-red-600"><X className="h-3.5 w-3.5"/></button></span>)}</div><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={clearCompare} className="h-10 rounded-lg px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100">Clear</button><Link to="/compare" aria-disabled={compareProducts.length < 2} onClick={(event) => { if (compareProducts.length < 2) event.preventDefault() }} className={`inline-flex h-10 items-center gap-2 rounded-lg px-5 text-xs font-bold text-white ${compareProducts.length >= 2 ? 'bg-primary hover:bg-blue-700' : 'cursor-not-allowed bg-slate-300'}`}>Compare now<ArrowRight className="h-4 w-4"/></Link></div></div></aside>}

    <div className="mt-10 grid gap-4 md:grid-cols-3">{[[BadgeCheck, 'Verified vendors', 'Discover services from registered vendors and trusted partners.'], [Headphones, 'Book a demo', 'Choose a convenient time and send your request directly to the Solution Provider.'], [ShieldCheck, 'Clear pricing', 'See available billing plans, pricing and discounts before you decide.']].map(([Icon, title, detail]) => <div key={title} className="rounded-xl border bg-white p-5"><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-primary"><Icon className="h-5 w-5"/></span><h3 className="mt-4 text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div>)}</div>
    {adVisibility.footer && adPlacements.footer.length > 0 && <aside aria-label="Sponsored marketplace solutions" className="mt-10 rounded-3xl bg-gradient-to-r from-slate-950 via-[#082d66] to-primary p-4 sm:p-7"><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-200">Advertisement</p><h2 className="mt-1 text-lg font-bold text-white">Featured partner solution</h2></div><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold text-blue-100">Sponsored</span></div><FeaturedAdsCarousel placement="footer" ads={adPlacements.footer} services={countryEligible}/></aside>}
  </section>
}
