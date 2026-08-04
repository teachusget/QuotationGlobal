import { NavLink } from 'react-router-dom'

export default function SidebarItem({ item, collapsed = false, onNavigate, nested = false }) {
  const Icon = item.icon
  return <NavLink end to={item.path} onClick={onNavigate} title={collapsed ? item.label : undefined} className={({ isActive }) => `flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] transition-colors ${collapsed ? 'justify-center' : ''} ${nested && !collapsed ? 'ml-5 mr-0.5 pl-3 text-[12px]' : ''} ${isActive ? nested ? 'bg-white font-medium text-primary ring-2 ring-inset ring-primary' : 'bg-blue-50 font-medium text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}><Icon className={`${nested ? 'h-3.5 w-3.5' : 'h-4 w-4'} shrink-0`}/><span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span></NavLink>
}
