import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import MarketplaceCountryFilter from './MarketplaceCountryFilter'

export default function MarketplaceCountryHeaderPortal(props) {
  const [target, setTarget] = useState(null)
  useEffect(() => { setTarget(document.querySelector('.app-header > div > div:last-child')) }, [])
  return target ? createPortal(<div className="order-first hidden md:block"><MarketplaceCountryFilter {...props} compact/></div>, target) : null
}
