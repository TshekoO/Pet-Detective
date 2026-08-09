-- Pet Detective Supabase schema
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  game_name text not null default 'Pet Detective',
  score integer not null default 0 check (score >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  number_completed integer not null default 0 check (number_completed >= 0),
  status text not null default 'playing' check (status in ('playing', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint completion_consistency check (
    (status = 'playing' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create index if not exists idx_game_sessions_game_name on public.game_sessions (game_name);
create index if not exists idx_game_sessions_score on public.game_sessions (score desc);

create table if not exists public.game_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  family_id integer not null,
  family_name text not null,
  selected_pet_id text not null,
  correct_pet_id text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists idx_game_answers_session_id on public.game_answers (session_id);
create index if not exists idx_game_answers_answered_at on public.game_answers (answered_at);

alter table public.game_sessions enable row level security;
alter table public.game_answers enable row level security;

-- NOTE:
-- This game currently has no Supabase Auth users and relies on the anon key from the browser.
-- Policies below allow public read/write for this game only.
-- For stricter security, add Supabase Auth and role-based policies.

drop policy if exists "public read sessions" on public.game_sessions;
create policy "public read sessions"
  on public.game_sessions
  for select
  to anon, authenticated
  using (game_name = 'Pet Detective');

drop policy if exists "public insert sessions" on public.game_sessions;
create policy "public insert sessions"
  on public.game_sessions
  for insert
  to anon, authenticated
  with check (game_name = 'Pet Detective');

drop policy if exists "public update sessions" on public.game_sessions;
create policy "public update sessions"
  on public.game_sessions
  for update
  to anon, authenticated
  using (game_name = 'Pet Detective')
  with check (game_name = 'Pet Detective');

drop policy if exists "public delete sessions" on public.game_sessions;
create policy "public delete sessions"
  on public.game_sessions
  for delete
  to anon, authenticated
  using (game_name = 'Pet Detective');

drop policy if exists "public read answers" on public.game_answers;
create policy "public read answers"
  on public.game_answers
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.game_sessions s
      where s.id = game_answers.session_id
      and s.game_name = 'Pet Detective'
    )
  );

drop policy if exists "public insert answers" on public.game_answers;
create policy "public insert answers"
  on public.game_answers
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.game_sessions s
      where s.id = game_answers.session_id
      and s.game_name = 'Pet Detective'
    )
  );

drop policy if exists "public delete answers" on public.game_answers;
create policy "public delete answers"
  on public.game_answers
  for delete
  to anon, authenticated
  using (
    exists (
      select 1
      from public.game_sessions s
      where s.id = game_answers.session_id
      and s.game_name = 'Pet Detective'
    )
  );

alter publication supabase_realtime add table public.game_sessions;
alter publication supabase_realtime add table public.game_answers;
