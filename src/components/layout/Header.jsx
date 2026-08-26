import { Bell, CheckCircle2, ChevronDown, FileText, ImageIcon, Menu, MessageSquare, Moon, Search, Sun, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getMarketplaceBrands } from '../../api/brands'
import { getMarketplaceCategories } from '../../api/categories'
import { getMarketplaceIndustries } from '../../api/industries'
import { getDemoRequests, markDemoNotificationsRead } from '../../api/demoRequests'
import { getQuoteRequests } from '../../api/rfqs'
import { useAuth } from '../../auth/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import BrandLogo from '../common/BrandLogo'
import NotificationBadge from '../common/NotificationBadge'
import UserDropdown from '../common/UserDropdown'
import CategoryHierarchyMenu from '../marketplace/CategoryHierarchyMenu'
import MobileMarketplaceNavigation, { MarketplaceMenuButton } from './MobileMarketplaceNavigation'
import { startVisiblePolling } from '../../utils/visiblePolling'
import useMarketplaceContent from '../../hooks/useMarketplaceContent'
const actions = []

function HeaderBrand({ compact, content, loading }) {
  if (loading) return <span aria-hidden="true" className={`${compact ? 'h-10 w-[120px]' : 'h-[52px] w-[190px]'} block animate-pulse rounded-md bg-slate-100`}/>
  return <BrandLogo compact={compact} branding={content?.document?.header} media={content?.media}/>
}

