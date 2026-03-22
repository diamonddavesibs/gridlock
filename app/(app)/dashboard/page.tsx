import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: organizer } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user!.id)
    .single()

  const { data: pools } = await supabase
    .from('pools')
    .select('id, name, sport, status, join_token, team_home, team_away')
    .eq('organizer_id', organizer!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Pools</h1>
        <Link href="/pools/new" className="bg-blue-600 text-white rounded px-4 py-2">+ New Pool</Link>
      </div>
      <div className="space-y-3">
        {pools?.map(pool => (
          <div key={pool.id} className="border border-slate-700 rounded p-4 flex justify-between items-center">
            <div>
              <div className="font-medium">{pool.name}</div>
              <div className="text-sm text-slate-400">{pool.team_home} vs {pool.team_away} — {pool.status}</div>
            </div>
            <div className="flex gap-2">
              <Link href={`/pools/${pool.id}`} className="text-sm text-blue-400">View</Link>
              <Link href={`/pools/${pool.id}/manage`} className="text-sm text-green-400">Manage</Link>
            </div>
          </div>
        ))}
        {!pools?.length && <p className="text-slate-400">No pools yet. Create one!</p>}
      </div>
    </div>
  )
}
