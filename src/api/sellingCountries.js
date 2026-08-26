import { authHeaders } from '../auth/session'

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...authHeaders(), ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat()[0] : data.message || 'Unable to load selling countries.')
  return data
}

export const getSellingCountries = () => request('/api/settings/selling-countries')
export const updateSellingCountries = (allowed_countries) => request('/api/settings/selling-countries', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allowed_countries }) })
