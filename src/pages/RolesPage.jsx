import { AlertTriangle, CheckSquare2, LockKeyhole, Plus, Search, Shield, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { deleteRole, getPermissions, getRoles, saveRole } from '../api/rbac'
import { useAuth } from '../auth/useAuth'
import { Alert, Button, Card, CardGridSkeleton, EmptyState, Modal, PageHeader } from '../components/ui'

const permissionLabel = (name) => (name.split('.')[1] || name).replaceAll('_', ' ')
const sensitiveActions = ['delete', 'deactivate', 'assign_roles', 'manage_permissions', 'impersonate', 'reset_password', 'block']

export default function RolesPage() {
  const { can } = useAuth()
  const [roles, setRoles] = useState([])
  const [groups, setGroups] = useState({})
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState([])
  const [initial, setInitial] = useState({ name: '', permissions: [] })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    return Promise.all([getRoles(), getPermissions()])
      .then(([roleResult, permissionResult]) => {
        setRoles(roleResult.data || [])
        setGroups(permissionResult.data || {})
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const dirty = open && (name !== initial.name || [...selected].sort().join('|') !== [...initial.permissions].sort().join('|'))
  useEffect(() => {
    if (!dirty) return undefined
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const closeEditor = () => {
    if (dirty && !window.confirm('Discard your unsaved role changes?')) return
    setOpen(false)
  }

  const edit = (role = null) => {
    const permissions = (role?.permissions || []).map((permission) => permission.name)
    setEditing(role)
    setName(role?.name || '')
    setSelected(permissions)
    setInitial({ name: role?.name || '', permissions })
    setQuery('')
    setError('')
    setOpen(true)
  }

  const filteredGroups = useMemo(() => Object.fromEntries(Object.entries(groups).map(([group, permissions]) => [group, permissions.filter((permission) => `${group} ${permission.name}`.toLowerCase().includes(query.toLowerCase()))]).filter(([, permissions]) => permissions.length)), [groups, query])
  const toggle = (permission) => setSelected((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission])
  const toggleGroup = (permissions) => {
    const names = permissions.map((permission) => permission.name)
    const allSelected = names.every((permission) => selected.includes(permission))
    setSelected((current) => allSelected ? current.filter((permission) => !names.includes(permission)) : [...new Set([...current, ...names])])
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await saveRole(editing, { name: name.trim(), permissions: selected })
      setInitial({ name: name.trim(), permissions: selected })
      setOpen(false)
      await load()
      await Swal.fire({ icon: 'success', title: 'Role saved', timer: 1200, showConfirmButton: false })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (role) => {
    const confirmation = await Swal.fire({ title: `Delete ${role.name}?`, text: 'This cannot be undone. Assigned roles must be cleared first.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete role', confirmButtonColor: '#dc2626' })
    if (!confirmation.isConfirmed) return
    try { await deleteRole(role.id); await load() } catch (requestError) { await Swal.fire('Unable to delete', requestError.message, 'error') }
  }

  return <section>
    <PageHeader eyebrow="Access control" title="Roles & Permissions" description="Build reusable access profiles and control exactly which actions each role can perform." actions={can('roles.create') && <Button icon={Plus} onClick={() => edit()}>New role</Button>}/>
    {error && !open && <Alert variant="error" className="mt-5">{error}<button type="button" onClick={load} className="ml-2 font-semibold underline">Retry</button></Alert>}
    {loading ? <div className="mt-6"><CardGridSkeleton/></div> : roles.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{roles.map((role) => <Card key={role.id} className="flex min-w-0 flex-col p-5">
      <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-primary"><Shield className="h-5 w-5"/></span>{role.is_system && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-amber-700"><LockKeyhole className="h-3 w-3"/>System</span>}</div>
      <h2 className="mt-4 text-base font-semibold text-slate-950">{role.name}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5"/>{role.users_count} users</span><span className="inline-flex items-center gap-1.5"><CheckSquare2 className="h-3.5 w-3.5"/>{role.permissions?.length || 0} permissions</span></div>
      <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">{can('roles.update') && <Button size="sm" variant="secondary" disabled={role.name === 'Super Admin'} onClick={() => edit(role)}>Edit permissions</Button>}{can('roles.delete') && !role.is_system && <Button size="sm" variant="danger" onClick={() => remove(role)}>Delete</Button>}</div>
    </Card>)}</div> : <div className="mt-6"><EmptyState icon={Shield} title="No roles configured" description="Create the first custom role to give users controlled access." action={can('roles.create') && <Button icon={Plus} onClick={() => edit()}>Create role</Button>}/></div>}

    <Modal open={open} onClose={closeEditor} title={editing ? `Edit ${editing.name}` : 'Create role'} description="Permissions from multiple assigned roles are combined." size="xl" footer={<><Button variant="secondary" onClick={closeEditor}>Cancel</Button><Button form="role-editor" type="submit" loading={saving} disabled={!name.trim() || !selected.length}>{saving ? 'Saving role' : 'Save role'}</Button></>}>
      <form id="role-editor" onSubmit={submit}>
        {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
        <label className="block text-xs font-semibold text-slate-700">Role name<input value={name} onChange={(event) => setName(event.target.value)} required disabled={editing?.is_system} className="mt-1.5 w-full rounded-lg border px-3 disabled:bg-slate-100"/></label>
        <div className="sticky top-0 z-10 -mx-1 mt-5 rounded-xl border bg-white/95 p-3 backdrop-blur"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search permissions…" className="w-full rounded-lg border pl-9 pr-3"/></label><div className="shrink-0 text-xs font-medium text-slate-500"><span className="font-semibold text-primary">{selected.length}</span> selected</div></div></div>
        <div className="mt-4 space-y-4">{Object.entries(filteredGroups).map(([group, permissions]) => {
          const selectedCount = permissions.filter((permission) => selected.includes(permission.name)).length
          return <fieldset key={group} className="overflow-hidden rounded-xl border"><legend className="sr-only">{group} permissions</legend><div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3"><div><h3 className="text-sm font-semibold capitalize text-slate-900">{group.replaceAll('_', ' ')}</h3><p className="mt-0.5 text-[11px] text-slate-500">{selectedCount} of {permissions.length} selected</p></div><button type="button" onClick={() => toggleGroup(permissions)} className="text-xs font-semibold text-primary hover:underline">{selectedCount === permissions.length ? 'Clear module' : 'Select module'}</button></div><div className="grid gap-1 p-2 sm:grid-cols-2 lg:grid-cols-3">{permissions.map((permission) => {
            const action = permission.name.split('.')[1] || permission.name
            const sensitive = sensitiveActions.includes(action)
            return <label key={permission.id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-xs transition ${selected.includes(permission.name) ? 'border-blue-200 bg-blue-50 text-primary' : 'border-transparent hover:bg-slate-50'} ${sensitive ? 'font-semibold' : ''}`}><input type="checkbox" checked={selected.includes(permission.name)} onChange={() => toggle(permission.name)} className="h-4 w-4 rounded accent-primary"/><span className="min-w-0 flex-1 capitalize">{permissionLabel(permission.name)}</span>{sensitive && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500"/>}</label>
          })}</div></fieldset>
        })}{!Object.keys(filteredGroups).length && <EmptyState icon={Search} title="No matching permissions" description="Try a different module or action name."/>}</div>
      </form>
    </Modal>
  </section>
}
