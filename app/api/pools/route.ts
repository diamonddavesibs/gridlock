import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get organizer user record
  const { data: organizer } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!organizer || !['admin', 'organizer'].includes(organizer.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, sport, team_home, team_away, payout_periods, game_date, external_game_id } = body

  if (!name || !sport || !team_home || !team_away) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: pool, error } = await supabase
    .from('pools')
    .insert({
      name,
      sport,
      team_home,
      team_away,
      organizer_id: organizer.id,
      payout_periods: payout_periods ?? ['Final'],
      game_date,
      external_game_id,
      status: 'open',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(pool, { status: 201 })
}
