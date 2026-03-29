# Multi-Square Claiming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow guests to claim multiple squares in a single page visit without re-entering their name/contact info between claims.

**Architecture:** All changes are confined to `JoinForm.tsx`. State is expanded from a single `claimed` boolean to a `phase` enum and a `claimedSquares` array. Toggle-select logic (tap same square to deselect) lives in a new `handleSelectSquare` handler. No API, database, or other component changes required.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest + React Testing Library, Tailwind CSS

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `gridlock/vitest.config.ts` | Add `@/` path alias so component tests can import from the project root |
| Create | `gridlock/tests/components/JoinForm.test.tsx` | Component tests for all new behaviour |
| Modify | `gridlock/app/join/[token]/JoinForm.tsx` | All UX changes live here |

---

### Task 1: Add `@/` path alias to vitest config

The existing vitest config lacks the `@/` alias that the codebase uses. Without it, component tests that import (or mock) `@/components/grid/Grid` will fail to resolve.

**Files:**
- Modify: `gridlock/vitest.config.ts`

- [ ] **Step 1: Update vitest.config.ts**

Replace the entire file contents with:

```ts
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 2: Verify existing tests still pass**

Run from `gridlock/`:
```bash
npx vitest run
```
Expected: all existing tests pass (numbers, winner, pools, scores).

- [ ] **Step 3: Commit**

```bash
git add gridlock/vitest.config.ts
git commit -m "chore: add @/ path alias to vitest config"
```

---

### Task 2: Toggle-select behaviour

A square tapped for the first time is selected (shows Claim button). Tapping the same square again deselects it (Claim button disappears). Tapping a different square switches the selection.

**Files:**
- Create: `gridlock/tests/components/JoinForm.test.tsx`
- Modify: `gridlock/app/join/[token]/JoinForm.tsx`

- [ ] **Step 1: Write the failing tests**

Create `gridlock/tests/components/JoinForm.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/components/JoinForm.test.tsx
```
Expected: FAIL — `handleSelectSquare` not yet implemented (currently any tap selects without toggle).

- [ ] **Step 3: Implement toggle-select in JoinForm**

Replace the entire contents of `gridlock/app/join/[token]/JoinForm.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import { Grid } from '@/components/grid/Grid'

type Phase = 'form' | 'claiming' | 'confirm' | 'done'

