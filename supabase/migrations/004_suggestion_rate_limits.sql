-- Tracks the last time each user requested an AI suggestion.
-- Used by the get-suggestion edge function to enforce a per-user cooldown.
create table if not exists public.suggestion_rate_limits (
  user_id uuid primary key references auth.users on delete cascade,
  last_at timestamptz not null default now()
);

alter table public.suggestion_rate_limits enable row level security;

create policy "rate_limits_select" on public.suggestion_rate_limits
  for select using (auth.uid() = user_id);

create policy "rate_limits_upsert" on public.suggestion_rate_limits
  for insert with check (auth.uid() = user_id);

create policy "rate_limits_update" on public.suggestion_rate_limits
  for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);
