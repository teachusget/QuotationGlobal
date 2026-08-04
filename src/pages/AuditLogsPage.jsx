import { ClipboardList, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getAuditLogs } from '../api/rbac'
import { Alert, Button, EmptyState, PageHeader, Pagination, TableSkeleton, Toolbar } from '../components/ui'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [query, setQuery] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(30)
  const [meta, setMeta] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = (background = false) => {
    background ? setRefreshing(true) : setLoading(true)
    setError('')
    return getAuditLogs({ action, page, per_page: pageSize }).then((result) => { setLogs(result.data || []); setMeta(result) }).catch((requestError) => setError(requestError.message)).finally(() => { setLoading(false); setRefreshing(false) })
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [action, page, pageSize])

  return <section>
    <PageHeader eyebrow="Security" icon={ClipboardList} title="Audit Log" description="Append-only history of user, role and permission changes."/>
    <Toolbar className="mt-6"><form onSubmit={(event) => { event.preventDefault(); setPage(1); setAction(query.trim()) }} className="flex w-full max-w-xl gap-2"><label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter action, e.g. user.updated…" className="w-full rounded-lg border pl-9 pr-3"/></label><Button type="submit" variant="secondary">Filter</Button></form>{action && <Button variant="ghost" onClick={() => { setQuery(''); setAction(''); setPage(1) }}>Clear</Button>}{refreshing && <span className="text-xs text-slate-400">Refreshing…</span>}</Toolbar>
    {error && <Alert className="mt-4">{error}<button type="button" onClick={() => load()} className="ml-2 font-semibold underline">Retry</button></Alert>}
    {loading ? <div className="mt-5"><TableSkeleton columns={6}/></div> : logs.length ? <div className="mt-5 ui-table-shell overflow-x-auto"><table className="audit-data-table w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50"><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>IP</th><th>Changes</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td className="whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td><td>{log.actor?.name || 'System'}<p className="text-[11px] text-slate-400">{log.actor?.email}</p></td><td className="font-semibold">{log.action}</td><td>{log.target_type.split('\\').pop()} #{log.target_id}</td><td>{log.ip_address || '—'}</td><td><details><summary className="cursor-pointer font-semibold text-primary">View snapshot</summary><pre className="mt-2 max-w-md overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] text-slate-100">{JSON.stringify({ before: log.before, after: log.after }, null, 2)}</pre></details></td></tr>)}</tbody></table></div> : <EmptyState icon={ClipboardList} title="No audit entries" description={action ? 'No activity matches the selected filter.' : 'RBAC and user-management activity will appear here.'}/>} 
    {!loading && <Pagination current={meta.current_page || 1} last={meta.last_page || 1} from={meta.from} to={meta.to} total={meta.total} pageSize={pageSize} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} onChange={setPage}/>} 
  </section>
}
