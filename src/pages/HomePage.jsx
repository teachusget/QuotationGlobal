import { AlertTriangle, ArrowRight, Boxes, BriefcaseBusiness, ClipboardList, FileText, PackageCheck, Paintbrush, Plus, RefreshCw, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../api/dashboard'
import { useAuth } from '../auth/useAuth'
import { Alert, Badge, Button, Card, PageHeader, Skeleton } from '../components/ui'

const icons = { vendors: BriefcaseBusiness, customers: UsersRound, services: Boxes, rfqs: FileText, demos: ClipboardList, orders: PackageCheck }
const quickActions = [
  { label: 'Add vendor', path: '/vendors', permission: 'vendors.create', icon: BriefcaseBusiness },
  { label: 'Add solution', path: '/services', permission: 'services.create', icon: Plus },
  { label: 'Review RFQs', path: '/rfqs', permission: 'rfqs.view', icon: FileText },
  { label: 'Manage inventory', path: '/inventory', permission: 'services.view', icon: Boxes },
  { label: 'Marketplace Builder', path: '/marketplace-builder', permission: 'marketplace_builder.view', icon: Paintbrush },
]

export default function HomePage() {
  const { can } = useAuth(); const [data, setData] = useState(null); const [generatedAt, setGeneratedAt] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const load = () => { setLoading(true); setError(''); getDashboard().then((result) => { setData(result.data); setGeneratedAt(result.generated_at) }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)) }
  useEffect(load, [])
  const totalPipeline = (data?.pipeline || []).reduce((sum, item) => sum + item.count, 0)
  const visibleActions = quickActions.filter((item) => can(item.permission))

  return <section aria-labelledby="page-title">
    <PageHeader eyebrow="Workspace overview" title="Admin Dashboard" description="Monitor operations, resolve priority work and track the RFQ lifecycle." actions={<Button variant="secondary" icon={RefreshCw} loading={loading} onClick={load}>Refresh</Button>}/>
    {error && <Alert className="mt-5">{error}</Alert>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{loading ? Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl"/>) : data?.kpis.map((item) => { const Icon = icons[item.key] || Boxes; return <Link key={item.key} to={item.path} className="group rounded-xl border bg-white p-4 shadow-subtle transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-floating"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-primary"><Icon className="h-5 w-5"/></span><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary"/></div><p className="mt-4 text-2xl font-bold text-slate-950">{Number(item.value).toLocaleString()}</p><p className="mt-1 text-xs font-semibold text-slate-500">{item.label}</p></Link> })}</div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_1.4fr]">
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="text-sm font-bold">Action required</h2><p className="mt-1 text-xs text-slate-500">Operational items needing attention</p></div><AlertTriangle className="h-5 w-5 text-amber-500"/></div><div className="divide-y">{loading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-10"/>)}</div> : data?.attention.map((item) => <Link key={item.key} to={item.path} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50"><span className={`grid h-9 min-w-9 place-items-center rounded-lg text-sm font-bold ${item.count ? item.tone === 'danger' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.count}</span><span className="min-w-0 flex-1 text-xs font-semibold text-slate-700">{item.label}</span><ArrowRight className="h-4 w-4 text-slate-300"/></Link>)}</div></Card>
      <Card className="overflow-hidden"><div className="border-b px-5 py-4"><h2 className="text-sm font-bold">RFQ pipeline</h2><p className="mt-1 text-xs text-slate-500">Select a stage to view matching RFQs</p></div><div className="grid gap-3 p-5 sm:grid-cols-4">{loading ? [1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28"/>) : data?.pipeline.map((item, index) => { const width = totalPipeline ? Math.max(8, Math.round(item.count / totalPipeline * 100)) : 0; return <Link key={item.status} to={`/rfqs?status=${item.status}`} aria-label={`View ${item.count} ${item.label}`} className="group relative rounded-xl border bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-floating focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><span className="text-[10px] font-bold uppercase tracking-wider text-primary">Stage {index + 1}</span><div className="mt-2 flex items-center justify-between"><p className="text-2xl font-bold">{item.count}</p><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary"/></div><p className="mt-1 text-xs font-semibold text-slate-600 group-hover:text-primary">{item.label}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-primary" style={{ width: `${width}%` }}/></div></Link> })}</div></Card>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="text-sm font-bold">Recent activity</h2><p className="mt-1 text-xs text-slate-500">Latest RFQ, demo and order updates</p></div>{generatedAt && <span className="text-[10px] text-slate-400">Updated {new Date(generatedAt).toLocaleTimeString()}</span>}</div><div className="divide-y">{loading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12"/>)}</div> : data?.recent?.length ? data.recent.map((item) => <Link key={item.id} to={item.path} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50"><Badge tone={item.type === 'Order' ? 'success' : 'primary'}>{item.type}</Badge><span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-800">{item.title}</b><span className="mt-0.5 block truncate text-[11px] capitalize text-slate-500">{item.detail}</span></span><time className="hidden text-[10px] text-slate-400 sm:block">{item.time ? new Date(item.time).toLocaleString() : ''}</time></Link>) : <p className="p-10 text-center text-xs text-slate-500">No recent operational activity.</p>}</div></Card>
      <Card className="h-fit overflow-hidden"><div className="border-b px-5 py-4"><h2 className="text-sm font-bold">Quick actions</h2><p className="mt-1 text-xs text-slate-500">Common administration tasks</p></div><div className="grid gap-2 p-4">{visibleActions.map(({ label, path, icon: Icon }) => <Link key={label} to={path} className="flex min-h-11 items-center gap-3 rounded-lg border px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-primary"><Icon className="h-4 w-4"/><span className="flex-1">{label}</span><ArrowRight className="h-4 w-4 text-slate-300"/></Link>)}</div></Card>
    </div>
  </section>
}
