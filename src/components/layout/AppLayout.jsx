import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'
import MobileSidebar from './MobileSidebar'
import Sidebar from './Sidebar'
import { useAuth } from '../../auth/useAuth'

export default function AppLayout() {
  const { user } = useAuth(); const isBuyer = user?.role === 'buyer'
  const [mobileOpen,setMobileOpen] = useState(false); const [collapsed,setCollapsed] = useState(false); const closeMobile = useCallback(() => setMobileOpen(false), [])
  useEffect(() => { document.title = 'Dashboard | Quotation Global'; const query = window.matchMedia('(min-width: 768px) and (max-width: 1023px)'); const sync = () => query.matches && setCollapsed(true); sync(); query.addEventListener('change', sync); return () => query.removeEventListener('change', sync) }, [])
  return <div className="min-h-screen bg-canvas"><Header onMenuClick={() => setMobileOpen(true)}/>{!isBuyer && <><div className={`fixed bottom-0 left-0 top-[62px] z-30 hidden border-r bg-white transition-[width] duration-200 md:block ${collapsed ? 'w-[68px]' : 'w-[215px]'}`}><Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)}/></div><MobileSidebar open={mobileOpen} onClose={closeMobile}/></>}<div className={`flex min-h-screen flex-col pt-[62px] transition-[margin] duration-200 ${isBuyer ? '' : collapsed ? 'md:ml-[68px]' : 'md:ml-[215px]'}`}><main className={`flex-1 p-5 lg:p-6 ${isBuyer ? 'mx-auto w-full max-w-[1440px]' : ''}`}><Outlet/></main><Footer/></div></div>
}
