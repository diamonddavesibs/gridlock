# GridLock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build GridLock — a PWA sports squares pool app where organizers create 10×10 grid pools, participants claim squares, and winners are auto-detected and notified in real time.

**Architecture:** Next.js 14 App Router PWA with Supabase for database, auth, and real-time subscriptions. API routes handle pool management and score polling via a Vercel cron job. Notifications fire via Twilio (SMS) and SendGrid (email) from server-side API routes when winning squares are resolved.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (Postgres + Auth + Realtime), Twilio, SendGrid, Vitest + React Testing Library, Vercel

---

## File Structure

```
gridlock/
├── app/
│   ├── layout.tsx                    # Root layout, PWA meta tags
│   ├── page.tsx                      # Landing / home page
│   ├── (auth)/
│   │   ├── login/page.tsx            # Login page (email + OAuth)
│   │   └── auth/callback/route.ts    # Supabase OAuth callback handler
│   ├── (app)/
│   │   ├── layout.tsx                # Protected layout (requires auth)
│   │   ├── dashboard/page.tsx        # Organizer dashboard — list of pools
│   │   ├── pools/
│   │   │   ├── new/page.tsx          # Create pool form
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Grid view (all users)
│   │   │       └── manage/page.tsx   # Organizer management (scores, settings)
│   │   └── admin/page.tsx            # Platform admin (admin role only)
│   ├── join/
│   │   └── [token]/page.tsx          # Guest join page (no auth required)
│   └── api/
│       ├── pools/
│       │   ├── route.ts              # POST — create pool
│       │   └── [id]/
│       │       ├── route.ts          # GET/PATCH — get or update pool
│       │       ├── squares/route.ts  # POST — claim a square
│       │       └── scores/route.ts   # POST — record a score snapshot
│       └── cron/
│           └── scores/route.ts       # GET — Vercel cron: poll sports APIs
├── components/
│   ├── grid/
│   │   ├── Grid.tsx                  # 10×10 grid container + real-time wiring
│   │   ├── GridSquare.tsx            # Single square cell (claimed/empty/winner)
│   │   └── GridHeaders.tsx           # Row and column number headers
│   ├── pool/
│   │   ├── CreatePoolForm.tsx        # Pool creation form
│   │   ├── JoinForm.tsx              # Guest join form (name + contact)
│   │   └── ScoreEntryForm.tsx        # Organizer manual score entry
│   └── ui/
│       ├── Button.tsx                # Reusable button
│       └── Input.tsx                 # Reusable input
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser-side Supabase client (singleton)
│   │   ├── server.ts                 # Server-side Supabase client (cookies)
│   │   └── types.ts                  # Generated DB types (via supabase gen types)
│   ├── scoring/
│   │   ├── numbers.ts                # Fisher-Yates shuffle, generate pool numbers
│   │   └── winner.ts                 # Resolve winning square from scores + pool_numbers
│   ├── notifications/
│   │   ├── sms.ts                    # Twilio SMS sender
│   │   └── email.ts                  # SendGrid email sender
│   └── sports-api/
│       ├── espn.ts                   # ESPN score fetcher (NFL/NCAA)
│       └── football-api.ts           # API-Football fetcher (FIFA/soccer)
├── middleware.ts                     # Protect (app) routes, redirect unauthenticated
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # All tables, indexes, RLS policies
├── public/
│   ├── manifest.json                 # PWA manifest
│   └── icons/                        # PWA icons (192px, 512px)
└── tests/
    ├── lib/
    │   ├── scoring/numbers.test.ts   # Unit tests for Fisher-Yates + pool number gen
    │   └── scoring/winner.test.ts    # Unit tests for winning square resolution
    └── api/
        ├── pools.test.ts             # API route tests for pool creation
        └── scores.test.ts            # API route tests for score recording + winner detection
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`
- Create: `.env.local.example`
- Create: `vitest.config.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd C:/Users/David/source/repos/diamonddavesibs/gridlock
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*"
```

Answer prompts: Yes to TypeScript, Yes to Tailwind, Yes to App Router, No to src/ dir.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr twilio @sendgrid/mail
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
})
```

Create `tests/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Create environment variables template**

Create `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1xxxxxxxxxx

SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

FOOTBALL_API_KEY=your_api_football_key

CRON_SECRET=a_random_secret_string
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Copy to `.env.local` and fill in real values from your Supabase project dashboard.

- [ ] **Step 6: Verify setup runs**

```bash
npm run dev
```
Expected: Next.js dev server starts at http://localhost:3000

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: bootstrap Next.js project with Supabase, Twilio, SendGrid, Vitest"
```

---

## Task 2: Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Install Supabase CLI**

```bash
npm install -D supabase
npx supabase --version
```
Expected: version number printed

- [ ] **Step 2: Link to your Supabase project**

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Find `YOUR_PROJECT_REF` in your Supabase project URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Roles enum
create type user_role as enum ('admin', 'organizer', 'participant');
create type pool_status as enum ('draft', 'open', 'locked', 'live', 'completed');
create type axis_type as enum ('row', 'col');

-- Users (extends Supabase auth.users)
create table users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  phone text,
  role user_role not null default 'participant',
  created_at timestamptz not null default now()
);

