import { Factory, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { createIndustry, deleteIndustry, getIndustries, updateIndustry } from '../api/industries'
import { useAuth } from '../auth/useAuth'
import IndustryModal from '../components/industries/IndustryModal'
import { ActionMenu, Alert, Badge, Button, EmptyState, PageHeader, TableSkeleton } from '../components/ui'

const alertOptions = {
  confirmButtonColor: '#0B6FF4',
  customClass: { popup: 'rounded-lg', confirmButton: 'rounded-md px-5 text-sm' },
}

export default function IndustriesPage() {
  const { can } = useAuth()
  const [industries, setIndustries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const submitLock = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setIndustries(await getIndustries())
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setModalError('')
    setEditing(null)
  }, [])

  const save = async (data) => {
    if (submitLock.current) return
    const name = String(data.get('name') || '').trim()
    const duplicate = industries.some((industry) => industry.id !== editing?.id && industry.name.trim().toLowerCase() === name.toLowerCase())
    if (duplicate) {
      setModalError('Industry with this name already exists.')
      return
    }

    submitLock.current = true
    setSaving(true)
    setModalError('')
    try {
      const response = editing ? await updateIndustry(editing.id, data) : await createIndustry(data)
      if (!response?.data?.id) throw new Error('The server did not confirm that the industry was added.')
      setIndustries((current) => (editing ? current.map((item) => item.id === editing.id ? response.data : item) : [...current, response.data]).sort((a, b) => a.name.localeCompare(b.name)))
      closeModal()
      await Swal.fire({ ...alertOptions, icon: 'success', title: editing ? 'Industry updated' : 'Industry added', text: response.message, timer: 1600, timerProgressBar: true })
    } catch (requestError) {
      setModalError(requestError.message)
    } finally {
      submitLock.current = false
      setSaving(false)
    }
  }

  const remove = async (industry) => {
    const result = await Swal.fire({ ...alertOptions, icon: 'warning', title: `Delete ${industry.name}?`, text: 'This cannot be undone. Industries assigned to services must be deactivated instead.', showCancelButton: true, confirmButtonText: 'Delete Industry', confirmButtonColor: '#dc2626' })
    if (!result.isConfirmed) return
    try {
      const response = await deleteIndustry(industry.id)
      setIndustries((current) => current.filter((item) => item.id !== industry.id))
      await Swal.fire({ ...alertOptions, icon: 'success', title: 'Industry deleted', text: response.message, timer: 1500, timerProgressBar: true })
    } catch (requestError) {
      await Swal.fire({ ...alertOptions, icon: 'error', title: 'Unable to delete industry', text: requestError.message })
    }
  }

  return <section>
    <PageHeader eyebrow="Marketplace catalog" title="Industries" description="Manage industries available in the marketplace." actions={can('industries.create') && <Button icon={Plus} onClick={() => { setEditing(null); setModalError(''); setModalOpen(true) }}>Add Industry</Button>}/>

    {error && <Alert className="mt-5">{error}<button type="button" onClick={load} className="ml-2 font-semibold underline">Retry</button></Alert>}

    {loading ? <div className="mt-6"><TableSkeleton columns={6}/></div> : industries.length === 0 ? <div className="mt-6 rounded-xl border bg-white"><EmptyState icon={Factory} title="No industries added" description="Use Add Industry to create the first industry." action={can('industries.create') && <Button icon={Plus} onClick={() => setModalOpen(true)}>Add Industry</Button>}/></div> : <div className="ui-table-shell mt-6 overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="bg-slate-50"><tr><th className="w-20">Logo</th><th>Industry</th><th>Description</th><th className="w-28">Status</th><th className="w-36">Date added</th>{can('industries.update') || can('industries.delete') ? <th className="w-20 text-right">Actions</th> : null}</tr></thead><tbody>{industries.map((industry) => <tr key={industry.id}><td>{industry.logo_url ? <img src={industry.logo_url} alt={`${industry.name} logo`} className="h-10 w-10 rounded-lg border bg-white object-contain p-1"/> : <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-400"><Factory className="h-4 w-4"/></span>}</td><td><p className="text-[13px] font-semibold text-slate-900">{industry.name}</p><p className="mt-0.5 text-[11px] text-slate-400">ID #{industry.id}</p></td><td className="max-w-xl text-[13px] leading-5 text-slate-500">{industry.description || <span className="text-slate-400">No description provided</span>}</td><td><Badge tone={industry.status === 'active' ? 'success' : 'neutral'}>{industry.status === 'active' ? 'Active' : 'Inactive'}</Badge></td><td className="whitespace-nowrap text-[13px] text-slate-500">{industry.created_at ? new Date(industry.created_at).toLocaleDateString() : '—'}</td>{can('industries.update') || can('industries.delete') ? <td className="text-right"><ActionMenu label={`Actions for ${industry.name}`} actions={[can('industries.update') && { label: 'Edit industry', icon: Pencil, onClick: () => { setEditing(industry); setModalError(''); setModalOpen(true) } }, can('industries.delete') && { label: 'Delete industry', icon: Trash2, tone: 'danger', onClick: () => remove(industry) }]}/></td> : null}</tr>)}</tbody></table></div>}

    <IndustryModal open={modalOpen} industry={editing} saving={saving} serverError={modalError} onClearError={() => setModalError('')} onClose={closeModal} onSave={save}/>
  </section>
}
