import { LoaderCircle, MoreHorizontal, SearchX } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

const cx = (...values) => values.filter(Boolean).join(' ')

export function Spinner({ className = '' }) { return <LoaderCircle aria-hidden="true" className={cx('h-4 w-4 animate-spin', className)}/> }

export function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, children, className = '', disabled, ...props }) {
  const variants = { primary: 'border-transparent bg-primary text-white shadow-sm hover:bg-blue-700 hover:shadow-floating', secondary: 'border-slate-300 bg-white text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-primary', ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900', danger: 'border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50' }
  const sizes = { sm: 'h-9 px-3 text-xs', md: 'h-10 px-4 text-[13px]', lg: 'h-11 px-5 text-sm' }
  return <button disabled={disabled || loading} aria-busy={loading || undefined} className={cx('inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border font-semibold transition-all duration-180 active:translate-y-px disabled:pointer-events-none disabled:opacity-55', variants[variant], sizes[size], className)} {...props}>{loading ? <Spinner/> : Icon ? <Icon className="h-4 w-4"/> : null}<span>{children}</span></button>
}

export function IconButton({ label, variant = 'ghost', className = '', children, ...props }) { return <button aria-label={label} title={label} className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-transparent text-slate-500 transition-all duration-180 hover:bg-slate-100 hover:text-slate-900 active:scale-95', variant === 'danger' && 'hover:bg-red-50 hover:text-red-600', className)} {...props}>{children}</button> }

export function ActionMenu({ label = 'Open actions', actions = [], align = 'right' }) {
  const [open, setOpen] = useState(false); const root = useRef(null)
  useEffect(() => { if (!open) return undefined; const close = (event) => { if (event.key === 'Escape' || (event.type === 'mousedown' && !root.current?.contains(event.target))) setOpen(false) }; document.addEventListener('mousedown', close); document.addEventListener('keydown', close); return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) } }, [open])
  return <div ref={root} className="relative inline-flex"><IconButton label={label} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((current) => !current)}><MoreHorizontal className="h-4 w-4"/></IconButton>{open && <div role="menu" className={cx('absolute top-11 z-30 w-48 overflow-hidden rounded-xl border bg-white py-1 shadow-floating', align === 'right' ? 'right-0' : 'left-0')}>{actions.filter(Boolean).map(({ label: actionLabel, icon: Icon, tone, onClick, disabled, title }) => <button key={actionLabel} type="button" role="menuitem" disabled={disabled} title={title} onClick={() => { setOpen(false); onClick?.() }} className={cx('flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40', tone === 'danger' && 'text-red-600 hover:bg-red-50', tone === 'success' && 'text-emerald-700 hover:bg-emerald-50')}>{Icon && <Icon className="h-4 w-4 shrink-0"/>}{actionLabel}</button>)}</div>}</div>
}

