import { createClient } from '@/lib/supabase/server'
import { generatePoolNumbers } from '@/lib/scoring/numbers'
import { sendSms } from '@/lib/notifications/sms'
import { sendEmail } from '@/lib/notifications/email'
import { numbersRevealMessage } from '@/lib/notifications/messages'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { row, col, guest_name, guest_email, guest_phone, owner_id } = body

  if (row == null || col == null) {
    return NextResponse.json({ error: 'row and col are required' }, { status: 400 })
  }

  // Check pool is open
  const { data: pool } = await supabase
    .from('pools')
    .select('id, status')
    .eq('id', id)
    .single()

  if (!pool || pool.status !== 'open') {
    return NextResponse.json({ error: 'Pool is not open for claiming' }, { status: 409 })
  }

  const { data: square, error } = await supabase
    .from('squares')
    .insert({ pool_id: id, row, col, owner_id, guest_name, guest_email, guest_phone })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Square already claimed' }, { status: 409 })

  // Check if all 100 squares are now claimed — if so, lock the pool and generate numbers
  const { count } = await supabase
    .from('squares')
    .select('*', { count: 'exact', head: true })
    .eq('pool_id', id)

  if (count === 100) {
    const entries = generatePoolNumbers()
    await supabase.from('pool_numbers').insert(
      entries.map(e => ({ pool_id: id, ...e }))
    )
    await supabase.from('pools').update({ status: 'locked' }).eq('id', id)

    // Send numbers-reveal notifications to all participants
    const { data: allSquares } = await supabase
      .from('squares')
      .select('row, col, guest_name, guest_email, guest_phone, users(display_name, email, phone)')
      .eq('pool_id', id)
    const { data: poolData } = await supabase.from('pools').select('team_home, team_away').eq('id', id).single()
    const rowNums = entries.filter(e => e.axis === 'row')
    const colNums = entries.filter(e => e.axis === 'col')
    for (const sq of (allSquares ?? [])) {
      const rowNum = rowNums.find(n => n.position === sq.row)?.number
      const colNum = colNums.find(n => n.position === sq.col)?.number
      const msg = numbersRevealMessage(poolData!.team_home, poolData!.team_away, rowNum!, colNum!)
      const phone = (sq as any).guest_phone ?? (sq as any).users?.phone
      const email = (sq as any).guest_email ?? (sq as any).users?.email
      if (phone) sendSms({ to: phone, body: msg }).catch(console.error)
      if (email) sendEmail({ to: email, subject: 'GridLock — Numbers Revealed!', text: msg }).catch(console.error)
    }
  }

  return NextResponse.json(square, { status: 201 })
}
