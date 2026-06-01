-- SERENE fix 002: books and manual categories permissions
--
-- Purpose:
-- Allow authenticated users to manage their own Biblioteca books and manual
-- category assignments while preserving soft-delete behavior for books.

grant usage on schema public to anon, authenticated;

grant select, insert, update on table public.books to authenticated;
grant select, insert, update on table public.manual_categories to authenticated;
grant select, insert, update, delete on table public.book_manual_categories to authenticated;

alter table public.books enable row level security;
alter table public.manual_categories enable row level security;
alter table public.book_manual_categories enable row level security;

drop policy if exists books_select_own on public.books;
create policy books_select_own
on public.books
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists books_insert_own on public.books;
create policy books_insert_own
on public.books
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists books_update_own on public.books;
create policy books_update_own
on public.books
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
