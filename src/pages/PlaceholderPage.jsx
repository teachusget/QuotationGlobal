import { useLocation } from 'react-router-dom'
import { allNavigation } from '../data/navigation'

export default function PlaceholderPage() { const { pathname } = useLocation(); const title = allNavigation.find((item) => item.path === pathname)?.label || 'Page'; return <section><div className="mb-5"><h1 className="text-xl font-bold">{title}</h1><p className="mt-1 text-sm text-slate-500">Header, sidebar and footer layout completed.</p></div><div className="flex min-h-48 items-center justify-center rounded-lg border bg-white p-6 text-center shadow-subtle"><div><h2 className="text-sm font-semibold">{title} content</h2><p className="mt-1 text-xs text-slate-500">This module will be added in a future phase.</p></div></div></section> }
