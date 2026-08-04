import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'
import MobileSidebar from './MobileSidebar'
import Sidebar from './Sidebar'
import { useAuth } from '../../auth/useAuth'

export default function AppLayout() {
  const { user } = useAuth(); const isBuyer = user?.account_type === 'buyer'
  const [mobileOpen,setMobileOpen] = useState(false); const [collapsed,setCollapsed] = useState(false); const closeMobile = useCallback(() => setMobileOpen(false), [])
  useEffect(() => { document.title = 'Dashboard | Quotation Global'; const query = window.matchMedia('(min-width: 768px) and (max-width: 1023px)'); const sync = () => query.matches && setCollapsed(true); sync(); query.addEventListener('change', sync); return () => query.removeEventListener('change', sync) }, [])
  return <div className="min-h-screen bg-canvas"><Header onMenuClick={() => setMobileOpen(true)}/>{!isBuyer && <><div className={`fixed bottom-0 left-0 top-16 z-30 hidden border-r bg-white transition-[width] duration-180 md:block ${collapsed ? 'w-[72px]' : 'w-60'}`}><Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)}/></div><MobileSidebar open={mobileOpen} onClose={closeMobile}/></>}<div className={`flex min-h-screen flex-col pt-16 transition-[margin] duration-180 ${isBuyer ? '' : collapsed ? 'md:ml-[72px]' : 'md:ml-60'}`}><main className={`flex-1 px-4 py-5 sm:px-5 lg:px-7 lg:py-7 ${isBuyer ? 'mx-auto w-full max-w-[1440px]' : 'mx-auto w-full max-w-[1680px]'}`}><Outlet/></main><Footer/></div></div>
}
