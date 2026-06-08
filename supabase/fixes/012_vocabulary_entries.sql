-- SERENE fix 012: reading vocabulary entries
--
-- Purpose:
-- Add a small, user-owned vocabulary history for words saved during reading.
-- This is complementary to annotations and must not become a heavy dictionary flow.

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vocabulary_entries_word_not_blank
    check (length(trim(word)) > 0),
  constraint vocabulary_entries_page_number_check
    check (page_number is null or page_number >= 0)
);

comment on table public.vocabulary_entries is
'Small reading vocabulary history. Complements annotations without replacing them or acting as a full dictionary.';
comment on column public.vocabulary_entries.definition is
'Manual or trusted-source meaning. Do not invent automatic definitions without a source.';
comment on column public.vocabulary_entries.source is
'Optional source for future dictionary/API/AI integrations. Manual entries may leave this null.';

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

grant usage on schema public to anon, authenticated;
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

drop policy if exists vocabulary_entries_select_admin on public.vocabulary_entries;
create policy vocabulary_entries_select_admin
on public.vocabulary_entries
for select
to authenticated
using (private.is_serene_admin());

drop policy if exists vocabulary_entries_beta_access_required on public.vocabulary_entries;
create policy vocabulary_entries_beta_access_required
on public.vocabulary_entries
as restrictive for all
to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());
