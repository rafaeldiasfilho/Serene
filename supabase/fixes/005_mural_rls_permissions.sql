-- SERENE fix 005: Mural permissions
--
-- Purpose:
-- Allow authenticated users to manage their own Phase 5 Mural positions and
-- suggestion balloons while keeping annotation content canonical in annotations.

grant usage on schema public to anon, authenticated;

grant select, insert, update on table public.annotation_mural_positions to authenticated;
grant select, insert, update on table public.mural_suggestions to authenticated;

alter table public.annotation_mural_positions enable row level security;
alter table public.mural_suggestions enable row level security;

drop policy if exists annotation_mural_positions_select_own on public.annotation_mural_positions;
create policy annotation_mural_positions_select_own
on public.annotation_mural_positions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists annotation_mural_positions_insert_own on public.annotation_mural_positions;
create policy annotation_mural_positions_insert_own
on public.annotation_mural_positions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists annotation_mural_positions_update_own on public.annotation_mural_positions;
create policy annotation_mural_positions_update_own
on public.annotation_mural_positions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists mural_suggestions_select_own on public.mural_suggestions;
create policy mural_suggestions_select_own
on public.mural_suggestions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists mural_suggestions_insert_own on public.mural_suggestions;
create policy mural_suggestions_insert_own
on public.mural_suggestions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists mural_suggestions_update_own on public.mural_suggestions;
create policy mural_suggestions_update_own
on public.mural_suggestions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
