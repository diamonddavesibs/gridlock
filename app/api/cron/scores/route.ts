import { createClient } from '@supabase/supabase-js'
import { fetchEspnScore } from '@/lib/sports-api/espn'
import { fetchFootballApiScore } from '@/lib/sports-api/football-api'
import { NextResponse } from 'next/server'

// Server-side only — uses service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all live pools with an external_game_id
  const { data: livePools } = await supabase
    .from('pools')
    .select('id, sport, external_game_id, payout_periods, team_home, team_away')
    .eq('status', 'live')
    .not('external_game_id', 'is', null)

  if (!livePools?.length) return NextResponse.json({ checked: 0 })

  for (const pool of livePools) {
    const isSoccer = pool.sport.toLowerCase().includes('soccer') ||
      pool.sport.toLowerCase().includes('fifa')

    const score = isSoccer
      ? await fetchFootballApiScore(pool.external_game_id)
      : await fetchEspnScore(pool.external_game_id, pool.sport)

    if (!score) continue

    // Only record scores at game completion — organizer handles mid-period entries
    if (!score.isCompleted) continue
    const period = (pool.payout_periods as string[]).at(-1) ?? 'Final'

    // Skip if this period already recorded
    const { count } = await supabase
      .from('score_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('pool_id', pool.id)
      .eq('period_name', period)

    if (!count) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/pools/${pool.id}/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ period_name: period, home_score: score.homeScore, away_score: score.awayScore }),
      })
    }

    // Note: For quarter-by-quarter scoring (NFL Q1/Q2/Q3/Final), the organizer
    // enters scores manually at each period. The cron job only handles final score auto-detection.
  }

  return NextResponse.json({ checked: livePools.length })
}
