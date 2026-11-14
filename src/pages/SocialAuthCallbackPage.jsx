import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getCurrentUserWithToken } from '../api/auth'
import { saveAuth } from '../auth/session'

export default function SocialAuthCallbackPage() {
  const location = useLocation(); const navigate = useNavigate(); const [error, setError] = useState('')
  useEffect(() => {
    const token = new URLSearchParams(location.search).get('token')
    if (!token) { setError('Social login did not return a session.'); return }
    getCurrentUserWithToken(token).then((response) => { saveAuth(response.user, token, true); navigate(response.user?.account_type === 'buyer' ? '/marketplace' : '/vendors', { replace: true }) }).catch((requestError) => setError(requestError.message))
  }, [location.search, navigate])
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="rounded-xl bg-white p-8 text-center shadow-subtle"><p className="text-sm font-semibold text-slate-700">{error || 'Completing secure sign in...'}</p>{error && <a href="/login" className="mt-4 inline-block text-sm font-bold text-primary">Back to sign in</a>}</div></main>
}
