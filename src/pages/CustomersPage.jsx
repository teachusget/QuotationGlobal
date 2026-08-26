import { Ban, ClipboardList, Mail, Search, ShieldCheck, UserRound, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { getCustomers, setCustomerBlocked, updateCustomerCrm } from '../api/customers'
import { useAuth } from '../auth/useAuth'
import { Button, TableSkeleton } from '../components/ui'
import useDialogAccessibility from '../hooks/useDialogAccessibility'

const tabs = [['all', 'All'], ['lead', 'Leads'], ['customer', 'Customers']]
const statuses = [['new', 'New'], ['contacted', 'Contacted'], ['qualified', 'Qualified'], ['proposal_sent', 'Proposal Sent'], ['follow_up', 'Follow-up'], ['won', 'Won'], ['lost', 'Lost']]
const quoteStatusLabels = { pending: 'Request Pending', quoted: 'Sent · Awaiting Buyer', quote_accepted: 'Accepted', quote_declined: 'Declined' }
const quoteStatusStyles = { pending: 'bg-amber-50 text-amber-700', quoted: 'bg-blue-50 text-blue-700', quote_accepted: 'bg-emerald-50 text-emerald-700', quote_declined: 'bg-red-50 text-red-700' }
const date = (value) => value ? new Date(value).toLocaleString() : '—'
const inputDate = (value) => value ? new Date(value).toISOString().slice(0, 16) : ''

export default function CustomersPage() {
  const { user, can } = useAuth()
  const isVendor = user?.account_type === 'vendor'
  const canManage = !isVendor && (can('customers.assign') || can('customers.follow_up'))
  const [rows, setRows] = useState([])
  const [assignees, setAssignees] = useState([])
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => { getCustomers().then((result) => { setRows(result.data); setAssignees(result.assignees) }).catch((err) => setError(err.message)).finally(() => setLoading(false)) }, [])
  const counts = useMemo(() => ({ all: rows.length, lead: rows.filter((x) => x.lifecycle_status === 'lead').length, customer: rows.filter((x) => x.lifecycle_status === 'customer').length }), [rows])
  const visible = useMemo(() => rows.filter((x) => (tab === 'all' || x.lifecycle_status === tab) && `${x.name} ${x.email} ${x.company_name || ''} ${x.crm?.assignee?.name || ''} ${x.vendor?.name || ''} ${(x.lead_sources || []).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())), [rows, tab, query])

  const block = async (customer) => {
    const blocked = !customer.is_blocked
    const confirmation = await Swal.fire({ icon: 'warning', title: `${blocked ? 'Block' : 'Unblock'} ${customer.name}?`, showCancelButton: true, confirmButtonText: blocked ? 'Block Customer' : 'Unblock Customer' })
    if (!confirmation.isConfirmed) return
    setUpdating(customer.id)
    try { const result = await setCustomerBlocked(customer.id, blocked); setRows((all) => all.map((x) => x.id === customer.id ? { ...x, is_blocked: result.data.is_blocked } : x)) } catch (err) { await Swal.fire('Action failed', err.message, 'error') } finally { setUpdating(null) }
  }
  const saveCrm = async (payload) => {
    setUpdating(selected.id)
    try {
      const result = await updateCustomerCrm(selected.id, selected.vendor.id, payload)
      setRows((all) => all.map((x) => x.row_key === selected.row_key ? { ...x, crm: result.data } : x))
      setSelected((x) => ({ ...x, crm: result.data }))
      await Swal.fire({ icon: 'success', title: result.message, timer: 1100, showConfirmButton: false })
    } finally { setUpdating(null) }
  }

  const takeUp = async (customer) => {
    setUpdating(customer.row_key)
    try {
      const result = await updateCustomerCrm(customer.id, customer.vendor.id, { assigned_to: user.id, status: 'follow_up', next_follow_up_at: null, note: 'Quotation follow-up taken up.' })
      setRows((all) => all.map((row) => row.row_key === customer.row_key ? { ...row, crm: result.data } : row))
      await Swal.fire({ icon: 'success', title: 'Lead assigned to you', timer: 1100, showConfirmButton: false })
    } catch (err) { await Swal.fire('Unable to take up lead', err.message, 'error') } finally { setUpdating(null) }
  }

  const countCards = [['all', isVendor ? 'My Buyers' : 'All Buyers'], ['lead', 'Leads'], ['customer', 'Customers']]
  return <section>
    <div className="ui-page-header"><div className="flex flex-wrap items-center justify-between gap-5"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-blue-100"><UsersRound className="h-4 w-4"/>Customer Management</p><h1 className="mt-2 text-2xl font-bold">{isVendor ? 'My Leads & Customers' : 'Leads & Customers'}</h1><p className="mt-2 text-sm text-blue-100">{isVendor ? 'Your buyers across demos, quotations and purchase orders.' : 'Assign leads, record follow-ups and track conversion activity.'}</p></div><div className="grid grid-cols-3 gap-3 text-center">{countCards.map(([key, label]) => <div key={key} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><b className="text-2xl">{counts[key]}</b><p className="text-[11px] text-blue-100">{label}</p></div>)}</div></div></div>
    <div className="mt-6 ui-toolbar"><div className="flex w-full flex-wrap items-center gap-3"><div className="flex rounded-lg bg-slate-100 p-1">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-md px-4 py-2 text-xs font-semibold ${tab === key ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>{label}<span className="ml-2">{counts[key]}</span></button>)}</div><label className="relative ml-auto min-w-[260px] flex-1 sm:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search buyer, company, assignee or email..." className="h-11 w-full rounded-lg border pl-10 pr-3 text-sm"/></label></div></div>
    {error && <p className="mt-5 rounded-lg bg-red-50 p-4 text-xs text-red-600">{error}</p>}
    {loading ? <div className="mt-6"><TableSkeleton columns={11}/></div> : <div className="mt-6 ui-table-shell"><div className="overflow-x-auto"><table className={`w-full text-left text-xs ${isVendor ? 'min-w-[980px]' : 'min-w-[1540px]'}`}><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="p-4">Buyer</th><th className="p-4">Vendor</th><th className="p-4">Lead Type</th><th className="p-4">Lifecycle</th>{!isVendor && <><th className="p-4">CRM Status</th><th className="p-4">Assigned To</th><th className="p-4">Next Follow-up</th></>}<th className="p-4 text-center">Demos</th><th className="p-4 text-center">Quotes</th><th className="p-4">Quote Status</th><th className="p-4 text-center">Sent POs</th>{!isVendor && <th className="p-4">Actions</th>}</tr></thead><tbody>{visible.map((customer) => <tr key={customer.row_key} className="border-t"><td className="p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-primary"><UserRound className="h-4 w-4"/></span><div><b>{customer.name}</b><a href={`mailto:${customer.email}`} className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 hover:text-primary"><Mail className="h-3 w-3"/>{customer.email}</a><p className="mt-0.5 text-[10px] text-slate-400">{customer.company_name || 'No company provided'}</p></div></div></td><td className="p-4"><span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{customer.vendor.name}</span></td><td className="p-4"><div className="flex flex-wrap gap-1">{customer.lead_sources.map((source) => <span key={source} className={`rounded-full px-2 py-1 text-[10px] font-bold ${source === 'Quote' ? 'bg-violet-50 text-violet-700' : source === 'Demo' ? 'bg-cyan-50 text-cyan-700' : 'bg-slate-100 text-slate-600'}`}>{source}</span>)}</div></td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${customer.lifecycle_status === 'customer' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{customer.lifecycle_status}</span></td>{!isVendor && <><td className="p-4 capitalize">{(customer.crm?.status || 'new').replaceAll('_', ' ')}</td><td className="p-4">{customer.crm?.assignee?.name || <span className="text-slate-400">Unassigned</span>}</td><td className="p-4 text-slate-500">{date(customer.crm?.next_follow_up_at)}</td></>}<td className="p-4 text-center font-bold">{customer.demo_requests_count}</td><td className="p-4 text-center font-bold">{customer.quote_requests_count}</td><td className="p-4">{customer.quote_status ? <div><span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold ${quoteStatusStyles[customer.quote_status] || 'bg-slate-100 text-slate-600'}`}>{quoteStatusLabels[customer.quote_status] || customer.quote_status}</span><p className="mt-1.5 whitespace-nowrap text-[10px] text-slate-400">{date(customer.quote_status_at)}</p></div> : <span className="text-slate-400">—</span>}</td><td className="p-4 text-center font-bold text-primary">{customer.sent_purchase_orders_count}</td>{!isVendor && <td className="p-4"><div className="flex gap-2">{user?.account_type === 'staff' && canManage && customer.quote_status === 'quoted' && !customer.crm?.assigned_to && <button disabled={updating === customer.row_key} onClick={() => takeUp(customer)} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-2.5 font-semibold text-white disabled:opacity-50"><UserRound className="h-3.5 w-3.5"/>Take Up</button>}{canManage && <button onClick={() => setSelected(customer)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary px-2.5 font-semibold text-primary"><ClipboardList className="h-3.5 w-3.5"/>Follow-up</button>}{can('customers.block') && <button disabled={updating === customer.id} onClick={() => block(customer)} className="inline-flex h-8 items-center gap-1 rounded-md border border-amber-200 px-2.5 font-semibold text-amber-700">{customer.is_blocked ? <ShieldCheck className="h-3.5 w-3.5"/> : <Ban className="h-3.5 w-3.5"/>}{customer.is_blocked ? 'Unblock' : 'Block'}</button>}</div></td>}</tr>)}{!visible.length && <tr><td colSpan={isVendor ? 8 : 12} className="p-12 text-center text-slate-500">No matching records found.</td></tr>}</tbody></table></div></div>}
    {selected && <CrmModal customer={selected} assignees={assignees} canAssign={can('customers.assign')} user={user} saving={updating === selected.id} onSave={saveCrm} onClose={() => setSelected(null)}/>} 
  </section>
}

