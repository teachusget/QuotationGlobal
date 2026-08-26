import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import useMarketplaceContent from '../../hooks/useMarketplaceContent'
import { legacyMarketplaceTheme } from '../../data/legacyMarketplaceShell'
import Footer from './Footer'
import Header from './Header'
import MobileSidebar from './MobileSidebar'
import Sidebar from './Sidebar'
import { loadMarketplaceTheme } from '../../themes/registry'
import BuyerHeaderSearchPortal from '../marketplace/BuyerHeaderSearchPortal'
import BuyerCountryHeaderControl from '../marketplace/BuyerCountryHeaderControl'

function LayoutFrame({ isBuyer = false, theme = {} }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  useEffect(() => {
    document.title = 'Dashboard | Quotation Global'
    const query = window.matchMedia('(min-width: 768px) and (max-width: 1023px)')
    const sync = () => query.matches && setCollapsed(true)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return <div className={`${isBuyer ? `marketplace-public-shell marketplace-shell-${theme.preset || 'neon-nexus'}` : ''} min-h-screen bg-canvas`} style={isBuyer ? { '--market-primary': theme.primary, '--market-secondary': theme.secondary, '--market-canvas': theme.canvas, '--market-surface': theme.surface, '--market-text': theme.text } : undefined}>
    <Header onMenuClick={() => setMobileOpen(true)}/>
    {!isBuyer && <><div className={`fixed bottom-0 left-0 top-16 z-30 hidden border-r bg-white transition-[width] duration-180 md:block ${collapsed ? 'w-[72px]' : 'w-60'}`}><Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)}/></div><MobileSidebar open={mobileOpen} onClose={closeMobile}/></>}
    <div className={`flex min-h-screen flex-col pt-16 transition-[margin] duration-180 ${isBuyer ? '' : collapsed ? 'md:ml-[72px]' : 'md:ml-60'}`}><main className={`flex-1 px-4 py-5 sm:px-5 lg:px-7 lg:py-7 ${isBuyer ? 'mx-auto w-full max-w-[1440px]' : 'mx-auto w-full max-w-[1680px]'}`}><Outlet/></main><Footer/></div>
  </div>
}

function BuyerLayout() {
  const { content } = useMarketplaceContent()
  useEffect(() => { loadMarketplaceTheme(content?.document?.theme?.preset).catch(() => {}) }, [content?.document?.theme?.preset])
  return <><LayoutFrame isBuyer theme={content?.document?.theme || legacyMarketplaceTheme}/><BuyerCountryHeaderControl/><BuyerHeaderSearchPortal/></>
}

export default function AppLayout() {
  const { user } = useAuth()
  return user?.account_type === 'buyer' ? <BuyerLayout/> : <LayoutFrame/>
}
