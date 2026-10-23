import { ChevronDown, Eye, EyeOff, MapPin, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import useDialogAccessibility from '../../hooks/useDialogAccessibility'
import { countryCatalog } from '../../data/countryCatalog'

const typeLabels = {
  freelancer: 'Freelancer',
  agency: 'Agency',
  company: 'Company',
}

const initialForm = {
  name: '',
  first_name: '',
  last_name: '',
  password: '',
  password_confirmation: '',
  designation: '',
  phone: '',
  email: '',
  country: '',
  address: '',
  city: '',
  company_name: '',
  business_type: '',
  industry_id: '',
  service_category_id: '',
  status: 'pending_approval',
}

const countryCities = {
  Pakistan: [
    'Abbottabad', 'Ahmedpur East', 'Arifwala', 'Attock', 'Bahawalnagar', 'Bahawalpur', 'Bannu', 'Bhalwal', 'Bhakkar',
    'Burewala', 'Chakwal', 'Charsadda', 'Chichawatni', 'Chiniot', 'Chishtian', 'Daska', 'Dera Ghazi Khan', 'Dera Ismail Khan',
    'Faisalabad', 'Gojra', 'Gujar Khan', 'Gujranwala', 'Gujrat', 'Hafizabad', 'Haripur', 'Hyderabad', 'Islamabad',
    'Jacobabad', 'Jaranwala', 'Jhang', 'Jhelum', 'Kamalia', 'Kamoke', 'Karachi', 'Kasur', 'Khanewal', 'Khanpur',
    'Khairpur', 'Khushab', 'Kot Addu', 'Lahore', 'Larkana', 'Layyah', 'Lodhran', 'Mandi Bahauddin', 'Mansehra',
    'Mardan', 'Mian Channu', 'Mianwali', 'Mirpur Khas', 'Multan', 'Muzaffargarh', 'Nankana Sahib', 'Narowal',
    'Nawabshah', 'Okara', 'Pakpattan', 'Peshawar', 'Quetta', 'Rahim Yar Khan', 'Rawalpindi', 'Sadiqabad', 'Sahiwal',
    'Sargodha', 'Sheikhupura', 'Shikarpur', 'Sialkot', 'Sukkur', 'Swabi', 'Tando Adam', 'Toba Tek Singh', 'Vehari',
    'Wah Cantt', 'Wazirabad', 'Yazman'
  ],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Khobar'],
  Qatar: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Umm Salal'],
  Oman: ['Muscat', 'Salalah', 'Sohar', 'Nizwa'],
  Kuwait: ['Kuwait City', 'Hawalli', 'Salmiya', 'Farwaniya'],
  Bahrain: ['Manama', 'Riffa', 'Muharraq', 'Hamad Town'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Dallas', 'San Francisco'],
  'United Kingdom': ['London', 'Birmingham', 'Manchester', 'Leeds', 'Glasgow'],
  Canada: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
}

const countries = Object.keys(countryCities)
const countryByName = Object.fromEntries(countryCatalog.map((country) => [country.name, country]))

function Field({ label, name, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return <div>
    <label htmlFor={`vendor-${name}`} className="mb-1.5 block text-xs font-semibold text-slate-700">{label}{required && <span className="text-red-500"> *</span>}</label>
    <input id={`vendor-${name}`} name={name} type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} className="h-10 w-full rounded-md border px-3 text-sm" maxLength={name === 'phone' ? 30 : 150}/>
  </div>
}

function PasswordField({ label, name, value, onChange, required = false, visible, onToggle }) {
  return <div>
    <label htmlFor={`vendor-${name}`} className="mb-1.5 block text-xs font-semibold text-slate-700">{label}{required && <span className="text-red-500"> *</span>}</label>
    <div className="relative">
      <input id={`vendor-${name}`} name={name} type={visible ? 'text' : 'password'} value={value} onChange={onChange} required={required} className="h-10 w-full rounded-md border px-3 pr-10 text-sm" maxLength={150}/>
      <button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-700" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
        {visible ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
      </button>
    </div>
  </div>
}

function SearchableSelect({ label, name, value, options, onChange, required = false, disabled = false, placeholder = 'Select', country = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [openUp, setOpenUp] = useState(false)
  const rootRef = useRef(null)
  const filtered = options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const position = () => {
      const button = rootRef.current?.querySelector('button')
      if (!button) return
      const bounds = button.getBoundingClientRect()
      const estimatedHeight = Math.min(280, 48 + Math.min(filtered.length, 8) * 42)
      setOpenUp(bounds.bottom + estimatedHeight > window.innerHeight - 12 && bounds.top > estimatedHeight + 12)
    }
    position()
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true) }
  }, [open, filtered.length])

  return <div ref={rootRef} className="relative">
    <label htmlFor={`vendor-${name}-search`} className="mb-1.5 block text-xs font-semibold text-slate-700">{label}{required && <span className="text-red-500"> *</span>}</label>
    <button type="button" disabled={disabled} onClick={() => setOpen((current) => !current)} className="flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 text-left text-sm shadow-sm transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400">
      <span className={`flex min-w-0 items-center gap-2 ${value ? 'text-slate-900' : 'text-slate-400'}`}>{country && value && countryByName[value]?.flagUrl && <img src={countryByName[value].flagUrl} alt="" className="h-4 w-6 rounded-sm object-cover"/>}{!country && value && <MapPin className="h-4 w-4 shrink-0 text-primary"/>}<span className="truncate">{value || placeholder}</span></span>
      <ChevronDown className="h-4 w-4 text-slate-400"/>
    </button>
    {open && !disabled && <div className={`absolute z-30 w-full overflow-hidden rounded-md border bg-white shadow-floating ${openUp ? 'bottom-full mb-1' : 'mt-1'}`}>
      <div className="flex h-10 items-center gap-2 border-b px-3">
        <Search className="h-4 w-4 text-slate-400"/>
        <input id={`vendor-${name}-search`} autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}`} className="min-w-0 flex-1 text-sm outline-none"/>
      </div>
      <div className="max-h-44 overflow-y-auto py-1">
        {filtered.length === 0 ? <div className="px-3 py-3 text-xs text-slate-500">No results found</div> : filtered.map((option) => <button key={option} type="button" onClick={() => { onChange(name, option); setOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-blue-50 hover:text-primary">{country && countryByName[option]?.flagUrl && <img src={countryByName[option].flagUrl} alt="" className="h-4 w-6 rounded-sm object-cover"/>}{!country && <MapPin className="h-4 w-4 shrink-0 text-slate-400"/>}<span>{option}</span></button>)}
      </div>
    </div>}
  </div>
}

export default function VendorModal({ open, registrationType, vendor, saving, serverError, onClose, onSave, onClearError }) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const baseline = { ...initialForm, ...Object.fromEntries(Object.keys(initialForm).map((key) => [key, vendor?.[key] || ''])), password: '', password_confirmation: '', status: vendor?.status || 'pending_approval' }
  const dirty = open && JSON.stringify(form) !== JSON.stringify(baseline)
  const requestClose = () => { if (dirty && !window.confirm('Discard your unsaved vendor changes?')) return; onClose() }
  const dialogRef = useDialogAccessibility(open, requestClose, saving)
  useEffect(() => { if (!dirty) return undefined; const warn = (event) => { event.preventDefault(); event.returnValue = '' }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])

  useEffect(() => {
    if (!open) return
    setForm({ ...initialForm, ...Object.fromEntries(Object.keys(initialForm).map((key) => [key, vendor?.[key] || ''])), password: '', password_confirmation: '', status: vendor?.status || 'pending_approval' })
    setShowPassword(false)
    setShowConfirmation(false)
    setError('')
  }, [open, registrationType, vendor])

  if (!open) return null

  const change = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
    onClearError()
  }

  const select = (name, value) => {
    setForm((current) => ({ ...current, [name]: value, ...(name === 'country' ? { city: '' } : {}) }))
    setError('')
    onClearError()
  }

  const submit = async (event) => {
    event.preventDefault()
    if (saving) return

    const requiredFields = ['company_name', 'first_name', 'email', 'phone', 'country', 'city']

    if (requiredFields.some((field) => !form[field].trim())) {
      setError('Please complete all required fields.')
      return
    }
    if (!vendor?.user && !form.password.trim()) {
      setError('Password is required.')
      return
    }
    if (form.password && form.password !== form.password_confirmation) {
      setError('Password and confirm password must match.')
      return
    }
    const personName = `${form.first_name} ${form.last_name}`.trim()

    onSave({
      registration_type: registrationType,
      ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])),
      name: personName || form.company_name.trim(),
    })
  }

  const visibleError = error || serverError
  const cityOptions = form.country ? countryCities[form.country] || [] : []

  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
    <button className="absolute inset-0 bg-slate-950/45" onClick={() => !saving && requestClose()} aria-label="Close modal"/>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="vendor-modal-title" className="relative max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-overlay sm:max-h-[92vh]">
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-white px-5">
        <div><h2 id="vendor-modal-title" className="text-base font-bold">{vendor ? 'Edit' : 'Register as'} {typeLabels[registrationType]}</h2><p className="mt-0.5 text-[11px] text-slate-500">Enter the registration details below.</p></div>
        <button type="button" onClick={requestClose} disabled={saving} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="Close"><X className="h-4 w-4"/></button>
      </div>

      <form onSubmit={submit} className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {['agency', 'company'].includes(registrationType) && <>
            <div className="sm:col-span-2"><Field label="Business/Vendor Name" name="company_name" value={form.company_name} onChange={change} required/></div>
            <Field label="Owner First Name" name="first_name" value={form.first_name} onChange={change} required/>
            <Field label="Owner Last Name" name="last_name" value={form.last_name} onChange={change}/>
            <Field label="Phone Number" name="phone" value={form.phone} onChange={change} type="tel" required/>
            <Field label="Email" name="email" value={form.email} onChange={change} type="email" required/>
            <PasswordField label={vendor?.user ? 'Password (optional)' : 'Password'} name="password" value={form.password} onChange={change} visible={showPassword} onToggle={() => setShowPassword((current) => !current)} required={!vendor?.user}/>
            <PasswordField label={vendor?.user ? 'Confirm Password (if changing)' : 'Confirm Password'} name="password_confirmation" value={form.password_confirmation} onChange={change} visible={showConfirmation} onToggle={() => setShowConfirmation((current) => !current)} required={!vendor?.user}/>
            <SearchableSelect label="Country Name" name="country" value={form.country} options={countries} onChange={select} required placeholder="Select country" country/>
            <SearchableSelect label="City Name" name="city" value={form.city} options={cityOptions} onChange={select} required disabled={!form.country} placeholder={form.country ? 'Select city' : 'Select country first'}/>
            <div className="sm:col-span-2"><label htmlFor="vendor-address" className="mb-1.5 block text-xs font-semibold text-slate-700">Address</label><textarea id="vendor-address" name="address" value={form.address} onChange={change} rows="3" className="w-full rounded-md border p-3 text-sm" maxLength={1000}/></div>
          </>}

          {registrationType === 'freelancer' && <>
            <div className="sm:col-span-2"><Field label="Business/Vendor Name" name="company_name" value={form.company_name} onChange={change} required/></div>
            <Field label="Owner First Name" name="first_name" value={form.first_name} onChange={change} required/>
            <Field label="Owner Last Name" name="last_name" value={form.last_name} onChange={change}/>
            <Field label="Email" name="email" value={form.email} onChange={change} type="email" required/>
            <Field label="Phone Number" name="phone" value={form.phone} onChange={change} type="tel" required/>
            <PasswordField label={vendor?.user ? 'Password (optional)' : 'Password'} name="password" value={form.password} onChange={change} visible={showPassword} onToggle={() => setShowPassword((current) => !current)} required={!vendor?.user}/>
            <PasswordField label={vendor?.user ? 'Confirm Password (if changing)' : 'Confirm Password'} name="password_confirmation" value={form.password_confirmation} onChange={change} visible={showConfirmation} onToggle={() => setShowConfirmation((current) => !current)} required={!vendor?.user}/>
            <SearchableSelect label="Country Name" name="country" value={form.country} options={countries} onChange={select} required placeholder="Select country" country/>
            <SearchableSelect label="City Name" name="city" value={form.city} options={cityOptions} onChange={select} required disabled={!form.country} placeholder={form.country ? 'Select city' : 'Select country first'}/>
            <div className="sm:col-span-2"><label htmlFor="vendor-address" className="mb-1.5 block text-xs font-semibold text-slate-700">Address</label><textarea id="vendor-address" name="address" value={form.address} onChange={change} rows="3" className="w-full rounded-md border p-3 text-sm" maxLength={1000}/></div>
          </>}
        </div>

        {visibleError && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{visibleError}</p>}

        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
          <button type="button" onClick={requestClose} disabled={saving} className="h-9 rounded-md border px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button disabled={saving} className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving...' : vendor ? 'Update Registration' : 'Save Registration'}</button>
        </div>
      </form>
    </div>
  </div>
}
