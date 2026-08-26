import { ArrowRight, BadgeCheck, Boxes, Headphones, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMarketplaceServices } from '../../api/marketplace'
import { Skeleton } from '../ui'

const icons = [BadgeCheck, Headphones, ShieldCheck]
const columnClass = { 1: 'grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 xl:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }
const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' }
const spacingClass = { compact: 'gap-y-2', comfortable: 'gap-y-5', spacious: 'gap-y-9' }

function MediaImage({ id, media, alt = '', className = '' }) {
  if (!id || !media?.[id]) return null
  const asset = media[id]
  return <img loading="lazy" decoding="async" src={asset.url} width={asset.width} height={asset.height} alt={asset.alt_text || alt} className={className}/>
}

function SafeLink({ to = '#', preview, children, className = '', ...props }) {
  const stop = (event) => { if (preview) event.preventDefault() }
  if (/^(https:\/\/|mailto:|tel:)/i.test(to)) return <a {...props} href={to} onClick={stop} target={to.startsWith('https://') ? '_blank' : undefined} rel="noreferrer" className={className}>{children}</a>
  return <Link {...props} to={preview ? '#' : to} onClick={stop} className={className}>{children}</Link>
}

function RichText({ content = [], legacyText = '' }) {
  const nodes = content.length ? content : legacyText.split('\n').filter(Boolean).map((text) => ({ type: 'paragraph', text }))
  return <div className="market-rich-text mx-auto max-w-3xl space-y-3 text-sm leading-7">{nodes.map((node, index) => {
    if (node.type === 'heading') return <h3 key={index} className="text-xl font-semibold">{node.text}</h3>
    if (node.type === 'bullet') return <div key={index} className="flex gap-2"><span aria-hidden="true">•</span><p>{node.text}</p></div>
    return <p key={index}>{node.text}</p>
  })}</div>
}

export default function MarketplaceRenderer({ document, media = {}, catalog: suppliedCatalog, preview = false }) {
  const [fallbackServices, setFallbackServices] = useState([])
  const [loading, setLoading] = useState(!suppliedCatalog)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ category: 'All', brand: 'All', industry: 'All', serviceType: 'All' })
  const theme = document?.theme || {}
  const catalog = useMemo(() => suppliedCatalog || { categories: [], brands: [], industries: [], services: fallbackServices }, [suppliedCatalog, fallbackServices])

  useEffect(() => {
    if (suppliedCatalog) { setLoading(false); return undefined }
    let active = true
    setLoading(true)
    getMarketplaceServices().then((rows) => { if (active) setFallbackServices(rows) }).catch((error) => { if (active) setLoadError(error.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [suppliedCatalog])

  useEffect(() => {
    if (preview) return undefined
    const handlers = {
      category: (event) => setFilters((value) => ({ ...value, category: event.detail || 'All' })),
      brand: (event) => setFilters((value) => ({ ...value, brand: event.detail || 'All' })),
      industry: (event) => setFilters((value) => ({ ...value, industry: event.detail || 'All' })),
      'service-type': (event) => setFilters((value) => ({ ...value, serviceType: event.detail || 'All' })),
    }
    Object.entries(handlers).forEach(([key, handler]) => window.addEventListener(`marketplace-${key}-selected`, handler))
    return () => Object.entries(handlers).forEach(([key, handler]) => window.removeEventListener(`marketplace-${key}-selected`, handler))
  }, [preview])

  const maps = useMemo(() => Object.fromEntries(['categories', 'brands', 'industries', 'services'].map((type) => [type, new Map((catalog[type] || []).map((item) => [Number(item.id), item]))])), [catalog])
  const byIds = (type, ids = []) => ids.map((id) => maps[type]?.get(Number(id))).filter(Boolean)
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const blockStyle = (settings = {}) => ({
    paddingTop: settings.padding_top === undefined ? undefined : `${settings.padding_top}px`,
    paddingBottom: settings.padding_bottom === undefined ? undefined : `${settings.padding_bottom}px`,
    backgroundColor: settings.background_color || undefined,
  })

  const renderBlock = (block) => {
    if (block.visible === false) return null
    const s = block.settings || {}
    const alignment = alignClass[s.alignment] || 'text-left'
    if (block.type === 'hero') return <section key={block.id} style={{ ...blockStyle(s), background: s.background_media_id && media[s.background_media_id] ? `linear-gradient(100deg,rgba(6,40,94,.94),rgba(7,85,189,.75)),url(${media[s.background_media_id].url}) center/cover` : `linear-gradient(135deg,${theme.primary || '#06285e'},${theme.secondary || '#0797c6'})` }} className={`relative overflow-hidden rounded-[var(--market-radius)] px-5 py-10 text-white sm:px-8 lg:px-12 lg:py-14 ${alignment}`}><div className={`${s.alignment === 'center' ? 'mx-auto' : s.alignment === 'right' ? 'ml-auto' : ''} relative z-10 max-w-3xl`}><span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5"/>{s.eyebrow}</span><h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">{s.title}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/85">{s.description}</p><div className="mt-7 flex max-w-2xl overflow-hidden rounded-xl bg-white p-1.5 shadow-floating"><Search className="ml-3 mt-2.5 h-5 w-5 text-slate-400"/><input disabled={preview} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={s.search_placeholder} className="min-w-0 flex-1 px-3 py-2 text-sm text-slate-800 outline-none"/><button type="button" disabled={preview} className="rounded-lg px-5 text-sm font-semibold text-white" style={{ backgroundColor: theme.primary }}>Search</button></div><div className="mt-5 flex flex-wrap gap-5 text-xs text-white/85">{(s.trust_points || []).map((point, index) => { const Icon = icons[index % icons.length]; return <span key={`${point}-${index}`} className="inline-flex items-center gap-1.5"><Icon className="h-4 w-4"/>{point}</span> })}</div></div></section>
    if (block.type === 'heading') return <section key={block.id} style={blockStyle(s)} className={`py-5 ${alignment}`}><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.primary }}>{s.eyebrow}</p><h2 className="mt-2 text-2xl font-bold">{s.title}</h2></section>
    if (block.type === 'paragraph') return <p key={block.id} style={blockStyle(s)} className={`mx-auto max-w-3xl whitespace-pre-wrap py-5 text-sm leading-7 ${alignment}`}>{s.text}</p>
    if (block.type === 'rich_text') return <section key={block.id} style={blockStyle(s)} className={`py-5 ${alignment}`}><RichText content={s.content} legacyText={s.text}/></section>
    if (block.type === 'image') return <figure key={block.id} style={blockStyle(s)} className="py-5"><MediaImage id={s.media_id} media={media} alt={s.caption} className="mx-auto max-h-[620px] w-full rounded-[var(--market-radius)] object-cover"/>{s.caption && <figcaption className="mt-2 text-center text-xs" style={{ color: theme.muted }}>{s.caption}</figcaption>}</figure>
    if (block.type === 'banner') return <section key={block.id} style={blockStyle(s)} className={`relative my-6 overflow-hidden rounded-[var(--market-radius)] bg-slate-900 p-7 text-white ${alignment}`}><MediaImage id={s.background_media_id} media={media} className="absolute inset-0 h-full w-full object-cover opacity-35"/><div className="relative"><h2 className="text-2xl font-bold">{s.title}</h2><p className="mt-2 max-w-2xl text-sm text-white/80">{s.description}</p>{s.button_label && <SafeLink preview={preview} to={s.target || '#'} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-slate-900">{s.button_label}<ArrowRight className="h-4 w-4"/></SafeLink>}</div></section>
    if (block.type === 'button_group') return <div key={block.id} style={blockStyle(s)} className={`flex flex-wrap gap-3 py-5 ${s.alignment === 'left' ? 'justify-start' : s.alignment === 'right' ? 'justify-end' : 'justify-center'}`}>{(s.items || []).map((item) => <SafeLink preview={preview} key={item.id} to={item.target || '#'} className="inline-flex h-10 items-center rounded-lg px-4 text-xs font-semibold text-white" style={{ backgroundColor: theme.primary }}>{item.label}</SafeLink>)}</div>
    if (block.type === 'spacer') return <div key={block.id} aria-hidden="true" style={{ height: Math.min(160, Math.max(0, Number(s.height) || 32)) }}/>
    if (block.type === 'divider') return <hr key={block.id} className="my-5"/>
    if (block.type === 'row') return <section key={block.id} style={blockStyle(s)} className={`grid gap-5 py-5 ${columnClass[s.columns] || columnClass[2]}`}>{(s.children || []).map(renderBlock)}</section>
    if (block.type === 'brand_grid') { const rows = byIds('brands', s.catalog_ids); return <section key={block.id} style={blockStyle(s)} className="my-6 overflow-hidden rounded-[var(--market-radius)] border p-5" data-market-surface>{s.title && <h2 className="mb-5 text-lg font-semibold">{s.title}</h2>}<div className={`flex items-center gap-8 overflow-x-auto ${s.display === 'marquee' ? 'brand-marquee-track w-max' : 'flex-wrap'}`}>{rows.map((item) => <div key={item.id} className="grid h-14 w-36 shrink-0 place-items-center">{item.logo_url ? <img loading="lazy" src={item.logo_url} alt={item.name} className="max-h-12 max-w-full object-contain"/> : <span className="text-xs font-semibold">{item.name}</span>}</div>)}</div></section> }
    if (block.type === 'category_grid' || block.type === 'industry_grid') { const type = block.type === 'category_grid' ? 'categories' : 'industries'; const rows = byIds(type, s.catalog_ids); return <section key={block.id} style={blockStyle(s)} className={`py-8 ${alignment}`}><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.primary }}>{s.eyebrow}</p><h2 className="mt-1 text-2xl font-bold">{s.title}</h2><div className={`mt-5 grid gap-3 ${columnClass[s.columns || 4]}`}>{rows.map((item) => <button disabled={preview} key={item.id} onClick={() => setFilter(type === 'categories' ? 'category' : 'industry', item.name)} className="rounded-[var(--market-radius)] border p-4 text-center transition hover:-translate-y-0.5 hover:border-blue-300" data-market-surface><span className="mx-auto grid h-12 w-12 place-items-center overflow-hidden rounded-lg bg-slate-50">{item.logo_url ? <img loading="lazy" src={item.logo_url} alt="" className="h-full w-full object-contain"/> : <Boxes className="h-5 w-5 text-slate-400"/>}</span><span className="mt-3 block text-xs font-semibold">{item.name}</span></button>)}</div></section> }
    if (block.type === 'product_grid') {
      const selected = byIds('services', s.catalog_ids)
      const products = selected.filter((service) => `${service.name || ''} ${service.vendor?.company_name || service.vendor || ''} ${service.category?.name || ''}`.toLowerCase().includes(query.toLowerCase()) && (filters.category === 'All' || service.category?.name === filters.category || service.subcategory?.name === filters.category) && (filters.brand === 'All' || [...(service.brands || []), service.brand].filter(Boolean).some((item) => item.name === filters.brand)) && (filters.industry === 'All' || (service.industries || []).some((item) => item.name === filters.industry)) && (filters.serviceType === 'All' || service.service_type === filters.serviceType))
      return <section key={block.id} id={`marketplace-products-${block.id}`} style={blockStyle(s)} className="my-8 rounded-[var(--market-radius)] border p-5 sm:p-6" data-market-surface><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.primary }}>{s.eyebrow}</p><h2 className="mt-1 text-2xl font-bold">{s.title}</h2><p className="mt-1 text-sm" style={{ color: theme.muted }}>{s.description}</p>{s.show_filters && <div className="mt-5 grid gap-2 sm:grid-cols-4">{[['Category', 'category', byIds('categories', s.category_ids || []).map((item) => item.name)], ['Brand', 'brand', byIds('brands', s.brand_ids || []).map((item) => item.name)], ['Industry', 'industry', byIds('industries', s.industry_ids || []).map((item) => item.name)], ['Type', 'serviceType', ['software', 'hardware', 'services']]].map(([label, key, options]) => <select disabled={preview} aria-label={label} key={label} value={filters[key]} onChange={(event) => setFilter(key, event.target.value)} className="h-10 rounded-lg border px-3 text-xs" data-market-surface><option value="All">All {label.toLowerCase()}</option>{options.map((option) => <option key={option}>{option}</option>)}</select>)}</div>} {loadError && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-xs text-red-700">{loadError}</p>}<div className={`mt-6 grid gap-5 ${columnClass[s.columns] || columnClass[3]}`}>{loading && Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-80"/>)}{products.map((service) => <SafeLink preview={preview} to={`/marketplace/services/${service.id}`} key={service.id} className="group flex flex-col overflow-hidden rounded-[var(--market-radius)] border transition hover:-translate-y-0.5 hover:shadow-floating" data-market-surface><div className="grid h-44 place-items-center bg-slate-50 p-4">{service.images?.[0]?.image_url || service.image_url ? <img loading="lazy" src={service.images?.[0]?.image_url || service.image_url} alt={service.name} className="h-full w-full object-contain"/> : <Boxes className="h-10 w-10 text-slate-300"/>}</div><div className="flex flex-1 flex-col p-4"><span className="text-xs font-semibold capitalize" style={{ color: theme.primary }}>{service.service_type}</span><h3 className="mt-2 text-base font-semibold">{service.name}</h3><p className="mt-1 text-xs" style={{ color: theme.muted }}>by {service.vendor?.company_name || service.vendor?.name || service.vendor || 'Marketplace vendor'}</p><p className="mt-4 text-sm font-bold">{service.plans?.[0]?.price_from || service.price_from ? `Starting From $${Number(service.plans?.[0]?.price_from || service.price_from).toLocaleString()}` : 'Price on request'}</p></div></SafeLink>)}{!loading && !products.length && <p className="col-span-full rounded-xl border border-dashed p-10 text-center text-sm" style={{ color: theme.muted }}>No selected solutions match these filters.</p>}</div></section>
    }
    if (block.type === 'feature_cards' || block.type === 'trust_badges') return <section key={block.id} style={blockStyle(s)} className={`grid gap-4 py-7 ${columnClass[Math.min(4, Math.max(1, (s.items || []).length))] || columnClass[3]}`}>{(s.items || []).map((item, index) => { const Icon = icons[index % icons.length]; return <article key={item.id} className="rounded-[var(--market-radius)] border p-5" data-market-surface><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50" style={{ color: theme.primary }}><Icon className="h-5 w-5"/></span><h3 className="mt-4 text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs leading-5" style={{ color: theme.muted }}>{item.description}</p></article> })}</section>
    return null
  }

  const style = {
    '--market-primary': theme.primary || '#0B6FF4', '--market-secondary': theme.secondary || '#0797C6', '--market-canvas': theme.canvas || '#F6F8FC', '--market-surface': theme.surface || '#FFFFFF', '--market-text': theme.text || '#0F172A', '--market-muted': theme.muted || '#64748B', '--market-radius': theme.radius === 'square' ? '0px' : theme.radius === 'soft' ? '8px' : '16px', fontFamily: theme.font === 'System' ? 'system-ui, sans-serif' : 'Inter, sans-serif', color: theme.text, backgroundColor: theme.canvas,
  }
  return <div className={`marketplace-renderer marketplace-container-${theme.container || 'wide'} grid ${spacingClass[theme.section_spacing] || spacingClass.comfortable}`} style={style}>{(document?.sections || []).map(renderBlock)}</div>
}
