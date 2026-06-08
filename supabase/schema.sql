-- SERENE Supabase/Postgres schema
-- Source of truth: DATABASE.md (aligned with AGENTS.md and PRD.md)
--
-- Important product rules preserved in schema comments:
-- 1) Opening Mural must not pause a reading session.
-- 2) Reading time only pauses when the user explicitly presses Pause.
-- 3) Mural annotations must not duplicate annotation content.
-- 4) annotation_mural_positions stores only visual position.
-- 5) mural_suggestions can have at most 5 suggestions per reading session.
-- 6) Suggested balloon positions are randomized once per session and stay stable during the session.
-- 7) Real reading time and estimated historical reading time are stored separately.
-- 8) Historical reading time is always estimated/approximate.
-- 9) Books and annotations are soft deleted with deleted_at by default.
-- 10) Manual Biblioteca categories and automatic Mente categories are separate concepts.
-- 11) Vocabulary entries are a small reading aid, not a replacement for annotations.

create extension if not exists pgcrypto;
create schema if not exists private;

-- ============================================================================
-- Helper functions
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1) profiles
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  avatar_url text,
  role text not null default 'reader',
  is_beta_tester boolean not null default false,
  access_status text not null default 'pending',
  theme_preference text not null default 'system',
  reduced_motion_enabled boolean not null default false,
  reading_close_behavior text not null default 'minimize',
  pressure_free_mode_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint profiles_role_check
    check (role in ('reader', 'admin')),
  constraint profiles_access_status_check
    check (access_status in ('pending', 'active', 'paused', 'suspended')),
  constraint profiles_theme_preference_check
    check (theme_preference in ('light', 'dark', 'system')),
  constraint profiles_reading_close_behavior_check
    check (reading_close_behavior in ('minimize', 'close'))
);

comment on table public.profiles is
'SERENE user profile and core reading comfort preferences.';

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

grant usage on schema private to authenticated;
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

-- ============================================================================
-- 2) books
-- ============================================================================

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  author text,
  cover_url text,
  description text,
  publisher text,
  edition text,
  publication_year int,
  language text,
  isbn text,
  subjects text[],
  total_pages int,
  current_page int not null default 0,
  status text not null default 'quero_ler',
  source text not null default 'manual',
  reading_origin text not null default 'serene',
  is_current boolean not null default false,
  is_private boolean not null default false,
  show_in_home boolean not null default true,
  show_in_notifications boolean not null default true,
  show_in_mente boolean not null default true,
  include_in_quick_exports boolean not null default true,
  estimated_reading_seconds int,
  estimated_reading_source text,
  estimated_reading_confidence text,
  audiobook_duration_minutes int,
  audiobook_source text,
  audiobook_is_confirmed boolean not null default false,
  estimated_minutes_per_page numeric,
  estimation_source text,
  read_before_serene boolean not null default false,
  completed_inside_serene boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint books_status_check
    check (status in ('quero_ler', 'lendo', 'pausado', 'lido')),
  constraint books_reading_origin_check
    check (reading_origin in ('historico', 'serene')),
  constraint books_total_pages_check
    check (total_pages is null or total_pages > 0),
  constraint books_current_page_check
    check (current_page >= 0),
  constraint books_page_bounds_check
    check (total_pages is null or current_page <= total_pages),
  constraint books_publication_year_check
    check (publication_year is null or publication_year > 0),
  constraint books_language_not_blank
    check (language is null or length(trim(language)) > 0),
  constraint books_isbn_not_blank
    check (isbn is null or length(trim(isbn)) > 0),
  constraint books_estimated_reading_seconds_check
    check (estimated_reading_seconds is null or estimated_reading_seconds >= 0),
  constraint books_audiobook_duration_minutes_check
    check (audiobook_duration_minutes is null or audiobook_duration_minutes > 0),
  constraint books_estimated_minutes_per_page_check
    check (estimated_minutes_per_page is null or estimated_minutes_per_page > 0),
  constraint books_estimation_source_check
    check (
      estimation_source is null
      or estimation_source in (
        'user_book_pace',
        'user_global_pace',
        'audiobook_duration',
        'default_average',
        'manual_adjustment'
      )
    )
);

