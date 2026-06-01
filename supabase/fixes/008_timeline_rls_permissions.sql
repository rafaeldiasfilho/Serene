-- SERENE fix 008: Phase 10 Timeline permissions
--
-- Purpose:
-- Allow authenticated users to read their own chronological reading memories
-- from timeline_events and, when available, read owner-scoped related context
-- from books, reading sessions, and annotations without weakening RLS.

grant usage on schema public to anon, authenticated;

grant select, insert, update on table public.timeline_events to authenticated;

-- Timeline cards may fetch related owner-scoped context for safe links/previews.
grant select on table public.books to authenticated;
grant select on table public.reading_sessions to authenticated;
grant select on table public.annotations to authenticated;

alter table public.timeline_events enable row level security;

create index if not exists idx_timeline_events_user_created
  on public.timeline_events (user_id, created_at desc);

drop policy if exists timeline_events_select_own on public.timeline_events;
create policy timeline_events_select_own
on public.timeline_events
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists timeline_events_insert_own on public.timeline_events;
create policy timeline_events_insert_own
on public.timeline_events
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists timeline_events_update_own on public.timeline_events;
create policy timeline_events_update_own
on public.timeline_events
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