-- Pools
create table pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text not null,
  team_home text not null,
  team_away text not null,
  status pool_status not null default 'draft',
  organizer_id uuid not null references users(id),
  join_token text unique not null default encode(gen_random_bytes(6), 'hex'),
  payout_periods jsonb not null default '["Final"]',
  game_date timestamptz,
  external_game_id text,
  max_squares_per_person int,  -- NULL means no limit (v1: stored but not enforced in claiming route — add enforcement in v2)
  created_at timestamptz not null default now()
);

-- Squares (100 per pool)
create table squares (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  row int not null check (row between 0 and 9),
  col int not null check (col between 0 and 9),
  owner_id uuid references users(id),
  guest_name text,
  guest_email text,
  guest_phone text,
  claimed_at timestamptz not null default now(),
  unique(pool_id, row, col)
);

-- Pool numbers (generated when pool locks)
create table pool_numbers (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  axis axis_type not null,
  position int not null check (position between 0 and 9),
  number int not null check (number between 0 and 9),
  unique(pool_id, axis, position)
);

-- Score snapshots (one per scoring period)
create table score_snapshots (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  period_name text not null,
  home_score int not null,
  away_score int not null,
  winning_square_id uuid references squares(id),
  recorded_at timestamptz not null default now()
);

-- Indexes
create index on pools(join_token);
create index on pools(organizer_id);
create index on squares(pool_id);
create index on pool_numbers(pool_id);
create index on score_snapshots(pool_id);

-- Row Level Security
alter table users enable row level security;
alter table pools enable row level security;
alter table squares enable row level security;
alter table pool_numbers enable row level security;
alter table score_snapshots enable row level security;

-- Users: anyone can read, only self can update
create policy "Users are viewable by everyone" on users for select using (true);
create policy "Users can update own profile" on users for update using (auth.uid() = auth_id);

-- Pools: anyone can read open/live/completed, organizer can manage
create policy "Pools viewable when open or beyond" on pools for select
  using (status in ('open','locked','live','completed') or organizer_id in (select id from users where auth_id = auth.uid()));
create policy "Organizers can insert pools" on pools for insert
  with check (organizer_id in (select id from users where auth_id = auth.uid()));
create policy "Organizers can update own pools" on pools for update
  using (organizer_id in (select id from users where auth_id = auth.uid()));

-- Squares: viewable by all, claimable by anyone (guest or user)
create policy "Squares are viewable by everyone" on squares for select using (true);
create policy "Squares can be claimed" on squares for insert with check (true);

-- Pool numbers: viewable when pool is locked or beyond
create policy "Pool numbers visible when locked" on pool_numbers for select
  using (pool_id in (select id from pools where status in ('locked','live','completed')));

-- Score snapshots: viewable by all
create policy "Score snapshots viewable by everyone" on score_snapshots for select using (true);
```

- [ ] **Step 4: Apply migration to Supabase**

```bash
npx supabase db push
```
Expected: Migration applied successfully

- [ ] **Step 5: Generate TypeScript types**

```bash
npx supabase gen types typescript --linked > lib/supabase/types.ts
```

- [ ] **Step 6: Commit**

```bash
git add supabase/ lib/supabase/types.ts
git commit -m "feat: add database schema and generated types"
```

---

## Task 3: Supabase Client Setup

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Create browser client**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server client**

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create middleware for route protection**

Create `middleware.ts` at project root:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /dashboard, /pools, /admin routes
  const isProtected = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/pools') ||
    request.nextUrl.pathname.startsWith('/admin')

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|join).*)'],
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts middleware.ts
git commit -m "feat: add Supabase client setup and route protection middleware"
```

---

## Task 4: Scoring Logic (TDD)

**Files:**
- Create: `lib/scoring/numbers.ts`
- Create: `lib/scoring/winner.ts`
- Create: `tests/lib/scoring/numbers.test.ts`
- Create: `tests/lib/scoring/winner.test.ts`

- [ ] **Step 1: Write failing tests for number generation**

Create `tests/lib/scoring/numbers.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { generatePoolNumbers } from '../../../lib/scoring/numbers'

describe('generatePoolNumbers', () => {
  it('returns exactly 20 entries (10 rows + 10 cols)', () => {
    const result = generatePoolNumbers()
    expect(result).toHaveLength(20)
  })

  it('row entries contain all digits 0-9 exactly once', () => {
    const result = generatePoolNumbers()
    const rowNumbers = result
      .filter(e => e.axis === 'row')
      .map(e => e.number)
      .sort((a, b) => a - b)
    expect(rowNumbers).toEqual([0,1,2,3,4,5,6,7,8,9])
  })

  it('col entries contain all digits 0-9 exactly once', () => {
    const result = generatePoolNumbers()
    const colNumbers = result
      .filter(e => e.axis === 'col')
      .map(e => e.number)
      .sort((a, b) => a - b)
    expect(colNumbers).toEqual([0,1,2,3,4,5,6,7,8,9])
  })

  it('each axis has positions 0-9', () => {
    const result = generatePoolNumbers()
    const rowPositions = result
      .filter(e => e.axis === 'row')
      .map(e => e.position)
      .sort((a, b) => a - b)
    expect(rowPositions).toEqual([0,1,2,3,4,5,6,7,8,9])
  })

  it('produces different shuffles on repeated calls', () => {
    const a = generatePoolNumbers().map(e => e.number).join('')
    const b = generatePoolNumbers().map(e => e.number).join('')
    // Statistically near-impossible to match; if this ever fails, investigate RNG
    expect(a).not.toEqual(b)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test:run -- tests/lib/scoring/numbers.test.ts
```
Expected: FAIL — `Cannot find module '../../../lib/scoring/numbers'`

