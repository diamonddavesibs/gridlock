'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function ManagePage() {
  const { id } = useParams()
  const [period, setPeriod] = useState('')
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [result, setResult] = useState('')

  async function recordScore(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(`/api/pools/${id}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_name: period, home_score: parseInt(homeScore), away_score: parseInt(awayScore) }),
    })
    const data = await res.json()
    setResult(res.ok ? `✅ Score recorded. Winner square ID: ${data.winning_square_id ?? 'none'}` : `❌ ${data.error}`)
  }

  return (
    <div className="p-6 max-w-md">
      <h2 className="text-xl font-bold mb-4">Record Score</h2>
      <form onSubmit={recordScore} className="space-y-3">
        <input className="w-full border rounded px-3 py-2 bg-slate-800" placeholder="Period (e.g. Q1, Half, Final)" value={period} onChange={e => setPeriod(e.target.value)} required />
        <input type="number" className="w-full border rounded px-3 py-2 bg-slate-800" placeholder="Home score" value={homeScore} onChange={e => setHomeScore(e.target.value)} required />
        <input type="number" className="w-full border rounded px-3 py-2 bg-slate-800" placeholder="Away score" value={awayScore} onChange={e => setAwayScore(e.target.value)} required />
        <button type="submit" className="w-full bg-green-600 text-white rounded py-2">Record Score</button>
      </form>
      {result && <p className="mt-3 text-sm">{result}</p>}
    </div>
  )
}
