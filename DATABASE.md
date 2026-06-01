# DATABASE.md - SERENE (Supabase/Postgres)

## 0) Source Of Truth

This document is the database implementation guide for SERENE.

Product source of truth:
- `AGENTS.md`
- `PRD.md`

SERENE is a calm reading, annotation, Mural, and reading-memory app.
Database choices must preserve comfort, safety, and clarity.

## 1) Platform And Global Conventions

- Database: Supabase Postgres (`public` schema unless noted).
- Primary keys: `uuid` with `default gen_random_uuid()` (except `profiles.id` references `auth.users(id)`).
- Ownership: use `user_id uuid` foreign keys where user-scoped data exists.
- Timestamps: use `created_at` and `updated_at` when specified.
- Soft delete first: use `deleted_at` for important data (`books`, `manual_categories`, `reading_sessions`, `annotations`).
- No permanent deletion by default for books, annotations, sessions, or memory artifacts.
- Trash behavior: deleted items are discoverable through soft-delete queries and optionally `trash_items`.
- Mural data model: Mural stores visual position and suggestion state only; annotation content remains in `annotations`.
- Reading time model: store real tracked time and estimated historical time separately.

Recommended extension:

```sql
create extension if not exists pgcrypto;
```

## 2) Canonical Value Sets (Use CHECK Constraints)

### 2.1 Books status

Valid `books.status`:
- `quero_ler`
- `lendo`
- `pausado`
- `lido`

### 2.2 Books reading origin

Valid `books.reading_origin`:
- `historico`
- `serene`

### 2.3 Reading session status

Valid `reading_sessions.status`:
- `active`
- `paused`
- `finished`
- `cancelled`

Rule:
- Opening Mural must not change session status to `paused`.
- Only explicit user pause action may change status to `paused`.

### 2.4 Annotation type

Valid `annotations.type`:
- `quick_note`
- `reflection`
- `highlight`
- `post_it`
- `flag`
- `doubt`
- `thought`
- `idea`
- `action`
- `ocr_page`

### 2.5 Annotation origin

Valid `annotations.origin`:
- `manual`
- `reading`
- `mural`
- `retroactive`
- `camera`
- `ocr`

### 2.6 Annotation review status

Valid `annotations.review_status`:
- `none`
- `to_review`
- `reviewed`

### 2.7 Mural suggestion status

Valid `mural_suggestions.status`:
- `available`
- `used`
- `hidden`
- `deleted`

## 3) Canonical Table Definitions

The SQL below is a practical baseline for migrations.

```sql
-- 1) profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  avatar_url text,
  theme_preference text not null default 'system',
  reduced_motion_enabled boolean not null default false,
  reading_close_behavior text not null default 'minimize',
  pressure_free_mode_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_theme_preference_check
    check (theme_preference in ('light', 'dark', 'system'))
);

-- 2) books
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
  read_before_serene boolean not null default false,
  completed_inside_serene boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint books_status_check
    check (status in ('quero_ler', 'lendo', 'pausado', 'lido')),
  constraint books_reading_origin_check
    check (reading_origin in ('historico', 'serene')),
  constraint books_current_page_check
    check (current_page >= 0),
  constraint books_total_pages_check
    check (total_pages is null or total_pages > 0),
  constraint books_page_bounds_check
    check (total_pages is null or current_page <= total_pages),
  constraint books_publication_year_check
    check (publication_year is null or publication_year > 0),
  constraint books_estimated_reading_seconds_check
    check (estimated_reading_seconds is null or estimated_reading_seconds >= 0)
);

-- 3) manual_categories
create table if not exists public.manual_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) book_manual_categories
create table if not exists public.book_manual_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  category_id uuid not null references public.manual_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint book_manual_categories_unique_book_category
    unique (book_id, category_id)
);

-- 5) automatic_mente_categories
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

-- 6) book_automatic_mente_categories
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

-- 7) reading_sessions
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

-- 8) reading_pauses
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

-- 9) annotations
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

-- 10) annotation_mural_positions
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
    )
);

-- 11) mural_suggestions
create table if not exists public.mural_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.reading_sessions(id) on delete cascade,
  suggested_type text,
  suggested_slot int,
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
    check (suggested_slot is null or (suggested_slot >= 1 and suggested_slot <= 5)),
  constraint mural_suggestions_size_check
    check (
      (width is null or width > 0)
      and (height is null or height > 0)
    ),
  constraint mural_suggestions_unique_slot_per_session
    unique (session_id, suggested_slot)
);

-- 12) annotation_colors
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

-- 13) timeline_events
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

-- 14) exports
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

-- 15) user_settings
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_unique_user_key
    unique (user_id, key)
);

-- 16) trash_items (optional helper table)
create table if not exists public.trash_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null,
  item_id uuid not null,
  title text,
  deleted_at timestamptz not null default now(),
  metadata jsonb
);
```

## 4) Required Extra Constraints And Guardrails

### 4.1 User ownership consistency

