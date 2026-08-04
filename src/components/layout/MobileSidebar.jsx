import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import BrandLogo from '../common/BrandLogo'
import Sidebar from './Sidebar'

export default function MobileSidebar({ open, onClose }) {
  const location = useLocation()
  useEffect(() => { onClose() }, [location.pathname, onClose])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; const escape = (event) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', escape); return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', escape) } }, [open, onClose])
  return <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}><button aria-label="Close navigation" onClick={onClose} className={`absolute inset-0 bg-slate-950/35 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}/><div className={`relative h-full w-[255px] bg-white shadow-floating transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}><div className="flex h-16 items-center justify-between border-b px-4"><BrandLogo/><button onClick={onClose} className="rounded-md p-2 hover:bg-slate-100" aria-label="Close navigation"><X className="h-5 w-5"/></button></div><div className="h-[calc(100%-4rem)]"><Sidebar mobile onNavigate={onClose}/></div></div></div>
}
