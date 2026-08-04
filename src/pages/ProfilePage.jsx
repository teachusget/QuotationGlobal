import { BadgeCheck, Mail, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { updateMyProfile } from '../api/auth'
import { useAuth } from '../auth/useAuth'
import AccountNavigation from '../components/account/AccountNavigation'
import { Alert, Badge, Button, Card, FieldError, PageHeader } from '../components/ui'

const Field = ({ label, error, ...props }) => <label className="block text-xs font-semibold text-slate-700">{label}<input {...props} className="mt-1.5 h-11 w-full rounded-lg border bg-white px-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"/><FieldError>{error}</FieldError></label>

export default function ProfilePage() {
  const { user, updateCurrentUser } = useAuth()
  const [form, setForm] = useState({ name: '', username: '', phone: '' })
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('')
  useEffect(() => setForm({ name: user?.name || '', username: user?.username || '', phone: user?.phone || '' }), [user])
  const save = async (event) => { event.preventDefault(); setSaving(true); setError(''); setMessage(''); try { const result = await updateMyProfile(form); updateCurrentUser(result.user); setMessage(result.message) } catch (err) { setError(err.message) } finally { setSaving(false) } }
  const initials = (user?.name || 'User').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  return <section><PageHeader eyebrow="Account" title="My Profile" description="Manage your personal identity and contact details."/><div className="mt-6 grid gap-5 lg:grid-cols-[220px_minmax(0,720px)]"><AccountNavigation/><div className="space-y-5"><Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-bold text-white">{initials}</span><div className="min-w-0"><h2 className="truncate text-lg font-semibold text-slate-950">{user?.name}</h2><p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500"><Mail className="h-3.5 w-3.5"/>{user?.email}</p><div className="mt-2 flex flex-wrap gap-1.5"><Badge tone="primary" className="capitalize">{user?.account_type}</Badge>{user?.roles?.map((role) => <Badge key={role.id}>{role.name}</Badge>)}{user?.email_verified_at && <Badge tone="success"><BadgeCheck className="mr-1 h-3 w-3"/>Verified</Badge>}</div></div></Card><Card className="p-5 sm:p-6"><h2 className="text-base font-semibold">Personal information</h2><p className="mt-1 text-xs text-slate-500">Your email address is managed as your secure sign-in identity.</p>{error && <Alert className="mt-4">{error}</Alert>}{message && <Alert tone="success" className="mt-4">{message}</Alert>}<form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Full name" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}/><Field label="Username" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}/><Field label="Phone number" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}/><Field label="Email address" type="email" value={user?.email || ''} disabled className="disabled:bg-slate-50"/><div className="sm:col-span-2 flex justify-end border-t pt-4"><Button type="submit" icon={Save} loading={saving}>Save profile</Button></div></form></Card></div></div></section>
}
