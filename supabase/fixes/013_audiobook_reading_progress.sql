-- SERENE fix 013: audiobook-informed reading progress estimates
--
-- Purpose:
-- Add audiobook duration metadata to books and a canonical user-owned table for
-- estimated outside-app reading progress. Real session time remains in
-- reading_sessions and is never mixed with estimated time without labeling.

alter table public.books
  add column if not exists audiobook_duration_minutes int,
  add column if not exists audiobook_source text,
  add column if not exists audiobook_is_confirmed boolean not null default false,
  add column if not exists estimated_minutes_per_page numeric,
  add column if not exists estimation_source text;

alter table public.books
  drop constraint if exists books_audiobook_duration_minutes_check,
  add constraint books_audiobook_duration_minutes_check
    check (audiobook_duration_minutes is null or audiobook_duration_minutes > 0);

alter table public.books
  drop constraint if exists books_estimated_minutes_per_page_check,
  add constraint books_estimated_minutes_per_page_check
    check (estimated_minutes_per_page is null or estimated_minutes_per_page > 0);

alter table public.books
  drop constraint if exists books_estimation_source_check,
  add constraint books_estimation_source_check
    check (
      estimation_source is null
      or estimation_source in (
        'user_book_pace',
        'user_global_pace',
        'audiobook_duration',
        'default_average',
        'manual_adjustment'
      )
    );

comment on column public.books.audiobook_duration_minutes is
'Optional full audiobook duration in minutes, used only as an estimated reading-time base when stronger personal pace data is unavailable.';
comment on column public.books.audiobook_source is
'Optional source or note for the audiobook duration. Do not invent a source.';
comment on column public.books.audiobook_is_confirmed is
'Whether the user confirmed the audiobook duration as a usable initial estimate.';
comment on column public.books.estimated_minutes_per_page is
'Current approximate minutes-per-page base for outside-app reading estimates.';
comment on column public.books.estimation_source is
'Current estimate source label: user_book_pace, user_global_pace, audiobook_duration, default_average, or manual_adjustment.';

create table if not exists public.reading_progress_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  reading_session_id uuid references public.reading_sessions(id) on delete set null,
  from_page int,
  to_page int not null,
  pages_read int not null,
  estimated_minutes int,
  estimation_source text,
  is_estimated boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_progress_entries_pages_check
    check (
      (from_page is null or from_page >= 0)
      and to_page >= 0
      and pages_read >= 0
      and (from_page is null or to_page >= from_page)
    ),
  constraint reading_progress_entries_estimated_minutes_check
    check (estimated_minutes is null or estimated_minutes >= 0),
  constraint reading_progress_entries_estimation_source_check
    check (
      estimation_source is null
      or estimation_source in (
        'user_book_pace',
        'user_global_pace',
        'audiobook_duration',
        'default_average',
        'manual_adjustment'
      )
    )
);

comment on table public.reading_progress_entries is
'Estimated outside-app reading progress. Real timed sessions stay in reading_sessions.';
comment on column public.reading_progress_entries.estimated_minutes is
'Approximate outside-app reading time for pages_read. Keep separate from real active_seconds.';
comment on column public.reading_progress_entries.estimation_source is
'Source used for this estimate: user_book_pace, user_global_pace, audiobook_duration, default_average, or manual_adjustment.';

drop trigger if exists trg_reading_progress_entries_updated_at on public.reading_progress_entries;
create trigger trg_reading_progress_entries_updated_at
before update on public.reading_progress_entries
for each row execute function public.set_updated_at();

create index if not exists idx_books_estimation_source on public.books(estimation_source);
create index if not exists idx_reading_progress_entries_user_created
  on public.reading_progress_entries(user_id, created_at desc);
create index if not exists idx_reading_progress_entries_book_created
  on public.reading_progress_entries(book_id, created_at desc);
create index if not exists idx_reading_progress_entries_session_id
  on public.reading_progress_entries(reading_session_id);
create index if not exists idx_reading_progress_entries_estimation_source
  on public.reading_progress_entries(estimation_source);

grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.reading_progress_entries to authenticated;

alter table public.reading_progress_entries enable row level security;

drop policy if exists reading_progress_entries_select_own on public.reading_progress_entries;
create policy reading_progress_entries_select_own
on public.reading_progress_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists reading_progress_entries_insert_own on public.reading_progress_entries;
create policy reading_progress_entries_insert_own
on public.reading_progress_entries
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.books b
    where b.id = book_id
      and b.user_id = (select auth.uid())
      and b.deleted_at is null
  )
  and (
    reading_session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = reading_session_id
        and rs.user_id = (select auth.uid())
        and rs.book_id = book_id
        and rs.deleted_at is null
    )
  )
);

drop policy if exists reading_progress_entries_update_own on public.reading_progress_entries;
create policy reading_progress_entries_update_own
on public.reading_progress_entries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.books b
    where b.id = book_id
      and b.user_id = (select auth.uid())
      and b.deleted_at is null
  )
  and (
    reading_session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = reading_session_id
        and rs.user_id = (select auth.uid())
        and rs.book_id = book_id
        and rs.deleted_at is null
    )
  )
);

drop policy if exists reading_progress_entries_select_admin on public.reading_progress_entries;
create policy reading_progress_entries_select_admin
on public.reading_progress_entries
for select
to authenticated
using (private.is_serene_admin());

drop policy if exists reading_progress_entries_beta_access_required on public.reading_progress_entries;
create policy reading_progress_entries_beta_access_required
on public.reading_progress_entries
as restrictive for all
to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());
