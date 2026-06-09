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

Phase 17 adds reading vocabulary:

- `supabase/fixes/012_vocabulary_entries.sql`

Phase 18 adds audiobook-based outside-app reading estimates:

- `supabase/fixes/013_audiobook_reading_progress.sql`

Phase 19 adds intelligent book intake metadata:

- `supabase/fixes/014_book_discovery_metadata.sql`

Phase 17B updates the reading dictionary/vocabulary flow:

- `supabase/fixes/015_vocabulary_dictionary_lookup.sql`

Phase 22 reviews the existing closed beta after the newer product flows:

- `supabase/fixes/016_beta_release_review.sql`

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

SERENE is implemented through Phase 22, with the existing closed beta reviewed for the newer vocabulary, progress, Biblioteca, Mural, Mente, and annotations-folder flows.

Current quality gates:

- `npm.cmd run build`
- `npm.cmd run lint`
- `npm.cmd run typecheck`

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

## Project structure

- `src/app` - Next.js App Router screens and global styles.
- `src/components` - app shell, auth, providers, and shared UI.
- `src/features` - SERENE product areas: books, annotations, reading sessions, Mural, Mente, Trash, Export, Settings, OCR/capture placeholder, and parked Timeline support.
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
- Apply required fixes through `supabase/fixes/016_beta_release_review.sql` before inviting testers.
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

## Phase 22 notes

Phase 22 does not recreate beta. It reinforces the existing beta system for controlled release:

- `/beta`, `profiles` beta fields, `last_seen_at`, active/pending access, and admin policies are preserved.
- `public.feedback` remains the single beta feedback table; reader-facing feedback labels cover Erro, Sugestao, Confusao, Elogio, Ideia, and Dificuldade.
- `supabase/fixes/016_beta_release_review.sql` reasserts authenticated grants, RLS, beta access requirements, and owner/relationship checks for newer flows.
- The UI keeps technical Supabase errors in the console and shows calm retry/feedback messages to readers.
- Before release, test with two real accounts and one admin account; no shared public demo login should be used.

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

Phase 15E refines the Mural without changing database structure or reading behavior:

- Mural remains a separate reading-session screen.
- Opening, closing, or using Mural does not pause reading time.
- Suggested idea balloons remain capped at 5 per session and keep stable saved positions.
- The Mural now presents itself more clearly as a calm mental map, with preserved positions and softer suggestion copy.
- Product decision: "O Mural do SERENE não usa canvas infinito nem pan/scroll livre. Ele é uma área fixa e visível."

Phase 15F strengthens Mente as an automatic interpretation of the user's reading life:

- Mente remains separate from manual Biblioteca shelves.
- Area weights are approximate and interpretive, not productivity metrics.
- Area details show related books with covers, related annotations, real SERENE reading time, and estimated historical reading time separately.
- The beta sample seed now includes automatic Mente areas and multi-area books for testing.

Phase 15G is a final experience polish before merging visual work back to master:

- Book cards no longer show placeholder/fake statistics.
- Reading entry labels stay calmer and distinguish starting from resuming when progress exists.
- The reading screen uses the same `Foto` language as Home for the camera/OCR placeholder.
- Mural copy emphasizes fixed visible memory placement instead of technical canvas wording.
- Theme options use Portuguese reader-facing labels.

Phase 16 reorganizes the experience so SERENE feels calmer and more self-organizing:

- The reader can use a real timed reading session or update progress later with `Atualizar pagina`.
- Outside-app progress is stored as estimated time and stays separate from real SERENE session time and historical estimates.
- Anotacoes now opens as folders for Post-its, Reflexoes, Marca-textos, and Anotacoes Rapidas instead of one mixed first view.
- Biblioteca prioritizes automatic shelves by reading area/topic; `Todos os livros` is its own entry.
- Manual shelves remain available as optional adjustments, but they are no longer the first organizing burden.
- Mente opens with the brain as the focus and shows area details only after the user selects an area.
- Primary navigation remains centered on Inicio, Biblioteca, Anotacoes, and Mente.
- Timeline/Linha do tempo is parked outside the current product flow; `/timeline` and `/linha-do-tempo` redirect to Mente while the supporting code and data are preserved.
- Annotation creation now emphasizes four main formats: Anotacao Rapida, Reflexao, Marca-texto, and Post-it.
- Reflexao appears as a thought bubble, Marca-texto as text-level highlighting, and Post-it as physical paper/stack.
- Secondary annotation types remain preserved as existing/internal records, but no longer compete as primary creation choices.
- Premium must not block the SERENE essence: reading, unlimited annotations, organized export, Mente, history, shelves/categories, and essential personalization remain core.