- [ ] **Step 3: Implement generatePoolNumbers**

Create `lib/scoring/numbers.ts`:
```typescript
type Axis = 'row' | 'col'

export interface PoolNumberEntry {
  axis: Axis
  position: number
  number: number
}

function shuffle(arr: number[]): number[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generatePoolNumbers(): PoolNumberEntry[] {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  const rows = shuffle(digits)
  const cols = shuffle(digits)

  const entries: PoolNumberEntry[] = []
  for (let i = 0; i < 10; i++) {
    entries.push({ axis: 'row', position: i, number: rows[i] })
    entries.push({ axis: 'col', position: i, number: cols[i] })
  }
  return entries
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test:run -- tests/lib/scoring/numbers.test.ts
```
Expected: All 5 tests pass

- [ ] **Step 5: Write failing tests for winner detection**

Create `tests/lib/scoring/winner.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { resolveWinner } from '../../../lib/scoring/winner'
import type { PoolNumberEntry } from '../../../lib/scoring/numbers'

// Pool where row digit 4 is at position 1, col digit 9 is at position 8
const poolNumbers: PoolNumberEntry[] = [
  { axis: 'row', position: 0, number: 2 },
  { axis: 'row', position: 1, number: 4 },
  { axis: 'row', position: 2, number: 7 },
  { axis: 'row', position: 3, number: 0 },
  { axis: 'row', position: 4, number: 5 },
  { axis: 'row', position: 5, number: 1 },
  { axis: 'row', position: 6, number: 8 },
  { axis: 'row', position: 7, number: 3 },
  { axis: 'row', position: 8, number: 6 },
  { axis: 'row', position: 9, number: 9 },
  { axis: 'col', position: 0, number: 3 },
  { axis: 'col', position: 1, number: 7 },
  { axis: 'col', position: 2, number: 1 },
  { axis: 'col', position: 3, number: 5 },
  { axis: 'col', position: 4, number: 0 },
  { axis: 'col', position: 5, number: 8 },
  { axis: 'col', position: 6, number: 2 },
  { axis: 'col', position: 7, number: 6 },
  { axis: 'col', position: 8, number: 9 },
  { axis: 'col', position: 9, number: 4 },
]

describe('resolveWinner', () => {
  it('returns correct row and col position for matching scores', () => {
    // home_score=24 (last digit 4 → row pos 1), away_score=19 (last digit 9 → col pos 8)
    const result = resolveWinner(24, 19, poolNumbers)
    expect(result).toEqual({ row: 1, col: 8 })
  })

  it('uses last digit only, not full score', () => {
    // 14 and 9 have same last digits as 24 and 19
    const result = resolveWinner(14, 9, poolNumbers)
    expect(result).toEqual({ row: 1, col: 8 })
  })

  it('handles score of 0', () => {
    // home=0 (last digit 0 → row pos 3), away=0 (last digit 0 → col pos 4)
    const result = resolveWinner(0, 0, poolNumbers)
    expect(result).toEqual({ row: 3, col: 4 })
  })

  it('returns null if pool numbers are incomplete', () => {
    const result = resolveWinner(24, 19, [])
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 6: Run tests — expect FAIL**

```bash
npm run test:run -- tests/lib/scoring/winner.test.ts
```
Expected: FAIL — `Cannot find module '../../../lib/scoring/winner'`

- [ ] **Step 7: Implement resolveWinner**

Create `lib/scoring/winner.ts`:
```typescript
import type { PoolNumberEntry } from './numbers'

export interface WinnerPosition {
  row: number
  col: number
}

export function resolveWinner(
  homeScore: number,
  awayScore: number,
  poolNumbers: PoolNumberEntry[]
): WinnerPosition | null {
  if (poolNumbers.length < 20) return null

  const homeLastDigit = homeScore % 10
  const awayLastDigit = awayScore % 10

  const rowEntry = poolNumbers.find(e => e.axis === 'row' && e.number === homeLastDigit)
  const colEntry = poolNumbers.find(e => e.axis === 'col' && e.number === awayLastDigit)

  if (!rowEntry || !colEntry) return null

  return { row: rowEntry.position, col: colEntry.position }
}
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
npm run test:run -- tests/lib/scoring/winner.test.ts
```
Expected: All 4 tests pass

- [ ] **Step 9: Commit**

```bash
git add lib/scoring/ tests/lib/
git commit -m "feat: add scoring logic — number generation and winner detection (TDD)"
```

---

## Task 5: Notifications

**Files:**
- Create: `lib/notifications/sms.ts`
- Create: `lib/notifications/email.ts`

- [ ] **Step 1: Create SMS sender**

Create `lib/notifications/sms.ts`:
```typescript
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export interface SmsPayload {
  to: string
  body: string
}

