import { describe, it, expect } from 'vitest'
import { resolveWinner } from '../../lib/scoring/winner'
import { generatePoolNumbers } from '../../lib/scoring/numbers'

describe('score snapshot winner resolution', () => {
  it('resolves a winner when scores have matching last digits', () => {
    const poolNumbers = generatePoolNumbers()
    // Find what row=home, col=away would match score 24, 17
    const winner = resolveWinner(24, 17, poolNumbers)
    expect(winner).not.toBeNull()
    expect(winner!.row).toBeGreaterThanOrEqual(0)
    expect(winner!.col).toBeGreaterThanOrEqual(0)
  })

  it('resolveWinner is deterministic for the same pool numbers', () => {
    const poolNumbers = generatePoolNumbers()
    const a = resolveWinner(21, 14, poolNumbers)
    const b = resolveWinner(21, 14, poolNumbers)
    expect(a).toEqual(b)
  })
})
