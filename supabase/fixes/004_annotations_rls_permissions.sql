-- SERENE fix 004: annotations permissions
--
-- Purpose:
-- Allow authenticated users to manage their own annotations in Phase 4
-- while preserving soft-delete behavior (no hard delete policy).

grant usage on schema public to anon, authenticated;

grant select, insert, update on table public.annotations to authenticated;
grant select, insert, update on table public.annotation_colors to authenticated;

alter table public.annotations enable row level security;
alter table public.annotation_colors enable row level security;

drop policy if exists annotations_select_own on public.annotations;
create policy annotations_select_own
on public.annotations
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists annotations_insert_own on public.annotations;
create policy annotations_insert_own
on public.annotations
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists annotations_update_own on public.annotations;
create policy annotations_update_own
on public.annotations
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists annotation_colors_select_own on public.annotation_colors;
create policy annotation_colors_select_own
on public.annotation_colors
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists annotation_colors_insert_own on public.annotation_colors;
create policy annotation_colors_insert_own
on public.annotation_colors
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists annotation_colors_update_own on public.annotation_colors;
create policy annotation_colors_update_own
on public.annotation_colors
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
