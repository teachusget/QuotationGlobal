import { NavLink } from 'react-router-dom'

export default function SidebarItem({ item, collapsed = false, onNavigate, nested = false }) {
  const Icon = item.icon
  return <NavLink end to={item.path} onClick={onNavigate} title={collapsed ? item.label : undefined} className={({ isActive }) => `flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-all duration-180 ${collapsed ? 'justify-center px-0' : ''} ${nested && !collapsed ? 'ml-5 mr-0.5 h-9 pl-3 text-xs' : ''} ${isActive ? 'bg-blue-50 text-primary shadow-sm ring-1 ring-inset ring-blue-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}><Icon className={`${nested ? 'h-3.5 w-3.5' : 'h-[17px] w-[17px]'} shrink-0`}/><span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span></NavLink>
}
