# SERENE

SERENE is a calm, premium reading and annotation app focused on reading sessions, books, notes, memory, and the user's reading mind.

## Setup

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Typecheck:

```bash
npm run typecheck
```

## Environment variables

Copy `.env.example` to `.env.local` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional server-side/admin automation only:

- `SUPABASE_SERVICE_ROLE_KEY`

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client code or with a `NEXT_PUBLIC_` prefix.

## Supabase SQL workflow

Run in this order in the Supabase SQL editor:

1. `supabase/schema.sql`
2. Optional local-only demo: `supabase/seed.sql`
3. Optional per-user beta starter content: `supabase/beta_sample_seed.sql`

For existing Supabase projects, apply incremental fixes in order. Phase 14 is:

- `supabase/fixes/010_private_beta_feedback_admin.sql`

Phase 15D adds Biblioteca shelves:

- `supabase/fixes/011_biblioteca_shelves.sql`

Private beta users must use individual Supabase Auth accounts. Do not use one shared demo account for testers. To enable a beta user, create their Auth user, then mark their profile:

```sql
update public.profiles
set is_beta_tester = true,
    access_status = 'active'
where email = 'beta-user@example.com';
```

To make an internal admin:

```sql
update public.profiles
set role = 'admin',
    is_beta_tester = true,
    access_status = 'active'
where email = 'admin@example.com';
```

## Project status

SERENE is implemented through Phase 15D - Biblioteca Shelves.

Current quality gates:

- `npm.cmd run build`
- `npm.cmd run lint`
- `npm.cmd run typecheck`

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

## Project structure

- `src/app` - Next.js App Router screens and global styles.
- `src/components` - app shell, auth, providers, and shared UI.
- `src/features` - SERENE product areas: books, annotations, reading sessions, Mural, Mente, Timeline, Trash, Export, Settings, OCR/capture placeholder.
- `src/lib` - Supabase client, generated types, utilities, and shortcuts.
- `supabase/schema.sql` - database schema.
- `supabase/seed.sql` - demo data seed.
- `supabase/beta_sample_seed.sql` - optional per-user beta starter content.

## Phase 14 notes

Phase 14 prepares SERENE for selected online beta users while keeping the app calm and account-scoped:

- Authentication remains required for user-specific areas.
- Profiles now include `role`, `is_beta_tester`, `access_status`, and `last_seen_at`.
- New users default to pending beta access until intentionally activated.
- User-owned tables keep owner RLS and also require active beta access at the database layer.
- Feedback lives in `public.feedback` with owner RLS and admin-only overview access.
- The discreet feedback entry point is in the main menu and Configurações.
- Admin overview is available at `/beta` only for active admin profiles.
- No shared demo account is used by the app UI.

Vercel deployment checklist:

- Set `NEXT_PUBLIC_SUPABASE_URL`.
- Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Do not set or expose `SUPABASE_SERVICE_ROLE_KEY` unless adding server-only admin code.
- Apply `supabase/fixes/010_private_beta_feedback_admin.sql` before inviting testers.
- Mark each selected tester individually in `profiles`.

Manual beta validation checklist:

- User A cannot see User B data.
- User can create a book.
- User can create a note.
- User can start/end a reading session.
- User can submit feedback.
- Admin can view feedback at `/beta`.
- Regular user cannot access `/beta`.

Pending manual checks: cross-account isolation and admin/regular access should be verified with two real beta accounts in the deployed Supabase project.

## Phase 15 notes

Phase 15 keeps the experience closer to the original SERENE intention through small, controlled refinements:

- Home now treats active reading books as the center of the first screen.
- The current book remains the main focus, while other books in reading stay visible with covers and progress.
- The Home reading section can be calmly collapsed and reopened.
- Phase 15B further refines Home with a larger editorial current-book area, `Iniciar leitura`/`Retomar leitura` wording, visible quick-note and photo actions, and softer reading metrics.
- Home curiosity text now references a real book from the user's library instead of a generic literary note.
- The optional beta sample seed now includes multiple active reading books with covers and progress for Home testing.
- Missing global visual token aliases are defined for light, dark, and system dark themes.
- Annotation post-its now use a reusable physical paper visual: nearly square, lightly layered, softly shadowed, and compatible with light/dark themes.
- Long post-it content is shortened with `...` and can expand/retract locally.
- Multiple post-its in Anotacoes can appear as a physical stack that opens into a calm folder view with individual actions preserved.
- Larger ideas from the original backlog, such as full OCR, custom color management, stronger Mente drill-down, and minimized floating reading, remain documented in `TASKS.md` for safe future phases.

Phase 15D adds manual Biblioteca shelves with a safe many-to-many relation:

- `public.shelves` stores user-created shelves.
- `public.book_shelves` lets one book belong to multiple shelves.
- Removing a shelf does not remove its books.
- Shelves are manual Biblioteca organization; Mente remains automatic interpretation.

No authentication, reading/session logic, annotation logic, Mente logic, beta access rules, or destructive deletion behavior changed in Phase 15D.

## Phase 13 notes

Phase 13 focuses on comfort, responsiveness, accessibility, dark mode, reduced motion, feedback, and safety checks. It does not introduce a new product phase or major feature area.

Basic shortcuts are active where they are safe:

- `Ctrl/Cmd + N` opens a new annotation in clear contexts or routes to `Anotacoes`.
- `Esc` closes supported menus/dialogs.
- `Ctrl/Cmd + Enter` and `Ctrl/Cmd + S` save the annotation modal.
- `Ctrl/Cmd + 1..4` navigate primary areas.
- `Ctrl/Cmd + ,` opens `Configuracoes`.

Known placeholders and limitations:

- PDF and DOCX export options are placeholders; Markdown and TXT are the current downloadable formats.
- OCR/camera remains a user-provided-image placeholder. No OCR extraction runs yet.
- Manual browser validation is still pending when the in-app browser connector is unavailable.

## Comfort rule reminder

Every new feature must make SERENE more comfortable, not heavier. If a feature makes the interface polluted, confusing, tiring, or stressful, simplify it, hide it, postpone it, or rethink it.
