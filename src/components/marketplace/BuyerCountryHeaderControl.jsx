import { useEffect, useMemo, useState } from 'react'
import { getMarketplaceSellingCountries } from '../../api/marketplace'
import { countryCatalog } from '../../data/countryCatalog'
import MarketplaceCountryHeaderPortal from './MarketplaceCountryHeaderPortal'

const STORAGE_KEY = 'marketplace-selling-country'

export default function BuyerCountryHeaderControl() {
  const [allowedCodes, setAllowedCodes] = useState([])
  const [country, setCountry] = useState(() => localStorage.getItem(STORAGE_KEY) || 'Global')
  const countries = useMemo(() => { const allowed = new Set(allowedCodes); return countryCatalog.filter((item) => allowed.has(item.code)) }, [allowedCodes])

  useEffect(() => { getMarketplaceSellingCountries().then(setAllowedCodes).catch(() => setAllowedCodes([])) }, [])
  useEffect(() => {
    const sync = (event) => setCountry(event.detail || 'Global')
    window.addEventListener('marketplace-country-selected', sync)
    return () => window.removeEventListener('marketplace-country-selected', sync)
  }, [])
  useEffect(() => {
    if (country !== 'Global' && allowedCodes.length && !allowedCodes.includes(country)) setCountry('Global')
  }, [allowedCodes, country])

  const select = (value) => {
    setCountry(value)
    localStorage.setItem(STORAGE_KEY, value)
    window.dispatchEvent(new CustomEvent('marketplace-country-selected', { detail: value }))
  }

  return <MarketplaceCountryHeaderPortal countries={countries} value={country} onChange={select}/>
}
