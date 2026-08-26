import { authHeaders } from '../auth/session'

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...authHeaders(), ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) { const validation = data.errors ? Object.values(data.errors).flat()[0] : null; throw new Error(validation || data.message || 'Unable to complete the marketplace request.') }
  return data
}

export const getMarketplaceBuilder = () => request('/api/marketplace-builder')
export const saveMarketplaceDraft = (document, lockVersion) => request('/api/marketplace-builder/draft', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document, lock_version: lockVersion }) })
export const publishMarketplace = (details = {}) => request('/api/marketplace-builder/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(details) })
export const scheduleMarketplace = (details) => request('/api/marketplace-builder/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(details) })
export const getMarketplaceVersions = () => request('/api/marketplace-builder/versions')
export const restoreMarketplaceVersion = (id) => request(`/api/marketplace-builder/versions/${id}/restore`, { method: 'POST' })
export const resetMarketplaceToDefaultTemplate = (lockVersion) => request('/api/marketplace-builder/templates/default/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lock_version: lockVersion }) })
export const saveMarketplaceDefaultTemplate = (lockVersion) => request('/api/marketplace-builder/templates/default/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lock_version: lockVersion }) })
export const getMarketplaceTemplates = (search = '', page = 1) => request(`/api/marketplace-builder/templates?${new URLSearchParams({ search, page, per_page: 12 })}`)
export const getMarketplaceTemplate = (id) => request(`/api/marketplace-builder/templates/${id}`)
export const createMarketplaceTemplate = (payload) => request('/api/marketplace-builder/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
export const cloneMarketplaceTemplate = (id, name = '') => request(`/api/marketplace-builder/templates/${id}/clone`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
export const applyMarketplaceTemplate = (id, lockVersion) => request(`/api/marketplace-builder/templates/${id}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lock_version: lockVersion }) })
export const archiveMarketplaceTemplate = (id) => request(`/api/marketplace-builder/templates/${id}`, { method: 'DELETE' })
export const getMarketplaceCatalog = () => request('/api/marketplace-builder/catalog')
export const getMarketplaceMedia = () => request('/api/marketplace-builder/media')
export const uploadMarketplaceMedia = (formData) => request('/api/marketplace-builder/media', { method: 'POST', body: formData })
export const updateMarketplaceMedia = (id, alt_text) => request(`/api/marketplace-builder/media/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alt_text }) })
export const archiveMarketplaceMedia = (id) => request(`/api/marketplace-builder/media/${id}`, { method: 'DELETE' })
export const getPublishedMarketplacePage = () => request('/api/marketplace/page')
