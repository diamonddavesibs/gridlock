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

describe('post-claim phase', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function claimSquare(name = 'David', square = 'grid-square-2-4', claimLabel = /Claim \(2, 4\)/) {
    render(<JoinForm {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: name } })
    fireEvent.click(screen.getByText(square))
    fireEvent.click(screen.getByRole('button', { name: claimLabel }))
    await waitFor(() => expect(screen.getByText(/Claiming as:/)).toBeInTheDocument())
  }

  it('collapses name/contact inputs after first claim', async () => {
    await claimSquare()
    expect(screen.queryByPlaceholderText('Your name')).not.toBeInTheDocument()
  })

  it('shows the user name in collapsed header', async () => {
    await claimSquare()
    const header = screen.getByText(/Claiming as:/)
    expect(header).toHaveTextContent('David')
  })

  it('resets selected square to none after claim', async () => {
    await claimSquare()
    expect(screen.queryByRole('button', { name: /Claim/ })).not.toBeInTheDocument()
  })

  it('shows I\'m finished button after first claim', async () => {
    await claimSquare()
    expect(screen.getByRole('button', { name: /I'm finished/ })).toBeInTheDocument()
  })

  it('shows success hint with last claimed coordinates', async () => {
    await claimSquare()
    expect(screen.getByText(/\(2, 4\) claimed/)).toBeInTheDocument()
  })
})

describe('confirm screen', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function claimAndFinish() {
    render(<JoinForm {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'David' } })
    // Claim first square
    fireEvent.click(screen.getByText('grid-square-2-4'))
    fireEvent.click(screen.getByRole('button', { name: /Claim \(2, 4\)/ }))
    await waitFor(() => screen.getByRole('button', { name: /I'm finished/ }))
    // Claim second square
    fireEvent.click(screen.getByText('grid-square-7-1'))
    fireEvent.click(screen.getByRole('button', { name: /Claim \(7, 1\)/ }))
    await waitFor(() => screen.getByRole('button', { name: /I'm finished/ }))
    // Open confirm screen
    fireEvent.click(screen.getByRole('button', { name: /I'm finished/ }))
  }

  it('shows confirm heading', async () => {
    await claimAndFinish()
    expect(screen.getByText(/Confirm your squares/)).toBeInTheDocument()
  })

  it('lists all claimed squares', async () => {
    await claimAndFinish()
    expect(screen.getByText('Row 2, Col 4')).toBeInTheDocument()
    expect(screen.getByText('Row 7, Col 1')).toBeInTheDocument()
  })

  it('shows square count', async () => {
    await claimAndFinish()
    expect(screen.getByText(/You claimed 2 squares/)).toBeInTheDocument()
  })

  it('returns to claiming phase when Go back is clicked', async () => {
    await claimAndFinish()
    fireEvent.click(screen.getByRole('button', { name: /Go back/ }))
    expect(screen.getByRole('button', { name: /I'm finished/ })).toBeInTheDocument()
    expect(screen.queryByText(/Confirm your squares/)).not.toBeInTheDocument()
  })
})

describe('done screen', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows personalised success message with count after confirming', async () => {
    render(<JoinForm {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'David' } })
    fireEvent.click(screen.getByText('grid-square-2-4'))
    fireEvent.click(screen.getByRole('button', { name: /Claim \(2, 4\)/ }))
    await waitFor(() => screen.getByRole('button', { name: /I'm finished/ }))
    fireEvent.click(screen.getByRole('button', { name: /I'm finished/ }))
    await waitFor(() => screen.getByText(/Confirm your squares/))
    fireEvent.click(screen.getByRole('button', { name: /Looks good/ }))
    expect(screen.getByText(/Good luck, David/)).toBeInTheDocument()
    expect(screen.getByText(/1 square/)).toBeInTheDocument()
  })
})
