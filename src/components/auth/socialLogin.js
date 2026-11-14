export function startSocialLogin(provider, onChoose) {
  try {
    const saved = JSON.parse(localStorage.getItem(`quotation_social_preference_${provider}`) || 'null')
    if (saved?.role) {
      const params = new URLSearchParams({ role: saved.role })
      if (saved.role === 'vendor') params.set('registration_type', saved.registrationType || 'freelancer')
      window.location.href = `/auth/${provider}/redirect?${params.toString()}`
      return
    }
  } catch { /* Treat an invalid preference as a first-time sign in. */ }
  onChoose(provider)
}
