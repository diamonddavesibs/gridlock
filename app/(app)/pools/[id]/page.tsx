import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Grid } from '@/components/grid/Grid'

export default async function PoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: pool } = await supabase
    .from('pools')
    .select('*, squares(*), pool_numbers(*), score_snapshots(*)')
    .eq('id', id)
    .single()

  if (!pool) notFound()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">{pool.name}</h1>
      <p className="text-slate-400 mb-6">{pool.team_home} vs {pool.team_away} — {pool.status}</p>
      <Grid
        poolId={pool.id}
        teamHome={pool.team_home}
        teamAway={pool.team_away}
        initialSquares={pool.squares}
        initialPoolNumbers={pool.pool_numbers}
        initialSnapshots={pool.score_snapshots}
      />
    </div>
  )
}
