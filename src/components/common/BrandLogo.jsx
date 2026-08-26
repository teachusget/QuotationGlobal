import { Globe2 } from 'lucide-react'
import { legacyMarketplaceHeader } from '../../data/legacyMarketplaceShell'

export default function BrandLogo({ compact = false, inverse = false, branding, media }) {
  const resolvedBranding = branding || legacyMarketplaceHeader
  const resolvedMedia = media || {}
  const logo = resolvedBranding?.logo_media_id && resolvedMedia?.[resolvedBranding.logo_media_id]
  return <div className="flex min-w-0 items-center gap-2.5">
    {logo ? <span className={`${compact ? 'h-10 w-[120px]' : 'h-[52px] w-[190px]'} block shrink-0 overflow-hidden`}><img src={logo.url} alt={logo.alt_text} className="h-full w-full object-cover object-center"/></span> : <Globe2 className={`h-8 w-8 shrink-0 ${inverse ? 'text-white' : 'text-primary'}`} strokeWidth={1.8}/>}
    {!compact && !logo && <div className="min-w-0 leading-tight"><div className={`whitespace-nowrap text-[13px] font-extrabold ${inverse ? 'text-white' : 'text-slate-900'}`}>{resolvedBranding?.brand_name || 'QUOTATION GLOBAL'}</div><div className={`whitespace-nowrap text-[11px] ${inverse ? 'text-slate-300' : 'text-slate-500'}`}>{resolvedBranding?.tagline || 'Global Technology Marketplace'}</div></div>}
  </div>
}