export function PageHeader({ eyebrow, title, description, icon: Icon, actions, stats, className = '' }) { return <header className={cx('ui-page-header', className)}><div className="min-w-0"><div className="ui-eyebrow">{Icon && <Icon className="h-4 w-4"/>}{eyebrow}</div><h1 className="ui-page-title">{title}</h1>{description && <p className="ui-page-description">{description}</p>}</div>{(stats || actions) && <div className="flex shrink-0 flex-wrap items-center gap-3">{stats}{actions}</div>}</header> }
export function Card({ interactive = false, className = '', children, ...props }) { return <div className={cx('ui-card', interactive && 'ui-card-interactive', className)} {...props}>{children}</div> }
export function Toolbar({ className = '', children }) { return <div className={cx('ui-toolbar', className)}>{children}</div> }
export function Alert({ tone = 'danger', children, className = '' }) { const tones = { danger: 'border-red-200 bg-red-50 text-red-700', success: 'border-emerald-200 bg-emerald-50 text-emerald-700', info: 'border-blue-200 bg-blue-50 text-blue-700', warning: 'border-amber-200 bg-amber-50 text-amber-700' }; return <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('rounded-lg border px-4 py-3 text-[13px] leading-5', tones[tone], className)}>{children}</div> }
export function Badge({ tone = 'neutral', children, className = '' }) { const tones = { neutral: 'bg-slate-100 text-slate-600', primary: 'bg-blue-50 text-primary', success: 'bg-emerald-50 text-emerald-700', warning: 'bg-amber-50 text-amber-700', danger: 'bg-red-50 text-red-700' }; return <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none', tones[tone], className)}>{children}</span> }
export function FieldError({ children }) { return children ? <p role="alert" className="mt-1.5 text-xs text-red-600">{children}</p> : null }

export function Skeleton({ className = '' }) { return <span aria-hidden="true" className={cx('ui-skeleton block rounded-md', className)}/> }
export function TableSkeleton({ rows = 6, columns = 5 }) { return <div role="status" aria-label="Loading table" className="overflow-hidden rounded-xl border bg-white"><div className="grid gap-4 border-b bg-slate-50 px-4 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }, (_, index) => <Skeleton key={index} className="h-3 w-2/3"/>)}</div>{Array.from({ length: rows }, (_, row) => <div key={row} className="grid gap-4 border-b px-4 py-4 last:border-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }, (_, column) => <Skeleton key={column} className={cx('h-3', column === 0 ? 'w-4/5' : 'w-2/3')}/>)}</div>)}</div> }
export function CardGridSkeleton({ cards = 6 }) { return <div role="status" aria-label="Loading content" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: cards }, (_, index) => <Card key={index} className="flex gap-4 p-5"><Skeleton className="h-14 w-14 shrink-0"/><div className="flex-1"><Skeleton className="h-4 w-2/3"/><Skeleton className="mt-3 h-3 w-full"/><Skeleton className="mt-2 h-3 w-1/2"/></div></Card>)}</div> }
export function EmptyState({ icon: Icon = SearchX, title, description, action, className = '' }) { return <div className={cx('grid min-h-52 place-items-center p-8 text-center', className)}><div className="max-w-sm"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400"><Icon className="h-5 w-5"/></span><h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>{description && <p className="mt-1.5 text-[13px] leading-5 text-slate-500">{description}</p>}{action && <div className="mt-4">{action}</div>}</div></div> }
export function BrandedLoader() { return <div role="status" className="grid min-h-screen place-items-center bg-canvas"><div className="text-center"><span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-lg font-bold text-white shadow-floating">Q<span className="absolute inset-[-5px] animate-spin rounded-[1.25rem] border-2 border-transparent border-t-primary"/></span><p className="mt-4 text-sm font-medium text-slate-600">Preparing your workspace</p></div></div> }

export function Modal({ open, onClose, title, description, size = 'md', children, footer }) {
  const panel = useRef(null); const previousFocus = useRef(null); const closeRef = useRef(onClose); const titleId = useId()
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return undefined
    previousFocus.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => panel.current?.querySelector('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')?.focus())
    const keydown = (event) => {
      if (event.key === 'Escape') closeRef.current()
      if (event.key !== 'Tab') return
      const nodes = [...panel.current.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      if (!nodes.length) return
      const first = nodes[0]; const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown); previousFocus.current?.focus() }
  }, [open])
  if (!open) return null
  return <div className="fixed inset-0 z-[120] grid items-end overflow-y-auto bg-slate-950/60 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cx('flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl border bg-white shadow-overlay sm:max-h-[92vh] sm:rounded-2xl', sizes[size])}><header className="flex shrink-0 items-start justify-between gap-4 border-b px-4 py-4 sm:px-6"><div><h2 id={titleId} className="text-lg font-semibold text-slate-950">{title}</h2>{description && <p className="mt-1 text-[13px] text-slate-500">{description}</p>}</div><IconButton label="Close dialog" onClick={onClose}>×</IconButton></header><div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>{footer && <footer className="flex shrink-0 flex-col-reverse gap-2 border-t bg-slate-50 px-4 py-4 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6">{footer}</footer>}</section></div>
}

export function DataTable({ columns, rows, rowKey = 'id', loading, empty, renderCell, renderMobile, className = '' }) {
  if (loading) return <TableSkeleton columns={columns.length}/>
  if (!rows.length) return empty
  return <>{renderMobile && <div className="grid gap-3 md:hidden">{rows.map((row) => <Card key={row[rowKey]} className="p-4">{renderMobile(row)}</Card>)}</div>}<div className={cx('ui-table-shell overflow-x-auto', renderMobile && 'hidden md:block', className)}><table className="w-full text-left"><thead className="bg-slate-50"><tr>{columns.map((column) => <th key={column.key} className={column.className}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row[rowKey]}>{columns.map((column) => <td key={column.key} className={column.cellClassName}>{renderCell ? renderCell(row, column) : row[column.key]}</td>)}</tr>)}</tbody></table></div></>
}

export function Pagination({ current = 1, last = 1, onChange, from, to, total, pageSize, onPageSizeChange }) {
  if (last <= 1 && !onPageSizeChange) return null
  const pages = Array.from(new Set([1, current - 1, current, current + 1, last].filter((page) => page >= 1 && page <= last))).sort((a, b) => a - b)
  return <nav aria-label="Pagination" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs text-slate-500">{total != null ? `Showing ${from || 0}–${to || 0} of ${total}` : `Page ${current} of ${last}`}</div><div className="flex flex-wrap items-center gap-1">{onPageSizeChange && <select aria-label="Rows per page" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="mr-2 h-9 rounded-lg border px-2 text-xs"><option value="10">10 / page</option><option value="25">25 / page</option><option value="50">50 / page</option></select>}<Button variant="secondary" size="sm" disabled={current <= 1} onClick={() => onChange(current - 1)}>Previous</Button>{pages.map((page, index) => <span key={page} className="contents">{index > 0 && page - pages[index - 1] > 1 && <span className="px-1 text-slate-400">…</span>}<button type="button" aria-current={page === current ? 'page' : undefined} onClick={() => onChange(page)} className={cx('grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-xs font-semibold', page === current ? 'border-primary bg-primary text-white' : 'bg-white text-slate-600 hover:border-blue-300')}>{page}</button></span>)}<Button variant="secondary" size="sm" disabled={current >= last} onClick={() => onChange(current + 1)}>Next</Button></div></nav>
}