function CrmModal({ customer, assignees, canAssign, user, saving, onSave, onClose }) {
  const crm = customer.crm || {}
  const [form, setForm] = useState({ assigned_to: crm.assigned_to || (canAssign ? '' : user.id), status: crm.status || 'new', next_follow_up_at: inputDate(crm.next_follow_up_at), note: '' })
  const [error, setError] = useState('')
  const ref = useDialogAccessibility(true, onClose, saving)
  const submit = async (event) => { event.preventDefault(); setError(''); try { await onSave({ ...form, assigned_to: form.assigned_to ? Number(form.assigned_to) : null, next_follow_up_at: form.next_follow_up_at || null }); setForm((x) => ({ ...x, note: '' })) } catch (err) { setError(err.message) } }
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4"><div ref={ref} role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-overlay"><header className="flex items-center justify-between border-b p-5"><div><h2 className="font-bold">Lead follow-up</h2><p className="mt-1 text-xs text-slate-500">{customer.name} · {customer.email}</p></div><button onClick={onClose}><X className="h-5 w-5"/></button></header><form onSubmit={submit} className="p-5"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Assigned to<select disabled={!canAssign} value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal disabled:bg-slate-100"><option value="">Unassigned</option>{assignees.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.email}</option>)}{!canAssign && <option value={user.id}>{user.name} (me)</option>}</select></label><label className="text-xs font-semibold">Pipeline status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal">{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-semibold sm:col-span-2">Next follow-up<input type="datetime-local" value={form.next_follow_up_at} onChange={(e) => setForm({ ...form, next_follow_up_at: e.target.value })} className="mt-1.5 h-10 w-full rounded-md border px-3 font-normal"/></label><label className="text-xs font-semibold sm:col-span-2">Work note<textarea required maxLength="2000" rows="3" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Call outcome, requirement and next action..." className="mt-1.5 w-full rounded-md border p-3 font-normal"/></label></div>{error && <p className="mt-4 bg-red-50 p-3 text-xs text-red-600">{error}</p>}<div className="mt-5 flex justify-end gap-2 border-t pt-4"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} disabled={!form.note.trim()}>Save follow-up</Button></div></form><section className="border-t p-5"><h3 className="text-sm font-bold">Activity history</h3><div className="mt-3 space-y-2">{(crm.activities || []).map((activity) => <article key={activity.id} className="rounded-lg border bg-slate-50 p-3"><div className="flex justify-between text-[11px]"><b>{activity.actor?.name || 'System'}</b><span className="text-slate-400">{date(activity.created_at)}</span></div><p className="mt-1 text-xs capitalize text-primary">{String(activity.status || activity.action).replaceAll('_', ' ')}</p>{activity.note && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{activity.note}</p>}</article>)}{!crm.activities?.length && <p className="rounded-lg border border-dashed p-5 text-center text-xs text-slate-400">No activity yet.</p>}</div></section></div></div>
}