comment on table public.books is
'Books in Biblioteca. Uses soft delete via deleted_at.';
comment on column public.books.estimated_reading_seconds is
'Estimated historical reading time in seconds (approximate). Keep separate from real tracked session time.';
comment on column public.books.language is
'Optional book language from a trusted source or manual correction.';
comment on column public.books.isbn is
'Optional ISBN from a trusted source or manual correction. Do not invent.';
comment on column public.books.subjects is
'Optional subjects/tags from book discovery sources. Used as calm signals for Biblioteca and Mente.';
comment on column public.books.audiobook_duration_minutes is
'Optional full audiobook duration in minutes, used only as an estimated reading-time base when stronger personal pace data is unavailable.';
comment on column public.books.audiobook_source is
'Optional source or note for the audiobook duration. Do not invent a source.';
comment on column public.books.audiobook_is_confirmed is
'Whether the user confirmed the audiobook duration as a usable initial estimate.';
comment on column public.books.estimated_minutes_per_page is
'Current approximate minutes-per-page base for outside-app reading estimates.';
comment on column public.books.estimation_source is
'Current estimate source label: user_book_pace, user_global_pace, audiobook_duration, default_average, or manual_adjustment.';
comment on column public.books.deleted_at is
'Soft delete timestamp. Do not hard delete by default.';

-- ============================================================================
-- 3) manual_categories
-- ============================================================================

create table if not exists public.manual_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.manual_categories is
'User-created Biblioteca categories (manual taxonomy). Separate from automatic Mente categories.';

-- ============================================================================
-- 4) book_manual_categories
-- ============================================================================

create table if not exists public.book_manual_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  category_id uuid not null references public.manual_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint book_manual_categories_unique_book_category
    unique (book_id, category_id)
);

-- ============================================================================
-- 5) shelves
-- ============================================================================

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

-- ============================================================================
-- 6) book_shelves
-- ============================================================================

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

-- ============================================================================
-- 7) automatic_mente_categories
-- ============================================================================

create table if not exists public.automatic_mente_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  confidence numeric,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automatic_mente_categories_confidence_check
    check (confidence is null or (confidence >= 0 and confidence <= 1))
);

comment on table public.automatic_mente_categories is
'Automatically inferred Mente categories. Separate from manual Biblioteca categories.';

-- ============================================================================
-- 8) book_automatic_mente_categories
-- ============================================================================

create table if not exists public.book_automatic_mente_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  automatic_category_id uuid not null references public.automatic_mente_categories(id) on delete cascade,
  confidence numeric,
  reason text,
  created_at timestamptz not null default now(),
  constraint book_automatic_mente_categories_unique_book_category
    unique (book_id, automatic_category_id),
  constraint book_automatic_mente_categories_confidence_check
    check (confidence is null or (confidence >= 0 and confidence <= 1))
);

-- ============================================================================
-- 7) reading_sessions
-- ============================================================================

create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active',
  active_seconds int not null default 0,
  paused_seconds int not null default 0,
  start_page int,
  end_page int,
  current_page_snapshot int,
  opened_from text,
  is_minimized boolean not null default false,
  mural_opened boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_sessions_status_check
    check (status in ('active', 'paused', 'finished', 'cancelled')),
  constraint reading_sessions_seconds_check
    check (active_seconds >= 0 and paused_seconds >= 0),
  constraint reading_sessions_ended_after_started_check
    check (ended_at is null or ended_at >= started_at),
  constraint reading_sessions_pages_non_negative_check
    check (
      (start_page is null or start_page >= 0)
      and (end_page is null or end_page >= 0)
      and (current_page_snapshot is null or current_page_snapshot >= 0)
    ),
  constraint reading_sessions_page_order_check
    check (start_page is null or end_page is null or end_page >= start_page)
);

comment on table public.reading_sessions is
'Real reading session tracking. Opening/closing Mural must not set status=paused; only explicit Pause action should pause.';
comment on column public.reading_sessions.active_seconds is
'Real tracked active reading time (seconds).';
comment on column public.reading_sessions.paused_seconds is
'Accumulated paused time (seconds).';

-- ============================================================================
-- 8) reading_pauses
-- ============================================================================

