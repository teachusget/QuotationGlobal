import { Building2, CalendarClock, ChevronDown, FileText, ListChecks, LogOut, RotateCcw, Settings, ShoppingBag, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { isImpersonating, restoreAdminAuth } from '../../auth/session'
import PortalActivityActions from '../layout/PortalActivityActions'

const profileOptions = [
  { label: 'My Profile', path: '/profile', icon: UserRound },
  { label: 'Company Profile', path: '/company-profile', icon: Building2 },
  { label: 'Account Settings', path: '/account-settings', icon: Settings },
]

export default function UserDropdown() {
  const [open, setOpen] = useState(false)
  const [requestsOpen, setRequestsOpen] = useState(false)
  const root = useRef(null)
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape' || (event.type === 'mousedown' && !root.current?.contains(event.target))) setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [])
  const isBuyer = user?.account_type === 'buyer'
  const options = isBuyer ? [{ label: 'My Orders', path: '/orders', icon: ShoppingBag }, ...profileOptions] : profileOptions
  const isAdmin = !['buyer', 'vendor'].includes(user?.account_type)
  const impersonating = isImpersonating()
  const initials = (user?.name || 'User').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const go = (path) => { setOpen(false); setRequestsOpen(false); navigate(path) }

  return <>{!isBuyer && <PortalActivityActions isAdmin={isAdmin}/>}<div className="relative" ref={root}>
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="menu" aria-label="Open account menu" className="flex items-center gap-2 rounded-md p-1 text-left hover:bg-slate-50">
      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-200 text-xs font-bold text-slate-600">{user?.company_logo_data ? <img src={user.company_logo_data} alt="" className="h-full w-full object-cover"/> : initials}</span>
      <span className="hidden min-w-0 leading-tight xl:block"><span className="block max-w-32 truncate text-xs font-semibold">{user?.name}</span><span className="block max-w-32 truncate text-[11px] capitalize text-slate-500">{user?.company_name || user?.account_type}</span></span>
      <svg className="hidden h-3 w-3 xl:block" viewBox="0 0 12 12"><path d="m2.5 4.5 3.5 3 3.5-3" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
    </button>
    {open && <div role="menu" className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-lg border bg-white py-1 shadow-floating">{impersonating && <><div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-amber-600">Viewing as vendor</div><button type="button" role="menuitem" onClick={() => { if (restoreAdminAuth()) window.location.assign('/vendors') }} className="flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-blue-50"><RotateCcw className="h-4 w-4"/>Return to Admin</button><div className="my-1 border-t"/></>}{isBuyer && <><button type="button" role="menuitem" aria-expanded={requestsOpen} onClick={() => setRequestsOpen((current) => !current)} className={`flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold transition ${requestsOpen ? 'bg-blue-50 text-primary' : 'text-slate-700 hover:bg-slate-50'}`}><ListChecks className="h-4 w-4"/><span className="flex-1">View Requests</span><ChevronDown className={`h-3.5 w-3.5 transition ${requestsOpen ? 'rotate-180' : ''}`}/></button><div className={`grid transition-[grid-template-rows,opacity] duration-200 ${requestsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}><div className="overflow-hidden"><div className="mx-2 mb-1 rounded-md border border-blue-100 bg-blue-50/40 p-1"><button type="button" role="menuitem" onClick={() => go('/rfqs')} className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-xs text-slate-700 hover:bg-white hover:text-primary"><FileText className="h-4 w-4 text-primary"/><span><b className="block font-semibold">Quote Requests</b><span className="text-[10px] text-slate-400">Quotes and current status</span></span></button><button type="button" role="menuitem" onClick={() => go('/demos')} className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-xs text-slate-700 hover:bg-white hover:text-primary"><CalendarClock className="h-4 w-4 text-primary"/><span><b className="block font-semibold">Demo Requests</b><span className="text-[10px] text-slate-400">Schedules and current status</span></span></button></div></div></div><div className="my-1 border-t"/></>}{options.map(({ label, path, icon: Icon }) => <button type="button" role="menuitem" key={path} onClick={() => go(path)} className="flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"><Icon className="h-4 w-4"/>{label}</button>)}<div className="my-1 border-t"/><button type="button" role="menuitem" onClick={() => { logout(); navigate('/login', { replace: true }) }} className="flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4"/>Logout</button></div>}
  </div></>
}