No authentication, reading/session logic, annotation CRUD logic, beta access rules, RLS, or destructive deletion behavior changed in Phase 15D, Phase 15E, Phase 15F, Phase 15G, or Phase 16.

## Phase 17 notes

Phase 17 adds a light reading vocabulary aid without making SERENE a study app:

- Reading has a secondary `Dicionario` tool for looking up a word during an active session.
- Phase 17B adds a real lookup flow through `/api/dictionary`, using Dicionario Aberto for Portuguese and Free Dictionary API for other supported language codes.
- The reader can consult a word without saving it.
- `public.vocabulary_entries` stores only saved words by user, book, optional reading session, page, date, optional definition, optional note, and source.
- Saved vocabulary entries now support `deleted_at` so removing a word from the vocabulary is reversible at the data layer.
- The reading screen shows a small `Vocabulario deste livro` history after words are saved for that book.
- Anotacoes includes a secondary `Vocabulario` folder with search and book filtering.
- Session summaries show `Palavras consultadas nesta leitura` when the session has saved words.
- When a finished session completes the book, the summary shows `Vocabulario deste livro`.

No primary navigation item, flashcards, quiz, translator, or invented definitions were added.

## Phase 18 notes

Phase 18 makes outside-app progress estimates more transparent without turning SERENE into a calculation tool:

- Books can store optional audiobook duration, source, confirmation state, estimated minutes per page, and current estimation source.
- `public.reading_progress_entries` stores confirmed outside-app progress with pages advanced, estimated minutes, and the source of the estimate.
- `Atualizar pagina` prioritizes real pace in the same book, then the user's real global pace, then audiobook duration, then a provisional default.
- Real SERENE session time, outside-app estimated time, historical estimated time, and approximate total remain visibly separated.
- Automatic audiobook duration lookup is prepared as future work; the app does not invent durations.

## Phase 19 notes

Phase 19 makes adding a book start with less work:

- `Novo livro` opens a short intake flow where the reader starts with only `Nome do livro`.
- Search suggestions use Open Library public search data and always require user confirmation before saving.
- Results show title and author, plus cover, year, pages, publisher, language, ISBN, and subjects when the source provides them.
- The user may confirm directly, edit the data in the full form, search again, cancel, or fall back to manual title-only cadastro.
- `public.books` now stores optional `language`, `isbn`, and `subjects`; existing `publication_year` remains the published-year field.
- `Adicionar por foto da capa` is visible as a prepared placeholder; OCR/IA identification remains future work.

## Phase 20 notes

Phase 20 makes the Mural easier to find without turning it into a primary app area:

- The reading screen names the tool `Mural de ideias` and explains that it organizes ideas visually without pausing the session.
- The annotation `+` modal includes a discreet `Abrir Mural` callout during reading; Mural remains an organization view, not an annotation type.
- Biblioteca book cards expose a secondary `Mural` action. If the book has an active or paused session, it opens the Mural directly; otherwise SERENE shows a calm `Mural deste livro` prompt with `Iniciar leitura`.
- Anotacoes shows `Organizar no Mural` when a folder is filtered to a specific book, with the same active-session requirement.
- Mural still lives under the contextual reading route `/leitura/[bookId]/mural` and is not a main navigation item.

## Phase 21 notes

Phase 21 is a simplicity pass after Vocabulary, audiobook estimates, intelligent book intake, and the more visible Mural:

- Primary navigation remains only Inicio, Biblioteca, Anotacoes, and Mente.
- Mural stays contextual to reading, book cards, and filtered Anotacoes; it was not promoted to the main menu.
- Vocabulary remains a light reading aid inside Leitura and Anotacoes, not a dictionary or study module.
- Outside-app time remains estimated and separated from real SERENE session time; approximate totals are labeled as such.
- Intelligent book intake still starts with `Nome do livro`, requires confirmation before saving, and keeps the cover-photo path as a prepared placeholder.
- No database table, route, or major feature was added in this phase.

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
