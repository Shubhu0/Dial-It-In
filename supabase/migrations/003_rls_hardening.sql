-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003 — RLS hardening + input validation
-- Run this in the Supabase SQL editor or via `supabase db push`.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Drop the broad catch-all policies ─────────────────────────────────────
drop policy if exists "own beans" on beans;
drop policy if exists "own brews" on brews;


-- ── 2. BEANS: one explicit policy per operation ───────────────────────────────
-- SELECT: only read your own beans
create policy "beans_select" on beans
  for select
  using (auth.uid() = user_id);

-- INSERT: user_id must match the authenticated caller
create policy "beans_insert" on beans
  for insert
  with check (auth.uid() = user_id);

-- UPDATE: can only edit your own beans; cannot reassign user_id
create policy "beans_update" on beans
  for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: can only delete your own beans
create policy "beans_delete" on beans
  for delete
  using (auth.uid() = user_id);


-- ── 3. BREWS: one explicit policy per operation ───────────────────────────────
-- SELECT: only read your own brews
create policy "brews_select" on brews
  for select
  using (auth.uid() = user_id);

-- INSERT: user_id must match AND the referenced bean must belong to the same user.
-- This closes the cross-user bean reference vulnerability.
create policy "brews_insert" on brews
  for insert
  with check (
    auth.uid() = user_id
    and (
      bean_id is null
      or exists (
        select 1 from beans
        where  id      = bean_id
        and    user_id = auth.uid()
      )
    )
  );

-- UPDATE: can only edit your own brews; cannot reassign user_id or bean_id
create policy "brews_update" on brews
  for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: can only delete your own brews
create policy "brews_delete" on brews
  for delete
  using (auth.uid() = user_id);


-- ── 4. Input validation on beans ─────────────────────────────────────────────
alter table beans
  add constraint beans_name_length
    check (length(trim(name)) between 1 and 100),
  add constraint beans_roaster_length
    check (roaster is null or length(roaster) <= 100),
  add constraint beans_origin_length
    check (origin  is null or length(origin)  <= 100),
  add constraint beans_notes_length
    check (notes   is null or length(notes)   <= 2000);


-- ── 5. Input validation on brews ─────────────────────────────────────────────
alter table brews
  -- Numeric ranges for physical plausibility
  add constraint brews_dose_range
    check (dose_g       is null or dose_g       between 1   and 100),
  add constraint brews_yield_range
    check (yield_g      is null or yield_g      between 1   and 500),
  add constraint brews_water_range
    check (water_g      is null or water_g      between 1   and 2000),
  add constraint brews_temp_range
    check (water_temp_c is null or water_temp_c between 50  and 110),
  add constraint brews_time_range
    check (time_s       is null or time_s       between 1   and 600),
  add constraint brews_brew_time_range
    check (brew_time_s  is null or brew_time_s  between 1   and 3600),
  -- Text length caps
  add constraint brews_grind_length
    check (grind_setting  is null or length(grind_setting)  <= 20),
  add constraint brews_notes_length
    check (personal_notes is null or length(personal_notes) <= 1000),
  -- Array size cap (prevents bloat)
  add constraint brews_taste_notes_limit
    check (taste_notes is null or cardinality(taste_notes) <= 20);


-- ── 6. Secure the dial_in_scores view ────────────────────────────────────────
-- Without security_invoker the view runs as the definer and bypasses RLS.
-- Replacing it with security_invoker=true means it runs as the calling user,
-- so the brews RLS policy filters results to that user's rows only.
drop view if exists dial_in_scores;

create view dial_in_scores
  with (security_invoker = true)
as
select
  bean_id,
  count(*)                                        as total_brews,
  avg(rating)                                     as avg_rating,
  round(100 - avg(abs(taste_position - 50)) * 2) as dial_in_pct
from brews
group by bean_id;
