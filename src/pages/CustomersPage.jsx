import { Ban, Mail, Search, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { getCustomers, setCustomerBlocked } from '../api/customers'
import { useAuth } from '../auth/useAuth'
import { TableSkeleton } from '../components/ui'

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'lead', label: 'Leads' },
  { key: 'customer', label: 'Customers' },
]

const formatDate = (value) => value ? new Date(value).toLocaleString() : '—'

export default function CustomersPage() {
  const { user } = useAuth()
  const isVendor = user?.account_type === 'vendor'
  const [customers, setCustomers] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    getCustomers().then(setCustomers).catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => ({
    all: customers.length,
    lead: customers.filter((item) => item.lifecycle_status === 'lead').length,
    customer: customers.filter((item) => item.lifecycle_status === 'customer').length,
  }), [customers])

  const visible = useMemo(() => customers.filter((customer) => {
    const matchesTab = activeTab === 'all' || customer.lifecycle_status === activeTab
    const haystack = `${customer.name} ${customer.username || ''} ${customer.email} ${customer.company_name || ''}`.toLowerCase()
    return matchesTab && haystack.includes(query.trim().toLowerCase())
  }), [customers, activeTab, query])

  const toggleBlocked = async (customer) => {
    const blocked = !customer.is_blocked
    const confirmation = await Swal.fire({ icon: 'warning', title: `${blocked ? 'Block' : 'Unblock'} ${customer.name}?`, text: blocked ? 'The customer will be logged out immediately and will not be able to sign in.' : 'The customer will be allowed to sign in again.', showCancelButton: true, confirmButtonText: blocked ? 'Block Customer' : 'Unblock Customer', confirmButtonColor: blocked ? '#D97706' : '#059669' })
    if (!confirmation.isConfirmed) return
    setUpdating(customer.id)
    try { const result = await setCustomerBlocked(customer.id, blocked); setCustomers((rows) => rows.map((row) => row.id === customer.id ? { ...row, is_blocked: result.data.is_blocked } : row)); await Swal.fire({ icon: 'success', title: blocked ? 'Customer blocked' : 'Customer unblocked', timer: 1300, showConfirmButton: false }) } catch (requestError) { await Swal.fire({ icon: 'error', title: 'Action failed', text: requestError.message }) } finally { setUpdating(null) }
  }

  return <section>
    <div className="ui-page-header">
      <div className="flex flex-wrap items-center justify-between gap-5"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-blue-100"><UsersRound className="h-4 w-4"/>Customer Management</p><h1 className="mt-2 text-2xl font-bold">{isVendor ? 'My Customers' : 'Leads & Customers'}</h1><p className="mt-2 text-sm text-blue-100">{isVendor ? 'Buyers with an accepted demo request or a sent purchase order for your vendor account.' : 'Registered buyers automatically become customers after sending their first PO.'}</p></div>{isVendor ? <div className="rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-center"><b className="text-3xl">{counts.customer}</b><p className="text-[11px] text-blue-100">My Customers</p></div> : <div className="grid grid-cols-3 gap-3 text-center"><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><b className="text-2xl">{counts.all}</b><p className="text-[11px] text-blue-100">All Buyers</p></div><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><b className="text-2xl">{counts.lead}</b><p className="text-[11px] text-blue-100">Leads</p></div><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><b className="text-2xl">{counts.customer}</b><p className="text-[11px] text-blue-100">Customers</p></div></div>}</div>
    </div>

    <div className="mt-6 ui-toolbar">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">{!isVendor && <div className="flex rounded-lg bg-slate-100 p-1">{tabs.map((tab) => <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`rounded-md px-4 py-2 text-xs font-semibold transition ${activeTab === tab.key ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{tab.label}<span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">{counts[tab.key]}</span></button>)}</div>}<label className={`relative block w-full sm:max-w-md ${isVendor ? 'sm:ml-auto' : ''}`}><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, username or email..." className="h-11 w-full rounded-lg border pl-10 pr-3 text-sm outline-none focus:border-primary"/></label></div>
    </div>

    {error && <p className="mt-5 rounded-lg bg-red-50 p-4 text-xs text-red-600">{error}</p>}
    {loading ? <div className="mt-6"><TableSkeleton columns={7}/></div> : <div className="mt-6 ui-table-shell"><div className="overflow-x-auto"><table className="customer-data-table w-full min-w-[1320px] text-left text-xs"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="p-4">Buyer</th><th className="p-4">Email</th><th className="p-4">Status</th><th className="p-4">Joined</th><th className="p-4">Last Login</th><th className="p-4 text-center">Demos</th><th className="p-4 text-center">Quotes</th><th className="p-4 text-center">Sent POs</th><th className="p-4">Last PO Sent</th><th className="p-4 text-right">Total PO Value</th>{!isVendor && <th className="p-4">Actions</th>}</tr></thead><tbody>{visible.map((customer) => <tr key={customer.id} className={`border-t ${customer.is_blocked ? 'bg-red-50/40' : ''}`}><td className="p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-primary"><UserRound className="h-4 w-4"/></span><div><b>{customer.name}</b><p className="mt-1 text-[11px] text-slate-400">{customer.company_name || customer.username || 'No company provided'}</p></div></div></td><td className="p-4"><a href={`mailto:${customer.email}`} className="inline-flex items-center gap-2 text-slate-600 hover:text-primary"><Mail className="h-3.5 w-3.5"/>{customer.email}</a></td><td className="p-4"><div className="flex flex-col items-start gap-1"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${customer.lifecycle_status === 'customer' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{customer.lifecycle_status}</span>{customer.is_blocked && <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold uppercase text-red-700">Blocked</span>}</div></td><td className="p-4 text-slate-500">{formatDate(customer.created_at)}</td><td className="p-4">{customer.last_login_at ? <span className="font-semibold text-emerald-700">{formatDate(customer.last_login_at)}</span> : <span className="text-slate-400">Never logged in</span>}</td><td className="p-4 text-center font-bold">{customer.demo_requests_count}</td><td className="p-4 text-center font-bold">{customer.quote_requests_count}</td><td className="p-4 text-center font-bold text-primary">{customer.sent_purchase_orders_count}</td><td className="p-4 text-slate-500">{formatDate(customer.last_po_sent_at)}</td><td className="p-4 text-right font-bold">PKR {Number(customer.total_po_value || 0).toLocaleString()}</td>{!isVendor && <td className="p-4"><div className="flex gap-2"><button disabled={updating === customer.id} onClick={() => toggleBlocked(customer)} className={`inline-flex h-8 items-center gap-1 rounded-md border px-2.5 font-semibold disabled:opacity-50 ${customer.is_blocked ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-amber-200 text-amber-700 hover:bg-amber-50'}`}>{customer.is_blocked ? <ShieldCheck className="h-3.5 w-3.5"/> : <Ban className="h-3.5 w-3.5"/>}{customer.is_blocked ? 'Unblock' : 'Block'}</button></div></td>}</tr>)}{!visible.length && <tr><td colSpan={isVendor ? 10 : 11} className="p-12 text-center text-slate-500">No {activeTab === 'all' ? 'buyers' : activeTab === 'lead' ? 'leads' : 'customers'} found.</td></tr>}</tbody></table></div></div>}
  </section>
}
