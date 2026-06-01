-- SERENE fix 003: reading sessions and pauses permissions
--
-- Purpose:
-- Resolve "permission denied for table reading_sessions" by allowing
-- authenticated users to manage only their own reading session records.

grant usage on schema public to anon, authenticated;

grant select, insert, update on table public.reading_sessions to authenticated;
grant select, insert, update on table public.reading_pauses to authenticated;

alter table public.reading_sessions enable row level security;
alter table public.reading_pauses enable row level security;

drop policy if exists reading_sessions_select_own on public.reading_sessions;
create policy reading_sessions_select_own
on public.reading_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists reading_sessions_insert_own on public.reading_sessions;
create policy reading_sessions_insert_own
on public.reading_sessions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists reading_sessions_update_own on public.reading_sessions;
create policy reading_sessions_update_own
on public.reading_sessions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists reading_pauses_select_own on public.reading_pauses;
create policy reading_pauses_select_own
on public.reading_pauses
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists reading_pauses_insert_own on public.reading_pauses;
create policy reading_pauses_insert_own
on public.reading_pauses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists reading_pauses_update_own on public.reading_pauses;
create policy reading_pauses_update_own
on public.reading_pauses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