create table if not exists public.reading_pauses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.reading_sessions(id) on delete cascade,
  paused_at timestamptz not null,
  resumed_at timestamptz,
  duration_seconds int not null default 0,
  created_at timestamptz not null default now(),
  constraint reading_pauses_duration_check
    check (duration_seconds >= 0),
  constraint reading_pauses_resumed_after_paused_check
    check (resumed_at is null or resumed_at >= paused_at)
);

comment on table public.reading_pauses is
'Pause intervals for reading sessions. Pause records should be created only when user explicitly presses Pause.';

-- ============================================================================
-- 9) reading_progress_entries
-- ============================================================================

create table if not exists public.reading_progress_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  reading_session_id uuid references public.reading_sessions(id) on delete set null,
  from_page int,
  to_page int not null,
  pages_read int not null,
  estimated_minutes int,
  estimation_source text,
  is_estimated boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_progress_entries_pages_check
    check (
      (from_page is null or from_page >= 0)
      and to_page >= 0
      and pages_read >= 0
      and (from_page is null or to_page >= from_page)
    ),
  constraint reading_progress_entries_estimated_minutes_check
    check (estimated_minutes is null or estimated_minutes >= 0),
  constraint reading_progress_entries_estimation_source_check
    check (
      estimation_source is null
      or estimation_source in (
        'user_book_pace',
        'user_global_pace',
        'audiobook_duration',
        'default_average',
        'manual_adjustment'
      )
    )
);

comment on table public.reading_progress_entries is
'Estimated outside-app reading progress. Real timed sessions stay in reading_sessions.';
comment on column public.reading_progress_entries.estimated_minutes is
'Approximate outside-app reading time for pages_read. Keep separate from real active_seconds.';
comment on column public.reading_progress_entries.estimation_source is
'Source used for this estimate: user_book_pace, user_global_pace, audiobook_duration, default_average, or manual_adjustment.';

-- ============================================================================
-- 10) annotations
-- ============================================================================

create table if not exists public.annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid references public.books(id) on delete set null,
  session_id uuid references public.reading_sessions(id) on delete set null,
  type text not null default 'quick_note',
  content text,
  page_number int,
  color text,
  text_color text,
  highlight_color text,
  origin text not null default 'manual',
  is_favorite boolean not null default false,
  is_private boolean not null default false,
  review_status text not null default 'none',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint annotations_type_check
    check (
      type in (
        'quick_note',
        'reflection',
        'highlight',
        'post_it',
        'flag',
        'doubt',
        'thought',
        'idea',
        'action',
        'ocr_page'
      )
    ),
  constraint annotations_origin_check
    check (origin in ('manual', 'reading', 'mural', 'retroactive', 'camera', 'ocr')),
  constraint annotations_review_status_check
    check (review_status in ('none', 'to_review', 'reviewed')),
  constraint annotations_page_number_check
    check (page_number is null or page_number >= 0)
);

comment on table public.annotations is
'Canonical annotation content store. Soft delete with deleted_at. Mural must reuse these records instead of duplicating content.';
comment on column public.annotations.deleted_at is
'Soft delete timestamp. Deleted annotations should be visible in Trash flows.';

-- ============================================================================
-- 10) annotation_mural_positions
-- ============================================================================

create table if not exists public.annotation_mural_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  annotation_id uuid not null references public.annotations(id) on delete cascade,
  session_id uuid references public.reading_sessions(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  x numeric,
  y numeric,
  width numeric,
  height numeric,
  rotation numeric not null default 0,
  z_index int not null default 0,
  is_visible boolean not null default true,
  is_suggested boolean not null default false,
  suggested_slot int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint annotation_mural_positions_suggested_slot_check
    check (suggested_slot is null or (suggested_slot >= 1 and suggested_slot <= 5)),
  constraint annotation_mural_positions_size_check
    check (
      (width is null or width > 0)
      and (height is null or height > 0)
    ),
  constraint annotation_mural_positions_unique_annotation_session
    unique (annotation_id, session_id)
);

comment on table public.annotation_mural_positions is
'Visual-only Mural placement metadata. Does not duplicate annotation textual content.';
comment on column public.annotation_mural_positions.annotation_id is
'References canonical annotation record; position only.';

-- ============================================================================
-- 11) mural_suggestions
-- ============================================================================