Recommended trigger checks for cross-table ownership on insert/update:
- `book_manual_categories.user_id` must match both `books.user_id` and `manual_categories.user_id`.
- `book_automatic_mente_categories.user_id` must match both `books.user_id` and `automatic_mente_categories.user_id`.
- `reading_sessions.user_id` must match `books.user_id`.
- `annotations.user_id` must match `book_id` and `session_id` ownership when those fields are not null.
- `annotation_mural_positions.user_id` must match `annotations.user_id`.
- `mural_suggestions.user_id` must match `reading_sessions.user_id`.

Without this, a user could theoretically attach data across users by UUID guessing.

### 4.2 Mural suggestion cap

Enforce at most 5 suggestions per session:

```sql
create or replace function public.enforce_mural_suggestion_limit()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*)
    from public.mural_suggestions ms
    where ms.session_id = new.session_id
      and ms.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) >= 5 then
    raise exception 'Maximum 5 mural suggestions per session';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mural_suggestions_limit on public.mural_suggestions;
create trigger trg_mural_suggestions_limit
before insert on public.mural_suggestions
for each row execute function public.enforce_mural_suggestion_limit();
```

### 4.3 Session status invariant

Application/service logic must enforce:
- Mural open/close can update `mural_opened` or UI state only.
- Mural open/close must not set `reading_sessions.status = 'paused'`.
- Only explicit pause action inserts/updates `reading_pauses` and sets `status = 'paused'`.

If needed, add a transition function that validates status transitions.

## 5) updated_at Trigger

Use one trigger function for all tables that have `updated_at`.

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_books_updated_at on public.books;
create trigger trg_books_updated_at
before update on public.books
for each row execute function public.set_updated_at();

drop trigger if exists trg_manual_categories_updated_at on public.manual_categories;
create trigger trg_manual_categories_updated_at
before update on public.manual_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_automatic_mente_categories_updated_at on public.automatic_mente_categories;
create trigger trg_automatic_mente_categories_updated_at
before update on public.automatic_mente_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_reading_sessions_updated_at on public.reading_sessions;
create trigger trg_reading_sessions_updated_at
before update on public.reading_sessions
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

