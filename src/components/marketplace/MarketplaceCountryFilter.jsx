import { Check, ChevronDown, Globe2, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

export default function MarketplaceCountryFilter({ countries, value, onChange, compact = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef(null)
  const selected = countries.find((country) => country.code === value)
  const filtered = useMemo(() => countries.filter((country) => `${country.name} ${country.code}`.toLowerCase().includes(query.trim().toLowerCase())), [countries, query])

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    const escape = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [open])

  const choose = (code) => { onChange(code); setOpen(false); setQuery('') }
  const buttonClass = compact
    ? 'flex h-10 min-w-32 items-center gap-2 rounded-lg bg-white px-2 text-left transition hover:bg-blue-50 focus:ring-2 focus:ring-primary/10'
    : 'flex h-11 min-w-48 items-center gap-2 rounded-xl border bg-white px-3 text-left shadow-sm transition hover:border-blue-300 focus:border-primary focus:ring-2 focus:ring-primary/10'

  return <div ref={root} className="relative">
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label="Choose marketplace country" className={buttonClass}>
      {selected ? <img src={selected.flagUrl} alt="" className="h-4 w-6 rounded-sm object-cover shadow-sm"/> : <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-50 text-primary"><Globe2 className="h-4 w-4"/></span>}
      <span className="min-w-0 flex-1">{!compact && <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Shopping country</span>}<span className="block truncate text-xs font-semibold text-slate-800">{selected?.name || (compact ? 'Global' : 'Global marketplace')}</span></span>
      <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`}/>
    </button>
    {open && <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-xl border bg-white shadow-overlay">
      <div className="border-b p-2"><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search available countries..." className="h-9 w-full rounded-lg border pl-9 pr-3 text-xs outline-none focus:border-primary"/></label></div>
      <div className="max-h-64 overflow-y-auto p-1">
        <button type="button" onClick={() => choose('Global')} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs hover:bg-blue-50 ${value === 'Global' ? 'bg-blue-50 font-semibold text-primary' : 'text-slate-700'}`}><span className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-primary"><Globe2 className="h-4 w-4"/></span><span className="flex-1"><b className="block">Global marketplace</b><span className="text-[10px] font-normal text-slate-400">Show products from every country</span></span>{value === 'Global' && <Check className="h-4 w-4"/>}</button>
        {filtered.map((country) => <button type="button" key={country.code} onClick={() => choose(country.code)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs hover:bg-blue-50 ${value === country.code ? 'bg-blue-50 font-semibold text-primary' : 'text-slate-700'}`}><img src={country.flagUrl} alt="" className="h-5 w-7 rounded-sm object-cover shadow-sm"/><span className="min-w-0 flex-1 truncate">{country.name}</span><span className="text-[10px] text-slate-400">{country.code}</span>{value === country.code && <Check className="h-4 w-4"/>}</button>)}
        {!filtered.length && <p className="p-6 text-center text-xs text-slate-400">No available country found.</p>}
      </div>
    </div>}
  </div>
}
