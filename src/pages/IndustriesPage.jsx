import { Factory, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { createIndustry, getIndustries } from '../api/industries'
import IndustryModal from '../components/industries/IndustryModal'

const alertOptions = {
  confirmButtonColor: '#0B6FF4',
  customClass: { popup: 'rounded-lg', confirmButton: 'rounded-md px-5 text-sm' },
}

export default function IndustriesPage() {
  const [industries, setIndustries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)
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
  }, [])

  const save = async (data) => {
    if (submitLock.current) return
    const name = String(data.get('name') || '').trim()
    const duplicate = industries.some((industry) => industry.name.trim().toLowerCase() === name.toLowerCase())
    if (duplicate) {
      setModalError('Industry with this name already exists.')
      return
    }

    submitLock.current = true
    setSaving(true)
    setModalError('')
    try {
      const response = await createIndustry(data)
      if (!response?.data?.id) throw new Error('The server did not confirm that the industry was added.')
      setIndustries((current) => [...current, response.data].sort((a, b) => a.name.localeCompare(b.name)))
      closeModal()
      await Swal.fire({ ...alertOptions, icon: 'success', title: 'Industry added', text: 'Industry added successfully.', timer: 1600, timerProgressBar: true })
    } catch (requestError) {
      setModalError(requestError.message)
    } finally {
      submitLock.current = false
      setSaving(false)
    }
  }

  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-xl font-bold">Industries</h1><p className="mt-1 text-sm text-slate-500">Manage industries available in the marketplace.</p></div>
      <button onClick={() => { setModalError(''); setModalOpen(true) }} className="flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-xs font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4"/>Add Industry</button>
    </div>

    {error && <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}<button onClick={load} className="ml-2 font-semibold underline">Retry</button></div>}

    {loading ? <div className="mt-6 grid min-h-52 place-items-center rounded-lg border bg-white text-xs text-slate-500">Loading industries...</div> : industries.length === 0 ? <div className="mt-6 grid min-h-60 place-items-center rounded-lg border bg-white text-center shadow-subtle"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-slate-100 text-slate-500"><Factory className="h-5 w-5"/></span><h2 className="mt-3 text-sm font-semibold">No industries added</h2><p className="mt-1 text-xs text-slate-500">Use Add Industry to create the first industry.</p></div></div> : <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{industries.map((industry) => <article key={industry.id} className="flex items-start gap-4 rounded-lg border bg-white p-4 shadow-subtle">{industry.logo_url ? <img src={industry.logo_url} alt="" className="h-14 w-14 rounded-md border object-contain"/> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-400"><Factory className="h-5 w-5"/></span>}<div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-bold text-slate-800">{industry.name}</h2><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${industry.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{industry.status === 'active' ? 'Active' : 'Deactive'}</span></div>{industry.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{industry.description}</p>}<p className="mt-1 text-[11px] text-slate-400">Added {new Date(industry.created_at).toLocaleDateString()}</p></div></article>)}</div>}

    <IndustryModal open={modalOpen} saving={saving} serverError={modalError} onClearError={() => setModalError('')} onClose={closeModal} onSave={save}/>
  </section>
}
