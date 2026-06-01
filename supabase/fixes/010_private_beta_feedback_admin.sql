-- SERENE fix 010: Phase 14 private beta, feedback, and admin overview
--
-- Purpose:
-- Prepare SERENE for selected online beta users with individual accounts,
-- owner-scoped data, feedback collection, and an admin-only beta overview.
-- Existing profile rows are preserved as active beta users; future profiles
-- default to pending until intentionally marked for beta access.

create schema if not exists private;

grant usage on schema public to anon, authenticated;
grant usage on schema private to authenticated;

alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists is_beta_tester boolean;
alter table public.profiles add column if not exists access_status text;
alter table public.profiles add column if not exists last_seen_at timestamptz;

update public.profiles
set
  role = coalesce(role, 'reader'),
  is_beta_tester = coalesce(is_beta_tester, true),
  access_status = coalesce(access_status, 'active')
where role is null
   or is_beta_tester is null
   or access_status is null;

alter table public.profiles alter column role set default 'reader';
alter table public.profiles alter column role set not null;
alter table public.profiles alter column is_beta_tester set default false;
alter table public.profiles alter column is_beta_tester set not null;
alter table public.profiles alter column access_status set default 'pending';
alter table public.profiles alter column access_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('reader', 'admin'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_access_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_access_status_check
      check (access_status in ('pending', 'active', 'paused', 'suspended'));
  end if;
end
$$;

create or replace function private.is_serene_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.access_status = 'active'
  );
$$;

grant execute on function private.is_serene_admin() to authenticated;

create or replace function private.has_serene_beta_access()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.access_status = 'active'
      and (p.role = 'admin' or p.is_beta_tester = true)
  );
$$;

grant execute on function private.has_serene_beta_access() to authenticated;

create or replace function public.protect_profile_beta_fields()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if not private.is_serene_admin() then
    if old.id is distinct from new.id
      or old.email is distinct from new.email
      or old.role is distinct from new.role
      or old.is_beta_tester is distinct from new.is_beta_tester
      or old.access_status is distinct from new.access_status
      or old.created_at is distinct from new.created_at
    then
      raise exception 'Only SERENE admins can change beta access fields.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_beta_fields on public.profiles;
create trigger trg_profiles_protect_beta_fields
before update on public.profiles
for each row execute function public.protect_profile_beta_fields();

create or replace function private.handle_new_serene_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.profiles (
    id,
    email,
    name,
    role,
    is_beta_tester,
    access_status,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    'reader',
    false,
    'pending',
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_auth_users_create_serene_profile on auth.users;
create trigger trg_auth_users_create_serene_profile
after insert on auth.users
for each row execute function private.handle_new_serene_user();

drop function if exists public.handle_new_serene_user();

insert into public.profiles (
  id,
  email,
  name,
  role,
  is_beta_tester,
  access_status,
  created_at,
  updated_at
)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name'),
  'reader',
  false,
  'pending',
  now(),
  now()
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  screen text not null,
  message text not null,
  rating int,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_type_check
    check (type in ('Bug', 'Suggestion', 'Difficulty', 'Confusing', 'Liked', 'New idea')),
  constraint feedback_screen_check
    check (screen in ('Home', 'Biblioteca', 'Leitura', 'Mural', 'Anotações', 'Mente', 'Configurações', 'Outro')),
  constraint feedback_rating_check
    check (rating is null or (rating between 1 and 5)),
  constraint feedback_status_check
    check (status in ('new', 'reviewing', 'planned', 'resolved', 'closed')),
  constraint feedback_message_not_empty_check
    check (length(trim(message)) > 0)
);

comment on table public.feedback is
'Private beta feedback submitted by authenticated SERENE users.';

drop trigger if exists trg_feedback_updated_at on public.feedback;
create trigger trg_feedback_updated_at
before update on public.feedback
for each row execute function public.set_updated_at();

create index if not exists idx_profiles_beta_access
  on public.profiles(is_beta_tester, access_status);
create index if not exists idx_profiles_last_seen_at
  on public.profiles(last_seen_at);
create index if not exists idx_feedback_user_id
  on public.feedback(user_id);
create index if not exists idx_feedback_status
  on public.feedback(status);
create index if not exists idx_feedback_created_at
  on public.feedback(created_at desc);

grant select, insert, update on table public.profiles to authenticated;
grant select on table public.books to authenticated;
grant select on table public.manual_categories to authenticated;
grant select on table public.book_manual_categories to authenticated;
grant select on table public.automatic_mente_categories to authenticated;
grant select on table public.book_automatic_mente_categories to authenticated;
grant select on table public.reading_sessions to authenticated;
grant select on table public.reading_pauses to authenticated;
grant select on table public.annotations to authenticated;
grant select on table public.annotation_mural_positions to authenticated;
grant select on table public.mural_suggestions to authenticated;
grant select on table public.annotation_colors to authenticated;
grant select on table public.timeline_events to authenticated;
grant select on table public.exports to authenticated;
grant select on table public.user_settings to authenticated;
grant select on table public.trash_items to authenticated;
grant select, insert, update on table public.feedback to authenticated;

