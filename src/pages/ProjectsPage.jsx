import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, FolderKanban, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createProject, getProjects, updateProject } from '../api/projects'
import { TableSkeleton } from '../components/ui'

const projectStatuses = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']
const statusLabels = { planning: 'Planning', in_progress: 'In Progress', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled' }
const statusTones = { planning: 'bg-blue-50 text-blue-700', in_progress: 'bg-violet-50 text-violet-700', on_hold: 'bg-amber-50 text-amber-700', completed: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-red-50 text-red-700' }
const statusDots = { planning: 'bg-blue-500', in_progress: 'bg-violet-500', on_hold: 'bg-amber-500', completed: 'bg-emerald-500', cancelled: 'bg-red-500' }
const cycleLabels = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-annually', annually: 'Annually' }
const currencies = [{ code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee' }, { code: 'USD', symbol: '$', name: 'US Dollar' }, { code: 'EUR', symbol: '€', name: 'Euro' }, { code: 'GBP', symbol: '£', name: 'British Pound' }, { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' }, { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' }, { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' }, { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }, { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' }, { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }, { code: 'INR', symbol: '₹', name: 'Indian Rupee' }, { code: 'TRY', symbol: '₺', name: 'Turkish Lira' }, { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal' }, { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' }, { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar' }, { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial' }]

function CurrencySelect({ value, onChange }) {
  const [open, setOpen] = useState(false); const [search, setSearch] = useState(''); const selected = currencies.find((item) => item.code === value) || currencies[0]; const matches = currencies.filter((item) => `${item.code} ${item.symbol} ${item.name}`.toLowerCase().includes(search.trim().toLowerCase()))
  return <label className="relative text-xs font-semibold">Currency *<button type="button" onClick={() => setOpen((current) => !current)} className="mt-1.5 flex h-11 w-full items-center justify-between rounded-lg border bg-white px-3 text-left font-normal"><span><b>{selected.code}</b> · {selected.symbol} · {selected.name}</span><span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span></button>{open && <div className="absolute z-40 mt-1 w-full rounded-lg border bg-white p-2 shadow-floating"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search currency, code or symbol..." className="h-10 w-full rounded-md border pl-9 pr-3 font-normal"/></div><div className="mt-2 max-h-52 overflow-y-auto">{matches.map((item) => <button key={item.code} type="button" onClick={() => { onChange(item.code); setOpen(false); setSearch('') }} className={`flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left font-normal hover:bg-slate-50 ${item.code === value ? 'bg-blue-50 text-primary' : ''}`}><b className="w-10">{item.code}</b><span className="w-8 text-center">{item.symbol}</span><span>{item.name}</span></button>)}{!matches.length && <p className="p-3 text-center font-normal text-slate-400">No currency found.</p>}</div></div>}</label>
}

function ProjectModal({ opportunities, project, saving, error, onClose, onSave }) {
  const editing = Boolean(project)
  const [form, setForm] = useState(() => editing ? {
    name: project.name || '',
    start_date: String(project.start_date || '').slice(0, 10),
    delivery_duration: project.delivery_duration || project.delivery_days || 1,
    delivery_unit: project.delivery_unit || 'days',
    payment_model: project.payment_model || 'one_time',
    billing_frequency: project.billing_frequency || 'monthly',
    currency: project.currency || 'PKR',
    contract_value: project.contract_value || '',
    additional_services_payment: project.additional_services_payment || '',
    payment_terms: project.payment_terms || '',
    status: project.status || 'planning',
    status_reason: project.status_reason || '',
    notes: project.notes || '',
  } : {
    sales_lead_id: '',
    name: '',
    start_date: new Date().toISOString().slice(0, 10),
    delivery_duration: 30,
    delivery_unit: 'days',
    payment_model: 'one_time',
    billing_frequency: 'monthly',
    currency: 'PKR',
    contract_value: '',
    additional_services_payment: '',
    payment_terms: '',
    status: 'planning',
    status_reason: '',
    notes: '',
  })
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const selected = opportunities.find((item) => String(item.id) === String(form.sales_lead_id))
  const dueDate = useMemo(() => {
    if (!form.start_date || !form.delivery_duration) return ''
    const date = new Date(`${form.start_date}T00:00:00`)
    const duration = Number(form.delivery_duration)
    if (form.delivery_unit === 'months') date.setMonth(date.getMonth() + duration)
    else if (form.delivery_unit === 'years') date.setFullYear(date.getFullYear() + duration)
    else date.setDate(date.getDate() + duration)
    return date.toLocaleDateString()
  }, [form.start_date, form.delivery_duration, form.delivery_unit])

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4">
    <form onSubmit={(event) => { event.preventDefault(); onSave(form) }} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-overlay">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
        <div><h2 className="text-lg font-bold">{editing ? 'Edit Project' : 'Add Project'}</h2><p className="mt-1 text-xs text-slate-500">{editing ? project.project_number : 'Convert an opportunity into a delivery project.'}</p></div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border"><X className="h-4 w-4"/></button>
      </header>
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        {!editing && <label className="text-xs font-semibold sm:col-span-2">Opportunity *
          <select required value={form.sales_lead_id} onChange={(event) => {
            const opportunity = opportunities.find((item) => String(item.id) === event.target.value)
            setForm((current) => ({ ...current, sales_lead_id: event.target.value, name: opportunity ? `${opportunity.service?.name || 'Project'} - ${opportunity.company_name || opportunity.name}` : '' }))
          }} className="mt-1.5 h-11 w-full rounded-lg border px-3 font-normal">
            <option value="">Select opportunity</option>
            {opportunities.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.company_name || item.email} · {item.service?.name || 'Service'}</option>)}
          </select>
        </label>}
        {(editing || selected) && <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs sm:col-span-2">
          <b>{editing ? (project.vendor?.company_name || project.vendor?.name) : (selected.vendor?.company_name || selected.vendor?.name)}</b>
          <span className="mx-2 text-blue-300">·</span>{editing ? project.service?.name : selected.service?.name}
          <span className="mx-2 text-blue-300">·</span>{editing ? project.opportunity?.email : selected.email}
          <p className="mt-1 text-[10px] text-slate-500">Opportunity, vendor and service are locked to preserve project history.</p>
        </div>}
        <Field label="Project name" value={form.name} onChange={(value) => set('name', value)} required wide/>
        <Field label="Project start" type="date" value={form.start_date} onChange={(value) => set('start_date', value)} required/>
        <DeliveryDurationField duration={form.delivery_duration} unit={form.delivery_unit} onDurationChange={(value) => set('delivery_duration', value)} onUnitChange={(value) => set('delivery_unit', value)}/>
        <div className="rounded-lg bg-slate-50 p-3 text-xs sm:col-span-2"><span className="text-slate-500">Expected delivery date</span><b className="ml-2 text-primary">{dueDate || 'Select start and duration'}</b></div>
        <label className="text-xs font-semibold">Payment model *
          <select value={form.payment_model} onChange={(event) => set('payment_model', event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border px-3 font-normal"><option value="one_time">One-time payment</option><option value="subscription">Subscription</option></select>
        </label>
        {form.payment_model === 'subscription' && <label className="text-xs font-semibold">Billing frequency *
          <select value={form.billing_frequency} onChange={(event) => set('billing_frequency', event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border px-3 font-normal">{Object.entries(cycleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </label>}
        <CurrencySelect value={form.currency} onChange={(value) => set('currency', value)}/>
        <Field label={form.payment_model === 'subscription' ? `Subscription amount (${form.currency})` : `Contract value (${form.currency})`} type="number" min="0" value={form.contract_value} onChange={(value) => set('contract_value', value)}/>
        <Field label={`Additional services payment (${form.currency})`} type="number" min="0" value={form.additional_services_payment} onChange={(value) => set('additional_services_payment', value)}/>
        <label className="text-xs font-semibold sm:col-span-2">Payment terms<textarea rows="3" value={form.payment_terms} onChange={(event) => set('payment_terms', event.target.value)} placeholder="Advance payment, due dates, late fee or milestone terms..." className="mt-1.5 w-full rounded-lg border p-3 font-normal"/></label>
        {editing && <label className="text-xs font-semibold sm:col-span-2">Project status *
          <select value={form.status} onChange={(event) => set('status', event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border px-3 font-normal">{projectStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>
        </label>}
        {editing && ['on_hold', 'cancelled'].includes(form.status) && <label className="text-xs font-semibold sm:col-span-2">{form.status === 'cancelled' ? 'Cancellation reason' : 'On-hold reason'} *<textarea required maxLength="1000" rows="3" value={form.status_reason} onChange={(event) => set('status_reason', event.target.value)} placeholder="Explain why this project status is being changed..." className="mt-1.5 w-full rounded-lg border p-3 font-normal"/></label>}
        <label className="text-xs font-semibold sm:col-span-2">Project notes<textarea rows="3" value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Scope, deliverables, dependencies or internal notes..." className="mt-1.5 w-full rounded-lg border p-3 font-normal"/></label>
        {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600 sm:col-span-2">{error}</p>}
      </div>
      <footer className="sticky bottom-0 flex justify-end gap-3 border-t bg-slate-50 px-6 py-4"><button type="button" onClick={onClose} className="h-10 rounded-lg border bg-white px-5 text-xs font-semibold">Cancel</button><button disabled={saving} className="h-10 rounded-lg bg-primary px-5 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Project'}</button></footer>
    </form>
  </div>
}
function DeliveryDurationField({ duration, unit, onDurationChange, onUnitChange }) { return <fieldset className="text-xs font-semibold"><legend>Delivery time *</legend><div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_120px] overflow-hidden rounded-lg border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"><input required min="1" max="3650" type="number" value={duration} onChange={(event) => onDurationChange(event.target.value)} className="h-11 min-w-0 border-0 px-3 font-normal outline-none"/><select required value={unit} onChange={(event) => onUnitChange(event.target.value)} className="h-11 border-0 border-l bg-slate-50 px-3 font-normal outline-none"><option value="days">Days</option><option value="months">Months</option><option value="years">Years</option></select></div></fieldset> }

function Field({ label, value, onChange, type = 'text', required = false, wide = false, min }) { return <label className={`text-xs font-semibold ${wide ? 'sm:col-span-2' : ''}`}>{label.replace('(PKR)', '')}{required && ' *'}<input required={required} min={min} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border px-3 font-normal outline-none focus:border-primary"/></label> }

function StatusReasonModal({ pending, saving, error, onCancel, onConfirm }) {
  const [reason, setReason] = useState(pending.project.status === pending.status ? pending.project.status_reason || '' : '')
  const label = pending.status === 'cancelled' ? 'Cancellation reason' : 'On-hold reason'
  return createPortal(<div className="fixed inset-0 z-[210] grid place-items-center bg-slate-950/55 p-4"><form onSubmit={(event) => { event.preventDefault(); onConfirm(reason.trim()) }} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-overlay"><header className="flex items-start justify-between border-b px-5 py-4"><div><h2 className="text-base font-bold">Move project to {statusLabels[pending.status]}</h2><p className="mt-1 text-xs text-slate-500">Reason is required and will be saved in the audit history.</p></div><button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-lg border"><X className="h-4 w-4"/></button></header><div className="p-5"><label className="text-xs font-semibold">{label} *<textarea autoFocus required minLength="3" maxLength="1000" rows="4" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Enter a clear reason..." className="mt-1.5 w-full resize-none rounded-lg border p-3 font-normal outline-none focus:border-primary"/></label><div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>Minimum 3 characters</span><span>{reason.length}/1000</span></div>{error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>}</div><footer className="flex justify-end gap-3 border-t bg-slate-50 px-5 py-4"><button type="button" onClick={onCancel} disabled={saving} className="h-9 rounded-lg border bg-white px-4 text-xs font-semibold">Cancel</button><button disabled={saving || reason.trim().length < 3} className="h-9 rounded-lg bg-primary px-4 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : `Confirm ${statusLabels[pending.status]}`}</button></footer></form></div>, document.body)
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]); const [opportunities, setOpportunities] = useState([]); const [meta, setMeta] = useState({}); const [query, setQuery] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [updatingStatus, setUpdatingStatus] = useState(null); const [pendingStatus, setPendingStatus] = useState(null); const [error, setError] = useState(''); const [modal, setModal] = useState(undefined)
  const filters = useMemo(() => ({ search: query, status, page, per_page: 25 }), [query, status, page])
  const load = () => { setLoading(true); getProjects(filters).then((result) => { setProjects(result.data || []); setOpportunities(result.opportunities || []); setMeta(result.meta || {}) }).catch((err) => setError(err.message)).finally(() => setLoading(false)) }
  useEffect(() => { const timer = setTimeout(load, 300); return () => clearTimeout(timer) }, [filters])
  const save = async (payload) => { setSaving(true); setError(''); try { if (modal) await updateProject(modal.id, payload); else await createProject(payload); setModal(undefined); await load() } catch (err) { setError(err.message) } finally { setSaving(false) } }
  const changeStatus = async (project, nextStatus, reason = null) => { if (nextStatus === project.status && !reason) return; setUpdatingStatus(project.id); setError(''); try { await updateProject(project.id, { status: nextStatus, ...(reason ? { status_reason: reason } : {}) }); setPendingStatus(null); await load() } catch (err) { setError(err.message) } finally { setUpdatingStatus(null) } }
  const requestStatusChange = (project, nextStatus) => { if (nextStatus === project.status) return; if (['on_hold', 'cancelled'].includes(nextStatus)) { setError(''); setPendingStatus({ project, status: nextStatus }); return } changeStatus(project, nextStatus) }
  return <section><div className="ui-page-header"><div className="flex w-full flex-wrap items-center justify-between gap-5"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-slate-500"><FolderKanban className="h-4 w-4"/>CRM · Delivery</p><h1 className="mt-2 text-2xl font-bold">Projects</h1><p className="mt-2 text-sm text-slate-500">Convert sales opportunities into tracked delivery projects.</p></div><button onClick={() => { setError(''); setModal(null) }} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold text-white"><Plus className="h-4 w-4"/>Add Project</button></div></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3"><Stat label="Total Projects" value={meta.all_total ?? meta.total ?? 0}/><Stat label="In Progress" value={meta.status_counts?.in_progress || 0} tone="text-violet-600"/><Stat label="Available Opportunities" value={opportunities.length} tone="text-emerald-600"/></div><StatusChips active={status} counts={meta.status_counts || {}} onChange={(value) => { setStatus(value); setPage(1) }}/><div className="mt-5 rounded-xl border bg-white p-4"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} placeholder="Search project, customer or email..." className="h-10 w-full rounded-lg border pl-10 pr-3 text-xs"/></label></div>
    {error && modal === undefined && <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>}{loading ? <div className="mt-5"><TableSkeleton columns={9}/></div> : <div className="mt-5 ui-table-shell"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-xs"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="p-4">Project</th><th className="p-4">Customer</th><th className="p-4">Service</th><th className="p-4">Vendor</th><th className="p-4">Timeline</th><th className="p-4">Payment</th><th className="p-4">Value</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id} className="border-t hover:bg-slate-50"><td className="p-4"><b className="text-primary">{project.project_number}</b><p className="mt-1 font-semibold text-slate-700">{project.name}</p></td><td className="p-4"><b>{project.opportunity?.name}</b><p className="mt-1 text-[10px] text-slate-500">{project.opportunity?.company_name || project.opportunity?.email}</p></td><td className="p-4">{project.service?.name || '—'}</td><td className="p-4">{project.vendor?.company_name || project.vendor?.name}</td><td className="p-4"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-primary"/>{new Date(project.start_date).toLocaleDateString()}</span><p className="mt-1 text-[10px] text-slate-500">Due {new Date(project.delivery_due_date).toLocaleDateString()} · {project.delivery_duration || project.delivery_days} {project.delivery_unit || 'days'}</p></td><td className="p-4"><b>{project.payment_model === 'subscription' ? 'Subscription' : 'One-time'}</b>{project.billing_frequency && <p className="mt-1 text-[10px] text-slate-500">{cycleLabels[project.billing_frequency]}</p>}</td><td className="p-4 font-bold">{project.contract_value ? `${project.currency || 'PKR'} ${Number(project.contract_value).toLocaleString()}` : '—'}</td><td className="p-4"><ProjectStatusMenu project={project} loading={updatingStatus === project.id} onChange={(nextStatus) => requestStatusChange(project, nextStatus)}/>{project.status_reason && <p title={project.status_reason} className="mt-1 max-w-32 truncate text-[9px] text-slate-500">{project.status_reason}</p>}</td><td className="p-4"><button onClick={() => { setError(''); setModal(project) }} className="h-8 rounded-md border border-primary px-3 font-semibold text-primary">Edit</button></td></tr>)}{!projects.length && <tr><td colSpan="9" className="p-12 text-center text-slate-500">No projects found. Mark an opportunity as Won, then create its project.</td></tr>}</tbody></table></div><div className="flex items-center justify-between border-t p-4 text-xs text-slate-500"><span>Showing {meta.from || 0}–{meta.to || 0} of {meta.total || 0}</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="grid h-8 w-8 place-items-center rounded-md border disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button><span>Page {meta.current_page || 1} of {meta.last_page || 1}</span><button disabled={page >= (meta.last_page || 1)} onClick={() => setPage(page + 1)} className="grid h-8 w-8 place-items-center rounded-md border disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button></div></div></div>}
    {modal !== undefined && <ProjectModal opportunities={opportunities} project={modal} saving={saving} error={error} onClose={() => setModal(undefined)} onSave={save}/>} {pendingStatus && <StatusReasonModal pending={pendingStatus} saving={updatingStatus === pendingStatus.project.id} error={error} onCancel={() => { if (!updatingStatus) { setPendingStatus(null); setError('') } }} onConfirm={(reason) => changeStatus(pendingStatus.project, pendingStatus.status, reason)}/>}</section>
}

function Stat({ label, value, tone = 'text-slate-900' }) { return <div className="rounded-xl border bg-white p-4"><span className="text-xs text-slate-500">{label}</span><b className={`mt-1 block text-2xl ${tone}`}>{value}</b></div> }

function StatusChips({ active, counts, onChange }) { return <div className="mt-5 flex flex-wrap gap-2 rounded-xl border bg-white p-3"><button type="button" onClick={() => onChange('')} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${!active ? 'border-primary bg-primary text-white' : 'bg-white text-slate-600 hover:border-primary'}`}>All <span className="ml-1 opacity-75">{Object.values(counts).reduce((total, count) => total + Number(count || 0), 0)}</span></button>{projectStatuses.map((item) => <button key={item} type="button" onClick={() => onChange(item)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${active === item ? 'border-primary ring-2 ring-blue-100' : 'border-transparent'} ${statusTones[item]}`}>{statusLabels[item]} <span className="ml-1 opacity-75">{counts[item] || 0}</span></button>)}</div> }

function ProjectStatusMenu({ project, loading, onChange }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const toggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const menuHeight = 196
      const opensAbove = rect.bottom + menuHeight + 8 > window.innerHeight
      setPosition({
        top: opensAbove ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6,
        left: Math.max(8, Math.min(rect.right - 176, window.innerWidth - 184)),
      })
    }
    setOpen((current) => !current)
  }

  useEffect(() => {
    if (!open) return undefined
    const closeOutside = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false)
    }
    const closeMenu = () => setOpen(false)
    document.addEventListener('mousedown', closeOutside)
    window.addEventListener('resize', closeMenu)
    window.addEventListener('scroll', closeMenu, true)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      window.removeEventListener('resize', closeMenu)
      window.removeEventListener('scroll', closeMenu, true)
    }
  }, [open])

  return <>
    <button ref={triggerRef} type="button" disabled={loading} aria-label={`Update status for ${project.name}`} aria-haspopup="listbox" aria-expanded={open} onClick={toggle} className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10px] font-bold transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-wait disabled:opacity-60 ${statusTones[project.status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${statusDots[project.status]}`}/>
      <span>{loading ? 'Saving…' : statusLabels[project.status]}</span>
      <ChevronDown className={`h-3 w-3 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}/>
    </button>
    {open && createPortal(<div ref={menuRef} role="listbox" style={{ top: position.top, left: position.left }} className="fixed z-[200] w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-overlay">
      {projectStatuses.map((item) => <button key={item} type="button" role="option" aria-selected={item === project.status} onClick={() => { setOpen(false); onChange(item) }} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2.5 text-left text-[11px] font-semibold transition hover:bg-slate-50 ${item === project.status ? 'bg-blue-50 text-primary' : 'text-slate-600'}`}>
        <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${statusDots[item]}`}/>{statusLabels[item]}</span>
        {item === project.status && <Check className="h-3.5 w-3.5"/>}
      </button>)}
    </div>, document.body)}
  </>
}