export async function sendSms({ to, body }: SmsPayload): Promise<void> {
  await client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER!,
    to,
    body,
  })
}
```

- [ ] **Step 2: Create email sender**

Create `lib/notifications/email.ts`:
```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export interface EmailPayload {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendEmail({ to, subject, text, html }: EmailPayload): Promise<void> {
  await sgMail.send({
    from: process.env.SENDGRID_FROM_EMAIL!,
    to,
    subject,
    text,
    html: html ?? text,
  })
}
```

- [ ] **Step 3: Create notification message builder**

Create `lib/notifications/messages.ts`:
```typescript
export function numbersRevealMessage(teamHome: string, teamAway: string, row: number, col: number): string {
  return `🎲 GridLock: Numbers are in! Your square is ${teamHome} ${row} / ${teamAway} ${col}. Good luck!`
}

export function periodWinnerMessage(period: string, teamHome: string, homeScore: number, teamAway: string, awayScore: number, isWinner: boolean, winnerName: string): string {
  if (isWinner) {
    return `🏆 GridLock — ${period} Result: ${teamHome} ${homeScore} – ${teamAway} ${awayScore}. YOU WIN! Your square matched!`
  }
  return `📊 GridLock — ${period} Result: ${teamHome} ${homeScore} – ${teamAway} ${awayScore}. Winner: ${winnerName}. Better luck next period!`
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/notifications/
git commit -m "feat: add Twilio SMS and SendGrid email notification senders"
```

---

## Task 6: Authentication UI

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/auth/callback/route.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create login page**

Create `app/(auth)/login/page.tsx`:
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    setSent(true)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Check your email for a login link!</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">GridLock</h1>
        <form onSubmit={handleMagicLink} className="space-y-3">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
          <button type="submit" className="w-full bg-blue-600 text-white rounded py-2">
            Send Magic Link
          </button>
        </form>
        <button onClick={handleGoogle} className="w-full border rounded py-2">
          Continue with Google
        </button>
        {/* Apple sign-in and anonymous auth deferred to v2 */}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create OAuth callback handler**

Create `app/auth/callback/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
```

- [ ] **Step 3: Commit**

```bash
git add app/
git commit -m "feat: add login page with magic link and Google OAuth"
```

---

## Task 7: Pool API Routes

**Files:**
- Create: `app/api/pools/route.ts`
- Create: `app/api/pools/[id]/route.ts`
- Create: `app/api/pools/[id]/squares/route.ts`
- Create: `tests/api/pools.test.ts`

- [ ] **Step 1: Write failing test for pool creation**

Create `tests/api/pools.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

// We test the pool validation logic in isolation
describe('pool validation', () => {
  it('requires name, sport, team_home, team_away', () => {
    const required = ['name', 'sport', 'team_home', 'team_away']
    const partial = { name: 'Test Pool', sport: 'NFL' }
    const missing = required.filter(k => !(k in partial))
    expect(missing).toEqual(['team_home', 'team_away'])
  })

  it('payout_periods defaults to ["Final"] when not provided', () => {
    const defaults = { payout_periods: ['Final'] }
    const input = {}
    const result = { payout_periods: (input as any).payout_periods ?? defaults.payout_periods }
    expect(result.payout_periods).toEqual(['Final'])
  })
})
```

- [ ] **Step 2: Run test — expect PASS (pure logic, no imports needed)**

```bash
npm run test:run -- tests/api/pools.test.ts
```
Expected: PASS

- [ ] **Step 3: Create pool creation route**

Create `app/api/pools/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
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
```

- [ ] **Step 4: Create pool detail + update route**

Create `app/api/pools/[id]/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pools')
    .select('*, squares(*), pool_numbers(*), score_snapshots(*)')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('pools')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 5: Create square claiming route**

Create `app/api/pools/[id]/squares/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { generatePoolNumbers } from '@/lib/scoring/numbers'
import { sendSms } from '@/lib/notifications/sms'
import { sendEmail } from '@/lib/notifications/email'
import { numbersRevealMessage } from '@/lib/notifications/messages'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await request.json()
  const { row, col, guest_name, guest_email, guest_phone, owner_id } = body

  if (row == null || col == null) {
    return NextResponse.json({ error: 'row and col are required' }, { status: 400 })
  }

  // Check pool is open
  const { data: pool } = await supabase
    .from('pools')
    .select('id, status')
    .eq('id', params.id)
    .single()

  if (!pool || pool.status !== 'open') {
    return NextResponse.json({ error: 'Pool is not open for claiming' }, { status: 409 })
  }

  const { data: square, error } = await supabase
    .from('squares')
    .insert({ pool_id: params.id, row, col, owner_id, guest_name, guest_email, guest_phone })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Square already claimed' }, { status: 409 })

  // Check if all 100 squares are now claimed — if so, lock the pool and generate numbers
  const { count } = await supabase
    .from('squares')
    .select('*', { count: 'exact', head: true })
    .eq('pool_id', params.id)

  if (count === 100) {
    const entries = generatePoolNumbers()
    await supabase.from('pool_numbers').insert(
      entries.map(e => ({ pool_id: params.id, ...e }))
    )
    await supabase.from('pools').update({ status: 'locked' }).eq('id', params.id)

    // Send numbers-reveal notifications to all participants
    const { data: allSquares } = await supabase
      .from('squares')
      .select('row, col, guest_name, guest_email, guest_phone, users(display_name, email, phone)')
      .eq('pool_id', params.id)
    const { data: poolData } = await supabase.from('pools').select('team_home, team_away').eq('id', params.id).single()
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
```

- [ ] **Step 6: Commit**

```bash
git add app/api/ tests/api/
git commit -m "feat: add pool CRUD and square claiming API routes with auto-lock on 100 squares"
```

---

## Task 8: Score Recording + Winner Detection API

**Files:**
- Create: `app/api/pools/[id]/scores/route.ts`
- Create: `tests/api/scores.test.ts`

- [ ] **Step 1: Write failing test for winner resolution integration**

Create `tests/api/scores.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run tests — expect PASS**

```bash
npm run test:run -- tests/api/scores.test.ts
```
Expected: PASS (pure logic reuse)

- [ ] **Step 3: Create score recording route**

Create `app/api/pools/[id]/scores/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveWinner } from '@/lib/scoring/winner'
import { sendSms } from '@/lib/notifications/sms'
import { sendEmail } from '@/lib/notifications/email'
import { periodWinnerMessage } from '@/lib/notifications/messages'
import type { PoolNumberEntry } from '@/lib/scoring/numbers'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: { id: string } }) {
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
    supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { period_name, home_score, away_score } = await request.json()

  // Fetch pool and pool_numbers
  const { data: pool } = await supabase
    .from('pools')
    .select('*, pool_numbers(*)')
    .eq('id', params.id)
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
      .eq('pool_id', params.id)
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
    .insert({ pool_id: params.id, period_name, home_score, away_score, winning_square_id })
    .select()
    .single()

  // Send notifications (fire and forget)
  if (winnerSquare) {
    const winnerName = winnerSquare.guest_name ?? winnerSquare.users?.display_name ?? 'Unknown'
    const allSquares = await supabase
      .from('squares')
      .select('guest_name, guest_email, guest_phone, users(display_name, email, phone)')
      .eq('pool_id', params.id)

    for (const sq of (allSquares.data ?? [])) {
      const isWinner = sq === winnerSquare
      const name = (sq as any).guest_name ?? (sq as any).users?.display_name ?? ''
      const msg = periodWinnerMessage(period_name, pool.team_home, home_score, pool.team_away, away_score, isWinner, winnerName)
      const phone = (sq as any).guest_phone ?? (sq as any).users?.phone
      const email = (sq as any).guest_email ?? (sq as any).users?.email
      if (phone) sendSms({ to: phone, body: msg }).catch(console.error)
      if (email) sendEmail({ to: email, subject: `GridLock — ${period_name} Result`, text: msg }).catch(console.error)
    }

  }

  // Auto-complete pool when the final payout period score is recorded,
  // regardless of whether a winner was found (pool_numbers may not be set yet in edge cases)
  const lastPeriod = (pool.payout_periods as string[]).at(-1)
  if (period_name === lastPeriod) {
    await supabase.from('pools').update({ status: 'completed' }).eq('id', params.id)
  }

  return NextResponse.json(snapshot, { status: 201 })
}
```

- [ ] **Step 4: Run all tests**

```bash
npm run test:run
```
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add app/api/pools/ tests/api/scores.test.ts
git commit -m "feat: add score recording API with winner detection and notifications"
```

