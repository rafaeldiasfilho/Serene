-- SERENE fix 016: Phase 22 beta release review
--
-- Purpose:
-- Re-check the existing closed beta after the newer reading flows and reinforce
-- grants/RLS without recreating beta, feedback, /beta, or any user data table.
-- This file is idempotent and safe to run after fixes 010 through 015.

create schema if not exists private;

grant usage on schema public to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_serene_admin() to authenticated;
grant execute on function private.has_serene_beta_access() to authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.books to authenticated;
grant select, insert, update, delete on table public.manual_categories to authenticated;
grant select, insert, update, delete on table public.book_manual_categories to authenticated;
grant select, insert, update on table public.shelves to authenticated;
grant select, insert, delete on table public.book_shelves to authenticated;
grant select, insert, update on table public.automatic_mente_categories to authenticated;
grant select, insert, update on table public.book_automatic_mente_categories to authenticated;
grant select, insert, update on table public.reading_sessions to authenticated;
grant select, insert, update on table public.reading_pauses to authenticated;
grant select, insert, update on table public.reading_progress_entries to authenticated;
grant select, insert, update, delete on table public.annotations to authenticated;
grant select, insert, update on table public.annotation_mural_positions to authenticated;
grant select, insert, update on table public.mural_suggestions to authenticated;
grant select, insert, update, delete on table public.annotation_colors to authenticated;
grant select, insert, update on table public.vocabulary_entries to authenticated;
grant select, insert, update on table public.timeline_events to authenticated;
grant select, insert, update on table public.exports to authenticated;
grant select, insert, update on table public.user_settings to authenticated;
grant select, insert, update on table public.trash_items to authenticated;
grant select, insert, update on table public.feedback to authenticated;

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.manual_categories enable row level security;
alter table public.book_manual_categories enable row level security;
alter table public.shelves enable row level security;
alter table public.book_shelves enable row level security;
alter table public.automatic_mente_categories enable row level security;
alter table public.book_automatic_mente_categories enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.reading_pauses enable row level security;
alter table public.reading_progress_entries enable row level security;
alter table public.annotations enable row level security;
alter table public.annotation_mural_positions enable row level security;
alter table public.mural_suggestions enable row level security;
alter table public.annotation_colors enable row level security;
alter table public.vocabulary_entries enable row level security;
alter table public.timeline_events enable row level security;
alter table public.exports enable row level security;
alter table public.user_settings enable row level security;
alter table public.trash_items enable row level security;
alter table public.feedback enable row level security;

comment on column public.feedback.type is
'Stored beta feedback type. UI labels cover erro, sugestao, confusao, elogio, ideia, and dificuldade while preserving the existing feedback flow.';

-- Re-assert Biblioteca shelves policies.
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

-- Relationship-aware Biblioteca category policies.
drop policy if exists book_manual_categories_insert_own on public.book_manual_categories;
create policy book_manual_categories_insert_own
on public.book_manual_categories
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
    from public.manual_categories c
    where c.id = category_id
      and c.user_id = (select auth.uid())
      and c.deleted_at is null
  )
);

drop policy if exists book_manual_categories_update_own on public.book_manual_categories;
create policy book_manual_categories_update_own
on public.book_manual_categories
for update
to authenticated
using ((select auth.uid()) = user_id)
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
    from public.manual_categories c
    where c.id = category_id
      and c.user_id = (select auth.uid())
      and c.deleted_at is null
  )
);

-- Relationship-aware Mente relation policies.
drop policy if exists book_automatic_mente_categories_insert_own on public.book_automatic_mente_categories;
create policy book_automatic_mente_categories_insert_own
on public.book_automatic_mente_categories
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
    from public.automatic_mente_categories c
    where c.id = automatic_category_id
      and c.user_id = (select auth.uid())
  )
);

drop policy if exists book_automatic_mente_categories_update_own on public.book_automatic_mente_categories;
create policy book_automatic_mente_categories_update_own
on public.book_automatic_mente_categories
for update
to authenticated
using ((select auth.uid()) = user_id)
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
    from public.automatic_mente_categories c
    where c.id = automatic_category_id
      and c.user_id = (select auth.uid())
  )
);

-- Relationship-aware reading session and pause policies.
drop policy if exists reading_sessions_insert_own on public.reading_sessions;
create policy reading_sessions_insert_own
on public.reading_sessions
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
);

drop policy if exists reading_sessions_update_own on public.reading_sessions;
create policy reading_sessions_update_own
on public.reading_sessions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.books b
    where b.id = book_id
      and b.user_id = (select auth.uid())
      and b.deleted_at is null
  )
);

drop policy if exists reading_pauses_insert_own on public.reading_pauses;
create policy reading_pauses_insert_own
on public.reading_pauses
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.reading_sessions rs
    where rs.id = session_id
      and rs.user_id = (select auth.uid())
      and rs.deleted_at is null
  )
);

drop policy if exists reading_pauses_update_own on public.reading_pauses;
create policy reading_pauses_update_own
on public.reading_pauses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.reading_sessions rs
    where rs.id = session_id
      and rs.user_id = (select auth.uid())
      and rs.deleted_at is null
  )
);

