import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveWinner } from '@/lib/scoring/winner'
import { sendSms } from '@/lib/notifications/sms'
import { sendEmail } from '@/lib/notifications/email'
import { periodWinnerMessage } from '@/lib/notifications/messages'
import type { PoolNumberEntry } from '@/lib/scoring/numbers'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Allow cron job to call this route using CRON_SECRET bearer token (no user session)
  const authHeader = request.headers.get('authorization')
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  let supabase: any
  if (isCron) {
    // Use service role to bypass RLS for cron-triggered score recording
    supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  } else {
    supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { period_name, home_score, away_score } = await request.json()

  // Fetch pool and pool_numbers
  const { data: pool } = await supabase
    .from('pools')
    .select('*, pool_numbers(*)')
    .eq('id', id)
    .single()

  if (!pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 })

  // Resolve winner
  const position = resolveWinner(home_score, away_score, pool.pool_numbers as PoolNumberEntry[])

  let winning_square_id: string | null = null
  let winnerSquare: any = null

  if (position) {
    const { data: square } = await supabase
      .from('squares')
      .select('*, users(display_name, phone, email)')
      .eq('pool_id', id)
      .eq('row', position.row)
      .eq('col', position.col)
      .single()

    if (square) {
      winning_square_id = square.id
      winnerSquare = square
    }
  }

  // Record snapshot
  const { data: snapshot } = await supabase
    .from('score_snapshots')
    .insert({ pool_id: id, period_name, home_score, away_score, winning_square_id })
    .select()
    .single()

  // Send notifications (fire and forget)
  if (winnerSquare) {
    const winnerName = winnerSquare.guest_name ?? winnerSquare.users?.display_name ?? 'Unknown'
    const allSquares = await supabase
      .from('squares')
      .select('guest_name, guest_email, guest_phone, users(display_name, email, phone)')
      .eq('pool_id', id)

    for (const sq of (allSquares.data ?? [])) {
      const isWinner = sq === winnerSquare
      const msg = periodWinnerMessage(period_name, pool.team_home, home_score, pool.team_away, away_score, isWinner, winnerName)
      const phone = (sq as any).guest_phone ?? (sq as any).users?.phone
      const email = (sq as any).guest_email ?? (sq as any).users?.email
      if (phone) sendSms({ to: phone, body: msg }).catch(console.error)
      if (email) sendEmail({ to: email, subject: `GridLock — ${period_name} Result`, text: msg }).catch(console.error)
    }
  }

  // Auto-complete pool when the final payout period score is recorded
  const lastPeriod = (pool.payout_periods as string[]).at(-1)
  if (period_name === lastPeriod) {
    await supabase.from('pools').update({ status: 'completed' }).eq('id', id)
  }

  return NextResponse.json(snapshot, { status: 201 })
}