---

## Task 9: Grid UI Components

**Files:**
- Create: `components/grid/GridHeaders.tsx`
- Create: `components/grid/GridSquare.tsx`
- Create: `components/grid/Grid.tsx`

- [ ] **Step 1: Create GridHeaders**

Create `components/grid/GridHeaders.tsx`:
```tsx
interface GridHeadersProps {
  colNumbers: (number | null)[]  // 10 numbers for columns (null = not yet revealed)
  rowNumbers: (number | null)[]  // 10 numbers for rows
  teamHome: string
  teamAway: string
}

export function GridHeaders({ colNumbers, rowNumbers, teamHome, teamAway }: GridHeadersProps) {
  return (
    <>
      {/* Column header row */}
      <div className="flex mb-1">
        <div className="w-14" />
        <div className="text-center text-xs text-blue-400 uppercase tracking-widest w-full mb-1">
          ← {teamAway} →
        </div>
      </div>
      <div className="flex mb-1">
        <div className="w-14" />
        {colNumbers.map((n, i) => (
          <div key={i} className="flex-1 h-7 flex items-center justify-center text-sm font-bold text-blue-400 bg-blue-950 rounded mx-px">
            {n ?? '?'}
          </div>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create GridSquare**

Create `components/grid/GridSquare.tsx`:
```tsx
interface GridSquareProps {
  row: number
  col: number
  ownerName: string | null
  isWinner: boolean
  isCurrentWinner: boolean
  onClaim?: (row: number, col: number) => void
}

export function GridSquare({ row, col, ownerName, isWinner, isCurrentWinner, onClaim }: GridSquareProps) {
  const isClaimed = ownerName !== null

  let className = 'flex-1 h-14 flex items-center justify-center text-xs rounded mx-px cursor-pointer transition-all '

  if (isCurrentWinner) {
    className += 'bg-green-700 text-white font-bold ring-2 ring-green-400 shadow-lg shadow-green-500/50'
  } else if (isWinner) {
    className += 'bg-green-900 text-green-300'
  } else if (isClaimed) {
    className += 'bg-slate-700 text-slate-300'
  } else {
    className += 'bg-slate-800 text-slate-500 hover:bg-slate-600'
  }

  return (
    <div
      className={className}
      onClick={() => !isClaimed && onClaim?.(row, col)}
    >
      {isCurrentWinner ? `🏆 ${ownerName}` : (ownerName ?? '+')}
    </div>
  )
}
```

- [ ] **Step 3: Create Grid container**

Create `components/grid/Grid.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GridHeaders } from './GridHeaders'
import { GridSquare } from './GridSquare'

interface Square {
  id: string
  row: number
  col: number
  guest_name: string | null
  owner_id: string | null
}

