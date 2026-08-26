import { LogIn, Sparkles, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import useDialogAccessibility from '../../hooks/useDialogAccessibility'
import useMarketplaceContent from '../../hooks/useMarketplaceContent'
import BrandLogo from '../common/BrandLogo'
import { BrandedLoader } from '../ui'
import AppLayout from './AppLayout'
import Footer from './Footer'
import MobileMarketplaceNavigation, { MarketplaceMenuButton } from './MobileMarketplaceNavigation'
import PublicMarketplaceNavigation from './PublicMarketplaceNavigation'
import { legacyMarketplaceHeader, legacyMarketplaceTheme } from '../../data/legacyMarketplaceShell'
import { loadMarketplaceTheme } from '../../themes/registry'

const GUEST_PREVIEW_DURATION_MS = 60 * 1000
const GUEST_PREVIEW_DEADLINE_KEY = 'marketplace_guest_preview_deadline'

export default function PublicMarketplaceLayout() {
  const { user, loading } = useAuth(); const { content, loading: contentLoading } = useMarketplaceContent()
  const [authPromptOpen, setAuthPromptOpen] = useState(false); const [marketplaceMenuOpen, setMarketplaceMenuOpen] = useState(false)
  const authPromptRef = useDialogAccessibility(authPromptOpen, () => {}, true)
  useEffect(() => { loadMarketplaceTheme(content?.document?.theme?.preset).catch(() => {}) }, [content?.document?.theme?.preset])
  useEffect(() => {
    if (loading || user) return undefined
    const storedDeadline = Number(sessionStorage.getItem(GUEST_PREVIEW_DEADLINE_KEY))
    const deadline = storedDeadline > Date.now() ? storedDeadline : storedDeadline || Date.now() + GUEST_PREVIEW_DURATION_MS
    if (!storedDeadline) sessionStorage.setItem(GUEST_PREVIEW_DEADLINE_KEY, String(deadline))
    const remaining = deadline - Date.now()
    if (remaining <= 0) { setAuthPromptOpen(true); return undefined }
    const timer = setTimeout(() => setAuthPromptOpen(true), remaining)
    return () => clearTimeout(timer)
  }, [loading, user])
  useEffect(() => {
    const seo = content?.document?.seo
    if (!seo) return undefined
    const previous = document.title
    if (seo.title) document.title = seo.title
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta) }
    const oldDescription = meta.content
    if (seo.description) meta.content = seo.description
    return () => { document.title = previous; meta.content = oldDescription }
  }, [content])
  if ((loading || contentLoading) && !user) return <BrandedLoader/>
  if (user) return <AppLayout/>
  const header = content?.document?.header || legacyMarketplaceHeader
  const theme = content?.document?.theme || legacyMarketplaceTheme
  return <div className={`marketplace-public-shell marketplace-shell-${theme.preset || 'neon-nexus'} min-h-screen bg-canvas`} style={{ '--market-primary': theme.primary, '--market-secondary': theme.secondary, '--market-canvas': theme.canvas, '--market-surface': theme.surface, '--market-text': theme.text }}>
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b px-4 lg:px-6" style={{ backgroundColor: theme.surface || '#fff' }}><Link to="/marketplace" className="shrink-0" aria-label="Marketplace home"><BrandLogo branding={header} media={content?.media}/></Link><div className="hidden min-w-0 flex-1 justify-center px-4 lg:flex"><PublicMarketplaceNavigation/></div><div className="ml-auto flex shrink-0 items-center gap-2"><MarketplaceMenuButton onClick={() => setMarketplaceMenuOpen(true)} className="lg:hidden"/><Link to="/login" className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary px-3.5 text-xs font-bold text-primary hover:bg-blue-50"><LogIn className="h-4 w-4"/><span className="hidden sm:inline">{header?.login_label || 'Log In'}</span></Link><Link to="/register" className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-bold text-white hover:bg-blue-700"><UserPlus className="h-4 w-4"/><span className="hidden sm:inline">{header?.signup_label || 'Sign Up'}</span></Link></div></header>
    <main className="mx-auto min-h-[70vh] w-full max-w-[1440px] px-5 pb-6 pt-[82px] lg:px-6"><Outlet/></main><Footer/><MobileMarketplaceNavigation open={marketplaceMenuOpen} onClose={() => setMarketplaceMenuOpen(false)}/>
    {authPromptOpen && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="guest-auth-title"><section ref={authPromptRef} className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-overlay"><div className="bg-gradient-to-r from-[#082d66] to-primary px-6 py-7 text-white"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><Sparkles className="h-5 w-5"/></span><h2 id="guest-auth-title" className="mt-4 text-2xl font-bold">Sign in to continue browsing</h2><p className="mt-2 text-sm leading-6 text-blue-100">Your 1-minute preview has ended. Create a verified account or log in to continue using the marketplace.</p></div><div className="p-6"><Link to="/register" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white hover:bg-blue-700"><UserPlus className="h-4 w-4"/>Create Free Account</Link><Link to="/login" className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary text-sm font-bold text-primary hover:bg-blue-50"><LogIn className="h-4 w-4"/>Log In</Link><p className="mt-4 text-center text-[11px] text-slate-400">Email verification is required for new accounts.</p></div></section></div>}
  </div>
}