create table if not exists public.mural_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.reading_sessions(id) on delete cascade,
  suggested_type text,
  suggested_slot int not null,
  x numeric,
  y numeric,
  width numeric,
  height numeric,
  rotation numeric not null default 0,
  status text not null default 'available',
  converted_annotation_id uuid references public.annotations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mural_suggestions_status_check
    check (status in ('available', 'used', 'hidden', 'deleted')),
  constraint mural_suggestions_slot_check
    check (suggested_slot between 1 and 5),
  constraint mural_suggestions_size_check
    check (
      (width is null or width > 0)
      and (height is null or height > 0)
    ),
  constraint mural_suggestions_unique_slot_per_session
    unique (session_id, suggested_slot)
);

comment on table public.mural_suggestions is
'Mural suggestion placeholders. Positions are randomized once per session, then remain stable during that session.';
comment on column public.mural_suggestions.suggested_slot is
'Slot index from 1..5. Together with unique(session_id, suggested_slot), this enforces max 5 suggestions per session.';

-- ============================================================================
-- 12) annotation_colors
-- ============================================================================

create table if not exists public.annotation_colors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text,
  color_hex text not null,
  applies_to text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 13) vocabulary_entries
-- ============================================================================

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

-- ============================================================================
-- 14) timeline_events
-- ============================================================================

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid references public.books(id) on delete set null,
  session_id uuid references public.reading_sessions(id) on delete set null,
  annotation_id uuid references public.annotations(id) on delete set null,
  event_type text not null,
  title text,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 15) exports
-- ============================================================================

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  format text not null,
  export_type text,
  file_url text,
  included_private_content boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.exports is
'Export metadata. Historical/private inclusion must be explicit and user-controlled.';

-- ============================================================================
-- 16) user_settings
-- ============================================================================

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_unique_user_key unique (user_id, key)
);

-- ============================================================================
-- 17) trash_items (optional helper table)
-- ============================================================================

create table if not exists public.trash_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null,
  item_id uuid not null,
  title text,
  deleted_at timestamptz not null default now(),
  metadata jsonb
);

comment on table public.trash_items is
'Optional unified trash feed. Keep in sync with soft-deleted books/annotations if used.';

-- ============================================================================
-- 18) feedback
-- ============================================================================

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

-- ============================================================================
-- Triggers (updated_at)
-- ============================================================================

-- Optional integrity function:
-- Prevent creating more than 5 suggestions per session.
create or replace function public.enforce_mural_suggestion_limit()
returns trigger
language plpgsql
as $$
declare
  v_count int;
begin
  select count(*)
  into v_count
  from public.mural_suggestions ms
  where ms.session_id = new.session_id
    and ms.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_count >= 5 then
    raise exception 'Maximum 5 mural suggestions per session';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_protect_beta_fields on public.profiles;
create trigger trg_profiles_protect_beta_fields
before update on public.profiles
for each row execute function public.protect_profile_beta_fields();

drop trigger if exists trg_auth_users_create_serene_profile on auth.users;
create trigger trg_auth_users_create_serene_profile
after insert on auth.users
for each row execute function private.handle_new_serene_user();

drop trigger if exists trg_books_updated_at on public.books;
create trigger trg_books_updated_at
before update on public.books
for each row execute function public.set_updated_at();

drop trigger if exists trg_manual_categories_updated_at on public.manual_categories;
create trigger trg_manual_categories_updated_at
before update on public.manual_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_shelves_updated_at on public.shelves;
create trigger trg_shelves_updated_at
before update on public.shelves
for each row execute function public.set_updated_at();

drop trigger if exists trg_automatic_mente_categories_updated_at on public.automatic_mente_categories;
create trigger trg_automatic_mente_categories_updated_at
before update on public.automatic_mente_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_reading_sessions_updated_at on public.reading_sessions;
create trigger trg_reading_sessions_updated_at
before update on public.reading_sessions
for each row execute function public.set_updated_at();

drop trigger if exists trg_reading_progress_entries_updated_at on public.reading_progress_entries;
create trigger trg_reading_progress_entries_updated_at
before update on public.reading_progress_entries
for each row execute function public.set_updated_at();

drop trigger if exists trg_annotations_updated_at on public.annotations;
create trigger trg_annotations_updated_at
before update on public.annotations
for each row execute function public.set_updated_at();

drop trigger if exists trg_annotation_mural_positions_updated_at on public.annotation_mural_positions;
create trigger trg_annotation_mural_positions_updated_at
before update on public.annotation_mural_positions
for each row execute function public.set_updated_at();

