import { authHeaders } from '../auth/session'

const API_URL = '/api/vendors'

async function request(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...authHeaders(), ...options?.headers },
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const validationMessage = data.errors ? Object.values(data.errors).flat()[0] : null
    throw new Error(validationMessage || data.message || 'Unable to complete the request.')
  }

  return data
}

export async function getVendors() {
  const response = await request(API_URL)
  if (!Array.isArray(response?.data)) throw new Error('The server returned an invalid vendor list.')
  return response.data
}

export async function createVendor(payload) {
  return request(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateVendor(id, payload) {
  return request(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteVendor(id) {
  return request(`${API_URL}/${id}`, { method: 'DELETE' })
}

export function approveVendor(id) {
  return request(`${API_URL}/${id}/approve`, { method: 'POST' })
}

export function setVendorActive(id, active) {
  return request(`${API_URL}/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  })
}

export function loginAsVendor(id) {
  return request(`${API_URL}/${id}/impersonate`, { method: 'POST' })
}
