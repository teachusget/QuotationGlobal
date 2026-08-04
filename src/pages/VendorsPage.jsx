import { BriefcaseBusiness, Building2, ChevronDown, LogIn, Pencil, Plus, Trash2, UserRound, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { createVendor, deleteVendor, getVendors, loginAsVendor, updateVendor } from '../api/vendors'
import VendorModal from '../components/vendors/VendorModal'
import { useAuth } from '../auth/useAuth'
import { beginVendorImpersonation } from '../auth/session'

const registrationOptions = [
  { type: 'freelancer', label: 'For Freelancer', description: 'Register an individual freelancer.', icon: UserRound },
  { type: 'agency', label: 'As an Agency', description: 'Register an agency.', icon: BriefcaseBusiness },
  { type: 'company', label: 'As a Company', description: 'Register a company.', icon: Building2 },
]

const typeLabels = { freelancer: 'Freelancer', agency: 'Agency', company: 'Company' }
const statusLabels = { pending_approval: 'Pending Approval', approved: 'Approved', rejected: 'Rejected', suspended: 'Suspended' }

export default function VendorsPage() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const [registrationType, setRegistrationType] = useState('freelancer')
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)
  const submitLock = useRef(false)
  const menuRef = useRef(null)
  const { user } = useAuth()
  const isVendor = user?.role === 'vendor'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setVendors(await getVendors())
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const closeMenu = (event) => {
      if (!menuRef.current?.contains(event.target)) setTypeMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditing(null)
    setModalError('')
  }, [])

  const selectType = (type) => {
    setRegistrationType(type)
    setEditing(null)
    setTypeMenuOpen(false)
    setModalError('')
    setModalOpen(true)
  }

  const save = async (payload) => {
    if (submitLock.current) return
    submitLock.current = true
    setSaving(true)
    setModalError('')

    try {
      const response = editing ? await updateVendor(editing.id, payload) : await createVendor(payload)
      if (!response?.data?.id) throw new Error('The server did not confirm that the registration was saved.')
      setVendors((current) => editing ? current.map((vendor) => String(vendor.id) === String(editing.id) ? response.data : vendor) : [response.data, ...current])
      closeModal()
      await Swal.fire({ icon: 'success', title: editing ? 'Registration updated' : 'Registration saved', text: `Vendor registration ${editing ? 'updated' : 'saved'} successfully.`, confirmButtonColor: '#0B6FF4', timer: 1700, timerProgressBar: true })
    } catch (requestError) {
      setModalError(requestError.message)
    } finally {
      submitLock.current = false
      setSaving(false)
    }
  }

  const edit = (vendor) => {
    setEditing(vendor)
    setRegistrationType(vendor.registration_type || 'freelancer')
    setModalError('')
    setModalOpen(true)
  }

  const remove = async (vendor) => {
    const confirmation = await Swal.fire({ icon: 'warning', title: `Delete ${displayName(vendor)}?`, text: 'This action cannot be undone.', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#DC2626' })
    if (!confirmation.isConfirmed) return

    try {
      await deleteVendor(vendor.id)
      setVendors((current) => current.filter((item) => String(item.id) !== String(vendor.id)))
      await Swal.fire({ icon: 'success', title: 'Deleted', text: 'Vendor registration deleted successfully.', confirmButtonColor: '#0B6FF4', timer: 1500, timerProgressBar: true })
    } catch (requestError) {
      await Swal.fire({ icon: 'error', title: 'Could not delete', text: requestError.message, confirmButtonColor: '#0B6FF4' })
    }
  }

  const impersonate = async (vendor) => {
    const confirmation = await Swal.fire({ icon: 'warning', title: `Login as ${vendor.company_name || displayName(vendor)}?`, text: 'You will enter this vendor account and can return to Admin from the profile menu.', showCancelButton: true, confirmButtonText: 'Login as Vendor', confirmButtonColor: '#0B6FF4' })
    if (!confirmation.isConfirmed) return
    try {
      const response = await loginAsVendor(vendor.id)
      beginVendorImpersonation(response.user, response.token)
      window.location.assign('/vendors')
    } catch (requestError) {
      await Swal.fire({ icon: 'error', title: 'Could not login as vendor', text: requestError.message, confirmButtonColor: '#0B6FF4' })
    }
  }

  const displayName = (vendor) => vendor.name || `${vendor.first_name || ''} ${vendor.last_name || ''}`.trim()

  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-xl font-bold">{isVendor ? 'My Service Profile' : 'Vendors'}</h1><p className="mt-1 text-sm text-slate-500">{isVendor ? 'View your own vendor and service details.' : 'Manage vendors, agencies, companies and freelancers.'}</p></div>
      {!isVendor && <div ref={menuRef} className="relative">
        <button onClick={() => setTypeMenuOpen((open) => !open)} className="flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-xs font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4"/>Add Vendor<ChevronDown className="h-3.5 w-3.5"/></button>
        {typeMenuOpen && <div className="absolute right-0 top-11 z-30 w-72 rounded-lg border bg-white p-1.5 shadow-xl">{registrationOptions.map(({ type, label, description, icon: Icon }) => <button key={type} onClick={() => selectType(type)} className="flex w-full items-start gap-3 rounded-md px-3 py-3 text-left hover:bg-slate-50"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-50 text-primary"><Icon className="h-4 w-4"/></span><span><span className="block text-xs font-semibold text-slate-800">{label}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{description}</span></span></button>)}</div>}
      </div>}
    </div>

    {error && <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}<button onClick={load} className="ml-2 font-semibold underline">Retry</button></div>}

    <div className="mt-6 overflow-hidden rounded-lg border bg-white shadow-subtle">
      <div className="border-b px-4 py-4"><h2 className="text-sm font-bold">Registrations</h2><p className="mt-1 text-xs text-slate-500">{vendors.length} total</p></div>
      {loading ? <div className="grid min-h-52 place-items-center text-xs text-slate-500">Loading vendors...</div> : vendors.length === 0 ? <div className="grid min-h-60 place-items-center text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-slate-100 text-slate-500"><UsersRound className="h-5 w-5"/></span><h3 className="mt-3 text-sm font-semibold">No registrations found</h3><p className="mt-1 text-xs text-slate-500">{isVendor ? 'No service profile is linked to this account.' : 'Use Add Vendor to create the first registration.'}</p></div></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left"><thead><tr className="border-b bg-slate-50 text-[10px] uppercase text-slate-500"><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Industry</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Status</th>{!isVendor && <th className="w-72 px-4 py-3">Actions</th>}</tr></thead><tbody>{vendors.map((vendor) => <tr key={vendor.id} className="border-b text-xs last:border-0"><td className="px-4 py-3"><div className="font-semibold text-slate-800">{vendor.company_name || displayName(vendor)}</div><div className="mt-0.5 text-[11px] text-slate-400">{displayName(vendor)}</div></td><td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-primary">{typeLabels[vendor.registration_type]}</span></td><td className="px-4 py-3 text-slate-500">{vendor.industry?.name || '-'}</td><td className="px-4 py-3 text-slate-500">{vendor.service_category?.name || '-'}</td><td className="px-4 py-3 text-slate-500">{vendor.email}</td><td className="px-4 py-3 text-slate-500">{vendor.phone}</td><td className="px-4 py-3 text-slate-500">{vendor.city || '-'}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{statusLabels[vendor.status] || vendor.status}</span></td>{!isVendor && <td className="px-4 py-3"><div className="flex items-center gap-2"><button disabled={!vendor.user_id} onClick={() => impersonate(vendor)} title={vendor.user_id ? 'Login to this vendor account' : 'No login account is linked'} className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"><LogIn className="h-3.5 w-3.5"/>Login As</button><button onClick={() => edit(vendor)} className="flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold text-slate-600 hover:border-primary hover:bg-blue-50 hover:text-primary"><Pencil className="h-3.5 w-3.5"/>Edit</button><button onClick={() => remove(vendor)} className="flex h-8 items-center gap-1.5 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5"/>Delete</button></div></td>}</tr>)}</tbody></table></div>}
    </div>

    <VendorModal open={modalOpen} registrationType={registrationType} vendor={editing} saving={saving} serverError={modalError} onClearError={() => setModalError('')} onClose={closeModal} onSave={save}/>
  </section>
}
