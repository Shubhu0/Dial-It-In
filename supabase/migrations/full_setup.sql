-- ─────────────────────────────────────────────────────────────────────────────
-- Dial It In — full database setup (idempotent, run in Supabase SQL editor)
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards throughout.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── BEANS ────────────────────────────────────────────────────────────────────
create table if not exists public.beans (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users on delete cascade,
  name          text        not null,
  roaster       text,
  origin        text,
  roast_level   text        check (roast_level in ('light','medium','medium-dark','dark')),
  roast_date    date,
  notes         text,
  grind_setting text,
  image_url     text,
  created_at    timestamptz default now(),

  constraint beans_name_length    check (length(trim(name)) between 1 and 100),
  constraint beans_roaster_length check (roaster   is null or length(roaster)   <= 100),
  constraint beans_origin_length  check (origin    is null or length(origin)    <= 100),
  constraint beans_notes_length   check (notes     is null or length(notes)     <= 2000),
  constraint beans_image_url_length check (image_url is null or length(image_url) <= 500)
);

-- Add image_url to existing tables that were created before this column existed
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where  table_schema = 'public' and table_name = 'beans' and column_name = 'image_url'
  ) then
    alter table public.beans add column image_url text
      check (image_url is null or length(image_url) <= 500);
  end if;
end $$;

alter table public.beans enable row level security;

drop policy if exists "own beans"    on public.beans;
drop policy if exists "beans_select" on public.beans;
drop policy if exists "beans_insert" on public.beans;
drop policy if exists "beans_update" on public.beans;
drop policy if exists "beans_delete" on public.beans;

create policy "beans_select" on public.beans
  for select using (auth.uid() = user_id);

create policy "beans_insert" on public.beans
  for insert with check (auth.uid() = user_id);

create policy "beans_update" on public.beans
  for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "beans_delete" on public.beans
  for delete using (auth.uid() = user_id);


-- ── BREWS ────────────────────────────────────────────────────────────────────
create table if not exists public.brews (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users on delete cascade,
  bean_id        uuid        references public.beans(id) on delete cascade,
  method         text        not null check (method in
                               ('espresso','pour_over','aeropress','french_press')),
  dose_g         numeric,
  water_temp_c   numeric,
  grind_setting  text,
  yield_g        numeric,
  time_s         integer,
  water_g        numeric,
  brew_time_s    integer,
  taste_position integer     check (taste_position between 0 and 100),
  taste_notes    text[],
  rating         integer     check (rating between 1 and 5),
  personal_notes text,
  ai_suggestion  jsonb,
  created_at     timestamptz default now(),

  constraint brews_dose_range        check (dose_g       is null or dose_g       between 1   and 100),
  constraint brews_yield_range       check (yield_g      is null or yield_g      between 1   and 500),
  constraint brews_water_range       check (water_g      is null or water_g      between 1   and 2000),
  constraint brews_temp_range        check (water_temp_c is null or water_temp_c between 50  and 110),
  constraint brews_time_range        check (time_s       is null or time_s       between 1   and 600),
  constraint brews_brew_time_range   check (brew_time_s  is null or brew_time_s  between 1   and 3600),
  constraint brews_grind_length      check (grind_setting  is null or length(grind_setting)  <= 20),
  constraint brews_notes_length      check (personal_notes is null or length(personal_notes) <= 1000),
  constraint brews_taste_notes_limit check (taste_notes   is null or cardinality(taste_notes) <= 20)
);

alter table public.brews enable row level security;

drop policy if exists "own brews"    on public.brews;
drop policy if exists "brews_select" on public.brews;
drop policy if exists "brews_insert" on public.brews;
drop policy if exists "brews_update" on public.brews;
drop policy if exists "brews_delete" on public.brews;

create policy "brews_select" on public.brews
  for select using (auth.uid() = user_id);

-- INSERT: also verify the referenced bean belongs to the same user
create policy "brews_insert" on public.brews
  for insert with check (
    auth.uid() = user_id
    and (
      bean_id is null
      or exists (
        select 1 from public.beans
        where  id      = bean_id
        and    user_id = auth.uid()
      )
    )
  );

create policy "brews_update" on public.brews
  for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "brews_delete" on public.brews
  for delete using (auth.uid() = user_id);


-- ── BEAN IMAGES (Supabase Storage) ───────────────────────────────────────────
-- Creates the storage bucket if it doesn't exist.
-- You can also create it manually: Storage → New bucket → "bean-images" → Public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'bean-images',
    'bean-images',
    true,            -- publicly readable (images shown in app without auth header)
    5242880,         -- 5 MB per file
    array['image/jpeg','image/jpg','image/png','image/webp','image/heic']
  )
  on conflict (id) do nothing;

-- Drop old policies before recreating (idempotent)
drop policy if exists "bean_images_public_read"   on storage.objects;
drop policy if exists "bean_images_owner_insert"  on storage.objects;
drop policy if exists "bean_images_owner_update"  on storage.objects;
drop policy if exists "bean_images_owner_delete"  on storage.objects;

-- Anyone can read (images are displayed publicly in the app)
create policy "bean_images_public_read" on storage.objects
  for select using (bucket_id = 'bean-images');

-- Only the owner can upload to their own folder (path: {user_id}/{filename})
create policy "bean_images_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'bean-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can replace their own files
create policy "bean_images_owner_update" on storage.objects
  for update using (
    bucket_id = 'bean-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can delete their own files
create policy "bean_images_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'bean-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ── DIAL-IN SCORE VIEW ───────────────────────────────────────────────────────
-- security_invoker = true: view runs as the caller, so brews RLS applies.
-- Each user only sees scores computed from their own brews.
drop view if exists public.dial_in_scores;

create view public.dial_in_scores
  with (security_invoker = true)
as
select
  bean_id,
  count(*)                                        as total_brews,
  avg(rating)                                     as avg_rating,
  round(100 - avg(abs(taste_position - 50)) * 2) as dial_in_pct
from public.brews
group by bean_id;
