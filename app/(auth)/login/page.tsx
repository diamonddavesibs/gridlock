'use client'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })

    setSubmitting(false)

    if (otpError) {
      setError(otpError.message)
      return
    }

    setSent(true)
  }

  async function handleGoogle() {
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })

    if (oauthError) {
      setError(oauthError.message)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Check your email for a login link!</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">GridLock</h1>
        <form onSubmit={handleMagicLink} className="space-y-3">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border rounded px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-60"
          >
            {submitting ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
        {error && (
          <p className="text-sm text-red-400" role="alert">{error}</p>
        )}
        <button onClick={handleGoogle} className="w-full border rounded py-2">
          Continue with Google
        </button>
        {/* Apple sign-in and anonymous auth deferred to v2 */}
      </div>
    </div>
  )
}
