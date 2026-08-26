import { ArrowDown, ArrowUp, Check, Image, MonitorPlay, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getMarketplaceBuilder, getMarketplaceCatalog, publishMarketplace, saveMarketplaceDraft } from '../api/marketplaceBuilder'
import { useAuth } from '../auth/useAuth'
import { Alert, Button, PageHeader, Skeleton } from '../components/ui'
import { clearMarketplaceContentCache } from '../hooks/useMarketplaceContent'

const clone = (value) => JSON.parse(JSON.stringify(value))

function heroAds(document) {
  return document?.sections?.find((section) => section.type === 'hero')?.settings?.featured_ads || []
}

function withHeroAds(document, featuredAds) {
  const next = clone(document)
  next.sections = (next.sections || []).map((section) => section.type === 'hero'
    ? { ...section, settings: { ...section.settings, featured_ads: featuredAds } }
    : section)
  return next
}

export default function FeaturedBannerAdsPage() {
  const { can } = useAuth()
  const [document, setDocument] = useState(null)
  const [lockVersion, setLockVersion] = useState(1)
  const [services, setServices] = useState([])
  const [ads, setAds] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getMarketplaceBuilder(), getMarketplaceCatalog()])
      .then(([builder, catalog]) => {
        const draft = builder.data.draft_document
        setDocument(draft)
        setLockVersion(builder.data.lock_version || 1)
        setAds(heroAds(draft))
        setServices(catalog.data?.services || [])
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [])

  const selectedIds = useMemo(() => new Set(ads.map((ad) => Number(ad.service_id))), [ads])
  const available = useMemo(() => services.filter((service) => !selectedIds.has(Number(service.id)) && `${service.name} ${service.vendor || ''} ${service.service_type || ''}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 60), [search, selectedIds, services])
  const serviceMap = useMemo(() => new Map(services.map((service) => [Number(service.id), service])), [services])

  const add = (serviceId) => setAds((current) => [...current, { service_id: Number(serviceId), duration_seconds: 6 }])
  const remove = (index) => setAds((current) => current.filter((_, itemIndex) => itemIndex !== index))
  const move = (index, direction) => setAds((current) => {
    const target = index + direction
    if (target < 0 || target >= current.length) return current
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]
    return next
  })
  const duration = (index, value) => setAds((current) => current.map((ad, itemIndex) => itemIndex === index ? { ...ad, duration_seconds: Math.min(120, Math.max(2, Number(value) || 2)) } : ad))

  const save = async (publish) => {
    setSaving(true); setError(''); setMessage('')
    try {
      const nextDocument = withHeroAds(document, ads)
      const saved = await saveMarketplaceDraft(nextDocument, lockVersion)
      setDocument(nextDocument)
      setLockVersion(saved.data.lock_version)
      if (publish) {
        await publishMarketplace({ name: 'Featured banner ads', release_note: 'Updated marketplace hero featured software.' })
        clearMarketplaceContentCache()
        setMessage('Featured banner ads saved and published on the marketplace.')
      } else setMessage('Featured banner ads saved to the marketplace draft.')
    } catch (requestError) { setError(requestError.message) } finally { setSaving(false) }
  }

  return <section>
    <PageHeader eyebrow="Marketplace settings" title="Featured Banner Ads" description="Choose which software appears in the marketplace hero banner, arrange its display order and control rotation timing." actions={<div className="flex gap-2">{can('marketplace_builder.update') && <Button variant="secondary" loading={saving} onClick={() => save(false)}>Save Draft</Button>}{can('marketplace_builder.publish') && <Button icon={MonitorPlay} loading={saving} onClick={() => save(true)}>Save & Publish</Button>}</div>}/>
    {error && <Alert className="mt-4">{error}</Alert>}
    {message && <Alert tone="success" className="mt-4">{message}</Alert>}
    {loading ? <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.15fr]"><Skeleton className="h-96"/><Skeleton className="h-96"/></div> : <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">Available software</p><p className="mt-1 text-xs text-slate-500">Search and add approved marketplace solutions.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-primary">{services.length} available</span></div>
        <label className="relative mt-4 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search software or vendor..." className="h-11 w-full rounded-xl border bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-primary focus:bg-white"/></label>
        <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">{available.map((service) => <button type="button" key={service.id} disabled={!can('marketplace_builder.update')} onClick={() => add(service.id)} className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/50 disabled:cursor-not-allowed"><span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">{service.image_url ? <img src={service.image_url} alt="" className="h-full w-full object-contain p-1"/> : <Image className="h-5 w-5 text-slate-400"/>}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{service.name}</b><span className="mt-0.5 block truncate text-xs text-slate-500">{service.vendor || 'Verified vendor'} · <span className="capitalize">{service.service_type}</span></span></span><span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-primary">Add</span></button>)}{!available.length && <p className="rounded-xl border border-dashed py-10 text-center text-xs text-slate-400">No matching software available.</p>}</div>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-5">
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">Banner rotation</p><p className="mt-1 text-xs text-slate-500">Ads display from top to bottom in this order.</p></div><span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white">{ads.length} selected</span></div>
        <div className="mt-4 space-y-3">{ads.map((ad, index) => { const service = serviceMap.get(Number(ad.service_id)); return <article key={ad.service_id} className="rounded-2xl border border-white bg-white p-3 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-blue-50">{service?.image_url ? <img src={service.image_url} alt="" className="h-full w-full object-contain p-1"/> : <Image className="h-5 w-5 text-primary"/>}</span><span className="min-w-0 flex-1"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-primary">Position {index + 1}</span><b className="block truncate text-sm">{service?.name || `Software #${ad.service_id}`}</b><span className="block truncate text-xs text-slate-500">{service?.vendor || 'Vendor'}</span></span><div className="flex items-center gap-1"><button type="button" disabled={index === 0 || !can('marketplace_builder.update')} onClick={() => move(index, -1)} aria-label="Move up" className="grid h-9 w-9 place-items-center rounded-lg border text-slate-500 disabled:opacity-30"><ArrowUp className="h-4 w-4"/></button><button type="button" disabled={index === ads.length - 1 || !can('marketplace_builder.update')} onClick={() => move(index, 1)} aria-label="Move down" className="grid h-9 w-9 place-items-center rounded-lg border text-slate-500 disabled:opacity-30"><ArrowDown className="h-4 w-4"/></button><button type="button" disabled={!can('marketplace_builder.update')} onClick={() => remove(index)} aria-label="Remove" className="grid h-9 w-9 place-items-center rounded-lg border border-red-100 text-red-500 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button></div></div><div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><label className="text-xs font-semibold text-slate-600">Display time</label><span className="flex items-center gap-2"><input type="number" min="2" max="120" disabled={!can('marketplace_builder.update')} value={ad.duration_seconds || 6} onChange={(event) => duration(index, event.target.value)} className="h-8 w-20 rounded-lg border bg-white px-2 text-center text-xs font-bold"/><span className="text-xs text-slate-500">seconds</span></span></div></article>})}{!ads.length && <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-blue-200 bg-white/50 text-center"><div><Check className="mx-auto h-8 w-8 text-blue-300"/><p className="mt-3 text-sm font-semibold">No banner ads selected</p><p className="mt-1 text-xs text-slate-500">Add software from the list to start a rotation.</p></div></div>}</div>
      </div>
    </div>}
  </section>
}
