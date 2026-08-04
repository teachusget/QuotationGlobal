import { LogIn, Sparkles, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import BrandLogo from '../common/BrandLogo'
import Footer from './Footer'
import AppLayout from './AppLayout'
import PublicMarketplaceNavigation from './PublicMarketplaceNavigation'

export default function PublicMarketplaceLayout() {
  const { user, loading } = useAuth()
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  useEffect(() => {
    if (loading || user) return undefined
    const timer = setTimeout(() => setAuthPromptOpen(true), 30000)
    return () => clearTimeout(timer)
  }, [loading, user])
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading marketplace...</div>
  if (user) return <AppLayout/>
  return <div className="min-h-screen bg-canvas"><header className="fixed inset-x-0 top-0 z-50 flex h-[62px] items-center border-b bg-white px-4 lg:px-6"><Link to="/marketplace" className="shrink-0" aria-label="Marketplace home"><BrandLogo/></Link><div className="hidden min-w-0 flex-1 justify-center px-4 lg:flex"><PublicMarketplaceNavigation/></div><div className="ml-auto flex shrink-0 items-center gap-2"><Link to="/login" className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary px-3.5 text-xs font-bold text-primary hover:bg-blue-50"><LogIn className="h-4 w-4"/><span className="hidden sm:inline">Log In</span></Link><Link to="/register" className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-bold text-white hover:bg-blue-700"><UserPlus className="h-4 w-4"/><span className="hidden sm:inline">Sign Up</span></Link></div></header><main className="mx-auto min-h-[70vh] w-full max-w-[1440px] px-5 pb-6 pt-[82px] lg:px-6"><Outlet/></main><Footer/>{authPromptOpen && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="guest-auth-title"><section className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="bg-gradient-to-r from-[#082d66] to-primary px-6 py-7 text-white"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><Sparkles className="h-5 w-5"/></span><h2 id="guest-auth-title" className="mt-4 text-2xl font-bold">Sign in to continue browsing</h2><p className="mt-2 text-sm leading-6 text-blue-100">Your 30-second preview has ended. Create a verified account or log in to continue using the marketplace.</p></div><div className="p-6"><Link to="/register" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white hover:bg-blue-700"><UserPlus className="h-4 w-4"/>Create Free Account</Link><Link to="/login" className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary text-sm font-bold text-primary hover:bg-blue-50"><LogIn className="h-4 w-4"/>Log In</Link><p className="mt-4 text-center text-[10px] text-slate-400">Email verification is required for new accounts.</p></div></section></div>}</div>
}