drop trigger if exists trg_user_settings_updated_at on public.user_settings;
create trigger trg_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();
```

## 6) Soft Delete Strategy

### 6.1 Tables with soft delete

Use `deleted_at` for:
- `books`
- `manual_categories`
- `reading_sessions`
- `annotations`

Default query pattern:

```sql
... where deleted_at is null
```

Trash query pattern:

```sql
... where deleted_at is not null
```

### 6.2 Trash synchronization options

Option A (simpler):
- Do not use `trash_items`.
- Read trash directly from soft-deleted rows.

Option B (helper table):
- Use `trash_items` as a unified recycle-bin feed.
- Keep it synced via triggers when soft-deleting/restoring rows.

If using `trash_items`, keep it in sync with:
- `books.deleted_at`
- `annotations.deleted_at`
- optionally `manual_categories.deleted_at`, `reading_sessions.deleted_at`

### 6.3 Hard delete policy

- Hard deletes are never the default user flow.
- User-facing permanent delete is allowed only from `Lixeira`, only after clear confirmation, and only for rows that already have `deleted_at is not null`.
- RLS delete policies for `books` and `annotations` should include both owner check and `deleted_at is not null`.
- Privileged/service-role hard delete paths should remain explicit and audited.
- Prefer scheduled cleanup with retention period and audit logging.

## 7) Recommended Indexes

Use indexes that match common SERENE queries.

```sql
-- ownership + active filters
create index if not exists idx_books_user_active
  on public.books (user_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_books_user_status_active
  on public.books (user_id, status)
  where deleted_at is null;

create index if not exists idx_manual_categories_user_active
  on public.manual_categories (user_id, name)
  where deleted_at is null;

create index if not exists idx_reading_sessions_user_active
  on public.reading_sessions (user_id, started_at desc)
  where deleted_at is null;

create index if not exists idx_reading_sessions_book_active
  on public.reading_sessions (book_id, started_at desc)
  where deleted_at is null;

create index if not exists idx_reading_pauses_session
  on public.reading_pauses (session_id, paused_at);

create index if not exists idx_annotations_user_active
  on public.annotations (user_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_annotations_book_active
  on public.annotations (book_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_annotations_session_active
  on public.annotations (session_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_annotations_review_status_active
  on public.annotations (user_id, review_status)
  where deleted_at is null;

create index if not exists idx_annotations_private_active
  on public.annotations (user_id, is_private)
  where deleted_at is null;

create index if not exists idx_annotation_mural_positions_annotation
  on public.annotation_mural_positions (annotation_id);

create index if not exists idx_annotation_mural_positions_session
  on public.annotation_mural_positions (session_id, z_index);

create index if not exists idx_mural_suggestions_session_status
  on public.mural_suggestions (session_id, status);

create index if not exists idx_timeline_events_user_created
  on public.timeline_events (user_id, created_at desc);

create index if not exists idx_exports_user_created
  on public.exports (user_id, created_at desc);

create index if not exists idx_trash_items_user_deleted
  on public.trash_items (user_id, deleted_at desc);
```

Optional search:
- Add `pg_trgm` indexes for book title/author and annotation content search.

## 8) RLS Policy Recommendations (Supabase)

Enable RLS on all user tables.

```sql
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.manual_categories enable row level security;
alter table public.book_manual_categories enable row level security;
alter table public.automatic_mente_categories enable row level security;
alter table public.book_automatic_mente_categories enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.reading_pauses enable row level security;
alter table public.annotations enable row level security;
alter table public.annotation_mural_positions enable row level security;
alter table public.mural_suggestions enable row level security;
alter table public.annotation_colors enable row level security;
alter table public.timeline_events enable row level security;
alter table public.exports enable row level security;
alter table public.user_settings enable row level security;
alter table public.trash_items enable row level security;
```

Recommended policy pattern:
- `select`: owner-only (`user_id = auth.uid()`).
- `insert`: `with check (user_id = auth.uid())`.
- `update`: owner-only.
- `delete`: normally disallow for client role; use update for soft delete.

Example for a user-owned table:

```sql
create policy "books_select_own"
on public.books
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "books_insert_own"
on public.books
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "books_update_own"
on public.books
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
```

`profiles` special case:
- `profiles.id` equals `auth.uid()`.
- Use id-based self policies.

Service role notes:
- Background jobs (Mente classification, OCR ingestion, exports) may require service role access.
- Keep service operations audited and scoped by user ownership.

## 9) Notes On Mural Data Model (No Duplication)

- Annotation content lives in `annotations`.
- Mural position/geometry lives in `annotation_mural_positions`.
- Suggestion placeholders live in `mural_suggestions`.
- Converting a suggestion to real annotation sets `mural_suggestions.converted_annotation_id`.
- Editing/deleting an annotation updates one record globally and reflects everywhere (Reading, Annotations, Mural).

Mural suggestion behavior rules to preserve in service/application logic:
- Maximum 5 suggestions per session (DB trigger included above).
- Suggestion positions are randomized only once per session.
- Within the same session, suggestions keep stable positions.
- Suggestions must not overlap existing annotations when created.
- Suggestions can be moved by the user (position updates in `mural_suggestions` or converted `annotation_mural_positions`).
- Clicking a suggestion does not delete it.
- A suggestion is removed only via explicit state change (`hidden` or `deleted`) or conversion to annotation (`used` with `converted_annotation_id`).
- After 5 suggestions are used, user-created manual annotations continue without new suggestions.

Recommended uniqueness (optional but useful):

```sql
create unique index if not exists uq_annotation_mural_positions_annotation_session
  on public.annotation_mural_positions (annotation_id, session_id)
  where session_id is not null;
```

## 10) Notes On Real Time Vs Estimated Historical Time

Store separately:
- Real tracked reading time:
  - `reading_sessions.active_seconds`
  - derived totals from sessions (excluding soft-deleted sessions)
- Estimated historical reading time:
  - `books.estimated_reading_seconds`
  - for `reading_origin = 'historico'` and/or `read_before_serene = true`

Never mix these fields in storage.
Combine only in derived analytics and always label:
- real registered time
- estimated historical time
- approximate total

Avoid double counting:
- use `count(distinct books.id)` for unique book totals.
- for Mente totals, aggregate books and sessions in separate subqueries.

## 11) Notes On Privacy Fields

Privacy controls:
- `books.is_private`
- `annotations.is_private`

Recommendations:
- Keep owner-only RLS for raw rows.
- In shared exports or non-private contexts, filter out `is_private = true` unless user opts in.
- Track export privacy decisions with `exports.included_private_content`.

## 12) Notes On Future OCR/Camera Support

Current model already supports future OCR/camera:
- `annotations.type = 'ocr_page'`
- `annotations.origin in ('camera', 'ocr')`

Future-proofing recommendations:
- Add optional OCR metadata table later (`ocr_artifacts`) if needed:
  - image reference
  - OCR confidence
  - extracted text blocks
  - optional markers (`R`, `I`, `?`, `!`, `A`, `P`)
- Keep markers optional and lightweight.
- OCR input must come from user-provided images only.

## 13) Practical Implementation Notes For Codex Tasks

- Implement migrations in small, reversible steps.
- Apply constraints early for statuses and ownership consistency.
- Add RLS and test with authenticated user tokens before frontend wiring.
- Build repository helpers to always filter `deleted_at is null` by default.
- Use explicit trash/restore service methods; direct hard delete is limited to confirmed `Lixeira` actions.
- Add integration tests for:
  - session status transitions (`active`, `paused`, `finished`, `cancelled`)
  - Mural suggestion limit (max 5 per session)
  - annotation non-duplication across Mural
  - real-vs-estimated time aggregation
  - distinct book counting in Mente totals
