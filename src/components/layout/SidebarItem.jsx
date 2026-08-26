import { NavLink } from 'react-router-dom'
import { FolderKanban } from 'lucide-react'
import { prefetchRoute } from '../../routes/prefetch'

export default function SidebarItem({ item, collapsed = false, onNavigate, nested = false }) {
  const Icon = item.icon
  const label = item.path === '/crm/sales' ? 'Opportunities' : item.label
  const preload = () => prefetchRoute(item.path)
  const link = <NavLink
    end
    to={item.path}
    onClick={onNavigate}
    onMouseEnter={preload}
    onFocus={preload}
    onTouchStart={preload}
    title={collapsed ? label : undefined}
    className={({ isActive }) => `flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-all duration-180 ${collapsed ? 'justify-center px-0' : ''} ${nested && !collapsed ? 'ml-5 mr-0.5 h-9 pl-3 text-xs' : ''} ${isActive ? 'bg-blue-50 text-primary shadow-sm ring-1 ring-inset ring-blue-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
  ><Icon className={`${nested ? 'h-3.5 w-3.5' : 'h-[17px] w-[17px]'} shrink-0`}/><span className={collapsed ? 'sr-only' : 'truncate'}>{label}</span></NavLink>
  if (item.path !== '/crm/sales' || !nested) return link
  return <>{link}<NavLink end to="/crm/projects" onClick={onNavigate} onMouseEnter={() => prefetchRoute('/crm/projects')} onFocus={() => prefetchRoute('/crm/projects')} className={({ isActive }) => `ml-5 mr-0.5 flex h-9 items-center gap-2.5 rounded-lg px-3 pl-3 text-xs font-medium transition-all ${isActive ? 'bg-blue-50 text-primary shadow-sm ring-1 ring-inset ring-blue-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}><FolderKanban className="h-3.5 w-3.5 shrink-0"/><span className="truncate">Projects</span></NavLink></>
}
