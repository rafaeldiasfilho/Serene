-- SERENE fix 009: Phase 11 Export permissions
--
-- Purpose:
-- Allow authenticated users to generate and review their own export records,
-- while reading only owner-scoped source data needed by the Export screen.
-- This keeps private/quick-export filtering in the app and does not weaken RLS.

grant usage on schema public to anon, authenticated;

-- Export source data. Existing RLS policies keep these rows owner-scoped.
grant select on table public.books to authenticated;
grant select on table public.annotations to authenticated;
grant select on table public.reading_sessions to authenticated;
grant select on table public.annotation_mural_positions to authenticated;
grant select on table public.automatic_mente_categories to authenticated;
grant select on table public.book_automatic_mente_categories to authenticated;

-- Export generation stores metadata and may add a Timeline memory.
grant select, insert, update on table public.exports to authenticated;
grant insert on table public.timeline_events to authenticated;

alter table public.exports enable row level security;

drop policy if exists exports_select_own on public.exports;
create policy exports_select_own
on public.exports
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists exports_insert_own on public.exports;
create policy exports_insert_own
on public.exports
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists exports_update_own on public.exports;
create policy exports_update_own
on public.exports
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
