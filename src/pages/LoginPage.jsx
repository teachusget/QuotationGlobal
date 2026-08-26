import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from '../components/common/BrandLogo'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/ui'

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { document.title = 'Sign In | Quotation Global' }, [])
  if (isAuthenticated) return <Navigate to="/" replace />

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!loginName.trim() || !password) { setError('Enter your email and password.'); return }
    setSubmitting(true)
    try {
      const response = await login({ login: loginName.trim(), password, remember })
      const destination = location.state?.from?.pathname || (response.user?.account_type === 'buyer' ? '/marketplace' : response.user?.account_type === 'vendor' ? '/vendors' : '/')
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="auth-page grid h-[100dvh] overflow-hidden bg-white lg:grid-cols-[minmax(420px,46%)_1fr]">
    <section className="auth-scroll-panel flex min-h-0 items-start justify-center overflow-y-auto px-5 py-6 sm:px-10 lg:py-8">
      <div className="my-auto w-full max-w-[390px]">
        <BrandLogo />
        <div className="mt-8 sm:mt-10"><span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-primary"><LockKeyhole className="h-3.5 w-3.5"/>Secure portal</span><h1 className="mt-4 text-2xl font-bold text-slate-900">Welcome back</h1><p className="mt-2 text-sm text-slate-500">Sign in to manage Quotation Global.</p></div>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {error && <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"><AlertCircle className="mt-px h-4 w-4 shrink-0"/><span>{error}</span></div>}
          <div><label htmlFor="login" className="mb-1.5 block text-xs font-semibold text-slate-700">Email address</label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input id="login" type="email" autoComplete="username" value={loginName} onChange={(event) => setLoginName(event.target.value)} className="h-11 w-full rounded-md border bg-white pl-10 pr-3 text-sm placeholder:text-slate-400" placeholder="name@example.com" autoFocus /></div></div>
          <div><label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-slate-700">Password</label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-md border bg-white pl-10 pr-11 text-sm placeholder:text-slate-400" placeholder="Enter your password"/><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></div>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-primary"/>Remember me</label>
          <Button type="submit" size="lg" loading={submitting} className="w-full">{submitting ? 'Signing in' : 'Sign in'}</Button>
        </form>
        <div className="mt-5 space-y-2 text-center text-xs text-slate-500"><p><Link to="/forgot-password" className="font-semibold text-primary hover:text-blue-700">Forgot your password?</Link></p><p>New to the portal? <Link to="/register" className="font-semibold text-primary hover:text-blue-700">Create an account</Link></p></div>
        <p className="mt-6 text-center text-[11px] text-slate-400">© 2026 Quotation Global. All rights reserved.</p>
      </div>
    </section>
    <section className="relative hidden overflow-hidden bg-slate-950 lg:block" aria-hidden="true"><div className="absolute right-0 top-0 h-full w-2 bg-primary"/><div className="absolute right-16 top-24 h-56 w-56 border border-slate-700"/><div className="absolute bottom-28 right-48 h-32 w-32 border border-primary/60"/><div className="relative flex h-full flex-col justify-between p-12 xl:p-16"><BrandLogo inverse/><div className="max-w-xl"><div className="mb-6 h-px w-16 bg-primary"/><h2 className="text-4xl font-bold leading-tight text-white xl:text-5xl">Technology sourcing, managed from one place.</h2><p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Connect with technology partners, manage RFQs, and compare solutions across the global marketplace.</p></div><p className="text-xs text-slate-500">Secure administrator access</p></div></section>
  </main>
}
