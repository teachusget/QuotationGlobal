import { Ban, Check, CheckCircle2, Globe2, Save, Search, ShieldCheck, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getSellingCountries, updateSellingCountries } from '../api/sellingCountries'
import { countryCatalog } from '../data/countryCatalog'
import { Alert, Button, PageHeader } from '../components/ui'

const tabs = [
  { id: 'restricted', label: 'Restricted' },
  { id: 'allowed', label: 'Allowed' },
  { id: 'all', label: 'All countries' },
]

export default function SellingCountriesPage() {
  const [countries, setCountries] = useState([])
  const [savedCountries, setSavedCountries] = useState([])
  const [tab, setTab] = useState('restricted')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    getSellingCountries().then((result) => {
      const allowed = result.data.allowed_countries ?? countryCatalog.map((country) => country.code)
      setCountries(allowed); setSavedCountries(allowed)
    }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false))
  }, [])

  const allowedSet = useMemo(() => new Set(countries), [countries])
  const restrictedCount = countryCatalog.length - countries.length
  const activeTabCount = tab === 'allowed' ? countries.length : tab === 'restricted' ? restrictedCount : countryCatalog.length
  const dirty = [...countries].sort().join(',') !== [...savedCountries].sort().join(',')
  const visible = useMemo(() => countryCatalog.filter((country) => {
    const matchesTab = tab === 'all' || (tab === 'allowed' ? allowedSet.has(country.code) : !allowedSet.has(country.code))
    return matchesTab && `${country.name} ${country.code}`.toLowerCase().includes(query.trim().toLowerCase())
  }), [allowedSet, query, tab])

  const toggle = (code) => {
    setMessage('')
    setCountries((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code])
  }
  const allowVisible = () => setCountries((current) => [...new Set([...current, ...visible.map((country) => country.code)])])
  const restrictVisible = () => setCountries((current) => current.filter((code) => !visible.some((country) => country.code === code)))
  const save = async () => {
    if (!countries.length) { setError('At least one selling country must remain allowed.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await updateSellingCountries(countries)
      setSavedCountries(result.data.allowed_countries); setCountries(result.data.allowed_countries); setMessage(result.message)
    } catch (requestError) { setError(requestError.message) } finally { setSaving(false) }
  }

  return <section className="pb-24"><PageHeader eyebrow="Marketplace controls" title="Selling Country Access" description="Control exactly where vendors can offer services across the global marketplace."/>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <article className="relative overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-4 shadow-sm"><CheckCircle2 className="absolute -bottom-3 -right-2 h-20 w-20 text-emerald-100"/><p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Allowed</p><p className="mt-1 text-3xl font-extrabold text-slate-900">{countries.length}</p><p className="mt-1 text-xs text-slate-500">Countries vendors can target</p></article>
      <article className="relative overflow-hidden rounded-xl border border-rose-100 bg-gradient-to-br from-white to-rose-50 p-4 shadow-sm"><Ban className="absolute -bottom-3 -right-2 h-20 w-20 text-rose-100"/><p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Restricted</p><p className="mt-1 text-3xl font-extrabold text-slate-900">{restrictedCount}</p><p className="mt-1 text-xs text-slate-500">Unavailable to vendors</p></article>
      <article className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-4 shadow-sm"><Globe2 className="absolute -bottom-3 -right-2 h-20 w-20 text-blue-100"/><p className="text-[11px] font-bold uppercase tracking-wider text-primary">Coverage</p><p className="mt-1 text-3xl font-extrabold text-slate-900">{countryCatalog.length}</p><p className="mt-1 text-xs text-slate-500">Total supported countries</p></article>
    </div>

    <section className="mt-4 overflow-hidden rounded-2xl border bg-white shadow-subtle">
      <header className="border-b bg-slate-50/70 p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-primary"><ShieldCheck className="h-5 w-5"/></span><div><h2 className="text-sm font-bold text-slate-900">Country access policy</h2><p className="mt-1 text-xs leading-5 text-slate-500">Restricted countries disappear from the country selector when a vendor enables global selling.</p></div></div>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="inline-flex w-fit rounded-lg border bg-white p-1">{tabs.map((item) => { const count = item.id === 'allowed' ? countries.length : item.id === 'restricted' ? restrictedCount : countryCatalog.length; return <button type="button" key={item.id} onClick={() => setTab(item.id)} className={`flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${tab === item.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>{item.label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === item.id ? 'bg-white/15' : 'bg-slate-100'}`}>{count}</span></button> })}</div><label className="relative block w-full lg:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search country or code..." className="h-11 w-full rounded-lg border bg-white pl-10 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"/>{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear country search" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4"/></button>}</label></div>
      </header>

      {error && <Alert className="m-4 mb-0">{error}</Alert>}{message && <Alert tone="success" className="m-4 mb-0">{message}</Alert>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"><p className="text-xs text-slate-500">{query ? <><b className="text-slate-800">{visible.length} of {activeTabCount}</b> {tab === 'all' ? 'countries' : `${tab} countries`} match “{query}”</> : <><b className="text-slate-800">{visible.length}</b> {tab === 'all' ? 'countries' : `${tab} countries`} shown</>}</p><div className="flex gap-2">{tab !== 'allowed' && <button type="button" disabled={!visible.length} onClick={allowVisible} className="h-8 rounded-md border border-emerald-200 px-3 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">Allow shown</button>}{tab !== 'restricted' && <button type="button" disabled={!visible.length} onClick={restrictVisible} className="h-8 rounded-md border border-rose-200 px-3 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40">Restrict shown</button>}</div></div>

      {loading ? <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 9 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-100"/>)}</div> : visible.length ? <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">{visible.map((country) => { const allowed = allowedSet.has(country.code); return <button type="button" key={country.code} onClick={() => toggle(country.code)} aria-pressed={allowed} className={`group flex min-h-14 items-center gap-3 rounded-xl border px-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${allowed ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-100 bg-rose-50/40'}`}><img src={country.flagUrl} alt="" className="h-7 w-9 shrink-0 rounded object-cover shadow-sm"/><span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-800">{country.name}</b><span className={`mt-0.5 block text-[10px] font-bold uppercase tracking-wide ${allowed ? 'text-emerald-700' : 'text-rose-600'}`}>{allowed ? 'Allowed' : 'Restricted'} · {country.code}</span></span><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${allowed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-rose-200 bg-white text-transparent group-hover:border-rose-400'}`}><Check className="h-3.5 w-3.5"/></span></button>})}</div> : <div className="grid min-h-56 place-items-center p-6 text-center"><div><Search className="mx-auto h-7 w-7 text-slate-300"/><h3 className="mt-3 text-sm font-semibold">No countries found</h3><p className="mt-1 text-xs text-slate-500">Change the active tab or search term.</p></div></div>}
    </section>

    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur md:left-60"><div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4"><div><p className="text-xs font-semibold text-slate-800">{dirty ? 'You have unsaved country changes' : 'Country access policy is up to date'}</p><p className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">{countries.length} allowed · {restrictedCount} restricted</p></div><Button type="button" icon={Save} loading={saving} disabled={loading || saving || !dirty} onClick={save}>Save Changes</Button></div></div>
  </section>
}