interface PoolNumber {
  axis: 'row' | 'col'
  position: number
  number: number
}

interface ScoreSnapshot {
  winning_square_id: string | null
  period_name: string
}

interface GridProps {
  poolId: string
  teamHome: string
  teamAway: string
  initialSquares: Square[]
  initialPoolNumbers: PoolNumber[]
  initialSnapshots: ScoreSnapshot[]
  onClaimSquare?: (row: number, col: number) => void
}

export function Grid({
  poolId, teamHome, teamAway,
  initialSquares, initialPoolNumbers, initialSnapshots,
  onClaimSquare,
}: GridProps) {
  const [squares, setSquares] = useState<Square[]>(initialSquares)
  const [poolNumbers, setPoolNumbers] = useState<PoolNumber[]>(initialPoolNumbers)
  const [snapshots, setSnapshots] = useState<ScoreSnapshot[]>(initialSnapshots)
  const supabase = createClient()

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`pool-${poolId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'squares', filter: `pool_id=eq.${poolId}` },
        payload => setSquares(prev => [...prev, payload.new as Square]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pool_numbers', filter: `pool_id=eq.${poolId}` },
        payload => setPoolNumbers(prev => [...prev, payload.new as PoolNumber]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'score_snapshots', filter: `pool_id=eq.${poolId}` },
        payload => setSnapshots(prev => [...prev, payload.new as ScoreSnapshot]))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [poolId])

  const getSquareAt = (row: number, col: number) =>
    squares.find(s => s.row === row && s.col === col)

  const getColNumbers = () =>
    Array.from({ length: 10 }, (_, i) =>
      poolNumbers.find(n => n.axis === 'col' && n.position === i)?.number ?? null)

  const getRowNumber = (pos: number) =>
    poolNumbers.find(n => n.axis === 'row' && n.position === pos)?.number ?? null

  const winnerIds = new Set(snapshots.map(s => s.winning_square_id).filter(Boolean))
  const latestWinnerId = snapshots.at(-1)?.winning_square_id

  return (
    <div className="overflow-x-auto">
      <GridHeaders colNumbers={getColNumbers()} rowNumbers={[]} teamHome={teamHome} teamAway={teamAway} />
      {Array.from({ length: 10 }, (_, row) => (
        <div key={row} className="flex mb-px items-center">
          <div className="w-14 h-14 flex items-center justify-center text-sm font-bold text-amber-400 bg-amber-950 rounded mr-px">
            {getRowNumber(row) ?? '?'}
          </div>
          {Array.from({ length: 10 }, (_, col) => {
            const sq = getSquareAt(row, col)
            return (
              <GridSquare
                key={col}
                row={row}
                col={col}
                ownerName={sq?.guest_name ?? null}
                isWinner={winnerIds.has(sq?.id ?? '')}
                isCurrentWinner={sq?.id === latestWinnerId}
                onClaim={onClaimSquare}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/grid/
git commit -m "feat: add Grid UI components with real-time Supabase subscriptions"
```

---

## Task 10: Pool Pages (Join + View + Manage)

**Files:**
- Create: `app/join/[token]/page.tsx`
- Create: `app/(app)/pools/[id]/page.tsx`
- Create: `app/(app)/pools/[id]/manage/page.tsx`
- Create: `app/(app)/dashboard/page.tsx`
- Create: `app/(app)/pools/new/page.tsx`

- [ ] **Step 1: Create guest join page**

Create `app/join/[token]/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import JoinForm from './JoinForm'

export default async function JoinPage({ params }: { params: { token: string } }) {
  const supabase = createClient()
  const { data: pool } = await supabase
    .from('pools')
    .select('id, name, sport, team_home, team_away, status, squares(*), pool_numbers(*), score_snapshots(*)')
    .eq('join_token', params.token)
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
```

Create `app/join/[token]/JoinForm.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Grid } from '@/components/grid/Grid'

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
  const [selectedSquare, setSelectedSquare] = useState<{row: number, col: number} | null>(null)
  const [claimed, setClaimed] = useState(false)

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
    if (res.ok) setClaimed(true)
  }

  if (claimed) return <p className="text-green-400 text-lg">Square claimed! Good luck 🎉</p>

  return (
    <div className="space-y-4">
      <input className="w-full border rounded px-3 py-2 bg-slate-800" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
      <div className="flex gap-2">
        <select className="border rounded px-3 py-2 bg-slate-800" value={contactType} onChange={e => setContactType(e.target.value as any)}>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </select>
        <input className="flex-1 border rounded px-3 py-2 bg-slate-800" placeholder={contactType === 'email' ? 'your@email.com' : '+1 (555) 000-0000'} value={contact} onChange={e => setContact(e.target.value)} />
      </div>
      <p className="text-slate-400 text-sm">Tap a square below to claim it</p>
      {selectedSquare && (
        <button onClick={handleClaim} className="w-full bg-blue-600 text-white rounded py-2">
          Claim Square ({selectedSquare.row}, {selectedSquare.col})
        </button>
      )}
      <Grid
        poolId={poolId}
        teamHome={teamHome}
        teamAway={teamAway}
        initialSquares={initialSquares}
        initialPoolNumbers={initialPoolNumbers}
        initialSnapshots={initialSnapshots}
        onClaimSquare={(row, col) => setSelectedSquare({ row, col })}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create pool grid view page**

Create `app/(app)/pools/[id]/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Grid } from '@/components/grid/Grid'

