import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import MarketplaceHeaderSearch from './MarketplaceHeaderSearch'

export default function BuyerHeaderSearchPortal() {
  const [target, setTarget] = useState(null)
  useEffect(() => {
    const headerCenter = document.querySelector('.app-header > div > div:nth-child(2)')
    if (headerCenter) { headerCenter.classList.add('buyer-header-search-center'); setTarget(headerCenter) }
    return () => headerCenter?.classList.remove('buyer-header-search-center')
  }, [])
  return target ? createPortal(<div className="buyer-header-search"><MarketplaceHeaderSearch/></div>, target) : null
}
