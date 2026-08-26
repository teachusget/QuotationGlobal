import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MarketplaceHeaderSearch() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const search = (event) => {
    event.preventDefault()
    navigate('/marketplace')
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('marketplace-search-selected', { detail: query.trim() }))
      document.getElementById('marketplace-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }
  const clear = () => { setQuery(''); window.dispatchEvent(new CustomEvent('marketplace-search-selected', { detail: '' })) }
  return <form onSubmit={search} role="search" className="group flex h-10 w-[250px] items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-sm transition focus-within:w-[310px] focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 xl:w-[290px] xl:focus-within:w-[350px]"><Search className="ml-3.5 h-4 w-4 shrink-0 text-slate-400 group-focus-within:text-primary"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search software..." aria-label="Search marketplace" className="min-w-0 flex-1 bg-transparent px-2.5 text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"/>{query && <button type="button" onClick={clear} aria-label="Clear search" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"><X className="h-3.5 w-3.5"/></button>}<button className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-white transition hover:bg-blue-700" aria-label="Submit search"><Search className="h-3.5 w-3.5"/></button></form>
}
