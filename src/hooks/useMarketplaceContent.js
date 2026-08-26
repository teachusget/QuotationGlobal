import { useEffect, useState } from 'react'
import { getPublishedMarketplacePage } from '../api/marketplaceBuilder'

let cache = null
let pending = null
const load = () => {
  if (cache) return Promise.resolve(cache)
  if (!pending) pending = getPublishedMarketplacePage().then((response) => { cache = response.data; return cache }).finally(() => { pending = null })
  return pending
}
export function clearMarketplaceContentCache() { cache = null; pending = null; window.dispatchEvent(new Event('marketplace-content-updated')) }
export default function useMarketplaceContent() {
  const [content, setContent] = useState(cache)
  const [loading, setLoading] = useState(!cache)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const refresh = () => { setLoading(true); setError(''); load().then((data) => active && setContent(data)).catch((requestError) => { if (active) setError(requestError.message || 'Marketplace content is unavailable.') }).finally(() => active && setLoading(false)) }
    refresh(); window.addEventListener('marketplace-content-updated', refresh)
    return () => { active = false; window.removeEventListener('marketplace-content-updated', refresh) }
  }, [])
  return { content, loading, error }
}
