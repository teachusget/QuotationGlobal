import { Check, Download, GitCompareArrows, Minus, Star, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMarketplaceService, getMarketplaceServices, getServiceRatings } from '../api/marketplace'
import { useAuth } from '../auth/useAuth'

const cycleLabels = { hourly: 'Hourly', daily: 'Daily', monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-annual', annual: 'Annual' }
const text = (value) => value === null || value === undefined || value === '' ? '—' : value
const yesNo = (value) => value ? <Check className="mx-auto h-5 w-5 text-emerald-600"/> : <X className="mx-auto h-5 w-5 text-red-500"/>
const personalEmailDomains = new Set(['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com', 'yandex.com', 'zoho.com'])
const isWorkEmail = (email) => { const domain = String(email || '').trim().toLowerCase().split('@')[1]; return Boolean(domain && domain.includes('.') && !personalEmailDomains.has(domain)) }

function ComparePdfAction({ selectedCount }) {
  const { user } = useAuth()
  if (selectedCount < 2) return null
  const allowed = Boolean(user?.email_verified_at && isWorkEmail(user?.email))
  return <div className="compare-pdf-action mt-5 flex flex-wrap items-center justify-end gap-3">{allowed ? <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white shadow-sm"><Download className="h-4 w-4"/>Download comparison PDF</button> : <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">{!user ? <><Link to="/login" className="font-bold text-primary hover:underline">Sign in</Link> with a verified work email to download the PDF report.</> : !user.email_verified_at ? 'Verify your work email to download the PDF report.' : 'PDF reports are available for work email accounts only.'}</p>}</div>
}

function specificationValue(item) {
  if (!item?.value) return '—'
  if (item.definition?.field_type === 'boolean') return item.value === 'yes' ? 'Yes' : item.value === 'no' ? 'No' : 'N/A'
  if (item.definition?.field_type === 'duration') { try { const value = JSON.parse(item.value); return `${value.amount} ${value.unit}` } catch { return item.value } }
  return `${item.value}${item.definition?.unit ? ` ${item.definition.unit}` : ''}`
}

export default function ComparePage() {
  const [products, setProducts] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [details, setDetails] = useState({})
  const [ratings, setRatings] = useState({})
  const [differences, setDifferences] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getMarketplaceServices().then((rows) => {
      const grouped = Object.values(rows.reduce((result, plan) => {
        const key = `${plan.vendor_id}|${plan.name}|${plan.service_type}`
        if (!result[key]) result[key] = { ...plan, plans: [] }
        result[key].plans.push(plan)
        return result
      }, {}))
      setProducts(grouped)
      let stored = []
      try { stored = JSON.parse(localStorage.getItem('compare-services') || '[]') } catch { localStorage.removeItem('compare-services') }
      const storedProducts = grouped.filter((product) => stored.map(String).includes(String(product.id)))
      const base = storedProducts[0]
      const compatible = storedProducts.filter((product) => !base || (product.service_type === base.service_type && String(product.subcategory_id) === String(base.subcategory_id))).slice(0, 3).map((product) => product.id)
      setSelectedIds(compatible)
      localStorage.setItem('compare-services', JSON.stringify(compatible))
    }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const missing = selectedIds.filter((id) => !details[id])
    if (!missing.length) return
    Promise.all(missing.map(async (id) => {
      const [product, rating] = await Promise.all([getMarketplaceService(id), getServiceRatings(id).catch(() => ({ average: 0, count: 0 }))])
      return [id, product, rating]
    })).then((items) => {
      setDetails((current) => ({ ...current, ...Object.fromEntries(items.map(([id, product]) => [id, product])) }))
      setRatings((current) => ({ ...current, ...Object.fromEntries(items.map(([id, , rating]) => [id, rating])) }))
    }).catch((requestError) => setError(requestError.message))
  }, [selectedIds, details])

  const selected = selectedIds.map((id) => products.find((product) => String(product.id) === String(id))).filter(Boolean)
  const first = selected[0]
  const eligible = products.filter((product) => !selectedIds.map(String).includes(String(product.id)) && (!first || (product.service_type === first.service_type && String(product.subcategory_id) === String(first.subcategory_id))))
  const save = (ids) => { setSelectedIds(ids); localStorage.setItem('compare-services', JSON.stringify(ids)) }
  const add = (id) => { const product = products.find((item) => String(item.id) === String(id)); if (product && selectedIds.length < 3) save([...selectedIds, product.id]) }
  const remove = (id) => save(selectedIds.filter((item) => String(item) !== String(id)))

  const specs = useMemo(() => {
    const union = new Map()
    selectedIds.forEach((id) => (details[id]?.service?.specification_values || []).forEach((item) => {
      if (item.definition?.is_comparable !== false) union.set(item.definition?.id || item.specification_definition_id, item.definition)
    }))
    return [...union.values()].filter(Boolean).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  }, [selectedIds, details])

  const specFor = (id, definition) => specificationValue(details[id]?.service?.specification_values?.find((item) => String(item.specification_definition_id) === String(definition.id)))
  const featureList = (id) => String(details[id]?.service?.features || '').split(/\r?\n|•/).map((item) => item.trim().replace(/^[-*]\s*/, '')).filter(Boolean)
  const commonRows = [
    ['Brand', (id) => details[id]?.service?.brands?.map((item) => item.name).join(', ') || details[id]?.service?.brand?.name || '—'],
    ['Solution provider', (id) => details[id]?.service?.vendor?.company_name || details[id]?.service?.vendor?.name || '—'],
    ['Category', (id) => details[id]?.service?.category?.name || '—'],
    ['Subcategory', (id) => details[id]?.service?.subcategory?.name || '—'],
    ['Industries', (id) => details[id]?.service?.industries?.map((item) => item.name).join(', ') || '—'],
    ['AI enabled', (id) => details[id]?.service?.ai_enabled ? 'Yes' : 'No'],
    ['Starting price', (id) => { const plans = details[id]?.plans || []; const prices = plans.map((plan) => Number(plan.price_from)).filter(Number.isFinite); return prices.length ? `$${Math.min(...prices).toLocaleString()}` : 'Price on request' }],
    ['Pricing model', (id) => details[id]?.service?.pricing_mode === 'flexible_price' ? 'Flexible pricing' : 'Starting price'],
    ['Plans available', (id) => details[id]?.plans?.map((plan) => cycleLabels[plan.billing_cycle] || plan.billing_cycle).join(', ') || '—'],
    ['Discount range', (id) => { const discounts = (details[id]?.plans || []).map((plan) => Number(plan.discount_percent || 0)); return discounts.length ? `Up to ${Math.max(...discounts)}%` : '—' }],
    ['Customer rating', (id) => ratings[id]?.count ? `${Number(ratings[id].average).toFixed(1)} / 5 (${ratings[id].count})` : 'Not rated'],
  ]
  const visibleRows = differences ? commonRows.filter(([, value]) => new Set(selectedIds.map(value)).size > 1) : commonRows
  const visibleSpecs = differences ? specs.filter((definition) => new Set(selectedIds.map((id) => specFor(id, definition))).size > 1) : specs

  return <section className="compare-page pb-12">
    <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 p-6 text-white sm:p-8"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><GitCompareArrows className="h-6 w-6"/></span><div><p className="text-xs font-bold uppercase tracking-widest text-blue-300">Smart comparison</p><h1 className="text-2xl font-bold sm:text-3xl">Compare software side by side</h1></div></div><p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Select 2 or 3 solutions from different brands in the same subcategory and compare pricing, plans, features, specifications, vendor and customer ratings.</p></div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <ComparePdfAction selectedCount={selected.length}/>
    <div className="mt-6 grid gap-3 md:grid-cols-3">{selected.map((product) => <article key={product.id} className="relative rounded-xl border bg-white p-4 shadow-sm"><button type="button" onClick={() => remove(product.id)} aria-label={`Remove ${product.name}`} className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4"/></button><div className="grid h-24 place-items-center rounded-lg bg-slate-50 p-3">{product.images?.[0]?.image_url ? <img src={product.images[0].image_url} alt={product.name} className="h-full w-full object-contain"/> : <GitCompareArrows className="h-8 w-8 text-slate-300"/>}</div><h2 className="mt-3 pr-6 font-bold text-slate-900">{product.name}</h2><p className="mt-1 text-xs text-slate-500">{product.vendor?.company_name || product.vendor?.name}</p></article>)}{selected.length < 3 && <label className="grid min-h-40 place-items-center rounded-xl border border-dashed bg-white p-5 text-center"><span className="w-full"><span className="text-sm font-bold text-slate-700">{selected.length ? 'Add another solution' : 'Select first solution'}</span><select value="" disabled={loading} onChange={(event) => add(event.target.value)} className="mt-3 h-11 w-full rounded-lg border bg-white px-3 text-sm"><option value="">Choose software...</option>{eligible.map((product) => <option key={product.id} value={product.id}>{product.name} — {product.vendor?.company_name || product.vendor?.name}</option>)}</select></span></label>}</div>
    {selected.length >= 2 ? <><div className="mt-6 flex justify-end"><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={differences} onChange={(event) => setDifferences(event.target.checked)}/>Show differences only</label></div><div className="mt-3 overflow-x-auto rounded-xl border bg-white shadow-sm"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="w-52 p-4">Comparison point</th>{selected.map((product) => <th key={product.id} className="p-4 text-center"><Link to={`/marketplace/services/${product.id}`} className="font-bold text-primary hover:underline">{product.name}</Link></th>)}</tr></thead><tbody>{visibleRows.map(([label, value]) => <tr key={label} className="border-t"><th className="p-4 font-semibold text-slate-700">{label}</th>{selectedIds.map((id) => <td key={id} className="p-4 text-center text-slate-600">{label === 'AI enabled' ? yesNo(value(id) === 'Yes') : label === 'Customer rating' && ratings[id]?.count ? <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400"/>{value(id)}</span> : text(value(id))}</td>)}</tr>)}{visibleSpecs.length > 0 && <tr className="border-t bg-blue-50"><th colSpan={selected.length + 1} className="p-3 text-xs font-bold uppercase tracking-wider text-primary">Technical specifications</th></tr>}{visibleSpecs.map((definition) => <tr key={definition.id} className="border-t"><th className="p-4 font-semibold text-slate-700">{definition.name}</th>{selectedIds.map((id) => <td key={id} className="p-4 text-center text-slate-600">{specFor(id, definition)}</td>)}</tr>)}<tr className="border-t bg-blue-50"><th colSpan={selected.length + 1} className="p-3 text-xs font-bold uppercase tracking-wider text-primary">Key features</th></tr><tr className="border-t"><th className="p-4 font-semibold text-slate-700">Features</th>{selectedIds.map((id) => <td key={id} className="p-4 align-top"><ul className="space-y-2">{featureList(id).map((feature) => <li key={feature} className="flex gap-2 text-xs text-slate-600"><Check className="h-4 w-4 shrink-0 text-emerald-600"/>{feature}</li>)}{!featureList(id).length && <li className="text-center"><Minus className="mx-auto h-5 w-5 text-slate-300"/></li>}</ul></td>)}</tr></tbody></table></div></> : <div className="mt-6 rounded-xl border border-dashed bg-white p-12 text-center text-sm text-slate-500">Select at least two software solutions to start comparing.</div>}
  </section>
}
