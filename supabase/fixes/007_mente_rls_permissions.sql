-- SERENE fix 007: Phase 9 Mente permissions
--
-- Purpose:
-- Allow authenticated users to read their own Mente source data, automatic
-- Mente categories, and safely create/reuse manual Biblioteca categories from
-- Mente suggestions without weakening owner-only RLS.

grant usage on schema public to anon, authenticated;

-- Mente reads these existing owner-scoped records.
grant select on table public.books to authenticated;
grant select on table public.reading_sessions to authenticated;
grant select on table public.annotations to authenticated;

-- Automatic Mente category data stays owner-scoped.
grant select, insert, update on table public.automatic_mente_categories to authenticated;
grant select, insert, update on table public.book_automatic_mente_categories to authenticated;

-- Optional "Criar na Biblioteca" action from Mente.
grant select, insert, update on table public.manual_categories to authenticated;
grant select, insert, update, delete on table public.book_manual_categories to authenticated;

alter table public.books enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.annotations enable row level security;
alter table public.automatic_mente_categories enable row level security;
alter table public.book_automatic_mente_categories enable row level security;
alter table public.manual_categories enable row level security;
alter table public.book_manual_categories enable row level security;

drop policy if exists automatic_mente_categories_select_own on public.automatic_mente_categories;
create policy automatic_mente_categories_select_own
on public.automatic_mente_categories
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists automatic_mente_categories_insert_own on public.automatic_mente_categories;
create policy automatic_mente_categories_insert_own
on public.automatic_mente_categories
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists automatic_mente_categories_update_own on public.automatic_mente_categories;
create policy automatic_mente_categories_update_own
on public.automatic_mente_categories
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists book_automatic_mente_categories_select_own on public.book_automatic_mente_categories;
create policy book_automatic_mente_categories_select_own
on public.book_automatic_mente_categories
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists book_automatic_mente_categories_insert_own on public.book_automatic_mente_categories;
create policy book_automatic_mente_categories_insert_own
on public.book_automatic_mente_categories
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists book_automatic_mente_categories_update_own on public.book_automatic_mente_categories;
create policy book_automatic_mente_categories_update_own
on public.book_automatic_mente_categories
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists manual_categories_select_own on public.manual_categories;
create policy manual_categories_select_own
on public.manual_categories
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists manual_categories_insert_own on public.manual_categories;
create policy manual_categories_insert_own
on public.manual_categories
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists manual_categories_update_own on public.manual_categories;
create policy manual_categories_update_own
on public.manual_categories
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists book_manual_categories_select_own on public.book_manual_categories;
create policy book_manual_categories_select_own
on public.book_manual_categories
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists book_manual_categories_insert_own on public.book_manual_categories;
create policy book_manual_categories_insert_own
on public.book_manual_categories
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists book_manual_categories_update_own on public.book_manual_categories;
create policy book_manual_categories_update_own
on public.book_manual_categories
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists book_manual_categories_delete_own on public.book_manual_categories;
create policy book_manual_categories_delete_own
on public.book_manual_categories
for delete
to authenticated
using ((select auth.uid()) = user_id);