alter table public.feedback enable row level security;

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin
on public.profiles
for select
to authenticated
using (private.is_serene_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles
for update
to authenticated
using (private.is_serene_admin())
with check (private.is_serene_admin());

drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own
on public.feedback
for select
to authenticated
using ((select auth.uid()) = user_id);

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

drop policy if exists books_select_admin on public.books;
create policy books_select_admin on public.books
for select to authenticated using (private.is_serene_admin());

drop policy if exists manual_categories_select_admin on public.manual_categories;
create policy manual_categories_select_admin on public.manual_categories
for select to authenticated using (private.is_serene_admin());

drop policy if exists book_manual_categories_select_admin on public.book_manual_categories;
create policy book_manual_categories_select_admin on public.book_manual_categories
for select to authenticated using (private.is_serene_admin());

drop policy if exists automatic_mente_categories_select_admin on public.automatic_mente_categories;
create policy automatic_mente_categories_select_admin on public.automatic_mente_categories
for select to authenticated using (private.is_serene_admin());

drop policy if exists book_automatic_mente_categories_select_admin on public.book_automatic_mente_categories;
create policy book_automatic_mente_categories_select_admin on public.book_automatic_mente_categories
for select to authenticated using (private.is_serene_admin());

drop policy if exists reading_sessions_select_admin on public.reading_sessions;
create policy reading_sessions_select_admin on public.reading_sessions
for select to authenticated using (private.is_serene_admin());

drop policy if exists reading_pauses_select_admin on public.reading_pauses;
create policy reading_pauses_select_admin on public.reading_pauses
for select to authenticated using (private.is_serene_admin());

drop policy if exists annotations_select_admin on public.annotations;
create policy annotations_select_admin on public.annotations
for select to authenticated using (private.is_serene_admin());

drop policy if exists annotation_mural_positions_select_admin on public.annotation_mural_positions;
create policy annotation_mural_positions_select_admin on public.annotation_mural_positions
for select to authenticated using (private.is_serene_admin());

drop policy if exists mural_suggestions_select_admin on public.mural_suggestions;
create policy mural_suggestions_select_admin on public.mural_suggestions
for select to authenticated using (private.is_serene_admin());

drop policy if exists annotation_colors_select_admin on public.annotation_colors;
create policy annotation_colors_select_admin on public.annotation_colors
for select to authenticated using (private.is_serene_admin());

drop policy if exists timeline_events_select_admin on public.timeline_events;
create policy timeline_events_select_admin on public.timeline_events
for select to authenticated using (private.is_serene_admin());

drop policy if exists exports_select_admin on public.exports;
create policy exports_select_admin on public.exports
for select to authenticated using (private.is_serene_admin());

drop policy if exists user_settings_select_admin on public.user_settings;
create policy user_settings_select_admin on public.user_settings
for select to authenticated using (private.is_serene_admin());

drop policy if exists trash_items_select_admin on public.trash_items;
create policy trash_items_select_admin on public.trash_items
for select to authenticated using (private.is_serene_admin());

drop policy if exists books_beta_access_required on public.books;
create policy books_beta_access_required on public.books
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists manual_categories_beta_access_required on public.manual_categories;
create policy manual_categories_beta_access_required on public.manual_categories
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists book_manual_categories_beta_access_required on public.book_manual_categories;
create policy book_manual_categories_beta_access_required on public.book_manual_categories
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists automatic_mente_categories_beta_access_required on public.automatic_mente_categories;
create policy automatic_mente_categories_beta_access_required on public.automatic_mente_categories
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists book_automatic_mente_categories_beta_access_required on public.book_automatic_mente_categories;
create policy book_automatic_mente_categories_beta_access_required on public.book_automatic_mente_categories
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists reading_sessions_beta_access_required on public.reading_sessions;
create policy reading_sessions_beta_access_required on public.reading_sessions
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists reading_pauses_beta_access_required on public.reading_pauses;
create policy reading_pauses_beta_access_required on public.reading_pauses
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists annotations_beta_access_required on public.annotations;
create policy annotations_beta_access_required on public.annotations
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists annotation_mural_positions_beta_access_required on public.annotation_mural_positions;
create policy annotation_mural_positions_beta_access_required on public.annotation_mural_positions
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists mural_suggestions_beta_access_required on public.mural_suggestions;
create policy mural_suggestions_beta_access_required on public.mural_suggestions
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists annotation_colors_beta_access_required on public.annotation_colors;
create policy annotation_colors_beta_access_required on public.annotation_colors
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists timeline_events_beta_access_required on public.timeline_events;
create policy timeline_events_beta_access_required on public.timeline_events
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists exports_beta_access_required on public.exports;
create policy exports_beta_access_required on public.exports
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists user_settings_beta_access_required on public.user_settings;
create policy user_settings_beta_access_required on public.user_settings
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists trash_items_beta_access_required on public.trash_items;
create policy trash_items_beta_access_required on public.trash_items
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());

drop policy if exists feedback_beta_access_required on public.feedback;
create policy feedback_beta_access_required on public.feedback
as restrictive for all to authenticated
using (private.has_serene_beta_access())
with check (private.has_serene_beta_access());
