import { Building2, Settings, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  ['/profile', 'My Profile', UserRound],
  ['/company-profile', 'Company Profile', Building2],
  ['/account-settings', 'Account Settings', Settings],
]

export default function AccountNavigation() {
  return <nav aria-label="Account pages" className="flex gap-1 overflow-x-auto rounded-xl border bg-white p-1.5 lg:flex-col lg:p-2">{items.map(([path, label, Icon]) => <NavLink key={path} to={path} className={({ isActive }) => `flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-xs font-semibold transition ${isActive ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon className="h-4 w-4"/>{label}</NavLink>)}</nav>
}
