import { useEffect, useMemo, useState } from 'react'
import { getServices } from '../../api/services'
import { getVendors } from '../../api/vendors'
import { getUsers } from '../../api/rbac'
import { createAdminRfq } from '../../api/rfqs'
import { Alert, Button, Modal } from '../ui'

const blank = { targets: [{ vendor_id: '', service_id: '' }], user_id: '', quote_purpose: '', expected_users: '10', currently_using: 'manual', current_brand_name: '' }

export default function AdminRfqModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(blank)
  const [services, setServices] = useState([])
  const [vendors, setVendors] = useState([])
  const [buyers, setBuyers] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const approvedVendors = useMemo(() => vendors.filter((vendor) => vendor.status === 'approved'), [vendors])
  const availableServices = useMemo(() => services.filter((service) => approvedVendors.some((vendor) => Number(vendor.id) === Number(service.vendor_id))), [services, approvedVendors])

  useEffect(() => {
    if (!open) return
    setForm(blank); setError(''); setLoading(true)
    Promise.all([getServices(), getVendors(), getUsers({ account_type: 'buyer', per_page: 100 })])
      .then(([serviceResult, vendorResult, buyerResult]) => { setServices(serviceResult.data || []); setVendors(vendorResult || []); setBuyers(buyerResult.data || []) })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [open])

  const change = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }
  const changeTarget = (index, key, value) => setForm((current) => ({ ...current, targets: current.targets.map((target, targetIndex) => targetIndex === index ? { ...target, [key]: value, ...(key === 'vendor_id' && !services.some((service) => String(service.id) === target.service_id && Number(service.vendor_id) === Number(value)) ? { service_id: '' } : {}) } : target) }))
  const addTarget = () => setForm((current) => ({ ...current, targets: [...current.targets, { vendor_id: '', service_id: '' }] }))
  const removeTarget = (index) => setForm((current) => ({ ...current, targets: current.targets.filter((_, targetIndex) => targetIndex !== index) }))
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('')
    try { const result = await createAdminRfq({ ...form, targets: form.targets.map((target) => ({ vendor_id: Number(target.vendor_id), service_id: Number(target.service_id) })), user_id: Number(form.user_id), expected_users: Number(form.expected_users) }); onCreated(result.data); onClose() } catch (requestError) { setError(requestError.message) } finally { setSaving(false) }
  }

  return <Modal open={open} onClose={() => !saving && onClose()} title="Add & Send RFQ" description="Create one RFQ campaign and send it to multiple approved vendors." size="md" footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button form="admin-rfq-form" type="submit" loading={saving} disabled={loading || !form.user_id || form.quote_purpose.trim().length < 10 || form.targets.some((target) => !target.vendor_id || !target.service_id)}>{saving ? 'Sending RFQs' : `Send to ${form.targets.length} vendor${form.targets.length === 1 ? '' : 's'}`}</Button></>}>
    {error && <Alert className="mb-4">{error}</Alert>}
    {loading ? <p className="py-8 text-center text-xs text-slate-500">Loading services, vendors and customers...</p> : <form id="admin-rfq-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Customer<select name="user_id" value={form.user_id} onChange={change} className="mt-1.5 h-10 w-full rounded-lg border px-3 text-xs"><option value="">Select customer</option>{buyers.map((buyer) => <option key={buyer.id} value={buyer.id}>{buyer.name} — {buyer.email}</option>)}</select></label>
      <div className="sm:col-span-2"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-700">Vendor bids</span><button type="button" onClick={addTarget} className="text-[11px] font-bold text-primary">+ Add vendor</button></div><div className="space-y-2">{form.targets.map((target, index) => <div key={`target-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2"><select value={target.vendor_id} onChange={(event) => changeTarget(index, 'vendor_id', event.target.value)} className="h-10 rounded-lg border px-2 text-xs"><option value="">Vendor</option>{approvedVendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.company_name || vendor.name}</option>)}</select><select value={target.service_id} onChange={(event) => changeTarget(index, 'service_id', event.target.value)} className="h-10 rounded-lg border px-2 text-xs"><option value="">Service</option>{availableServices.filter((service) => !target.vendor_id || Number(service.vendor_id) === Number(target.vendor_id)).map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select><button type="button" disabled={form.targets.length === 1} onClick={() => removeTarget(index)} className="h-10 px-2 text-xs text-red-500 disabled:opacity-30">Remove</button></div>)}</div></div>
      <label className="text-xs font-semibold text-slate-700">Expected users<select name="expected_users" value={form.expected_users} onChange={change} className="mt-1.5 h-10 w-full rounded-lg border px-3 text-xs">{[['10', '1–10'], ['50', '11–50'], ['100', '51–100'], ['250', '101–250'], ['500', '251–500'], ['1000000', '500+']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-700">Currently using<select name="currently_using" value={form.currently_using} onChange={change} className="mt-1.5 h-10 w-full rounded-lg border px-3 text-xs"><option value="manual">Manual</option><option value="spreadsheet">Excel / Google Sheet</option><option value="customized_in_house">Customized in-house</option><option value="brand">Another brand</option></select></label>
      {form.currently_using === 'brand' && <label className="text-xs font-semibold text-slate-700">Current brand<input name="current_brand_name" value={form.current_brand_name} onChange={change} className="mt-1.5 h-10 w-full rounded-lg border px-3 text-xs"/></label>}
      <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Requirements<textarea name="quote_purpose" value={form.quote_purpose} onChange={change} minLength={10} maxLength={1500} rows={5} placeholder="Describe what the customer needs..." className="mt-1.5 w-full rounded-lg border p-3 text-xs"/></label>
    </form>}
  </Modal>
}
