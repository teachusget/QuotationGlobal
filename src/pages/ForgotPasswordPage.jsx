import { AlertCircle, CheckCircle2, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/auth'
import BrandLogo from '../components/common/BrandLogo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [resetUrl, setResetUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const response = await requestPasswordReset(email.trim())
      setMessage(response.message)
      setResetUrl(response.reset_url || '')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-10">
    <section className="w-full max-w-md rounded-xl border bg-white p-6 shadow-xl sm:p-8">
      <BrandLogo/>
      <h1 className="mt-8 text-2xl font-bold">Forgot password?</h1>
      <p className="mt-2 text-sm text-slate-500">Enter your registered email to receive a secure reset link.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        {error && <div role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</div>}
        {message && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-700"><div className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0"/>{message}</div>{resetUrl && <a href={resetUrl} className="mt-3 block break-all font-semibold text-primary underline">Open password reset page</a>}</div>}
        <div><label htmlFor="forgot-email" className="mb-1.5 block text-xs font-semibold">Email</label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input id="forgot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-11 w-full rounded-md border pl-10 pr-3 text-sm" placeholder="you@example.com" autoFocus/></div></div>
        <button disabled={submitting} className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{submitting ? 'Sending...' : 'Send reset link'}</button>
      </form>
      <p className="mt-5 text-center text-xs text-slate-500"><Link to="/login" className="font-semibold text-primary">Back to sign in</Link></p>
    </section>
  </main>
}
