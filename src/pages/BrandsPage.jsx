import { Award, Check, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { approveBrand, createBrand, deleteBrand, getBrands, updateBrand } from '../api/brands'
import CategoryModal from '../components/categories/CategoryModal'
import { useAuth } from '../auth/useAuth'
import { TableSkeleton } from '../components/ui'

const alertOptions = { confirmButtonColor: '#0B6FF4', customClass: { popup: 'rounded-lg', confirmButton: 'rounded-md px-5 text-sm' } }

export default function BrandsPage() {
  const { user, can } = useAuth()
  const isVendor = user?.account_type === 'vendor'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalError, setModalError] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const submitLock = useRef(false)

  const load = async () => {
    setLoading(true); setError('')
    try { const response = await getBrands(); setItems(response.data) }
    catch (requestError) { setError(requestError.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const closeModal = () => { setModalOpen(false); setEditing(null); setModalError('') }
  const save = async (data) => {
    if (submitLock.current) return
    const name = String(data.get('name') || '').trim()
    const duplicate = items.some((brand) => String(brand.id) !== String(editing?.id) && brand.name.trim().toLowerCase() === name.toLowerCase())
    if (duplicate) { setModalError('Brand with this name already exists.'); return }
    submitLock.current = true; setSaving(true); setModalError('')
    try {
      const response = editing ? await updateBrand(editing.id, data) : await createBrand(data)
      const saved = response?.data
      if (!saved?.id) throw new Error('The server did not confirm that the brand was saved.')
      setItems((current) => editing ? current.map((item) => String(item.id) === String(editing.id) ? saved : item) : [...current, saved].sort((a, b) => a.name.localeCompare(b.name)))
      const wasEditing = Boolean(editing)
      closeModal()
      await Swal.fire({ ...alertOptions, icon: 'success', title: wasEditing ? 'Updated successfully' : 'Saved successfully', text: `Brand has been ${wasEditing ? 'updated' : 'added'}.`, timer: 1600, timerProgressBar: true })
    } catch (requestError) { setModalError(requestError.message) }
    finally { submitLock.current = false; setSaving(false) }
  }

  const remove = async (brand) => {
    const confirmation = await Swal.fire({ ...alertOptions, icon: 'warning', title: `Delete ${brand.name}?`, text: 'This action cannot be undone.', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#DC2626' })
    if (!confirmation.isConfirmed) return
    try { await deleteBrand(brand.id); setItems((current) => current.filter((item) => String(item.id) !== String(brand.id))); await Swal.fire({ ...alertOptions, icon: 'success', title: 'Deleted', text: 'Brand deleted successfully.', timer: 1400, timerProgressBar: true }) }
    catch (requestError) { await Swal.fire({ ...alertOptions, icon: 'error', title: 'Could not delete', text: requestError.message }) }
  }

  const approve = async (brand) => {
    try {
      const response = await approveBrand(brand.id)
      setItems((current) => current.map((item) => String(item.id) === String(brand.id) ? response.data : item))
      await Swal.fire({ ...alertOptions, icon: 'success', title: 'Brand approved', timer: 1400, showConfirmButton: false })
    } catch (requestError) { await Swal.fire({ ...alertOptions, icon: 'error', title: 'Could not approve', text: requestError.message }) }
  }

  const filtered = items.filter((item) => `${item.name} ${item.details || ''}`.toLowerCase().includes(query.toLowerCase()))
  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-xl font-bold">{isVendor ? 'Brands' : 'Brand Management'}</h1><p className="mt-1 text-sm text-slate-500">{isVendor ? 'View approved brands or submit and revise your own brands for admin approval.' : 'Manage and approve marketplace brands.'}</p></div>{can('brands.create') && <button onClick={() => { setEditing(null); setModalError(''); setModalOpen(true) }} className="flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-xs font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4"/>Add Brand</button>}</div>
    <div className="mt-6 overflow-visible rounded-lg border bg-white shadow-subtle">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4"><div><h2 className="text-sm font-bold">Brands</h2><p className="mt-1 text-xs text-slate-500">{items.length} total</p></div><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-64 rounded-md border pl-9 pr-3 text-xs" placeholder="Search brands"/></label></div>
      {error && <div className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
      {loading ? <TableSkeleton columns={4}/> : filtered.length === 0 ? <div className="grid min-h-60 place-items-center text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-slate-100 text-slate-500"><Award className="h-5 w-5"/></span><h3 className="mt-3 text-sm font-semibold">No brands found</h3><p className="mt-1 text-xs text-slate-500">{query ? 'Try a different search.' : 'Add your first brand to get started.'}</p></div></div> : <div className="overflow-x-auto"><table className="catalog-data-table w-full text-left"><thead><tr className="border-b bg-slate-50 text-[11px] uppercase text-slate-500"><th className="px-4 py-3">Name</th><th className="px-4 py-3">Details</th><th className="px-4 py-3">Status</th><th className="w-64 px-4 py-3">Actions</th></tr></thead><tbody>{filtered.map((brand) => { const ownBrand = String(brand.vendor_id || '') === String(user?.vendor_profile?.id || user?.vendor_id || ''); const mayEdit = can('brands.update') && (!isVendor || ownBrand); return <tr key={brand.id} className="border-b last:border-0"><td className="px-4 py-3"><div className="flex items-center gap-3">{brand.logo_url ? <img src={brand.logo_url} alt="" className="h-9 w-9 rounded-md border object-contain"/> : <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100"><Award className="h-4 w-4 text-slate-400"/></span>}<span className="text-xs font-semibold">{brand.name}</span></div></td><td className="max-w-md px-4 py-3 text-xs text-slate-500">{brand.details || '-'}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${brand.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{brand.status}</span></td><td className="px-4 py-3"><div className="flex items-center gap-2">{mayEdit && <button onClick={() => { setEditing(brand); setModalError(''); setModalOpen(true) }} className="flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold text-slate-600 hover:border-primary hover:bg-blue-50 hover:text-primary"><Pencil className="h-3.5 w-3.5"/>Edit</button>}{!isVendor && can('brands.approve') && brand.status !== 'approved' && <button onClick={() => approve(brand)} className="flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><Check className="h-3.5 w-3.5"/>Approve</button>}{!isVendor && can('brands.delete') && <button onClick={() => remove(brand)} className="flex h-8 items-center gap-1.5 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5"/>Delete</button>}{!mayEdit && (isVendor || (!can('brands.approve') && !can('brands.delete'))) && <span className="text-[11px] text-slate-400">View only</span>}</div></td></tr> })}</tbody></table></div>}
    </div>
    <CategoryModal open={modalOpen} type="brand" categories={[]} item={editing} saving={saving} serverError={modalError} onClearError={() => setModalError('')} onClose={closeModal} onSave={save}/>
  </section>
}
