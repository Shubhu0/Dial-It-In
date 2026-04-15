-- ── BEANS ──────────────────────────────────────────────────────────────────
create table beans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  roaster     text,
  origin      text,
  roast_level text check (roast_level in ('light','medium','medium-dark','dark')),
  roast_date  date,
  notes       text,
  created_at  timestamptz default now()
);
alter table beans enable row level security;
create policy "own beans" on beans for all using (auth.uid() = user_id);

-- ── BREWS ──────────────────────────────────────────────────────────────────
create table brews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users not null,
  bean_id        uuid references beans(id) on delete cascade,
  method         text not null check (method in
                   ('espresso','pour_over','aeropress','french_press')),
  -- shared
  dose_g         numeric,
  water_temp_c   numeric,
  grind_setting  text,
  -- espresso
  yield_g        numeric,
  time_s         integer,
  -- non-espresso
  water_g        numeric,
  brew_time_s    integer,
  -- taste (0=sour, 50=balanced, 100=bitter — matches dial position)
  taste_position integer check (taste_position between 0 and 100),
  taste_notes    text[],
  rating         integer check (rating between 1 and 5),
  personal_notes text,
  -- ai output
  ai_suggestion  jsonb,
  created_at     timestamptz default now()
);
alter table brews enable row level security;
create policy "own brews" on brews for all using (auth.uid() = user_id);

-- ── DIAL-IN SCORE VIEW ─────────────────────────────────────────────────────
create view dial_in_scores as
select
  bean_id,
  count(*)                                           as total_brews,
  avg(rating)                                        as avg_rating,
  round(100 - avg(abs(taste_position - 50)) * 2)    as dial_in_pct
from brews
group by bean_id;
