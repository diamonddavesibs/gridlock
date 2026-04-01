'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const PERIOD_PRESETS: Record<string, string[]> = {
  NFL: ['Q1', 'Half', 'Q3', 'Final'],
  Soccer: ['Half', 'Final'],
  Custom: [],
}

export default function NewPoolPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', sport: 'NFL', team_home: '', team_away: '', game_date: '' })
  const [periods, setPeriods] = useState(PERIOD_PRESETS['NFL'])
  const [customPeriod, setCustomPeriod] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    if (key === 'sport') setPeriods(PERIOD_PRESETS[value] ?? PERIOD_PRESETS['Custom'])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setError(null)
    setSubmitting(true)

    const payload = {
      ...form,
      game_date: form.game_date ? new Date(form.game_date).toISOString() : undefined,
      payout_periods: periods,
    }

    const res = await fetch('/api/pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      if (data?.details?.length) {
        const details = data.details.map((d: { field?: string; message?: string }) => d.message || d.field).filter(Boolean)
        setError(details.join(' | '))
      } else {
        setError(data?.error || 'Unable to create pool. Please try again.')
      }
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    router.push(`/pools/${data.id}`)
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Create Pool</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="w-full border rounded px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400" placeholder="Pool name" value={form.name} onChange={e => set('name', e.target.value)} required />
        <select className="w-full border rounded px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400" value={form.sport} onChange={e => set('sport', e.target.value)}>
          <option>NFL</option><option>NCAA Football</option><option>NCAA Basketball</option><option>Soccer</option><option>Custom</option>
        </select>
        <input className="w-full border rounded px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400" placeholder="Home team" value={form.team_home} onChange={e => set('team_home', e.target.value)} required />
        <input className="w-full border rounded px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400" placeholder="Away team" value={form.team_away} onChange={e => set('team_away', e.target.value)} required />
        <input type="datetime-local" className="w-full border rounded px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400 [color-scheme:dark]" value={form.game_date} onChange={e => set('game_date', e.target.value)} />
        <div>
          <label className="text-sm text-slate-400">Payout periods: {periods.join(', ') || 'none'}</label>
          <div className="flex gap-2 mt-1">
            <input className="flex-1 border rounded px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400" placeholder="Add period (e.g. Q1)" value={customPeriod} onChange={e => setCustomPeriod(e.target.value)} />
            <button type="button" onClick={() => { if (customPeriod) { setPeriods(p => [...p, customPeriod]); setCustomPeriod('') } }} className="border rounded px-3 py-2">Add</button>
          </div>
        </div>
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-60">
          {submitting ? 'Creating...' : 'Create Pool'}
        </button>
      </form>
    </div>
  )
}
