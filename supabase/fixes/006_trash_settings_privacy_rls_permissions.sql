-- SERENE fix 006: Phase 8 trash, settings, and privacy permissions
--
-- Purpose:
-- Allow authenticated users to save calm settings, restore soft-deleted data,
-- manage annotation colors, and permanently delete only items that are already
-- in Lixeira.

grant usage on schema public to anon, authenticated;

grant select, insert, update on table public.user_settings to authenticated;
grant select, insert, update on table public.trash_items to authenticated;

grant select, insert, update, delete on table public.books to authenticated;
grant select, insert, update, delete on table public.annotations to authenticated;
grant select, insert, update, delete on table public.annotation_colors to authenticated;

alter table public.user_settings enable row level security;
alter table public.trash_items enable row level security;
alter table public.books enable row level security;
alter table public.annotations enable row level security;
alter table public.annotation_colors enable row level security;

drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own
on public.user_settings
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own
on public.user_settings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own
on public.user_settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists trash_items_select_own on public.trash_items;
create policy trash_items_select_own
on public.trash_items
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists trash_items_insert_own on public.trash_items;
create policy trash_items_insert_own
on public.trash_items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists trash_items_update_own on public.trash_items;
create policy trash_items_update_own
on public.trash_items
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists books_delete_soft_deleted_own on public.books;
create policy books_delete_soft_deleted_own
on public.books
for delete
to authenticated
using (((select auth.uid()) = user_id) and deleted_at is not null);

drop policy if exists annotations_delete_soft_deleted_own on public.annotations;
create policy annotations_delete_soft_deleted_own
on public.annotations
for delete
to authenticated
using (((select auth.uid()) = user_id) and deleted_at is not null);

drop policy if exists annotation_colors_delete_custom_own on public.annotation_colors;
create policy annotation_colors_delete_custom_own
on public.annotation_colors
for delete
to authenticated
using (((select auth.uid()) = user_id) and is_default = false);