drop trigger if exists trg_mural_suggestions_updated_at on public.mural_suggestions;
create trigger trg_mural_suggestions_updated_at
before update on public.mural_suggestions
for each row execute function public.set_updated_at();

drop trigger if exists trg_annotation_colors_updated_at on public.annotation_colors;
create trigger trg_annotation_colors_updated_at
before update on public.annotation_colors
for each row execute function public.set_updated_at();

drop trigger if exists trg_vocabulary_entries_updated_at on public.vocabulary_entries;
create trigger trg_vocabulary_entries_updated_at
before update on public.vocabulary_entries
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_settings_updated_at on public.user_settings;
create trigger trg_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_feedback_updated_at on public.feedback;
create trigger trg_feedback_updated_at
before update on public.feedback
for each row execute function public.set_updated_at();

-- Enforce at most 5 suggestions per session (in addition to slot check + unique session/slot).
drop trigger if exists trg_mural_suggestions_limit on public.mural_suggestions;
create trigger trg_mural_suggestions_limit
before insert or update on public.mural_suggestions
for each row execute function public.enforce_mural_suggestion_limit();

-- ============================================================================
-- Indexes (requested + practical)
-- ============================================================================

create index if not exists idx_books_user_id on public.books(user_id);
create index if not exists idx_books_status on public.books(status);
create index if not exists idx_books_reading_origin on public.books(reading_origin);
create index if not exists idx_books_deleted_at on public.books(deleted_at);
create index if not exists idx_books_estimation_source on public.books(estimation_source);
create index if not exists idx_books_isbn
  on public.books(user_id, lower(isbn))
  where isbn is not null;
create index if not exists idx_books_subjects
  on public.books using gin(subjects);

create index if not exists idx_shelves_user_id on public.shelves(user_id);
create index if not exists idx_shelves_deleted_at on public.shelves(deleted_at);
create unique index if not exists idx_shelves_unique_active_name
  on public.shelves(user_id, lower(name))
  where deleted_at is null;

create index if not exists idx_book_shelves_user_id on public.book_shelves(user_id);
create index if not exists idx_book_shelves_book_id on public.book_shelves(book_id);
create index if not exists idx_book_shelves_shelf_id on public.book_shelves(shelf_id);

create index if not exists idx_reading_sessions_user_id on public.reading_sessions(user_id);
create index if not exists idx_reading_sessions_book_id on public.reading_sessions(book_id);
create index if not exists idx_reading_sessions_status on public.reading_sessions(status);

create index if not exists idx_reading_progress_entries_user_created
  on public.reading_progress_entries(user_id, created_at desc);
create index if not exists idx_reading_progress_entries_book_created
  on public.reading_progress_entries(book_id, created_at desc);
create index if not exists idx_reading_progress_entries_session_id
  on public.reading_progress_entries(reading_session_id);
create index if not exists idx_reading_progress_entries_estimation_source
  on public.reading_progress_entries(estimation_source);

create index if not exists idx_annotations_user_id on public.annotations(user_id);
create index if not exists idx_annotations_book_id on public.annotations(book_id);
create index if not exists idx_annotations_session_id on public.annotations(session_id);
create index if not exists idx_annotations_type on public.annotations(type);
create index if not exists idx_annotations_review_status on public.annotations(review_status);
create index if not exists idx_annotations_is_favorite on public.annotations(is_favorite);
create index if not exists idx_annotations_deleted_at on public.annotations(deleted_at);

create index if not exists idx_annotation_mural_positions_session_id on public.annotation_mural_positions(session_id);
create index if not exists idx_annotation_mural_positions_annotation_id on public.annotation_mural_positions(annotation_id);

create index if not exists idx_mural_suggestions_session_id on public.mural_suggestions(session_id);

create index if not exists idx_vocabulary_entries_user_created
  on public.vocabulary_entries(user_id, created_at desc);
create index if not exists idx_vocabulary_entries_book_created
  on public.vocabulary_entries(book_id, created_at desc);
create index if not exists idx_vocabulary_entries_session_created
  on public.vocabulary_entries(reading_session_id, created_at desc);
create index if not exists idx_vocabulary_entries_word
  on public.vocabulary_entries(user_id, lower(word));