export default function JoinForm({
  poolId, poolStatus, teamHome, teamAway,
  initialSquares, initialPoolNumbers, initialSnapshots,
}: {
  poolId: string, poolStatus: string, teamHome: string, teamAway: string,
  initialSquares: any[], initialPoolNumbers: any[], initialSnapshots: any[]
}) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [contactType, setContactType] = useState<'email' | 'sms'>('email')
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null)
  const [claimedSquares, setClaimedSquares] = useState<{ row: number; col: number }[]>([])
  const [lastClaimed, setLastClaimed] = useState<{ row: number; col: number } | null>(null)
  const [phase, setPhase] = useState<Phase>('form')

  function handleSelectSquare(row: number, col: number) {
    if (selectedSquare?.row === row && selectedSquare?.col === col) {
      setSelectedSquare(null)
    } else {
      setSelectedSquare({ row, col })
    }
  }

  async function handleClaim() {
    if (!selectedSquare || !name) return
    const res = await fetch(`/api/pools/${poolId}/squares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        row: selectedSquare.row,
        col: selectedSquare.col,
        guest_name: name,
        guest_email: contactType === 'email' ? contact : undefined,
        guest_phone: contactType === 'sms' ? contact : undefined,
      }),
    })
    if (res.ok) {
      setClaimedSquares(prev => [...prev, selectedSquare])
      setLastClaimed(selectedSquare)
      setSelectedSquare(null)
      setPhase('claiming')
    }
  }

  if (phase === 'confirm') {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Confirm your squares</h2>
        <p className="text-slate-400 text-sm">
          You claimed {claimedSquares.length} square{claimedSquares.length !== 1 ? 's' : ''}:
        </p>
        <ul className="list-disc list-inside text-slate-200 space-y-1">
          {claimedSquares.map(sq => (
            <li key={`${sq.row}-${sq.col}`}>Row {sq.row}, Col {sq.col}</li>
          ))}
        </ul>
        <button
          onClick={() => setPhase('done')}
          className="w-full bg-green-700 text-white rounded py-2"
        >
          Looks good — I&apos;m done! 🎉
        </button>
        <button
          onClick={() => setPhase('claiming')}
          className="w-full bg-slate-800 border border-slate-600 text-slate-300 rounded py-2"
        >
          ← Go back and claim more
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <p className="text-green-400 text-lg">
        🎉 Good luck, {name}! You&apos;ve claimed {claimedSquares.length} square{claimedSquares.length !== 1 ? 's' : ''}.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {phase === 'form' ? (
        <>
          <input
            className="w-full border rounded px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <div className="flex gap-2">
            <select
              className="border rounded px-3 py-2 bg-slate-800 text-slate-100"
              value={contactType}
              onChange={e => setContactType(e.target.value as 'email' | 'sms')}
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
            <input
              className="flex-1 border rounded px-3 py-2 bg-slate-800 text-slate-100 placeholder:text-slate-400"
              placeholder={contactType === 'email' ? 'your@email.com' : '+1 (555) 000-0000'}
              value={contact}
              onChange={e => setContact(e.target.value)}
            />
          </div>
        </>
      ) : (
        <div className="flex items-center bg-slate-800 rounded px-4 py-2">
          <span className="text-slate-400">
            Claiming as: <strong className="text-slate-100">{name}</strong>
          </span>
        </div>
      )}

      {lastClaimed && phase === 'claiming' ? (
        <p className="text-green-400 text-sm">
          ✓ ({lastClaimed.row}, {lastClaimed.col}) claimed — tap a square to select another
        </p>
      ) : (
        <p className="text-slate-400 text-sm">Tap a square below to claim it</p>
      )}

      {selectedSquare && (
        <button onClick={handleClaim} className="w-full bg-blue-600 text-white rounded py-2">
          Claim ({selectedSquare.row}, {selectedSquare.col})
        </button>
      )}

      <Grid
        poolId={poolId}
        teamHome={teamHome}
        teamAway={teamAway}
        initialSquares={initialSquares}
        initialPoolNumbers={initialPoolNumbers}
        initialSnapshots={initialSnapshots}
        onClaimSquare={handleSelectSquare}
      />

      {phase === 'claiming' && (
        <button
          onClick={() => setPhase('confirm')}
          className="w-full bg-slate-800 border border-slate-600 text-slate-300 rounded py-2"
        >
          I&apos;m finished
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run toggle-select tests to confirm they pass**

```bash
npx vitest run tests/components/JoinForm.test.tsx --reporter=verbose
```
Expected: all 3 `toggle-select` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add gridlock/tests/components/JoinForm.test.tsx gridlock/app/join/[token]/JoinForm.tsx
git commit -m "feat: toggle-select squares in join form"
```

---

### Task 3: Post-claim phase — form collapse and I'm finished button

After a successful claim the name/contact fields collapse to a "Claiming as: [name]" label. `selectedSquare` resets to null. An "I'm finished" button appears.

**Files:**
- Modify: `gridlock/tests/components/JoinForm.test.tsx` (add tests)
- No changes to `JoinForm.tsx` — this behaviour is already in the implementation from Task 2.

- [ ] **Step 1: Write failing tests**

Append to `gridlock/tests/components/JoinForm.test.tsx` (after the `toggle-select` describe block):

```tsx
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
    expect(screen.getByText('David')).toBeInTheDocument()
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
```

- [ ] **Step 2: Run to confirm tests pass**

```bash
npx vitest run tests/components/JoinForm.test.tsx --reporter=verbose
```
Expected: all 8 tests PASS (3 from Task 2 + 5 new).

- [ ] **Step 3: Commit**

```bash
git add gridlock/tests/components/JoinForm.test.tsx
git commit -m "test: post-claim phase behaviour"
```

---

### Task 4: Confirm screen

Clicking "I'm finished" shows a confirmation screen listing every claimed square. Two buttons: confirm (→ done) and go back (→ claiming).

**Files:**
- Modify: `gridlock/tests/components/JoinForm.test.tsx` (add tests)
- No changes to `JoinForm.tsx` — already implemented in Task 2.

- [ ] **Step 1: Write failing tests**

Append to `gridlock/tests/components/JoinForm.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run to confirm tests pass**

```bash
npx vitest run tests/components/JoinForm.test.tsx --reporter=verbose
```
Expected: all 12 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add gridlock/tests/components/JoinForm.test.tsx
git commit -m "test: confirm screen lists claimed squares"
```

---

### Task 5: Done screen

After confirming, the done screen shows a personalised success message with the square count.

**Files:**
- Modify: `gridlock/tests/components/JoinForm.test.tsx` (add tests)
- No changes to `JoinForm.tsx` — already implemented in Task 2.

- [ ] **Step 1: Write failing tests**

Append to `gridlock/tests/components/JoinForm.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run to confirm tests pass**

```bash
npx vitest run tests/components/JoinForm.test.tsx --reporter=verbose
```
Expected: all 13 tests PASS.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add gridlock/tests/components/JoinForm.test.tsx
git commit -m "test: done screen shows personalised message with count"
```
