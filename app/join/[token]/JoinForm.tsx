'use client'
import { useState } from 'react'
import { Grid } from '@/components/grid/Grid'

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
  const [selectedSquare, setSelectedSquare] = useState<{row: number, col: number} | null>(null)
  const [claimed, setClaimed] = useState(false)

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
    if (res.ok) setClaimed(true)
  }

  if (claimed) return <p className="text-green-400 text-lg">Square claimed! Good luck 🎉</p>

  return (
    <div className="space-y-4">
      <input className="w-full border rounded px-3 py-2 bg-slate-800" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
      <div className="flex gap-2">
        <select className="border rounded px-3 py-2 bg-slate-800" value={contactType} onChange={e => setContactType(e.target.value as any)}>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </select>
        <input className="flex-1 border rounded px-3 py-2 bg-slate-800" placeholder={contactType === 'email' ? 'your@email.com' : '+1 (555) 000-0000'} value={contact} onChange={e => setContact(e.target.value)} />
      </div>
      <p className="text-slate-400 text-sm">Tap a square below to claim it</p>
      {selectedSquare && (
        <button onClick={handleClaim} className="w-full bg-blue-600 text-white rounded py-2">
          Claim Square ({selectedSquare.row}, {selectedSquare.col})
        </button>
      )}
      <Grid
        poolId={poolId}
        teamHome={teamHome}
        teamAway={teamAway}
        initialSquares={initialSquares}
        initialPoolNumbers={initialPoolNumbers}
        initialSnapshots={initialSnapshots}
        onClaimSquare={(row, col) => setSelectedSquare({ row, col })}
      />
    </div>
  )
}
