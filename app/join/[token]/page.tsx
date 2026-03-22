import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import JoinForm from './JoinForm'

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: pool } = await supabase
    .from('pools')
    .select('id, name, sport, team_home, team_away, status, squares(*), pool_numbers(*), score_snapshots(*)')
    .eq('join_token', token)
    .single()

  if (!pool || pool.status === 'completed') notFound()

  return (
    <div className="min-h-screen p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">{pool.name}</h1>
      <p className="text-slate-400 mb-6">{pool.team_home} vs {pool.team_away}</p>
      <JoinForm
        poolId={pool.id}
        poolStatus={pool.status}
        teamHome={pool.team_home}
        teamAway={pool.team_away}
        initialSquares={pool.squares}
        initialPoolNumbers={pool.pool_numbers}
        initialSnapshots={pool.score_snapshots}
      />
    </div>
  )
}