function ThemeToggle({ role }) {
  const storageKey = `quotation-theme-${role}`
  const [dark, setDark] = useState(() => localStorage.getItem(storageKey) === 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    localStorage.setItem(storageKey, dark ? 'dark' : 'light')
    return () => {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
  }, [dark, storageKey])

  return <button type="button" onClick={() => setDark((current) => !current)} className="relative grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-primary" aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} title={`${dark ? 'Light' : 'Dark'} mode`}>{dark ? <Sun className="h-[18px] w-[18px]"/> : <Moon className="h-[18px] w-[18px]"/>}</button>
}
function DemoChatButton({ label = 'Chat' }) {
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let active = true
    const load = () => getDemoRequests().then((result) => {
      if (active) setUnread((result.data || []).reduce((total, item) => total + Number(item.unread_count || 0), 0))
    }).catch(() => {})
    window.addEventListener('demo-chat-read', load)
    const stopPolling = startVisiblePolling(load, 30000)
    return () => { active = false; stopPolling(); window.removeEventListener('demo-chat-read', load) }
  }, [])

  return <><button type="button" onClick={() => navigate('/demos', { state: { openLatestChat: true } })} className="relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-slate-600 hover:bg-blue-50 hover:text-primary" aria-label={unread ? `${label}, ${unread} unread messages` : label} title="Open latest demo chat"><MessageSquare className="h-[19px] w-[19px]"/><span className="hidden text-[11px] font-semibold xl:inline">{label}</span>{unread > 0 && <span className="absolute -right-1 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">{unread > 9 ? '9+' : unread}</span>}</button>{label === 'Chat' && <BuyerNotificationsButton/>}</>
}
function BuyerNotificationsButton() {
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState([])
  const root = useRef(null)
  const notifications = requests
    .filter((item) => item.notification_type === 'demo'
      ? ['accepted', 'rejected'].includes(item.status)
      : ['quoted', 'quote_accepted', 'quote_declined'].includes(item.status) || item.purchase_order?.status === 'sent')
    .sort((a, b) => new Date(b.purchase_order?.sent_at || b.buyer_quote_response_at || b.quoted_at || b.updated_at || b.created_at) - new Date(a.purchase_order?.sent_at || a.buyer_quote_response_at || a.quoted_at || a.updated_at || a.created_at))
  const unread = notifications.filter((item) => item.status_unread).length

  useEffect(() => {
    let active = true
    const load = () => Promise.all([getDemoRequests(), getQuoteRequests()]).then(([demos, quotes]) => { if (active) setRequests([...(demos.data || []).map((item) => ({ ...item, notification_type: 'demo' })), ...quotes.map((item) => ({ ...item, notification_type: 'quote' }))]) }).catch(() => {})
    const stopPolling = startVisiblePolling(load, 30000)
    return () => { active = false; stopPolling() }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    const escape = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    if (unread) {
      markDemoNotificationsRead().then(() => setRequests((current) => current.map((item) => ({ ...item, status_unread: false })))).catch(() => {})
    }
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape) }
  }, [open, unread])

  return <div ref={root} className="relative">
    <button type="button" onClick={() => setOpen(!open)} className="relative grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-blue-50 hover:text-primary" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}><Bell className="h-[19px] w-[19px]"/>{unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">{unread > 9 ? '9+' : unread}</span>}</button>
    {open && <div className="absolute right-0 top-11 z-50 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-xl border bg-white shadow-overlay">
      <div className="flex items-center justify-between border-b px-4 py-3"><div><p className="text-sm font-bold text-slate-900">Notifications</p><p className="mt-0.5 text-[11px] text-slate-500">Demo, quotation and purchase order updates</p></div>{unread > 0 && <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600">{unread} new</span>}</div>
      <div className="max-h-[430px] overflow-y-auto">
        {notifications.map((item) => {
          const isQuote = item.notification_type === 'quote'
          const poSent = isQuote && item.purchase_order?.status === 'sent'
          const positive = item.status === 'accepted' || item.status === 'quote_accepted' || poSent
          const title = poSent ? 'Purchase order sent' : item.status === 'quoted' ? 'New quote received' : item.status === 'quote_accepted' ? 'Quote accepted' : item.status === 'quote_declined' ? 'Quote declined' : `Demo request ${item.status}`
          return <div key={`${item.notification_type}-${item.id}`} className={`border-b px-4 py-3 last:border-0 ${item.status_unread ? 'bg-blue-50/60' : 'bg-white'}`}>
          <div className="flex gap-3">{positive ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-5 w-5"/></span> : item.status === 'quoted' ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-primary"><FileText className="h-5 w-5"/></span> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><XCircle className="h-5 w-5"/></span>}<div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-900">{title}</p><p className="mt-0.5 truncate text-[11px] font-semibold text-slate-600">{item.service?.name}</p><p className="mt-0.5 text-[11px] text-slate-400">{item.vendor?.company_name || item.vendor?.name}</p>{item.status === 'accepted' ? <p className="mt-2 rounded-md bg-emerald-50 p-2 text-[11px] leading-4 text-emerald-700">Your demo is confirmed for {item.demo_at ? new Date(item.demo_at).toLocaleString() : 'the requested time'}.</p> : isQuote && positive ? <p className="mt-2 rounded-md bg-emerald-50 p-2 text-[11px] leading-4 text-emerald-700">{poSent ? `PO ${item.purchase_order.po_number} was sent to the Solution Provider.` : `Accepted quotation: PKR ${Number(item.quoted_price || 0).toLocaleString()}.`}</p> : item.status === 'quoted' ? <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 p-2"><p className="text-sm font-bold text-primary">PKR {Number(item.quoted_price || 0).toLocaleString()}</p><p className="mt-1 text-[11px] leading-4 text-slate-600">Valid until {item.quote_valid_until ? new Date(item.quote_valid_until).toLocaleDateString() : 'Solution Provider confirmation'}.</p></div> : <div className="mt-2 rounded-md border border-red-100 bg-red-50 p-2"><p className="text-[11px] font-bold uppercase tracking-wide text-red-500">{isQuote ? 'Quotation update' : 'Rejection reason'}</p><p className="mt-1 text-[11px] leading-4 text-red-700">{isQuote ? 'This quotation was declined.' : item.rejection_reason || 'The vendor did not provide a reason.'}</p></div>}<Link to={isQuote ? '/rfqs' : '/demos'} onClick={() => setOpen(false)} className="mt-2 inline-flex text-[11px] font-semibold text-primary hover:underline">{poSent ? 'View purchase order' : isQuote ? 'View quote' : 'View demo request'}</Link></div></div>
        </div>
        })}
        {!notifications.length && <div className="px-5 py-10 text-center"><Bell className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-3 text-xs font-semibold text-slate-600">No notifications yet</p><p className="mt-1 text-[11px] text-slate-400">Demo, quotation and PO updates will appear here.</p></div>}
      </div>
    </div>}
  </div>
}
function ListMenu({ label, items, onSelect, children, showDetails = false }) { const [open, setOpen] = useState(false); const root = useRef(null); const select = (value) => { onSelect(value); setOpen(false) }; const directory = label === 'Brands' ? 'brands' : label === 'Industry' ? 'industries' : null; const pathFor = (item) => `/marketplace/${directory}/${item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`; useEffect(() => { if (!open) return undefined; const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }; const escape = (event) => { if (event.key === 'Escape') setOpen(false) }; document.addEventListener('mousedown', outside); document.addEventListener('keydown', escape); return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape) } }, [open]); if (label === 'Categories') return <CategoryHierarchyMenu categories={items} onSelect={onSelect}/>; return <div ref={root} className="relative"><button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 hover:text-primary">{label}<ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`}/></button>{open && <div className="absolute left-0 top-6 z-50 w-[620px] rounded-xl border bg-white p-4 shadow-overlay">{children || <><div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-slate-900">Browse {label}</p>{directory ? <Link to={`/marketplace/${directory}`} onClick={() => setOpen(false)} className="text-[11px] font-semibold text-primary hover:underline">View all</Link> : <button type="button" onClick={() => select('All')} className="text-[11px] font-semibold text-primary hover:underline">View all</button>}</div><div className="grid grid-cols-3 gap-2">{items.length ? items.map((item) => { const content = <>{item.logo_url ? <img src={item.logo_url} alt="" className={`${showDetails ? 'h-11 w-11' : 'h-9 w-9'} shrink-0 rounded-md border border-slate-100 bg-white object-contain p-0.5`}/> : <span className={`grid ${showDetails ? 'h-11 w-11' : 'h-9 w-9'} shrink-0 place-items-center rounded-md bg-slate-100 text-slate-400`}><ImageIcon className="h-4 w-4"/></span>}<span className="min-w-0"><span className="block truncate font-semibold">{item.name}</span>{showDetails && item.details && <span className="mt-1 line-clamp-2 block text-[11px] font-normal leading-3.5 text-slate-500">{item.details}</span>}</span></>; const className = `flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 text-left text-xs text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-primary ${showDetails ? 'min-h-[76px]' : 'min-h-14'}`; return directory ? <Link key={item.id} to={pathFor(item)} onClick={() => setOpen(false)} className={className}>{content}</Link> : <button type="button" key={item.id} onClick={() => select(item.name)} className={className}>{content}</button> }) : <p className="col-span-3 py-4 text-center text-xs text-slate-500">No {label.toLowerCase()} available yet.</p>}</div></>}</div>}</div> }
function BuyerNavigation() { const [categories, setCategories] = useState([]); const [brands, setBrands] = useState([]); const [industries, setIndustries] = useState([]); useEffect(() => { getMarketplaceCategories().then(setCategories).catch(() => setCategories([])); getMarketplaceBrands().then(setBrands).catch(() => setBrands([])); getMarketplaceIndustries().then(setIndustries).catch(() => setIndustries([])) }, []); const select = (type, value) => { window.dispatchEvent(new CustomEvent(`marketplace-${type}-selected`, { detail: value })); window.location.hash = 'marketplace-products' }; return <nav aria-label="Marketplace navigation" className="flex items-center gap-5 text-xs font-semibold text-slate-600 lg:gap-7"><Link to="/orders" className="hover:text-primary">My Orders</Link><ListMenu label="Categories" items={categories} onSelect={(value) => select('category', value)}>{<><div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-slate-900">Browse Categories</p><button type="button" onClick={() => select('category', 'All')} className="text-[11px] font-semibold text-primary hover:underline">View all solutions</button></div><div className="grid grid-cols-3 gap-3">{categories.length ? categories.map((category) => <div key={category.id} className="rounded-lg border border-slate-100 p-3"><button type="button" onClick={() => select('category', category.name)} className="flex w-full items-center gap-2.5 text-left text-xs font-bold text-slate-800 hover:text-primary">{category.logo_url ? <img src={category.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-md border border-slate-100 bg-white object-contain p-0.5"/> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-400"><ImageIcon className="h-4 w-4"/></span>}<span className="min-w-0 truncate">{category.name}</span></button>{category.subcategories.length ? <div className="mt-2 space-y-1.5 pl-10">{category.subcategories.slice(0, 5).map((sub) => <button type="button" key={sub.id} onClick={() => select('category', category.name)} className="flex w-full items-center gap-2 text-left text-[11px] text-slate-500 hover:text-primary">{sub.logo_url ? <img src={sub.logo_url} alt="" className="h-5 w-5 shrink-0 rounded border border-slate-100 bg-white object-contain"/> : <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-slate-100 text-slate-400"><ImageIcon className="h-3 w-3"/></span>}<span className="min-w-0 truncate">{sub.name}</span></button>)}</div> : <p className="mt-2 pl-10 text-[11px] text-slate-400">Explore solutions</p>}</div>) : <p className="col-span-3 py-4 text-center text-xs text-slate-500">No categories available yet.</p>}</div></>}</ListMenu><ListMenu label="Brands" items={brands} onSelect={(value) => select('brand', value)}/><ListMenu label="Industry" items={industries} onSelect={(value) => select('industry', value)}/><Link to="/compare" className="hover:text-primary">Compare</Link><a href="#marketplace-products" className="hover:text-primary">Ask Question</a><a href="#marketplace-products" className="hover:text-primary">Blog</a><a href="#marketplace-products" className="rounded-full bg-primary px-5 py-2.5 text-white hover:bg-blue-700">Get Free Advice</a></nav> }
export default function Header({ onMenuClick }) { const { user } = useAuth(); const { content, loading: brandingLoading } = useMarketplaceContent(); const isBuyer = user?.account_type === 'buyer'; const isVendor = user?.account_type === 'vendor'; const isAdmin = !isBuyer && !isVendor; const homePath = isBuyer ? '/marketplace' : '/'; const [query, setQuery] = useState(''); const [category, setCategory] = useState('All'); const [marketplaceMenuOpen, setMarketplaceMenuOpen] = useState(false); return <><header className="app-header fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b bg-white/95 px-3 shadow-[0_1px_12px_rgba(15,23,42,.04)] backdrop-blur lg:px-0"><div className="flex h-full w-full items-center"><div className={`flex w-auto shrink-0 items-center gap-2 ${isBuyer ? 'px-1 sm:px-4' : 'lg:w-[215px] lg:px-4'}`}>{!isBuyer && <button onClick={onMenuClick} className="rounded-md p-2 hover:bg-slate-100 md:hidden" aria-label="Open navigation"><Menu className="h-5 w-5"/></button>}<Link to={homePath} className="hidden rounded-sm sm:block focus:outline-none focus:ring-2 focus:ring-primary/40" aria-label="Go to home page"><HeaderBrand content={content} loading={brandingLoading}/></Link><Link to={homePath} className="rounded-sm sm:hidden focus:outline-none focus:ring-2 focus:ring-primary/40" aria-label="Go to home page"><HeaderBrand compact content={content} loading={brandingLoading}/></Link></div><div className={`${isBuyer ? 'hidden xl:flex' : 'hidden lg:flex'} min-w-0 flex-1 items-center justify-center px-3 xl:px-4`}>{isBuyer ? <BuyerNavigation/> : <form onSubmit={(event) => event.preventDefault()} className="flex h-10 w-full max-w-[560px] overflow-hidden rounded-lg border bg-white shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-primary/15"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What solution or service are you looking for?" className="min-w-0 flex-1 px-3 text-xs outline-none"/><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-[72px] border-x bg-white px-2 text-xs outline-none"><option>All</option><option>Solutions</option><option>Vendors</option></select><button className="grid w-[45px] place-items-center bg-primary text-white" aria-label="Search"><Search className="h-4 w-4"/></button></form>}</div><div className="ml-auto flex h-full shrink-0 items-center gap-1.5 pr-1 lg:gap-2 lg:pr-3">{isBuyer && <MarketplaceMenuButton onClick={() => setMarketplaceMenuOpen(true)} className="xl:hidden"/>}{isBuyer && <DemoChatButton/>}{(isAdmin || isVendor) && <DemoChatButton label="Messages"/>}{!isBuyer && actions.map(({ label, count, icon: Icon }) => <button key={label} className="hidden items-center gap-1.5 rounded-md px-1.5 py-2 text-slate-600 hover:bg-slate-50 sm:flex"><span className="relative"><Icon className="h-[18px] w-[18px]"/><NotificationBadge count={count}/></span><span className="hidden text-[11px] font-medium xl:inline">{label}</span></button>)}{!isBuyer && <ThemeToggle role={isVendor ? 'vendor' : 'admin'}/>} <UserDropdown/></div></div></header>{isBuyer && <MobileMarketplaceNavigation open={marketplaceMenuOpen} onClose={() => setMarketplaceMenuOpen(false)}/>}</> }
