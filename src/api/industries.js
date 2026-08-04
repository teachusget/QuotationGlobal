import { authHeaders } from '../auth/session'

const API_URL = '/api/industries'

async function request(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...authHeaders(), ...options?.headers },
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || 'Unable to complete the request.')
    error.status = response.status
    throw error
  }

  return data
}

async function serialize(formData) {
  const payload = {
    name: String(formData.get('name') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    status: String(formData.get('status') || 'active').trim(),
  }
  const logo = formData.get('logo')

  if (logo instanceof File && logo.size) {
    payload.logo_data = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(logo)
    })
  }

  return JSON.stringify(payload)
}

export async function getIndustries() {
  const response = await request(API_URL)
  if (!Array.isArray(response?.data)) throw new Error('The server returned an invalid industry list.')
  return response.data
}
export async function getMarketplaceIndustries() {
  const response = await request('/api/marketplace/industries')
  return Array.isArray(response?.data) ? response.data : []
}

export async function createIndustry(formData) {
  return request(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await serialize(formData),
  })
}
