import { BriefcaseBusiness, LogIn, Sparkles, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import useDialogAccessibility from '../../hooks/useDialogAccessibility'
import useMarketplaceContent from '../../hooks/useMarketplaceContent'
import BrandLogo from '../common/BrandLogo'
import SocialLoginChooser from '../auth/SocialLoginChooser'
import { startSocialLogin } from '../auth/socialLogin'
import { BrandedLoader } from '../ui'
import AppLayout from './AppLayout'
import Footer from './Footer'
import MobileMarketplaceNavigation, { MarketplaceMenuButton } from './MobileMarketplaceNavigation'
import PublicMarketplaceNavigation from './PublicMarketplaceNavigation'
import { legacyMarketplaceHeader, legacyMarketplaceTheme } from '../../data/legacyMarketplaceShell'
import { loadMarketplaceTheme } from '../../themes/registry'
import MarketplaceChatWidget from '../chat/MarketplaceChatWidget'

const GUEST_PREVIEW_DURATION_MS = 60 * 1000
const GUEST_PREVIEW_DEADLINE_KEY = 'marketplace_guest_preview_deadline'

function GoogleLogo() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z"/><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.75Z"/><path fill="#FBBC05" d="M6.54 13.83A5.86 5.86 0 0 1 6.23 12c0-.64.11-1.26.31-1.83V7.64H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.36l3.24-2.53Z"/><path fill="#EA4335" d="M12 6.14c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.2 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.39l3.24 2.53C7.31 7.86 9.46 6.14 12 6.14Z"/></svg>
}

export default function PublicMarketplaceLayout() {
  const { user, loading } = useAuth(); const { content, loading: contentLoading } = useMarketplaceContent()
  const [authPromptOpen, setAuthPromptOpen] = useState(false); const [marketplaceMenuOpen, setMarketplaceMenuOpen] = useState(false)
  const [socialProvider, setSocialProvider] = useState('')
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
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 min-w-0 items-center border-b px-2 sm:px-4 lg:px-6" style={{ backgroundColor: theme.surface || '#fff' }}><Link to="/marketplace" className="min-w-0 shrink-1" aria-label="Marketplace home"><BrandLogo compact branding={header} media={content?.media}/></Link><div className="hidden min-w-0 flex-1 justify-center px-4 lg:flex"><PublicMarketplaceNavigation/></div><div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2"><MarketplaceMenuButton onClick={() => setMarketplaceMenuOpen(true)} className="lg:hidden"/><Link to="/login" aria-label={header?.login_label || 'Log In'} className="inline-flex h-10 w-10 items-center justify-center gap-2 rounded-lg border border-primary px-2 text-xs font-bold text-primary hover:bg-blue-50 sm:h-9 sm:w-auto sm:px-3.5"><LogIn className="h-4 w-4"/><span className="hidden sm:inline">{header?.login_label || 'Log In'}</span></Link><Link to="/register" aria-label={header?.signup_label || 'Sign Up'} className="inline-flex h-10 w-10 items-center justify-center gap-2 rounded-lg bg-primary px-2 text-xs font-bold text-white hover:bg-blue-700 sm:h-9 sm:w-auto sm:px-3.5"><UserPlus className="h-4 w-4"/><span className="hidden sm:inline">{header?.signup_label || 'Sign Up'}</span></Link></div></header>
    <main className="mx-auto min-h-[70vh] w-full max-w-[1440px] px-5 pb-4 pt-20 lg:px-6"><Outlet/></main><Footer/><MobileMarketplaceNavigation open={marketplaceMenuOpen} onClose={() => setMarketplaceMenuOpen(false)}/>
    {authPromptOpen && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="guest-auth-title"><section ref={authPromptRef} className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-overlay"><button type="button" onClick={() => setAuthPromptOpen(false)} aria-label="Close sign in prompt" className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/35 focus:outline-none focus:ring-2 focus:ring-white"><X className="h-5 w-5"/></button><div className="bg-gradient-to-r from-[#082d66] to-primary px-6 py-7 text-white"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15"><Sparkles className="h-5 w-5"/></span><h2 id="guest-auth-title" className="mt-4 text-2xl font-bold">Sign in to continue browsing</h2><p className="mt-2 text-sm leading-6 text-blue-100">Your 1-minute preview has ended. Create a verified account or log in to continue using the marketplace.</p></div><div className="p-6"><Link to="/register" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white hover:bg-blue-700"><UserPlus className="h-4 w-4"/>Register as a Buyer</Link><Link to="/solution-provider/register" className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 text-sm font-bold text-primary hover:bg-blue-100"><BriefcaseBusiness className="h-4 w-4"/>Register as a Seller</Link><Link to="/login" className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary text-sm font-bold text-primary hover:bg-blue-50"><LogIn className="h-4 w-4"/>Log In</Link><div className="relative mt-5"><div className="absolute inset-x-0 top-1/2 border-t border-slate-200"/><span className="relative mx-auto block w-fit bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">or continue with</span></div><div className="mt-3 flex justify-center gap-3"><button type="button" aria-label="Continue with Google" title="Continue with Google" onClick={() => startSocialLogin('google', setSocialProvider)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40"><span className="grid h-7 w-7 place-items-center rounded-md bg-white ring-1 ring-slate-200"><GoogleLogo/></span></button><button type="button" aria-label="Continue with LinkedIn" title="Continue with LinkedIn" onClick={() => startSocialLogin('linkedin', setSocialProvider)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40"><span className="grid h-7 w-7 place-items-center rounded-md bg-[#0a66c2] text-xs font-extrabold text-white">in</span></button></div><p className="mt-4 text-center text-[11px] text-slate-400">Email verification is required for new accounts.</p></div></section></div>}
    <SocialLoginChooser open={Boolean(socialProvider)} provider={socialProvider} onClose={() => setSocialProvider('')} /><MarketplaceChatWidget/>
  </div>
}