-- Relationship-aware annotation policies. Folders in Anotacoes are visual only;
-- they keep using these same canonical annotation rows.
drop policy if exists annotations_insert_own on public.annotations;
create policy annotations_insert_own
on public.annotations
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
    session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = session_id
        and rs.user_id = (select auth.uid())
        and rs.deleted_at is null
    )
  )
  and (
    book_id is null
    or session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = session_id
        and rs.book_id = book_id
        and rs.user_id = (select auth.uid())
        and rs.deleted_at is null
    )
  )
);

drop policy if exists annotations_update_own on public.annotations;
create policy annotations_update_own
on public.annotations
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
    session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = session_id
        and rs.user_id = (select auth.uid())
        and rs.deleted_at is null
    )
  )
  and (
    book_id is null
    or session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = session_id
        and rs.book_id = book_id
        and rs.user_id = (select auth.uid())
        and rs.deleted_at is null
    )
  )
);

-- Relationship-aware Mural policies.
drop policy if exists annotation_mural_positions_insert_own on public.annotation_mural_positions;
create policy annotation_mural_positions_insert_own
on public.annotation_mural_positions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.annotations a
    where a.id = annotation_id
      and a.user_id = (select auth.uid())
      and a.deleted_at is null
      and (book_id is null or a.book_id = book_id)
  )
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
    session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = session_id
        and rs.user_id = (select auth.uid())
        and rs.deleted_at is null
        and (book_id is null or rs.book_id = book_id)
    )
  )
);

drop policy if exists annotation_mural_positions_update_own on public.annotation_mural_positions;
create policy annotation_mural_positions_update_own
on public.annotation_mural_positions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.annotations a
    where a.id = annotation_id
      and a.user_id = (select auth.uid())
      and a.deleted_at is null
      and (book_id is null or a.book_id = book_id)
  )
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
    session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = session_id
        and rs.user_id = (select auth.uid())
        and rs.deleted_at is null
        and (book_id is null or rs.book_id = book_id)
    )
  )
);

drop policy if exists mural_suggestions_insert_own on public.mural_suggestions;
create policy mural_suggestions_insert_own
on public.mural_suggestions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.reading_sessions rs
    where rs.id = session_id
      and rs.user_id = (select auth.uid())
      and rs.deleted_at is null
  )
  and (
    converted_annotation_id is null
    or exists (
      select 1
      from public.annotations a
      where a.id = converted_annotation_id
        and a.user_id = (select auth.uid())
        and a.deleted_at is null
    )
  )
);

drop policy if exists mural_suggestions_update_own on public.mural_suggestions;
create policy mural_suggestions_update_own
on public.mural_suggestions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.reading_sessions rs
    where rs.id = session_id
      and rs.user_id = (select auth.uid())
      and rs.deleted_at is null
  )
  and (
    converted_annotation_id is null
    or exists (
      select 1
      from public.annotations a
      where a.id = converted_annotation_id
        and a.user_id = (select auth.uid())
        and a.deleted_at is null
    )
  )
);

-- Re-assert recent table policies most likely to produce beta permission errors.
drop policy if exists reading_progress_entries_insert_own on public.reading_progress_entries;
create policy reading_progress_entries_insert_own
on public.reading_progress_entries
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
  and (
    reading_session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = reading_session_id
        and rs.user_id = (select auth.uid())
        and rs.book_id = book_id
        and rs.deleted_at is null
    )
  )
);

drop policy if exists reading_progress_entries_update_own on public.reading_progress_entries;
create policy reading_progress_entries_update_own
on public.reading_progress_entries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.books b
    where b.id = book_id
      and b.user_id = (select auth.uid())
      and b.deleted_at is null
  )
  and (
    reading_session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = reading_session_id
        and rs.user_id = (select auth.uid())
        and rs.book_id = book_id
        and rs.deleted_at is null
    )
  )
);

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

drop policy if exists timeline_events_insert_own on public.timeline_events;
create policy timeline_events_insert_own
on public.timeline_events
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
    session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = session_id
        and rs.user_id = (select auth.uid())
        and rs.deleted_at is null
        and (book_id is null or rs.book_id = book_id)
    )
  )
  and (
    annotation_id is null
    or exists (
      select 1
      from public.annotations a
      where a.id = annotation_id
        and a.user_id = (select auth.uid())
        and a.deleted_at is null
        and (book_id is null or a.book_id is null or a.book_id = book_id)
        and (session_id is null or a.session_id is null or a.session_id = session_id)
    )
  )
);

drop policy if exists timeline_events_update_own on public.timeline_events;
create policy timeline_events_update_own
on public.timeline_events
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
    session_id is null
    or exists (
      select 1
      from public.reading_sessions rs
      where rs.id = session_id
        and rs.user_id = (select auth.uid())
        and rs.deleted_at is null
        and (book_id is null or rs.book_id = book_id)
    )
  )
  and (
    annotation_id is null
    or exists (
      select 1
      from public.annotations a
      where a.id = annotation_id
        and a.user_id = (select auth.uid())
        and a.deleted_at is null
        and (book_id is null or a.book_id is null or a.book_id = book_id)
        and (session_id is null or a.session_id is null or a.session_id = session_id)
    )
  )
);

-- Feedback remains the existing beta feedback table.
drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own
on public.feedback
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists feedback_select_admin on public.feedback;
create policy feedback_select_admin
on public.feedback
for select
to authenticated
using (private.is_serene_admin());

drop policy if exists feedback_update_admin on public.feedback;
create policy feedback_update_admin
on public.feedback
for update
to authenticated
using (private.is_serene_admin())
with check (private.is_serene_admin());
