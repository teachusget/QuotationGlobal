import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from '../components/common/BrandLogo'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/ui'
import SocialLoginChooser from '../components/auth/SocialLoginChooser'
import { startSocialLogin } from '../components/auth/socialLogin'

function GoogleLogo() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z"/><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.75Z"/><path fill="#FBBC05" d="M6.54 13.83A5.86 5.86 0 0 1 6.23 12c0-.64.11-1.26.31-1.83V7.64H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.36l3.24-2.53Z"/><path fill="#EA4335" d="M12 6.14c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.2 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.39l3.24 2.53C7.31 7.86 9.46 6.14 12 6.14Z"/></svg>
}

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
  const [socialProvider, setSocialProvider] = useState('')
  const socialError = new URLSearchParams(location.search).get('social_error')

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
    <section className="auth-scroll-panel flex min-h-0 items-start justify-center overflow-hidden px-5 py-3 sm:px-10 lg:py-8">
      <div className="auth-login-content flex min-h-full w-full max-w-[390px] flex-col">
        <div className="flex items-start justify-between gap-3"><Link to="/marketplace" aria-label="Open Quotation Global marketplace" className="min-w-0"><BrandLogo /></Link><Link to="/marketplace" className="mt-1 inline-flex shrink-0 items-center rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-primary transition hover:border-blue-300 hover:bg-blue-100">Marketplace</Link></div>
        <div className="auth-login-intro mt-6"><span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-primary"><LockKeyhole className="h-3.5 w-3.5"/>Secure portal</span><h1 className="mt-2 text-2xl font-bold text-slate-900 sm:mt-4">Welcome back</h1><p className="mt-1 text-sm text-slate-500 sm:mt-2">Sign in to manage Quotation Global.</p></div>
        <form onSubmit={submit} className="auth-login-form mt-3 space-y-2 sm:mt-6 sm:space-y-4" noValidate>
          {(error || socialError) && <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"><AlertCircle className="mt-px h-4 w-4 shrink-0"/><span>{error || socialError}</span></div>}
          <div><label htmlFor="login" className="mb-0.5 block text-xs font-semibold text-slate-700">Email address</label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input id="login" type="email" autoComplete="username" value={loginName} onChange={(event) => setLoginName(event.target.value)} className="h-10 w-full rounded-md border bg-white pl-10 pr-3 text-sm placeholder:text-slate-400" placeholder="name@example.com" autoFocus /></div></div>
          <div><label htmlFor="password" className="mb-0.5 block text-xs font-semibold text-slate-700">Password</label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 w-full rounded-md border bg-white pl-10 pr-11 text-sm placeholder:text-slate-400" placeholder="Enter your password"/><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></div>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-primary"/>Remember me</label>
          <Button type="submit" size="lg" loading={submitting} className="h-10 w-full">{submitting ? 'Signing in' : 'Sign in'}</Button>
        </form>
        <div className="auth-login-divider relative mt-3 sm:mt-5"><div className="absolute inset-x-0 top-1/2 border-t border-slate-200"/><span className="relative mx-auto block w-fit bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">or continue with</span></div>
        <div className="auth-login-social mt-2 grid grid-cols-2 gap-2 sm:mt-3"><button type="button" onClick={() => startSocialLogin('google', setSocialProvider)} className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50/40"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white ring-1 ring-slate-200"><GoogleLogo/></span>Google</button><button type="button" onClick={() => startSocialLogin('linkedin', setSocialProvider)} className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50/40"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#0a66c2] text-[11px] font-extrabold text-white">in</span>LinkedIn</button></div>
        <div className="auth-login-links mt-3 space-y-1 text-center text-xs text-slate-500 sm:mt-5 sm:space-y-2"><p><Link to="/forgot-password" className="font-semibold text-primary hover:text-blue-700">Forgot your password?</Link></p><p>New to the portal? <Link to="/register" className="font-semibold text-primary hover:text-blue-700">Create an account</Link></p></div>
        <p className="mt-auto shrink-0 pt-2 text-center text-[11px] text-slate-400 sm:pt-6">© 2026 Quotation Global. All rights reserved.</p>
      </div>
    </section>
    <section className="relative hidden overflow-hidden bg-slate-950 lg:block" aria-hidden="true"><div className="absolute right-0 top-0 h-full w-2 bg-primary"/><div className="absolute right-16 top-24 h-56 w-56 border border-slate-700"/><div className="absolute bottom-28 right-48 h-32 w-32 border border-primary/60"/><div className="relative flex h-full flex-col justify-between p-12 xl:p-16"><Link to="/marketplace" aria-label="Open Quotation Global marketplace"><BrandLogo inverse/></Link><div className="max-w-xl"><div className="mb-6 h-px w-16 bg-primary"/><h2 className="text-4xl font-bold leading-tight text-white xl:text-5xl">Technology sourcing, managed from one place.</h2><p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Connect with technology partners, manage RFQs, and compare solutions across the global marketplace.</p></div><p className="text-xs text-slate-500">Secure administrator access</p></div></section>
    <SocialLoginChooser open={Boolean(socialProvider)} provider={socialProvider} onClose={() => setSocialProvider('')} />
  </main>
}
