'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GridHeaders } from './GridHeaders'
import { GridSquare } from './GridSquare'

interface Square {
  id: string
  row: number
  col: number
  guest_name: string | null
  owner_id: string | null
}

interface PoolNumber {
  axis: 'row' | 'col'
  position: number
  number: number
}

interface ScoreSnapshot {
  winning_square_id: string | null
  period_name: string
}

interface GridProps {
  poolId: string
  teamHome: string
  teamAway: string
  initialSquares: Square[]
  initialPoolNumbers: PoolNumber[]
  initialSnapshots: ScoreSnapshot[]
  selectedSquare?: { row: number, col: number } | null
  onClaimSquare?: (row: number, col: number) => void
}

export function Grid({
  poolId, teamHome, teamAway,
  initialSquares, initialPoolNumbers, initialSnapshots,
  selectedSquare,
  onClaimSquare,
}: GridProps) {
  const [squares, setSquares] = useState<Square[]>(initialSquares)
  const [poolNumbers, setPoolNumbers] = useState<PoolNumber[]>(initialPoolNumbers)
  const [snapshots, setSnapshots] = useState<ScoreSnapshot[]>(initialSnapshots)
  const supabase = createClient()

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`pool-${poolId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'squares', filter: `pool_id=eq.${poolId}` },
        payload => setSquares(prev => [...prev, payload.new as Square]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pool_numbers', filter: `pool_id=eq.${poolId}` },
        payload => setPoolNumbers(prev => [...prev, payload.new as PoolNumber]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'score_snapshots', filter: `pool_id=eq.${poolId}` },
        payload => setSnapshots(prev => [...prev, payload.new as ScoreSnapshot]))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [poolId])

  const getSquareAt = (row: number, col: number) =>
    squares.find(s => s.row === row && s.col === col)

  const getColNumbers = () =>
    Array.from({ length: 10 }, (_, i) =>
      poolNumbers.find(n => n.axis === 'col' && n.position === i)?.number ?? null)

  const getRowNumber = (pos: number) =>
    poolNumbers.find(n => n.axis === 'row' && n.position === pos)?.number ?? null

  const winnerIds = new Set(snapshots.map(s => s.winning_square_id).filter(Boolean))
  const latestWinnerId = snapshots.at(-1)?.winning_square_id ?? null

  return (
    <div className="overflow-x-auto">
      <GridHeaders colNumbers={getColNumbers()} rowNumbers={[]} teamHome={teamHome} teamAway={teamAway} />
      {Array.from({ length: 10 }, (_, row) => (
        <div key={row} className="flex mb-px items-center">
          <div className="w-14 h-14 flex items-center justify-center text-sm font-bold text-amber-400 bg-amber-950 rounded mr-px">
            {getRowNumber(row) ?? '?'}
          </div>
          {Array.from({ length: 10 }, (_, col) => {
            const sq = getSquareAt(row, col)
            return (
              <GridSquare
                key={col}
                row={row}
                col={col}
                ownerName={sq?.guest_name ?? null}
                ownerId={sq?.owner_id ?? null}
                isWinner={Boolean(sq?.id && winnerIds.has(sq.id))}
                isCurrentWinner={Boolean(sq?.id && latestWinnerId && sq.id === latestWinnerId)}
                isSelected={selectedSquare?.row === row && selectedSquare?.col === col}
                onClaim={onClaimSquare}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
