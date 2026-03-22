-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Roles enum
do $$ begin
  create type user_role as enum ('admin', 'organizer', 'participant');
exception when duplicate_object then null; end $$;
do $$ begin
  create type pool_status as enum ('draft', 'open', 'locked', 'live', 'completed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type axis_type as enum ('row', 'col');
exception when duplicate_object then null; end $$;

-- Users (extends Supabase auth.users)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  phone text,
  role user_role not null default 'participant',
  created_at timestamptz not null default now()
);

-- Pools
create table if not exists pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text not null,
  team_home text not null,
  team_away text not null,
  status pool_status not null default 'draft',
  organizer_id uuid not null references users(id),
  join_token text unique not null default substring(md5(random()::text || clock_timestamp()::text), 1, 12),
  payout_periods jsonb not null default '["Final"]',
  game_date timestamptz,
  external_game_id text,
  max_squares_per_person int,  -- NULL means no limit (v1: stored but not enforced in claiming route)
  created_at timestamptz not null default now()
);

-- Squares (100 per pool)
create table if not exists squares (
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
create table if not exists pool_numbers (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  axis axis_type not null,
  position int not null check (position between 0 and 9),
  number int not null check (number between 0 and 9),
  unique(pool_id, axis, position)
);

-- Score snapshots (one per scoring period)
create table if not exists score_snapshots (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  period_name text not null,
  home_score int not null,
  away_score int not null,
  winning_square_id uuid references squares(id),
  recorded_at timestamptz not null default now()
);

-- Indexes
create index if not exists pools_join_token_idx on pools(join_token);
create index if not exists pools_organizer_id_idx on pools(organizer_id);
create index if not exists squares_pool_id_idx on squares(pool_id);
create index if not exists pool_numbers_pool_id_idx on pool_numbers(pool_id);
create index if not exists score_snapshots_pool_id_idx on score_snapshots(pool_id);

-- Row Level Security
alter table users enable row level security;
alter table pools enable row level security;
alter table squares enable row level security;
alter table pool_numbers enable row level security;
alter table score_snapshots enable row level security;

-- Users: anyone can read, only self can update
do $$ begin
  create policy "Users are viewable by everyone" on users for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Users can update own profile" on users for update using (auth.uid() = auth_id);
exception when duplicate_object then null; end $$;

-- Pools: anyone can read open/live/completed, organizer can manage
do $$ begin
  create policy "Pools viewable when open or beyond" on pools for select
    using (status in ('open','locked','live','completed') or organizer_id in (select id from users where auth_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Organizers can insert pools" on pools for insert
    with check (organizer_id in (select id from users where auth_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Organizers can update own pools" on pools for update
    using (organizer_id in (select id from users where auth_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- Squares: viewable by all, claimable by anyone (guest or user)
do $$ begin
  create policy "Squares are viewable by everyone" on squares for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Squares can be claimed" on squares for insert with check (true);
exception when duplicate_object then null; end $$;

-- Pool numbers: viewable when pool is locked or beyond
do $$ begin
  create policy "Pool numbers visible when locked" on pool_numbers for select
    using (pool_id in (select id from pools where status in ('locked','live','completed')));
exception when duplicate_object then null; end $$;

-- Score snapshots: viewable by all
do $$ begin
  create policy "Score snapshots viewable by everyone" on score_snapshots for select using (true);
exception when duplicate_object then null; end $$;
