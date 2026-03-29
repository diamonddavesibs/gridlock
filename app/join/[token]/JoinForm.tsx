'use client'
import { useState } from 'react'
import { Grid } from '@/components/grid/Grid'

type Phase = 'form' | 'claiming' | 'confirm' | 'done'

export default function JoinForm({
  poolId, poolStatus, teamHome, teamAway,
  initialSquares, initialPoolNumbers, initialSnapshots,
}: {
  poolId: string, poolStatus: string, teamHome: string, teamAway: string,
  initialSquares: any[], initialPoolNumbers: any[], initialSnapshots: any[]
}) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [contactType, setContactType] = useState<'email' | 'sms'>('email')
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null)
  const [claimedSquares, setClaimedSquares] = useState<{ row: number; col: number }[]>([])
  const [lastClaimed, setLastClaimed] = useState<{ row: number; col: number } | null>(null)
  const [phase, setPhase] = useState<Phase>('form')

  function handleSelectSquare(row: number, col: number) {
    if (selectedSquare?.row === row && selectedSquare?.col === col) {
      setSelectedSquare(null)
    } else {
      setSelectedSquare({ row, col })
    }
  }

  async function handleClaim() {
    if (!selectedSquare || !name) return
    const res = await fetch(`/api/pools/${poolId}/squares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        row: selectedSquare.row,
        col: selectedSquare.col,
        guest_name: name,
        guest_email: contactType === 'email' ? contact : undefined,
        guest_phone: contactType === 'sms' ? contact : undefined,
      }),
    })
    if (res.ok) {
      setClaimedSquares(prev => [...prev, selectedSquare])
      setLastClaimed(selectedSquare)
      setSelectedSquare(null)
      setPhase('claiming')
    }
  }

  if (phase === 'confirm') {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Confirm your squares</h2>
        <p className="text-slate-400 text-sm">
          You claimed {claimedSquares.length} square{claimedSquares.length !== 1 ? 's' : ''}:
        </p>
        <ul className="list-disc list-inside text-slate-200 space-y-1">
          {claimedSquares.map(sq => (
            <li key={`${sq.row}-${sq.col}`}>Row {sq.row}, Col {sq.col}</li>
          ))}
        </ul>
        <button
          onClick={() => setPhase('done')}
          className="w-full bg-green-700 text-white rounded py-2"
        >
          Looks good — I&apos;m done! 🎉
        </button>
        <button
          onClick={() => setPhase('claiming')}
          className="w-full bg-slate-800 border border-slate-600 text-slate-300 rounded py-2"
        >
          ← Go back and claim more
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <p className="text-green-400 text-lg">
        🎉 Good luck, {name}! You&apos;ve claimed {claimedSquares.length} square{claimedSquares.length !== 1 ? 's' : ''}.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {phase === 'form' ? (
        <>
          <input
            className="w-full border rounded px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <div className="flex gap-2">
            <select
              className="border rounded px-3 py-2 bg-slate-800 text-slate-100"
              value={contactType}
              onChange={e => setContactType(e.target.value as 'email' | 'sms')}
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
            <input
              className="flex-1 border rounded px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400"
              placeholder={contactType === 'email' ? 'your@email.com' : '+1 (555) 000-0000'}
              value={contact}
              onChange={e => setContact(e.target.value)}
            />
          </div>
        </>
      ) : (
        <div className="flex items-center bg-slate-800 rounded px-4 py-2">
          <span className="text-slate-400">
            Claiming as: <strong className="text-slate-100">{name}</strong>
          </span>
        </div>
      )}

      {lastClaimed && phase === 'claiming' ? (
        <p className="text-green-400 text-sm">
          ✓ ({lastClaimed.row}, {lastClaimed.col}) claimed — tap a square to select another
        </p>
      ) : (
        <p className="text-slate-400 text-sm">Tap a square below to claim it</p>
      )}

      {selectedSquare && (
        <button onClick={handleClaim} className="w-full bg-blue-600 text-white rounded py-2">
          Claim ({selectedSquare.row}, {selectedSquare.col})
        </button>
      )}

      <Grid
        poolId={poolId}
        teamHome={teamHome}
        teamAway={teamAway}
        initialSquares={initialSquares}
        initialPoolNumbers={initialPoolNumbers}
        initialSnapshots={initialSnapshots}
        onClaimSquare={handleSelectSquare}
      />

      {phase === 'claiming' && (
        <button
          onClick={() => setPhase('confirm')}
          className="w-full bg-slate-800 border border-slate-600 text-slate-300 rounded py-2"
        >
          I&apos;m finished
        </button>
      )}
    </div>
  )
}
