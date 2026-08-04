import { ChevronDown, ChevronLeft, ChevronRight, FileCheck2, FilePlus2, ShoppingCart, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { bottomNavigation, personalNavigation, primaryNavigation } from '../../data/navigation'
import SidebarItem from './SidebarItem'
import { useAuth } from '../../auth/useAuth'

const showReferenceHighlights = true
export default function Sidebar({ collapsed = false, onToggle, mobile = false, onNavigate }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, can } = useAuth()
  const isVendor = user?.account_type === 'vendor'
  const isBuyer = user?.account_type === 'buyer'
  const categoryRouteActive = ['/categories', '/sub-categories'].includes(location.pathname)
  const [categoriesOpen, setCategoriesOpen] = useState(categoryRouteActive)
  const [procurementOpen, setProcurementOpen] = useState(location.pathname === '/purchase-orders')
  useEffect(() => { if (categoryRouteActive) setCategoriesOpen(true) }, [categoryRouteActive])
  useEffect(() => { if (location.pathname === '/purchase-orders') setProcurementOpen(true) }, [location.pathname])
  const highlightStart = primaryNavigation.findIndex((item) => item.highlighted)
  const before = primaryNavigation.slice(0, highlightStart); const highlighted = primaryNavigation.filter((item) => item.highlighted); const after = primaryNavigation.slice(highlightStart + highlighted.length)
  const permissionsByPath = { '/brands':'brands.view','/services':'services.view','/specification-templates':'specifications.view','/vendors':'vendors.view','/customers':'customers.view','/rfqs':'rfqs.view','/demos':'demos.view','/industries':'industries.view','/purchase-orders':'purchase_orders.view' }
  const allowed = (item) => can(item.permission || permissionsByPath[item.path]) || (!item.permission && !permissionsByPath[item.path])
  const list = (items) => items.filter(allowed).map((item) => {
    if (!item.children) return <SidebarItem key={`${item.path}-${item.label}`} item={item} collapsed={collapsed} onNavigate={onNavigate}/>
    const Icon = item.icon
    return <div key={`${item.path}-${item.label}`}>
      <button
        type="button"
        aria-expanded={categoriesOpen}
        onClick={() => { if (collapsed) { navigate(item.path); return } setCategoriesOpen((open) => !open) }}
        title={collapsed ? item.label : undefined}
        className={`flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-[13px] transition-colors ${collapsed ? 'justify-center' : ''} ${categoryRouteActive ? 'bg-blue-50 font-medium text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
      >
        <Icon className="h-4 w-4 shrink-0"/>
        <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
        {!collapsed && <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`}/>} 
      </button>
      {!collapsed && <div className={`grid transition-[grid-template-rows,opacity] duration-200 ${categoriesOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}><div className="overflow-hidden"><div className="space-y-0.5 pb-1 pt-0.5">{item.children.map((child) => <SidebarItem key={child.path} item={child} nested onNavigate={onNavigate}/>)}</div></div></div>}
    </div>
  })
  if (isVendor) {
    const vendorItem = primaryNavigation.find((item) => item.path === '/vendors')
    const brandItem = primaryNavigation.find((item) => item.path === '/brands')
    const serviceItem = primaryNavigation.find((item) => item.path === '/services')
    const demoItem = primaryNavigation.find((item) => item.path === '/demos')
    const rfqItem = primaryNavigation.find((item) => item.path === '/rfqs')
    return <aside className={`flex h-full flex-col bg-white ${mobile ? 'w-[255px]' : ''}`} aria-label="Vendor navigation">
      {!mobile && <button onClick={onToggle} className="absolute -right-3 top-3 z-10 hidden h-6 w-6 place-items-center rounded-full border bg-white text-slate-500 shadow-sm hover:text-primary md:grid" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight className="h-3.5 w-3.5"/> : <ChevronLeft className="h-3.5 w-3.5"/>}</button>}
      <nav className="space-y-1 px-3 py-4"><SidebarItem item={{ ...vendorItem, label: 'My Service Profile' }} collapsed={collapsed} onNavigate={onNavigate}/><SidebarItem item={{ ...serviceItem, path: '/services', label: 'My Services' }} collapsed={collapsed} onNavigate={onNavigate}/><SidebarItem item={{ ...rfqItem, label: 'RFQs' }} collapsed={collapsed} onNavigate={onNavigate}/><SidebarItem item={{ ...demoItem, label: 'Demo Requests' }} collapsed={collapsed} onNavigate={onNavigate}/><SidebarItem item={{ path: '/customers', label: 'My Customers', icon: UsersRound }} collapsed={collapsed} onNavigate={onNavigate}/><div><button type="button" onClick={() => { if (collapsed) navigate('/purchase-orders'); else setProcurementOpen((open) => !open) }} className={`flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-[13px] ${collapsed ? 'justify-center' : ''} ${location.pathname === '/purchase-orders' ? 'bg-blue-50 font-medium text-primary' : 'text-slate-600 hover:bg-slate-100'}`}><ShoppingCart className="h-4 w-4"/><span className={collapsed ? 'sr-only' : ''}>Procurement</span>{!collapsed && <ChevronDown className={`ml-auto h-3.5 w-3.5 transition ${procurementOpen ? 'rotate-180' : ''}`}/>}</button>{!collapsed && procurementOpen && <div className="pt-0.5"><SidebarItem item={{ path: '/purchase-orders', label: 'Purchase Orders (PO)', icon: FileCheck2 }} nested onNavigate={onNavigate}/></div>}</div><SidebarItem item={{ ...brandItem, label: 'Brands' }} collapsed={collapsed} onNavigate={onNavigate}/>{list(primaryNavigation.filter(i=>['/users','/roles','/audit-logs'].includes(i.path)))}</nav>
    </aside>
  }
  if (isBuyer) {
    const marketplaceItem = primaryNavigation.find((item) => item.path === '/marketplace')
    const demoItem = primaryNavigation.find((item) => item.path === '/demos')
    const rfqItem = primaryNavigation.find((item) => item.path === '/rfqs')
    return <aside className={`flex h-full flex-col bg-white ${mobile ? 'w-[255px]' : ''}`} aria-label="Buyer navigation">
      {!mobile && <button onClick={onToggle} className="absolute -right-3 top-3 z-10 hidden h-6 w-6 place-items-center rounded-full border bg-white text-slate-500 shadow-sm hover:text-primary md:grid" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight className="h-3.5 w-3.5"/> : <ChevronLeft className="h-3.5 w-3.5"/>}</button>}
      <nav className="space-y-1 px-3 py-4"><SidebarItem item={marketplaceItem} collapsed={collapsed} onNavigate={onNavigate}/><SidebarItem item={{ ...rfqItem, label: 'My RFQs' }} collapsed={collapsed} onNavigate={onNavigate}/><SidebarItem item={{ ...demoItem, label: 'My Demo Requests' }} collapsed={collapsed} onNavigate={onNavigate}/>{list(primaryNavigation.filter(i=>['/users','/roles','/audit-logs'].includes(i.path)))}</nav>
    </aside>
  }
  return <aside className={`flex h-full flex-col bg-white ${mobile ? 'w-[255px]' : ''}`} aria-label="Primary navigation">
    {!mobile && <button onClick={onToggle} className="absolute -right-3 top-3 z-10 hidden h-6 w-6 place-items-center rounded-full border bg-white text-slate-500 shadow-sm hover:text-primary md:grid" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight className="h-3.5 w-3.5"/> : <ChevronLeft className="h-3.5 w-3.5"/>}</button>}
    <nav className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
      <div className="space-y-0.5">{list(before)}<div className={showReferenceHighlights ? 'my-1 space-y-0.5 rounded-[10px] border border-dashed border-primary p-[3px]' : 'space-y-0.5'}>{list(highlighted)}</div>{list(after)}<div><button type="button" onClick={() => { if (collapsed) navigate('/purchase-orders'); else setProcurementOpen((open) => !open) }} className={`flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-[13px] ${collapsed ? 'justify-center' : ''} ${location.pathname === '/purchase-orders' ? 'bg-blue-50 font-medium text-primary' : 'text-slate-600 hover:bg-slate-100'}`}><ShoppingCart className="h-4 w-4"/><span className={collapsed ? 'sr-only' : ''}>Procurement</span>{!collapsed && <ChevronDown className={`ml-auto h-3.5 w-3.5 transition ${procurementOpen ? 'rotate-180' : ''}`}/>}</button>{!collapsed && procurementOpen && <div className="pt-0.5"><SidebarItem item={{ path: '/purchase-orders', label: 'Purchase Orders (PO)', icon: FileCheck2 }} nested onNavigate={onNavigate}/></div>}</div></div>
      <div className="my-2 border-t"/><div className="space-y-0.5">{list(personalNavigation)}</div><div className="flex-1 min-h-4"/><div className="space-y-0.5 border-t pt-2">{list(bottomNavigation)}</div>
      <NavLink to="/rfqs" onClick={onNavigate} className={`mt-3 flex items-center rounded-md bg-blue-50 text-primary transition hover:bg-blue-100 ${collapsed ? 'justify-center p-2' : 'gap-2.5 p-2.5'}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-white"><FilePlus2 className="h-4 w-4"/></span>{!collapsed && <><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">Post an RFQ</span><span className="block text-[11px] text-slate-500">Get quotes from multiple vendors</span></span><ChevronRight className="h-4 w-4"/></>}</NavLink>
    </nav>
  </aside>
}
