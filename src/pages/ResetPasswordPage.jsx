import { AlertCircle, CheckCircle2, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import BrandLogo from '../components/common/BrandLogo'

export default function ResetPasswordPage() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const email = searchParams.get('email') || ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (password !== confirmation) {
      setError('Password confirmation does not match.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const response = await resetPassword({ email, token, password, password_confirmation: confirmation })
      setSuccess(response.message)
      setTimeout(() => navigate('/login', { replace: true }), 1800)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-10">
    <section className="w-full max-w-md rounded-xl border bg-white p-6 shadow-xl sm:p-8">
      <BrandLogo/>
      <h1 className="mt-8 text-2xl font-bold">Set a new password</h1>
      <p className="mt-2 text-sm text-slate-500">Resetting password for <span className="font-semibold text-slate-700">{email}</span>.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        {error && <div role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</div>}
        {success && <div className="flex gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-700"><CheckCircle2 className="h-4 w-4 shrink-0"/>{success}</div>}
        <div><label htmlFor="reset-password" className="mb-1.5 block text-xs font-semibold">New Password</label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input id="reset-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} className="h-11 w-full rounded-md border pl-10 pr-3 text-sm"/></div></div>
        <div><label htmlFor="reset-confirmation" className="mb-1.5 block text-xs font-semibold">Confirm Password</label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input id="reset-confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={8} className="h-11 w-full rounded-md border pl-10 pr-3 text-sm"/></div></div>
        <button disabled={submitting || Boolean(success)} className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{submitting ? 'Resetting...' : 'Reset password'}</button>
      </form>
      <p className="mt-5 text-center text-xs"><Link to="/login" className="font-semibold text-primary">Back to sign in</Link></p>
    </section>
  </main>
}