create index if not exists idx_timeline_events_user_id on public.timeline_events(user_id);
create index if not exists idx_exports_user_id on public.exports(user_id);
create index if not exists idx_profiles_beta_access on public.profiles(is_beta_tester, access_status);
create index if not exists idx_profiles_last_seen_at on public.profiles(last_seen_at);
create index if not exists idx_feedback_user_id on public.feedback(user_id);
create index if not exists idx_feedback_status on public.feedback(status);
create index if not exists idx_feedback_created_at on public.feedback(created_at desc);

-- ============================================================================
-- Row Level Security (RLS)
-- Basic owner-only policies. User DELETE is allowed only for already soft-deleted
-- books/annotations, so permanent deletion can exist only inside Lixeira.
-- ============================================================================

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

grant usage on schema public to anon, authenticated;

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

-- profiles policies (auth.uid() = id)
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

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

-- user-owned table policy template:
-- select/update/insert only when auth.uid() = user_id

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

drop policy if exists books_delete_soft_deleted_own on public.books;
create policy books_delete_soft_deleted_own
on public.books
for delete
to authenticated
using (((select auth.uid()) = user_id) and deleted_at is not null);

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

drop policy if exists reading_sessions_select_own on public.reading_sessions;
create policy reading_sessions_select_own
on public.reading_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists reading_sessions_insert_own on public.reading_sessions;
create policy reading_sessions_insert_own
on public.reading_sessions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists reading_sessions_update_own on public.reading_sessions;
create policy reading_sessions_update_own
on public.reading_sessions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists reading_pauses_select_own on public.reading_pauses;
create policy reading_pauses_select_own
on public.reading_pauses
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists reading_pauses_insert_own on public.reading_pauses;
create policy reading_pauses_insert_own
on public.reading_pauses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists reading_pauses_update_own on public.reading_pauses;
create policy reading_pauses_update_own
on public.reading_pauses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists reading_progress_entries_select_own on public.reading_progress_entries;
create policy reading_progress_entries_select_own
on public.reading_progress_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

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

drop policy if exists annotations_delete_soft_deleted_own on public.annotations;
create policy annotations_delete_soft_deleted_own
on public.annotations
for delete
to authenticated
using (((select auth.uid()) = user_id) and deleted_at is not null);

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

drop policy if exists annotation_colors_delete_custom_own on public.annotation_colors;
create policy annotation_colors_delete_custom_own
on public.annotation_colors
for delete
to authenticated
using (((select auth.uid()) = user_id) and is_default = false);

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

drop policy if exists timeline_events_select_own on public.timeline_events;
create policy timeline_events_select_own
on public.timeline_events
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists timeline_events_insert_own on public.timeline_events;
create policy timeline_events_insert_own
on public.timeline_events
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists timeline_events_update_own on public.timeline_events;
create policy timeline_events_update_own
on public.timeline_events
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists exports_select_own on public.exports;
create policy exports_select_own
on public.exports
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists exports_insert_own on public.exports;
create policy exports_insert_own
on public.exports
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists exports_update_own on public.exports;
create policy exports_update_own
on public.exports
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

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

drop policy if exists shelves_select_admin on public.shelves;
create policy shelves_select_admin on public.shelves
for select to authenticated using (private.is_serene_admin());

drop policy if exists book_shelves_select_admin on public.book_shelves;
create policy book_shelves_select_admin on public.book_shelves
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

drop policy if exists reading_progress_entries_select_admin on public.reading_progress_entries;
create policy reading_progress_entries_select_admin on public.reading_progress_entries
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

drop policy if exists vocabulary_entries_select_admin on public.vocabulary_entries;
create policy vocabulary_entries_select_admin on public.vocabulary_entries
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

drop policy if exists reading_progress_entries_beta_access_required on public.reading_progress_entries;
create policy reading_progress_entries_beta_access_required on public.reading_progress_entries
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

drop policy if exists vocabulary_entries_beta_access_required on public.vocabulary_entries;
create policy vocabulary_entries_beta_access_required on public.vocabulary_entries
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

-- ============================================================================
-- Next steps
-- ============================================================================
-- Run this schema in Supabase SQL editor.
-- Then optionally create local demo data or per-user beta sample data.
-- Then implement the app features in phases.
