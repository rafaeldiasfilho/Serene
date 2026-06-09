-- SERENE fix 017: Portuguese-only dictionary safeguards
--
-- Purpose:
-- Keep the first dictionary version focused on Portuguese definitions only,
-- while reinforcing the saved vocabulary table, grants, RLS, and user-owned
-- insert/update rules.

create table if not exists public.vocabulary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid references public.books(id) on delete set null,
  reading_session_id uuid references public.reading_sessions(id) on delete set null,
  word text not null,
  definition text,
  page_number int,
  note text,
  source text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vocabulary_entries_word_not_blank
    check (length(trim(word)) > 0),
  constraint vocabulary_entries_page_number_check
    check (page_number is null or page_number >= 0)
);

alter table public.vocabulary_entries
  add column if not exists deleted_at timestamptz;

comment on table public.vocabulary_entries is
'Saved words found through the Portuguese reading dictionary. Complements annotations without becoming a heavy study module.';

comment on column public.vocabulary_entries.definition is
'Manual or trusted-source Portuguese meaning. Do not invent automatic definitions without a source.';

comment on column public.vocabulary_entries.source is
'Dictionary/source name used for the saved definition. Manual entries may leave this null.';

drop trigger if exists trg_vocabulary_entries_updated_at on public.vocabulary_entries;
create trigger trg_vocabulary_entries_updated_at
before update on public.vocabulary_entries
for each row execute function public.set_updated_at();

create index if not exists idx_vocabulary_entries_user_created
  on public.vocabulary_entries(user_id, created_at desc);

create index if not exists idx_vocabulary_entries_book_created
  on public.vocabulary_entries(book_id, created_at desc);

create index if not exists idx_vocabulary_entries_session_created
  on public.vocabulary_entries(reading_session_id, created_at desc);

create index if not exists idx_vocabulary_entries_word
  on public.vocabulary_entries(user_id, lower(word));

create index if not exists idx_vocabulary_entries_active_book_word
  on public.vocabulary_entries(user_id, book_id, lower(word))
  where deleted_at is null;

grant usage on schema public to authenticated;
grant select, insert, update on table public.vocabulary_entries to authenticated;

alter table public.vocabulary_entries enable row level security;

drop policy if exists vocabulary_entries_select_own on public.vocabulary_entries;
create policy vocabulary_entries_select_own
on public.vocabulary_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists vocabulary_entries_insert_own on public.vocabulary_entries;
create policy vocabulary_entries_insert_own
on public.vocabulary_entries
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    book_id is null
    or exists (
      select 1
      from public.books b
      where b.id = book_id
        and b.user_id = (select auth.uid())
        and b.deleted_at is null
    )
  )
  and (
    reading_session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = reading_session_id
        and rs.user_id = (select auth.uid())
        and rs.deleted_at is null
    )
  )
  and (
    book_id is null
    or reading_session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = reading_session_id
        and rs.book_id = book_id
        and rs.user_id = (select auth.uid())
        and rs.deleted_at is null
    )
  )
);

drop policy if exists vocabulary_entries_update_own on public.vocabulary_entries;
create policy vocabulary_entries_update_own
on public.vocabulary_entries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    book_id is null
    or exists (
      select 1
      from public.books b
      where b.id = book_id
        and b.user_id = (select auth.uid())
        and b.deleted_at is null
    )
  )
  and (
    reading_session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = reading_session_id
        and rs.user_id = (select auth.uid())
        and rs.deleted_at is null
    )
  )
  and (
    book_id is null
    or reading_session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = reading_session_id
        and rs.book_id = book_id
        and rs.user_id = (select auth.uid())
        and rs.deleted_at is null
    )
  )
);
