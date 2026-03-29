import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import JoinForm from '@/app/join/[token]/JoinForm'

// Mock Grid so tests don't need Supabase
vi.mock('@/components/grid/Grid', () => ({
  Grid: ({ onClaimSquare }: { onClaimSquare?: (row: number, col: number) => void }) => (
    <div data-testid="grid">
      <button type="button" onClick={() => onClaimSquare?.(2, 4)}>grid-square-2-4</button>
      <button type="button" onClick={() => onClaimSquare?.(7, 1)}>grid-square-7-1</button>
    </div>
  ),
}))

const defaultProps = {
  poolId: 'pool-1',
  poolStatus: 'open',
  teamHome: 'Home',
  teamAway: 'Away',
  initialSquares: [],
  initialPoolNumbers: [],
  initialSnapshots: [],
}

describe('toggle-select', () => {
  it('shows Claim button when a square is tapped', () => {
    render(<JoinForm {...defaultProps} />)
    fireEvent.click(screen.getByText('grid-square-2-4'))
    expect(screen.getByRole('button', { name: /Claim \(2, 4\)/ })).toBeInTheDocument()
  })

  it('hides Claim button when the same square is tapped again', () => {
    render(<JoinForm {...defaultProps} />)
    fireEvent.click(screen.getByText('grid-square-2-4'))
    fireEvent.click(screen.getByText('grid-square-2-4'))
    expect(screen.queryByRole('button', { name: /Claim/ })).not.toBeInTheDocument()
  })

  it('switches selection when a different square is tapped', () => {
    render(<JoinForm {...defaultProps} />)
    fireEvent.click(screen.getByText('grid-square-2-4'))
    fireEvent.click(screen.getByText('grid-square-7-1'))
    expect(screen.getByRole('button', { name: /Claim \(7, 1\)/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Claim \(2, 4\)/ })).not.toBeInTheDocument()
  })
})