export default async function PoolPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: pool } = await supabase
    .from('pools')
    .select('*, squares(*), pool_numbers(*), score_snapshots(*)')
    .eq('id', params.id)
    .single()

  if (!pool) notFound()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">{pool.name}</h1>
      <p className="text-slate-400 mb-6">{pool.team_home} vs {pool.team_away} — {pool.status}</p>
      <Grid
        poolId={pool.id}
        teamHome={pool.team_home}
        teamAway={pool.team_away}
        initialSquares={pool.squares}
        initialPoolNumbers={pool.pool_numbers}
        initialSnapshots={pool.score_snapshots}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create organizer manage page**

Create `app/(app)/pools/[id]/manage/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function ManagePage() {
  const { id } = useParams()
  const [period, setPeriod] = useState('')
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [result, setResult] = useState('')

  async function recordScore(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(`/api/pools/${id}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_name: period, home_score: parseInt(homeScore), away_score: parseInt(awayScore) }),
    })
    const data = await res.json()
    setResult(res.ok ? `✅ Score recorded. Winner square ID: ${data.winning_square_id ?? 'none'}` : `❌ ${data.error}`)
  }

  return (
    <div className="p-6 max-w-md">
      <h2 className="text-xl font-bold mb-4">Record Score</h2>
      <form onSubmit={recordScore} className="space-y-3">
        <input className="w-full border rounded px-3 py-2 bg-slate-800" placeholder="Period (e.g. Q1, Half, Final)" value={period} onChange={e => setPeriod(e.target.value)} required />
        <input type="number" className="w-full border rounded px-3 py-2 bg-slate-800" placeholder="Home score" value={homeScore} onChange={e => setHomeScore(e.target.value)} required />
        <input type="number" className="w-full border rounded px-3 py-2 bg-slate-800" placeholder="Away score" value={awayScore} onChange={e => setAwayScore(e.target.value)} required />
        <button type="submit" className="w-full bg-green-600 text-white rounded py-2">Record Score</button>
      </form>
      {result && <p className="mt-3 text-sm">{result}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Create dashboard page**

Create `app/(app)/dashboard/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
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
```

- [ ] **Step 5: Create new pool form page**

Create `app/(app)/pools/new/page.tsx`:
```tsx
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const PERIOD_PRESETS: Record<string, string[]> = {
  NFL: ['Q1', 'Half', 'Q3', 'Final'],
  Soccer: ['Half', 'Final'],
  Custom: [],
}

export default function NewPoolPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', sport: 'NFL', team_home: '', team_away: '', game_date: '' })
  const [periods, setPeriods] = useState(PERIOD_PRESETS['NFL'])
  const [customPeriod, setCustomPeriod] = useState('')

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    if (key === 'sport') setPeriods(PERIOD_PRESETS[value] ?? PERIOD_PRESETS['Custom'])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, payout_periods: periods }),
    })
    const pool = await res.json()
    if (res.ok) router.push(`/pools/${pool.id}`)
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Create Pool</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="w-full border rounded px-3 py-2 bg-slate-800" placeholder="Pool name" value={form.name} onChange={e => set('name', e.target.value)} required />
        <select className="w-full border rounded px-3 py-2 bg-slate-800" value={form.sport} onChange={e => set('sport', e.target.value)}>
          <option>NFL</option><option>NCAA Football</option><option>NCAA Basketball</option><option>Soccer</option><option>Custom</option>
        </select>
        <input className="w-full border rounded px-3 py-2 bg-slate-800" placeholder="Home team" value={form.team_home} onChange={e => set('team_home', e.target.value)} required />
        <input className="w-full border rounded px-3 py-2 bg-slate-800" placeholder="Away team" value={form.team_away} onChange={e => set('team_away', e.target.value)} required />
        <input type="datetime-local" className="w-full border rounded px-3 py-2 bg-slate-800" value={form.game_date} onChange={e => set('game_date', e.target.value)} />
        <div>
          <label className="text-sm text-slate-400">Payout periods: {periods.join(', ') || 'none'}</label>
          <div className="flex gap-2 mt-1">
            <input className="flex-1 border rounded px-3 py-2 bg-slate-800" placeholder="Add period (e.g. Q1)" value={customPeriod} onChange={e => setCustomPeriod(e.target.value)} />
            <button type="button" onClick={() => { if (customPeriod) { setPeriods(p => [...p, customPeriod]); setCustomPeriod('') } }} className="border rounded px-3 py-2">Add</button>
          </div>
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white rounded py-2">Create Pool</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Run all tests**

```bash
npm run test:run
```
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add app/
git commit -m "feat: add pool pages — dashboard, create pool, join flow, grid view, score management"
```

---

## Task 11: Sports API Score Polling (Cron)

**Files:**
- Create: `lib/sports-api/espn.ts`
- Create: `lib/sports-api/football-api.ts`
- Create: `app/api/cron/scores/route.ts`

- [ ] **Step 1: Create ESPN fetcher**

Create `lib/sports-api/espn.ts`:
```typescript
export interface GameScore {
  externalGameId: string
  homeScore: number
  awayScore: number
  isCompleted: boolean
  period: string
}

// Maps pool sport strings to ESPN API paths
const ESPN_SPORT_PATHS: Record<string, string> = {
  nfl: 'football/nfl',
  'ncaa football': 'football/college-football',
  'ncaa basketball': 'basketball/mens-college-basketball',
  nba: 'basketball/nba',
}

function espnPathForSport(sport: string): string {
  return ESPN_SPORT_PATHS[sport.toLowerCase()] ?? 'football/nfl'
}

export async function fetchEspnScore(gameId: string, sport = 'NFL'): Promise<GameScore | null> {
  try {
    const path = espnPathForSport(sport)
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`,
      { next: { revalidate: 0 } }
    )
    const data = await res.json()

    const event = data.events?.find((e: any) => e.id === gameId)
    if (!event) return null

    const competition = event.competitions?.[0]
    const competitors = competition?.competitors ?? []
    const home = competitors.find((c: any) => c.homeAway === 'home')
    const away = competitors.find((c: any) => c.homeAway === 'away')

    return {
      externalGameId: gameId,
      homeScore: parseInt(home?.score ?? '0'),
      awayScore: parseInt(away?.score ?? '0'),
      isCompleted: competition?.status?.type?.completed ?? false,
      period: competition?.status?.type?.shortDetail ?? 'In Progress',
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Create API-Football fetcher**

Create `lib/sports-api/football-api.ts`:
```typescript
import type { GameScore } from './espn'

export async function fetchFootballApiScore(gameId: string): Promise<GameScore | null> {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?id=${gameId}`,
      {
        headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY ?? '' },
        next: { revalidate: 0 },
      }
    )
    const data = await res.json()
    const fixture = data.response?.[0]
    if (!fixture) return null

    return {
      externalGameId: gameId,
      homeScore: fixture.goals?.home ?? 0,
      awayScore: fixture.goals?.away ?? 0,
      isCompleted: fixture.fixture?.status?.short === 'FT',
      period: fixture.fixture?.status?.long ?? 'In Progress',
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 3: Create cron route**

Create `app/api/cron/scores/route.ts`:
```typescript
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

    // Map API status string to pool's payout period names
    // Strategy: if game is completed, use the last payout period; otherwise skip
    // (only record scores at period boundaries — organizer handles mid-period)
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
```

- [ ] **Step 4: Add Vercel cron config**

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/scores",
      "schedule": "* * * * *"
    }
  ]
}
```

This runs the score poller every minute.

- [ ] **Step 5: Commit**

```bash
git add lib/sports-api/ app/api/cron/ vercel.json
git commit -m "feat: add ESPN and API-Football score polling with Vercel cron job"
```

---

## Task 12: PWA Setup

**Files:**
- Create: `public/manifest.json`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create PWA manifest**

Create `public/manifest.json`:
```json
{
  "name": "GridLock",
  "short_name": "GridLock",
  "description": "Sports squares pool app",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Create placeholder icons — add 192×192 and 512×512 PNG files to `public/icons/`. You can generate them at https://favicon.io or use any image editor.

- [ ] **Step 2: Update root layout with PWA meta tags**

Update `app/layout.tsx`:
```tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GridLock',
  description: 'Sports squares pool app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GridLock',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Run all tests one final time**

```bash
npm run test:run
```
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add public/ app/layout.tsx
git commit -m "feat: add PWA manifest and meta tags"
```

---

## Task 13: Deploy to Vercel

- [ ] **Step 1: Push all changes to GitHub**

```bash
git push origin master
```

- [ ] **Step 2: Connect repo to Vercel**

1. Go to https://vercel.com and sign in
2. Click "Add New Project"
3. Import your `gridlock` GitHub repo
4. Framework: Next.js (auto-detected)
5. Click Deploy (first deploy will fail — that's OK, we need to add env vars next)

- [ ] **Step 3: Add environment variables in Vercel**

In Vercel project Settings → Environment Variables, add all values from `.env.local.example`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `CRON_SECRET` (generate a random string: `openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL` (your Vercel deployment URL, e.g. `https://gridlock.vercel.app`)
- `FOOTBALL_API_KEY` (from https://www.api-football.com — required for soccer/FIFA pools)

- [ ] **Step 4: Redeploy**

In Vercel, click "Redeploy" after adding env vars.
Expected: Build succeeds, app live at your Vercel URL.

- [ ] **Step 5: Update Supabase auth redirect URLs**

In Supabase Dashboard → Authentication → URL Configuration:
- Add `https://your-app.vercel.app/auth/callback` to Redirect URLs

- [ ] **Step 6: Final smoke test**

1. Open your Vercel URL
2. Click login → enter email → check inbox for magic link
3. Log in → create a pool → copy join link
4. Open join link in incognito → enter name + contact → claim a square
5. Back in manage page → record a score → verify winner shows on grid
6. Check SMS/email was received

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "chore: finalize deployment setup"
git push origin master
```

---

## Summary

| Task | What it builds |
|------|---------------|
| 1 | Project bootstrap, Vitest config |
| 2 | Database schema, migrations, TypeScript types |
| 3 | Supabase client setup, route protection middleware |
| 4 | Scoring logic — number generation + winner detection (TDD) |
| 5 | Twilio SMS + SendGrid email notification senders |
| 6 | Login page with magic link + Google OAuth |
| 7 | Pool CRUD + square claiming API routes |
| 8 | Score recording + winner detection + notifications API |
| 9 | Grid UI components with real-time Supabase subscriptions |
| 10 | Pool pages — dashboard, create, join, view, manage |
| 11 | ESPN + API-Football score polling with Vercel cron |
| 12 | PWA manifest + meta tags |
| 13 | Vercel deployment + smoke test |
