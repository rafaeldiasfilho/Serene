-- SERENE fix 011: Biblioteca shelves
--
-- Purpose:
-- Add user-owned manual Biblioteca shelves without changing Mente, book status,
-- reading sessions, annotations, beta access, or existing manual categories.

create table if not exists public.shelves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shelves_name_not_blank
    check (length(trim(name)) > 0)
);

comment on table public.shelves is
'User-created Biblioteca shelves. Manual user organization, separate from automatic Mente categories.';

comment on column public.shelves.deleted_at is
'Soft delete timestamp for removed shelves. Removing a shelf must not remove books.';

create table if not exists public.book_shelves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  shelf_id uuid not null references public.shelves(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint book_shelves_unique_user_book_shelf
    unique (user_id, book_id, shelf_id)
);

comment on table public.book_shelves is
'Many-to-many relation between Biblioteca books and manual shelves.';

drop trigger if exists trg_shelves_updated_at on public.shelves;
create trigger trg_shelves_updated_at
before update on public.shelves
for each row execute function public.set_updated_at();

create index if not exists idx_shelves_user_id on public.shelves(user_id);
create index if not exists idx_shelves_deleted_at on public.shelves(deleted_at);
create unique index if not exists idx_shelves_unique_active_name
  on public.shelves(user_id, lower(name))
  where deleted_at is null;

create index if not exists idx_book_shelves_user_id on public.book_shelves(user_id);
create index if not exists idx_book_shelves_book_id on public.book_shelves(book_id);
create index if not exists idx_book_shelves_shelf_id on public.book_shelves(shelf_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.shelves to authenticated;
grant select, insert, delete on table public.book_shelves to authenticated;

alter table public.shelves enable row level security;
alter table public.book_shelves enable row level security;

drop policy if exists shelves_select_own on public.shelves;
create policy shelves_select_own
on public.shelves
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists shelves_insert_own on public.shelves;
create policy shelves_insert_own
on public.shelves
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists shelves_update_own on public.shelves;
create policy shelves_update_own
on public.shelves
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists book_shelves_select_own on public.book_shelves;
create policy book_shelves_select_own
on public.book_shelves
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists book_shelves_insert_own on public.book_shelves;
create policy book_shelves_insert_own
on public.book_shelves
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
  and exists (
    select 1
    from public.shelves s
    where s.id = shelf_id
      and s.user_id = (select auth.uid())
      and s.deleted_at is null
  )
);

drop policy if exists book_shelves_delete_own on public.book_shelves;
create policy book_shelves_delete_own
on public.book_shelves
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists shelves_select_admin on public.shelves;
create policy shelves_select_admin on public.shelves
for select to authenticated using (private.is_serene_admin());

drop policy if exists book_shelves_select_admin on public.book_shelves;
create policy book_shelves_select_admin on public.book_shelves
for select to authenticated using (private.is_serene_admin());

drop policy if exists shelves_beta_access_required on public.shelves;
create policy shelves_beta_access_required on public.shelves
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists book_shelves_beta_access_required on public.book_shelves;
create policy book_shelves_beta_access_required on public.book_shelves
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());
