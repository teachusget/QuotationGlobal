import { ArrowRight, BriefcaseBusiness, Building2, Check, ShoppingBag, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from '../ui'

const providerDetails = {
  google: { label: 'Google', mark: 'G', markClass: 'bg-white text-[#4285f4] ring-1 ring-slate-200' },
  linkedin: { label: 'LinkedIn', mark: 'in', markClass: 'bg-[#0a66c2] text-white' },
}

const providerTypes = [
  { type: 'freelancer', label: 'Freelancer', description: 'I provide solutions independently.', icon: UserRound },
  { type: 'agency', label: 'Agency', description: 'I represent a professional agency.', icon: BriefcaseBusiness },
  { type: 'company', label: 'Company', description: 'I represent a technology company.', icon: Building2 },
]

export default function SocialLoginChooser({ open, provider = 'google', onClose }) {
  const [role, setRole] = useState('')
  const [registrationType, setRegistrationType] = useState('')
  const details = providerDetails[provider] || providerDetails.google

  useEffect(() => {
    if (open) { setRole(''); setRegistrationType('') }
  }, [open])

  const continueToProvider = () => {
    if (!role || (role === 'vendor' && !registrationType)) return
    const params = new URLSearchParams({ role })
    if (role === 'vendor') params.set('registration_type', registrationType)
    window.location.href = `/auth/${provider}/redirect?${params.toString()}`
  }

  return <Modal open={open} onClose={onClose} title={`Continue with ${details.label}`} description="Choose the account type you want to use for your first sign in." size="md">
    <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
      <span className={`grid h-10 w-10 place-items-center rounded-lg text-sm font-extrabold ${details.markClass}`}>{details.mark}</span>
      <div><p className="text-sm font-bold text-slate-900">Secure sign in with {details.label}</p><p className="mt-0.5 text-xs text-slate-500">Your choice controls the workspace you will enter.</p></div>
    </div>
    {!role && <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={() => setRole('buyer')} className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-primary hover:bg-blue-50/50 hover:shadow-subtle">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-primary"><ShoppingBag className="h-5 w-5"/></span><span className="mt-3 block text-sm font-bold text-slate-900">Buyer account</span><span className="mt-1 block text-xs leading-5 text-slate-500">Find solutions, compare vendors, and request quotes.</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">Continue <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"/></span>
      </button>
      <button type="button" onClick={() => setRole('vendor')} className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-primary hover:bg-blue-50/50 hover:shadow-subtle">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-primary"><BriefcaseBusiness className="h-5 w-5"/></span><span className="mt-3 block text-sm font-bold text-slate-900">Solution Provider</span><span className="mt-1 block text-xs leading-5 text-slate-500">Offer your technology products and professional services.</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">Choose provider type <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"/></span>
      </button>
    </div>}
    {role === 'vendor' && <div className="mt-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-900">What best describes you?</h3><p className="mt-1 text-xs text-slate-500">Select your provider category to continue.</p></div><button type="button" onClick={() => { setRole(''); setRegistrationType('') }} className="text-xs font-semibold text-primary hover:underline">Change account type</button></div><div className="mt-3 grid gap-2">{providerTypes.map(({ type, label, description, icon: Icon }) => <button type="button" key={type} onClick={() => setRegistrationType(type)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${registrationType === type ? 'border-primary bg-blue-50 ring-1 ring-primary/20' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-primary"><Icon className="h-4 w-4"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{description}</span></span>{registrationType === type && <Check className="h-5 w-5 shrink-0 text-primary"/>}</button>)}</div><button type="button" disabled={!registrationType} onClick={continueToProvider} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Continue with {details.label} <ArrowRight className="h-4 w-4"/></button></div>}
    {role === 'buyer' && <div className="mt-5"><div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs leading-5 text-emerald-800">You selected a Buyer account. Your marketplace workspace will open after {details.label} verifies your account.</div><button type="button" onClick={continueToProvider} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700">Continue with {details.label} <ArrowRight className="h-4 w-4"/></button><button type="button" onClick={() => setRole('')} className="mt-3 w-full text-xs font-semibold text-slate-500 hover:text-primary">Choose a different account type</button></div>}
  </Modal>
}
