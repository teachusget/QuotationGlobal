import { FolderTree, ImageIcon, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { createCategory, deleteCategory, getCategories, updateCategory } from '../api/categories'
import CategoryModal from '../components/categories/CategoryModal'
import { TableSkeleton } from '../components/ui'

const alertOptions = {
  confirmButtonColor: '#0B6FF4',
  customClass: { popup: 'rounded-lg', confirmButton: 'rounded-md px-5 text-sm' },
}

export default function CategoriesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const type = location.pathname === '/sub-categories' ? 'subcategory' : 'category'
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalError, setModalError] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const loadRequestRef = useRef(0)
  const submitLockRef = useRef(false)

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current
    setLoading(true)
    setError('')
    try {
      const list = await getCategories(type)
      const parentList = type === 'category' ? list : await getCategories('category')
      if (requestId !== loadRequestRef.current) return
      setItems(Array.isArray(list?.data) ? list.data : [])
      setCategories(Array.isArray(parentList?.data) ? parentList.data : [])
    } catch (requestError) {
      if (requestId !== loadRequestRef.current) return
      setError(requestError.message)
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false)
    }
  }, [type])

  const syncVisibleList = useCallback(async () => {
    ++loadRequestRef.current
    const list = await getCategories(type)
    setItems(list.data)
    if (type === 'category') setCategories(list.data)
  }, [type])

  useEffect(() => { load() }, [load])
  useEffect(() => { setQuery('') }, [type])

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setModalError('')
  }

  const save = async (data) => {
    if (submitLockRef.current) return
    const wasEditing = Boolean(editing)
    const editingId = editing?.id
    const submitted = {
      name: String(data.get('name') || ''),
      details: String(data.get('details') || ''),
      parent_id: data.get('parent_id') || null,
    }
    const normalizedName = submitted.name.trim().toLowerCase()
    const normalizedParent = String(submitted.parent_id || '')
    const scopeUnchanged = wasEditing
      && String(editing.name || '').trim().toLowerCase() === normalizedName
      && String(editing.parent_id || '') === normalizedParent
    const duplicateSource = type === 'category' ? categories : items
    const duplicateExists = !scopeUnchanged && (Array.isArray(duplicateSource) ? duplicateSource : []).some((category) => {
      if (String(category.id) === String(editingId)) return false
      const sameName = String(category.name || '').trim().toLowerCase() === normalizedName
      const sameParent = type === 'category' || String(category.parent_id || '') === normalizedParent
      return sameName && sameParent
    })
    if (duplicateExists) {
      setModalError(`${type === 'category' ? 'Category' : 'Sub category'} with this name already exists.`)
      return
    }

    submitLockRef.current = true
    setSaving(true)
    setError('')
    setModalError('')

    let response
    try {
      response = editing ? await updateCategory(editing.id, data) : await createCategory(data)
      if (!response?.data?.id) throw new Error('The server did not confirm that the category was saved.')
    } catch (requestError) {
      // A connection can drop after the database commit. Reconcile only those
      // ambiguous failures; validation responses such as 422 remain errors.
      if (!requestError.status) {
        try {
          const latest = await getCategories(type)
          const saved = latest.data.find((category) => {
            if (wasEditing && String(category.id) !== String(editingId)) return false
            const sameName = String(category.name || '').trim().toLowerCase() === normalizedName
            const sameParent = type === 'category' || String(category.parent_id || '') === normalizedParent
            return sameName && sameParent
          })
          if (saved) response = { data: saved }
        } catch {
          // Keep the original request error when reconciliation is unavailable.
        }
      }
      if (response?.data?.id) {
        // Continue through the normal success path below.
      } else {
        submitLockRef.current = false
        setSaving(false)
        setModalError(requestError.message)
        return
      }
    }

    submitLockRef.current = false
    setSaving(false)
    closeModal()
    if (response?.data || wasEditing) {
      const savedItem = {
        ...(wasEditing ? editing : {}),
        ...submitted,
        ...(response?.data || {}),
      }
      setItems((current) => {
        const safeItems = Array.isArray(current) ? current : []
        if (wasEditing) {
          const exists = safeItems.some((item) => String(item.id) === String(editingId))
          return exists ? safeItems.map((item) => String(item.id) === String(editingId) ? savedItem : item) : [savedItem]
        }
        return [...safeItems, savedItem].sort((first, second) => first.name.localeCompare(second.name))
      })
      if (type === 'category') {
        setCategories((current) => {
          const safeCategories = Array.isArray(current) ? current : []
          if (wasEditing) {
            const exists = safeCategories.some((item) => String(item.id) === String(editingId))
            return exists ? safeCategories.map((item) => String(item.id) === String(editingId) ? savedItem : item) : [savedItem]
          }
          return [...safeCategories, savedItem].sort((first, second) => first.name.localeCompare(second.name))
        })
      }
    }
    try {
      await syncVisibleList()
    } catch {
      // The optimistic state above remains visible if background synchronization fails.
    }
    await Swal.fire({
      ...alertOptions,
      icon: 'success',
      title: wasEditing ? 'Updated successfully' : 'Saved successfully',
      text: `${type === 'category' ? 'Category' : 'Sub category'} has been ${wasEditing ? 'updated' : 'added'}.`,
      timer: 1800,
      timerProgressBar: true,
    })
  }

  const remove = async (item) => {
    const confirmation = await Swal.fire({
      ...alertOptions,
      icon: 'warning',
      title: `Delete ${item.name}?`,
      text: type === 'category' ? 'This category and its related sub categories will be deleted. This action cannot be undone.' : 'This action cannot be undone.',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#DC2626',
    })
    if (!confirmation.isConfirmed) return

    try {
      await deleteCategory(item.id)
      setItems((current) => (Array.isArray(current) ? current : []).filter((category) => String(category.id) !== String(item.id)))
      if (type === 'category') {
        setCategories((current) => (Array.isArray(current) ? current : []).filter((category) => String(category.id) !== String(item.id)))
      }
      try {
        await syncVisibleList()
      } catch {
        // Keep the correctly scoped optimistic deletion when synchronization is unavailable.
      }
      await Swal.fire({ ...alertOptions, icon: 'success', title: 'Deleted', text: 'Category deleted successfully.', timer: 1500, timerProgressBar: true })
    } catch (requestError) {
      await Swal.fire({ ...alertOptions, icon: 'error', title: 'Could not delete', text: requestError.message })
    }
  }

  const filtered = (Array.isArray(items) ? items : []).filter((item) => {
    const name = typeof item?.name === 'string' ? item.name : ''
    const details = typeof item?.details === 'string' ? item.details : ''
    const search = query.toLowerCase()
    return name.toLowerCase().includes(search) || details.toLowerCase().includes(search)
  })
  const heading = type === 'category' ? 'Categories' : 'Sub Categories'

  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-xl font-bold">Category Management</h1><p className="mt-1 text-sm text-slate-500">Organize marketplace solutions and services.</p></div>
      <button onClick={() => { setEditing(null); setModalError(''); setModalOpen(true) }} className="flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-xs font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4"/>Add {type === 'category' ? 'Category' : 'Sub Category'}</button>
    </div>

    <div className="mt-6 border-b"><nav className="flex gap-5" aria-label="Category views">
      <button onClick={() => navigate('/categories')} className={`border-b-2 px-1 pb-3 text-xs font-semibold ${type === 'category' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>Categories</button>
      <button onClick={() => navigate('/sub-categories')} className={`border-b-2 px-1 pb-3 text-xs font-semibold ${type === 'subcategory' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>Sub Categories</button>
    </nav></div>

    <div className="mt-5 overflow-visible rounded-lg border bg-white shadow-subtle">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div><h2 className="text-sm font-bold">{heading}</h2><p className="mt-0.5 text-[11px] text-slate-500">{Array.isArray(items) ? items.length : 0} total</p></div>
        <label className="relative"><span className="sr-only">Search {heading}</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-64 max-w-full rounded-md border pl-9 pr-3 text-xs" placeholder={`Search ${heading.toLowerCase()}`}/></label>
      </div>

      {error && <div className="m-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}<button onClick={load} className="ml-2 font-semibold underline">Retry</button></div>}
      {loading ? <TableSkeleton columns={5}/> : filtered.length === 0 ? <div className="grid min-h-60 place-items-center p-6 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-slate-100 text-slate-500"><FolderTree className="h-5 w-5"/></span><h3 className="mt-3 text-sm font-semibold">No {heading.toLowerCase()} found</h3><p className="mt-1 text-xs text-slate-500">{query ? 'Try a different search.' : `Add your first ${type === 'category' ? 'category' : 'sub category'} to get started.`}</p></div></div> : <div className="overflow-x-auto">
        <table className="catalog-data-table w-full min-w-[680px] text-left">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-4 py-3 font-semibold">Name</th>{type === 'subcategory' && <th className="px-4 py-3 font-semibold">Parent category</th>}<th className="px-4 py-3 font-semibold">Details</th><th className="px-4 py-3 font-semibold">Created</th><th className="w-48 px-4 py-3 font-semibold">Actions</th></tr></thead>
          <tbody className="divide-y">{filtered.map((item) => <tr key={item.id} className="text-xs hover:bg-slate-50/60">
            <td className="px-4 py-3"><div className="flex items-center gap-3">{item.logo_url ? <img src={item.logo_url} alt="" className="h-9 w-9 rounded-md border object-contain"/> : <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-400"><ImageIcon className="h-4 w-4"/></span>}<span className="font-semibold text-slate-800">{item.name}</span></div></td>
            {type === 'subcategory' && <td className="px-4 py-3 text-slate-600">{item.parent?.name || '-'}</td>}
            <td className="max-w-xs truncate px-4 py-3 text-slate-500">{item.details || '-'}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(item.created_at).toLocaleDateString()}</td>
            <td className="px-4 py-3"><div className="flex items-center gap-2"><button onClick={() => { setEditing(item); setModalError(''); setModalOpen(true) }} className="flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold text-slate-600 hover:border-primary hover:bg-blue-50 hover:text-primary"><Pencil className="h-3.5 w-3.5"/>Edit</button><button onClick={() => remove(item)} className="flex h-8 items-center gap-1.5 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5"/>Delete</button></div></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </div>

    <CategoryModal open={modalOpen} type={type} categories={Array.isArray(categories) ? categories : []} item={editing} saving={saving} serverError={modalError} onClearError={() => setModalError('')} onClose={closeModal} onSave={save}/>
  </section>
}
