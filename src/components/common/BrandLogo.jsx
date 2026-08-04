import { Globe2 } from 'lucide-react'

export default function BrandLogo({ compact = false, inverse = false }) {
  return <div className="flex min-w-0 items-center gap-2.5">
    <Globe2 className={`h-8 w-8 shrink-0 ${inverse ? 'text-white' : 'text-primary'}`} strokeWidth={1.8} />
    {!compact && <div className="min-w-0 leading-tight"><div className={`whitespace-nowrap text-[13px] font-extrabold ${inverse ? 'text-white' : 'text-slate-900'}`}>QUOTATION GLOBAL</div><div className={`whitespace-nowrap text-[11px] ${inverse ? 'text-slate-300' : 'text-slate-500'}`}>Global Technology Marketplace</div></div>}
  </div>
}
