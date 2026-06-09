# SERENE Tasks

## Core rule

Every new feature must make SERENE more comfortable, not heavier. If a feature makes the app polluted, confusing, tiring, or stressful, simplify it, hide it, postpone it, or rethink it.

## Phase gates reminders

- [ ] Keep phases incremental; do not combine unrelated work in one PR.
- [ ] After each phase, run build/lint/typecheck if available.
- [ ] Do not start Phase 5 (Mural) before Phase 3 (sessions) and Phase 4 (annotations) are stable.
- [ ] Do not implement Mente before there is real book/session/annotation data.
- [ ] Do not implement AI/OCR before core reading and annotations are reliable.

## Phase 0 â€” Project setup

- [x] Inspect the current project structure.
- [x] Identify framework, routing system, styling system, and package manager.
- [x] Confirm whether Supabase client exists.
- [x] Create or update environment variable example file.
- [x] Add required Supabase environment variables.
- [x] Confirm app can run locally.
- [x] Confirm build command.
- [x] Confirm lint/typecheck command if available.
- [x] Confirm `supabase/schema.sql` exists.
- [x] Confirm `supabase/seed.sql` exists.
- [x] Document any missing setup in README or project notes.

Validation:
- [x] App starts locally.
- [x] No obvious runtime errors on initial load.
- [x] Build/lint/typecheck pass if available.

## Phase 1 â€” Auth, profile and app shell

- [x] Create Supabase client utility.
- [x] Implement auth state listener.
- [x] Implement local demo login path for early development.
- [x] Phase 14 superseded shared demo login for beta; testers now use individual accounts.
- [x] Fetch current profile from `profiles` table.
- [x] Create base app shell.
- [x] Add main navigation: InÃ­cio, Biblioteca, AnotaÃ§Ãµes, Mente.
- [x] Add hamburger menu: ConfiguraÃ§Ãµes, Lixeira, Exportar, Atalhos, Perfil.
- [x] Implement light theme.
- [x] Implement dark theme.
- [x] Implement system theme.
- [x] Implement reduced motion setting.
- [x] Implement pressure-free mode setting.
- [x] Add SERENE brain loading placeholder.
- [x] Add empty states with calm copy.

Validation:
- [x] User can enter app.
- [x] Profile loads.
- [x] Navigation works.
- [x] Theme switching works.
- [x] Reduced motion setting is respected where already used.
- [x] Build/lint/typecheck pass if available.

## Phase 2 â€” Biblioteca and books

- [x] Create books query for current user.
- [x] Create Biblioteca screen.
- [x] Display all books even when no manual categories exist.
- [x] Add book status filters: Todos, Lendo, Quero ler, Pausados, Lidos.
- [x] Add ordering: alphabetical, recent, status, author.
- [x] Implement create book form with title required.
- [x] Add optional book fields.
- [x] Implement edit book.
- [x] Implement soft delete book using `deleted_at`.
- [x] Add Lidos separation: HistÃ³rico de leitura and Lido no SERENE.
- [x] Add book origin labels.
- [x] Add manual categories.
- [x] Allow multiple manual categories per book.
- [x] Add empty state for categories.
- [x] Highlight current book on InÃ­cio.
- [x] Make other currently-reading books smaller than current book.
- [x] Add hover statistics with delay and transparency.
- [x] Add profile photo placeholder on InÃ­cio.
- [x] Add closable literary curiosity placeholder.

Validation:
- [x] Books appear without categories.
- [x] Book CRUD works.
- [x] Soft-deleted books disappear from normal Biblioteca.
- [x] Lidos correctly separates historical and SERENE-read books.
- [x] Multiple categories work.
- [x] Build/lint/typecheck pass if available.

## Phase 3 â€” Reading sessions

- [x] Create reading session service/helpers.
- [x] Implement Iniciar Leitura.
- [x] Start visible timer immediately.
- [x] Store session with status `active`.
- [x] Implement `active_seconds` calculation.
- [x] Implement Pausar.
- [x] Implement Retomar.
- [x] Track `paused_seconds` separately.
- [x] Ensure only explicit Pausar pauses timer.
- [x] Add page current display.
- [x] Allow current page update.
- [x] Implement Finalizar Leitura.
- [x] Ask final page before completing.
- [x] Save `end_page`.
- [x] Save session status `finished`.
- [x] Show basic session summary.
- [x] Add `+` button on reading screen.
- [x] Add Mural button placeholder.
- [x] Add reading close behavior setting: minimize or close.
- [x] Implement origin-aware back behavior.

Important:
- [x] Opening Mural must not pause time.
- [x] Closing Mural must not pause time.

Validation:
- [x] Timer starts immediately.
- [x] Timer counts only active time.
- [x] Pause/resume works.
- [x] Final page is saved.
- [x] Summary shows correct active time.
- [x] Manual UI validation passed after reading session RLS fix.
- [x] Build/lint/typecheck pass if available.

## Phase 4 â€” Annotation system

- [x] Create annotations query for current user.
- [x] Create `+` annotation modal.
- [x] Default annotation type to AnotaÃ§Ã£o RÃ¡pida.
- [x] Add type switcher.
- [x] Implement `quick_note`.
- [x] Implement `reflection`.
- [x] Implement `highlight`.
- [x] Implement `post_it`.
- [x] Implement `flag`.
- [x] Implement `doubt`.
- [x] Implement `thought`.
- [x] Implement `idea`.
- [x] Implement `action`.
- [x] Link annotations to book.
- [x] Link annotations to session when available.
- [x] Add optional page number.
- [x] Add color support.
- [x] Add edit annotation.
- [x] Add soft delete annotation.
- [x] Add favorite annotation.
- [x] Add private annotation.
- [x] Add `review_status`.
- [x] Add Para revisar filter/area.
- [x] Add visual identity by annotation type.
- [x] Ensure highlight marks selected words, not entire card where possible.

Validation:
- [x] Annotations create correctly.
- [x] Annotations edit correctly.
- [x] Annotations soft delete correctly.
- [x] Favorites work.
- [x] Para revisar works.
- [x] Build/lint/typecheck pass if available.

## Phase 5 â€” Mural mode

- [x] Create separate Mural screen.
- [x] Open Mural from reading screen.
- [x] Add smooth transition to Mural.
- [x] Ensure opening Mural does not pause timer.
- [x] Ensure closing Mural does not pause timer.
- [x] Show current session/book annotations in Mural.
- [x] Show annotations created outside Mural in Mural.
- [x] Initially order outside-Mural annotations by creation time.
- [x] Store positions in `annotation_mural_positions`.
- [x] Do not duplicate annotation content.
- [x] Implement drag/move annotations.
- [x] Implement resize annotations.
- [x] Persist moved positions.
- [x] Edit annotation from Mural updates same annotation record.
- [x] Delete annotation from Mural sends same annotation to Trash.
- [x] Add floating/sticky new annotation button.
- [x] New manual annotation starts in visible center.
- [x] Implement `mural_suggestions` query.
- [x] Create max 5 suggestions per session.
- [x] `suggested_slot` must be 1 to 5.
- [x] Randomize suggestion positions only once per session.
- [x] Keep suggestion positions stable during same session.
- [x] Prevent suggestions from overlapping existing annotation positions.
- [x] Allow user to move suggested balloons.
- [x] Persist moved suggestion positions.
- [x] Clicking suggestion does not remove it.
- [x] Remove/hide suggestion only by explicit close/hide/delete/cancel.
- [x] Convert suggestion into annotation when user writes in it.
- [x] Stop auto-suggestions after 5 are used.
- [x] Ensure Mural remains visually calm like a whiteboard.

Validation:
- [x] Timer continues while Mural is open.
- [x] Suggestions remain in same place when reopening Mural in same session.
- [x] New session can have different suggestion positions.
- [x] Suggestions do not overlap existing annotations.
- [x] Mural annotations sync with AnotaÃ§Ãµes screen.
- [x] Build/lint/typecheck pass if available.

## Phase 6 â€” Final session animation and summary

- [x] Create final session animation component.
- [x] Show open book.
- [x] Animate session annotations moving into book.
- [x] Animate book closing.
- [x] Add skip option.
- [x] Add reduced motion fallback.
- [x] Show â€œSessÃ£o de leitura finalizada.â€
- [x] Create smart session summary.
- [x] Show active time.
- [x] Show pages read.
- [x] Show annotation counts by type.
- [x] Show favorites count.
- [x] Show items to review.
- [x] Add emotional reading-time phrase.
- [x] Add Revisar agora option.
- [x] Add Revisar depois option.

Validation:
- [x] Finish flow works without losing session data.
- [x] Reduced motion fallback works.
- [x] Summary is accurate.
- [x] Build/lint/typecheck pass if available.

## Phase 7 â€” Minimization and active reading state

- [x] Implement minimize reading.
- [x] Keep timer running while minimized.
- [x] Create floating reading card.
- [x] Show book, time, status, and restore button.
- [x] Allow card movement.
- [x] Dock card to screen corners if possible.
- [x] Restore full reading screen.
- [x] Add active reading indicator.
- [x] Show active indicator while reading is active.
- [x] Show active indicator while Mural is open.
- [x] Make it clear when time is running.

Validation:
- [x] Minimizing does not end session.
- [x] Timer continues while minimized.
- [x] Restore works.
- [x] User is never unsure if session is active.
- [x] Build/lint/typecheck pass if available.

## Phase 8 â€” Trash, settings and privacy

- [x] Create Trash screen.
- [x] Show deleted books.
- [x] Show deleted annotations.
- [x] Restore deleted book.
- [x] Restore deleted annotation.
- [x] Add permanent delete with confirmation.
- [x] Implement settings screen.
- [x] Add theme setting.
- [x] Add reduced motion setting.
- [x] Add pressure-free mode setting.
- [x] Add reading close behavior setting.
- [x] Add Mural preferences.
- [x] Add annotation colors settings.
- [x] Add privacy settings.
- [x] Add shortcuts screen/list.
- [x] Add private book behavior.
- [x] Add private annotation behavior.
- [x] Exclude private content from quick exports by default.

Validation:
- [x] Trash restore works.
- [x] Permanent delete requires confirmation.
- [x] Settings persist.
- [x] Privacy flags are respected in visible areas already implemented.
- [x] Build/lint/typecheck pass if available.

## Phase 9 â€” Mente

- [x] Create Mente dashboard.
- [x] Query automatic categories.
- [x] Show books by automatic category.
- [x] Avoid double-counting unique books.
- [x] Show real time registered in SERENE.
- [x] Show estimated historical time separately.
- [x] Show approximate total.
- [x] Label estimated time clearly.
- [x] Show strongest categories.
- [x] Show books count.
- [x] Show sessions count.
- [x] Show annotations count.
- [x] Show favorite ideas.
- [x] Show items to review.
- [x] Show reading evolution.
- [x] Add brain symbol placeholder.
- [x] Add Timeline access.
- [x] Add simple â€œLivros que conversam entre siâ€ section.
- [x] Add suggestion to turn automatic category into manual Biblioteca category.
- [x] Ensure one book can appear in multiple categories but count once in totals.

Validation:
- [x] Mente works without manual categories.
- [x] Real and estimated time are separated.
- [x] Unique books are not double-counted.
- [x] Build/lint/typecheck pass if available.

## Phase 10 â€” Timeline

- [x] Create Timeline screen or Mente section.
- [x] Query `timeline_events`.
- [x] Group events by month.
- [x] Display event title and description.
- [x] Add calm visual style.
- [x] Add empty state.
- [x] Link events to book/session/annotation when available.

Validation:
- [x] Timeline displays seeded events.
- [x] Events are grouped clearly.
- [x] Build/lint/typecheck pass if available.

## Phase 11 â€” Export

- [x] Create Export screen.
- [x] Add export intention selector.
- [x] Add export by book.
- [x] Add export by period.
- [x] Add export all.
- [x] Add reflections only.
- [x] Add highlights only.
- [x] Add post-its only.
- [x] Add favorites only.
- [x] Add items to review.
- [x] Add session export.
- [x] Add Mural annotations export.
- [x] Generate TXT export.
- [x] Generate Markdown export.
- [x] Add PDF placeholder or real generation if already supported.
- [x] Add DOCX placeholder or real generation if already supported.
- [x] Respect private content exclusion by default.
- [x] Add â€œinclude private content?â€ option.
- [x] Avoid duplicating Mural annotations.
- [x] Include real vs estimated time clearly.
- [x] Create export record.

Validation:
- [x] Export produces organized content.
- [x] Private content is excluded unless included.
- [x] Mural annotations are not duplicated.
- [x] Build/lint/typecheck pass if available.

## Phase 12 â€” Future AI/OCR preparation

- [x] Add camera button placeholder on InÃ­cio.
- [x] Add camera button placeholder on reading screen.
- [x] Create capture flow placeholder.
- [x] Default captured content to current book.
- [x] Allow choosing recent 5 books.
- [x] Allow searching/filtering books.
- [x] Add OCR page placeholder.
- [x] Add physical annotation detection placeholder.
- [x] Add optional marker explanation:
  - R = ReflexÃ£o
  - I = Ideia
  - ? = DÃºvida
  - ! = Insight
  - A = AÃ§Ã£o
  - P = Pensamento
- [x] Make clear markers are optional.

Validation:
- [x] AI/OCR placeholders do not make the app heavy.
- [x] Flow is understandable but not overbuilt.
- [x] Build/lint/typecheck pass if available.

## Phase 13 â€” Polish and quality

- [x] Improve responsive layouts.
- [x] Polish dark mode.
- [x] Respect reduced motion everywhere.
- [x] Add keyboard shortcuts.
- [x] Improve empty states.
- [x] Improve loading states.
- [x] Add feedback messages.
- [x] Remove invisible clickable areas.
- [x] Check no duplicated data.
- [x] Check Mural does not pause timer.
- [x] Check soft delete behavior.
- [x] Check privacy behavior.
- [x] Fix TypeScript errors.
- [x] Fix lint errors.
- [x] Run final build.

Validation:
- [ ] SERENE feels calm, coherent, reliable, and comfortable.
- [x] Build/lint/typecheck pass if available.

## Phase 14 — SERENE Private Beta

- [x] Remove shared demo login from the app UI.
- [x] Keep authentication required for user-specific areas.
- [x] Add beta profile fields: `role`, `is_beta_tester`, `access_status`, `last_seen_at`.
- [x] Add pending-by-default profile creation for new Auth users.
- [x] Preserve existing profiles as active beta users during migration.
- [x] Add `public.feedback` table with type, screen, message, rating, status, and timestamps.
- [x] Add feedback RLS: users insert/read own feedback; admins read/update all feedback.
- [x] Add restrictive RLS so user data tables require active beta access.
- [x] Add discreet feedback modal in main menu and Configurações.
- [x] Add success message: “Obrigado. Seu feedback ajuda a melhorar o SERENE.”
- [x] Add protected `/beta` admin overview.
- [x] Show beta users, total books, total notes, total sessions, feedback count, latest feedback, and last activity.
- [x] Hide admin overview from regular users.
- [x] Add admin-select RLS policies for internal overview counts.
- [x] Add `supabase/beta_sample_seed.sql` for optional per-user starter content.
- [x] Update README with Vercel/private beta deployment instructions.
- [x] Document service role key as optional server-only and not client-safe.
- [x] Apply Phase 14 migration to the configured Supabase project.

Validation:
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.
- [x] Local HTTP smoke test returns 200 for `/` and `/beta`.
- [ ] User A cannot see User B data.
- [ ] User can create a book.
- [ ] User can create a note.
- [ ] User can start/end a reading session.
- [ ] User can submit feedback.
- [ ] Admin can view feedback.
- [ ] Regular user cannot access admin area.

Pending manual checks:
- [ ] Cross-account isolation needs two real beta accounts.
- [ ] `/beta` admin access needs one profile marked `role = 'admin'`.
- [ ] Vercel deployment smoke test after env vars are configured.

## Phase 15 - Forgotten ideas rescue and experience refinement

- [x] Keep the Home screen centered on books currently in reading.
- [x] Show the current book as the main visual focus.
- [x] Keep secondary reading books visible with covers and progress, without competing with the current book.
- [x] Add a calm show/hide control for the reading section.
- [x] Keep quick annotation and capture/photo placeholder entry points on Home.
- [x] Replace the generic Home curiosity with a book-specific note based only on the user's own library.
- [x] Preserve the dismissible curiosity behavior.
- [x] Keep the profile avatar block visible on Home.
- [x] Consolidate missing visual token aliases used by the polished interface.
- [x] Refine annotation post-its so they feel more physical, smaller, square, and tactile.
- [x] Add a light post-it stack effect in annotation cards.
- [x] Limit visible annotation text in cards and allow local expand/retract.
- [x] Keep edit, favorite, privacy, review status, and Trash actions unchanged.
- [x] Move the Trash action visually toward the lower-right action area in annotation cards.
- [x] Create a reusable physical post-it paper renderer for annotation surfaces.
- [x] Add grouped post-it piles in Anotacoes that open like a calm folder.
- [x] Keep individual post-it edit/delete/favorite/privacy/review actions available inside the opened pile.
- [x] Reuse the physical post-it visual in Mural and session-end ritual styling.
- [x] Add a calm living-session detail to the reading timer area.
- [x] Add a minimal cup/steam visual that suggests active reading without competing with the book.
- [x] Add a softer paused state with short microcopy: `Volte com calma.`
- [x] Keep reading controls and session logic unchanged.
- [x] Refine Mural as a calmer mental map without changing reading/session logic.

Deferred intentionally:
- [ ] Full OCR extraction for photographed pages.
- [ ] Physical post-it/photo detection and user confirmation before saving.
- [ ] Optional marker classification for physical notes: `*`, `R`, `I`, `?`, `!`, `A`, `P`.
- [ ] A single user-facing color manager in Configuracoes, if the data model is expanded safely.
- [ ] User-created custom colors, only if the database supports it without risky migration.
- [ ] Onboarding prompt for already-read books, softly presented and never forced.
- [x] Stronger Mente drill-down by area with related books, notes, and area statistics.
- [ ] Optional minimized floating reading session if requested as a behavior change.
- [ ] Seed/demo data showing multiple active readings, post-its, highlights, reflections, Mural suggestions, and Mente data, only with approval and never against production data.
- [ ] Future finishing animation refinement: notes entering an open book, then the book closing.

Validation:
- [ ] Basic browser flow: login, Home, Biblioteca, reading, pause/resume, note, Mural timer continuity, finish session, Anotacoes, Mente, themes, feedback.
- [ ] Manual visual check for the reading presence detail in light and dark themes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Phase 15B - Home reading presence refinement

- [x] Make the current reading book larger and more editorial on Inicio.
- [x] Show a status/progress chip for the current book.
- [x] Use `Iniciar leitura` or `Retomar leitura` based on current page progress.
- [x] Keep all reading books visible in the same section, with smaller secondary cards.
- [x] Keep the reading section collapsible with the existing up/down arrow control.
- [x] Add a visible calm quick-note action in the Home header.
- [x] Keep the floating `+` action for quick annotations.
- [x] Rename the Home camera entry to `Foto` while preserving the existing capture placeholder dialog.
- [x] Make the literary curiosity more tied to the user's actual book progress when available.
- [x] Make Home metrics read less like a productivity dashboard.
- [x] Update optional beta sample seed with multiple active readings, covers, progress, and a current book.
- [x] Preserve authentication, beta isolation, services, RLS, and reading/session logic.

Validation:
- [ ] Manual Home check: current book, all reading books, collapse/expand, quick note, photo dialog, light/dark, responsive.
- [x] `git diff --check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Phase 15C - Physical post-its and post-it piles

- [x] Make post-its square or nearly square, physical, tactile, and visually distinct from common cards.
- [x] Add soft paper layers, subtle tape, physical shadow, and dark-mode-compatible contrast.
- [x] Limit long post-it text with `...` and allow local expand/retract.
- [x] Avoid extra invisible clickable areas by making only the paper/folder surface interactive.
- [x] Add a grouped post-it pile in Anotacoes when multiple post-its belong to the same book or no-book group.
- [x] Let the post-it pile open into a side-by-side folder view and close back to the pile.
- [x] Keep edit, delete to Lixeira, favorite, privacy, and review-status actions unchanged inside the folder.
- [x] Update Mural post-its to use the same physical paper visual.
- [x] Refine session-end post-it notes so they keep a stacked paper identity during the ritual.
- [x] Add optional beta sample post-its with short and long content for visual testing.
- [x] Preserve authentication, beta isolation, services, RLS, reading/session logic, and annotation CRUD logic.

Validation:
- [ ] Manual post-it flow: create, view, expand, edit, delete, open/close pile, light/dark, clickable areas.
- [x] `git diff --check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Phase 15D - Biblioteca shelves

- [x] Add manual Biblioteca shelves as a separate concept from automatic Mente categories.
- [x] Add safe `public.shelves` and `public.book_shelves` tables through `supabase/fixes/011_biblioteca_shelves.sql`.
- [x] Allow one book to belong to multiple shelves.
- [x] Let users create and rename shelves.
- [x] Let users remove shelves without removing books.
- [x] Let users add/remove books from shelves through calm selection panels.
- [x] Add an internal opened-shelf view with back action, book count, annotation count, and current Biblioteca filters.
- [x] Add shelf cards with small cover previews and a quiet personal-library visual.
- [x] Keep current book status filters, ordering, categories, reading, annotations, Mural, Mente, export, and beta logic unchanged.
- [x] Update demo and beta sample seeds with shelves and books in more than one shelf.
- [x] Document future Mente suggestion: automatic categories may later suggest optional shelves, never force them.

Validation:
- [ ] Manual Biblioteca shelves flow: create, rename, remove shelf, add/remove book, multi-shelf book, open shelf, back, light/dark, responsive.
- [x] `git diff --check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

Future optional bridge:
- [ ] Mente may suggest creating a Biblioteca shelf from a strong automatic category, but the user must always choose whether to create it.

## Phase 15F - Mente strengthening

- [x] Keep the screen named `Mente`; do not use visible `Minha Mente` wording.
- [x] Add a central symbolic brain visual for automatic reading areas.
- [x] Add approximate area percentages/weights.
- [x] Let the user select an area and see books, annotations, real time, and estimated historical time.
- [x] Show book covers or elegant fallbacks wherever Mente lists related books.
- [x] Keep real SERENE reading time separate from estimated historical time.
- [x] Use books, descriptions, annotations, automatic relations, and existing manual categories as signals.
- [x] Keep Mente independent from Biblioteca shelves; manual organization remains separate.
- [x] Keep the existing optional manual-category bridge, without creating shelves automatically.
- [x] Add a richer empty state encouraging already-read books without forcing it.
- [x] Update beta sample data with automatic Mente areas, multi-area books, related notes, covers, real reading time, and estimated historical time.
- [x] Avoid database migrations; Phase 15F uses existing tables and safe seed updates.
- [x] Preserve authentication, beta isolation, Supabase schema, RLS, Biblioteca, Estantes, Leitura, Mural, Anotacoes, Lixeira, Exportacao, and Beta logic.

Future:
- [ ] Mente may later suggest creating a Biblioteca shelf from a strong automatic category, for example: "Voce tem muitos livros ligados a Filosofia. Criar estante Filosofia?" This must be optional and never automatic.

Validation:
- [ ] Manual Mente flow: brain visual, area selection, covers/fallbacks, percentages, real vs estimated time, empty state, light/dark, responsive.
- [ ] Browser QA after applying pending database fixes in the target Supabase project.
- [x] `git diff --check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Phase 15E - Mural refinement

- [x] Keep Mural as a separate reading-session screen.
- [x] Keep opening and closing Mural from changing pause/resume state.
- [x] Preserve current route and return-to-reading behavior.
- [x] Preserve the existing annotation, suggestion, position, and session services.
- [x] Keep suggested balloons capped at 5 per session.
- [x] Make suggestion copy shorter, calmer, and more reading-focused.
- [x] Add a calm session status strip for memories, saved positions, and suggestion limit.
- [x] Make the Mural feel more like a mental map/whiteboard without adding visual noise.
- [x] Product decision recorded: "O Mural do SERENE não usa canvas infinito nem pan/scroll livre. Ele é uma área fixa e visível."
- [x] Replace the internal scrollable canvas with a fixed visible Mural area.
- [x] Remove scroll-based placement for new Mural annotations.
- [x] Keep moved annotations and suggested balloons constrained to the fixed visible area.
- [x] Show a calm `mais memorias` summary instead of solving dense Murals with infinite scroll.
- [x] Improve fallback placement so generated annotation/suggestion positions keep looking organized when the canvas is busier.
- [x] Keep manual `+` annotation creation starting at the visible center.
- [x] Keep suggested balloons movable and removable only through explicit actions.
- [x] Preserve visual identity for post-it, reflection, highlight, flag, idea, doubt, thought, action, and quick notes.
- [x] Reuse existing demo seed coverage for Mural suggestions, positions, post-it, reflection, highlight, and active-session examples.
- [x] Preserve authentication, beta isolation, Supabase schema, RLS, migrations, services, Biblioteca, Mente, annotations, export, and Trash logic.

Validation:
- [ ] Manual Mural flow: open from reading, timer continuity, move annotation, move suggestion, convert suggestion, hide/delete suggestion, `+` center creation, close back to reading, light/dark, responsive.
- [ ] Browser QA after applying pending database fixes in the target Supabase project.
- [x] `git diff --check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Phase 15G - Final experience polish before master

- [x] Keep the phase small: polish, align copy, remove visual noise, and avoid new large flows.
- [x] Remove the fake zero-statistics hover panel from book cards so Biblioteca feels literary, not like a cold dashboard.
- [x] Use `Iniciar leitura` or `Retomar leitura` on book cards based on existing page progress.
- [x] Align the reading camera placeholder language with Home by using `Foto`.
- [x] Make Mural feedback and labels talk about memories/places on a fixed table instead of technical positions or balloons.
- [x] Keep the Mural product decision: no infinite canvas, no free pan, no horizontal scroll, no zoom.
- [x] Keep Estantes manual and separate from automatic Mente interpretation.
- [x] Keep Mente automatic and independent from Biblioteca shelves.
- [x] Keep core features outside Premium blocking: reading, Biblioteca, annotations, Mural, Mente, Trash, and exports remain essential SERENE areas.
- [x] Keep `/timeline` only as a redirect alias to `/linha-do-tempo`; do not remove routes before a separate navigation decision.
- [x] Preserve authentication, beta isolation, Supabase schema, RLS, migrations, services, reading/session logic, annotation CRUD, Biblioteca, Estantes, Mural, Mente, Trash, Export, and Beta behavior.

Pending manual QA before master:
- [ ] Browser flow: Home, Biblioteca/Estantes, Leitura active/paused/minimized/finished, Anotacoes/post-it pile, Mural fixed area, Mente, Configuracoes, Lixeira, Exportar, Perfil, Beta.
- [ ] Light/dark/system visual pass for post-its, highlights, Mural, Mente, Home, reading controls, and feedback messages.
- [ ] Mobile pass for Home reading section, Biblioteca shelves, Mural fixed area, bottom navigation, and floating `+` buttons.

Validation:
- [x] `git diff --check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Phase 16 - Reorganizacao simples da experiencia SERENE

Goal:
- [x] Reorganize the app around Inicio, Biblioteca, Leitura, Anotacoes, and Mente without making the interface heavier.
- [x] Let SERENE organize more of the experience for the reader: read, update progress, save thoughts, and explore Mente when desired.
- [x] Preserve authentication, beta, Supabase, RLS, reading sessions, annotations, Biblioteca, Estantes, Mural, Mente, Trash, Export, and Beta behavior.

A. Essential now:
- [x] User can read with the app open through the existing real reading session flow.
- [x] User can also register reading done outside the app through `Atualizar pagina`.
- [x] `Atualizar pagina` is available from Inicio/current book and Biblioteca/book cards.
- [x] Outside-app progress updates the book page and records estimated time through timeline events, not through `reading_sessions`.
- [x] Real time, outside-app estimated time, and historical estimated time stay separated in copy and calculations.
- [x] The estimate uses the user's real seconds-per-page average when sessions have page deltas; otherwise it uses a simple initial estimate.
- [x] Page input rejects negative pages and asks for confirmation before lowering current progress.
- [x] Anotacoes opens as calm folders: `Post-its`, `Reflexoes`, `Marca-textos`, and `Anotacoes rapidas`.
- [x] Post-its can be viewed by color groups inside the Post-its folder: todos, amarelos, azuis, verdes, rosas, and other recognized colors.
- [x] Reflexao keeps its own thought-bubble visual identity.
- [x] Marca-texto keeps its own marked-text visual identity; the highlight sits on words, not on the whole card.
- [x] Post-it keeps its own physical-paper visual identity, including square paper, shadow, slight rotation, and stack behavior.
- [x] Anotacao Rapida remains simple, neutral, and fast.
- [x] Biblioteca now prioritizes automatic shelves by reading area/topic, with `Todos os livros` as its own entry.
- [x] Automatic Biblioteca shelves use book title, author, description, existing manual categories, and shelves as signals.
- [x] A book can appear in more than one automatic shelf, and shelf contents are alphabetical by default.
- [x] Biblioteca search remains global while the main screen stays shelf-first.
- [x] Manual Estantes remain available as optional adjustments, separate from automatic Biblioteca shelves.
- [x] Mente opens with the brain as the main focus and shows details only after the user clicks an area.
- [x] Area details in Mente show related books, related annotations, simple counts, real time, outside-app estimated time, historical estimated time, and total dedicated time.
- [x] Mente remains automatic and interpretive; Biblioteca remains practical organization.
- [x] Mural remains optional, fixed, without infinite canvas, pan, scroll, or zoom, and does not compete with Anotacoes.
- [x] Essential SERENE features must not be blocked behind Premium: unlimited annotations, organized export, main Mente, history, categories/shelves, essential personalization, and essential future AI.

B. Simplified or hidden:
- [x] Anotacoes no longer starts as one mixed list; the mixed view only appears after opening a type folder.
- [x] Type filters no longer compete with folders; the folder itself defines the main annotation type.
- [x] Flag, Ideia, Duvida, Pensamento, and Acao remain preserved as existing/internal annotation records, but are not presented as main creation choices.
- [x] Biblioteca no longer shows automatic shelves and all books as equally primary on the same first surface.
- [x] Manual shelves and manual categories are available but visually secondary to the automatic organization.
- [x] Mente hides broad metric blocks, evolution, favorites, review, and conversation panels from the initial view.
- [x] Timeline/Linha do tempo remains outside the visible product flow for now; `/timeline` and `/linha-do-tempo` redirect calmly to `/mente`.
- [x] Camera/OCR remains a calm placeholder; no full OCR was implemented.
- [x] Curiosities, export, shortcuts, beta, and profile remain secondary or placeholder-level instead of becoming primary destinations.

C. Future:
- [ ] Decide whether Timeline/Linha do tempo has a clear calm role before returning it to navigation.
- [ ] Refine the existing session-ending book animation into the future ritual where annotations enter an open book and the book closes.
- [ ] Mente may suggest Biblioteca shelves from automatic categories, always optional and never automatic.
- [ ] OCR page extraction from user-provided images.
- [ ] Photo of physical post-it with user confirmation before saving.
- [ ] Automatic classification of physical annotations.
- [ ] Optional physical markers: `R`, `I`, `?`, `!`, `A`, and `P`.
- [ ] Writing/capturing a page as a future camera/OCR flow.
- [ ] PDF, DOCX, and advanced Markdown export formats.
- [ ] Audiobooks, smartwatch, smart pen, Spotify/YouTube, community/social, advanced Premium, and other large integrations stay on the roadmap, not in the current flow.

Validation:
- [ ] Browser flow: Home `Atualizar pagina`, Biblioteca automatic shelves/Todos os livros, Anotacoes folders, Leitura active/paused/minimized/finished, Mural fixed area, Mente brain selection, Configuracoes, Lixeira, Exportar, Perfil, Beta.
- [ ] Light/dark/system visual pass for quick notes, reflections, highlights, post-its, Mural, Mente, Home, Biblioteca shelves, reading controls, and feedback messages.
- [ ] Mobile pass for primary navigation, Anotacoes folders/filters, Biblioteca automatic shelves, Mente brain area, Mural fixed area, and floating `+` buttons.
- [x] `git diff --check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Phase 17 - Vocabulario da Leitura e resumo de palavras do livro

Goal:
- [x] Add a calm, secondary reading vocabulary aid without turning SERENE into a dictionary app.
- [x] Let the user save words during active reading while preserving reading focus, Mural behavior, annotations, Biblioteca, Mente, Trash, Export, and Beta rules.
- [x] Keep vocabulary complementary to annotations; do not add it as a primary annotation type or primary navigation item.

A. Data and safety:
- [x] Add `public.vocabulary_entries` for user-owned saved words.
- [x] Store word, optional definition, book, optional reading session, page, date, optional note, optional source, and user.
- [x] Add useful indexes for user history, book history, session summary, and word lookup.
- [x] Enable RLS and owner-only select/insert/update policies.
- [x] Ensure insert/update policies validate optional book/session ownership.
- [x] Preserve beta access restrictions for the new table.
- [x] Avoid destructive vocabulary deletion flows in this phase.

B. Reading flow:
- [x] Add a discreet secondary `Vocabulario` button to the reading screen.
- [x] Open a light modal asking which word the user wants to save.
- [x] Allow saving without automatic definition.
- [x] Show calm copy that automatic lookup is still in preparation.
- [x] Allow optional manual meaning and optional note.
- [x] Save the current page and active reading session when available.
- [x] Show a small `Palavras consultadas neste livro` section after the book has saved words.

C. Anotacoes and summaries:
- [x] Add a secondary `Vocabulario` folder inside Anotacoes.
- [x] Allow vocabulary search by word/meaning/note and filtering by book.
- [x] Show `Palavras consultadas nesta leitura` in the session summary when words were saved in that session.
- [x] Show `Vocabulario deste livro` when finishing a session completes the book.
- [x] Keep vocabulary summary smaller than the main annotations section.

Future:
- [ ] Additional dictionary sources and provider fallback controls.
- [ ] Translation.
- [ ] Synonyms.
- [ ] Contextual examples.
- [ ] AI-suggested meaning with source/confirmation.
- [ ] Relate saved words to Mente.
- [ ] Vocabulary review flow only if it can stay calm and useful.

Validation:
- [ ] Manual flow: save word during reading, see book history, finish session, see session vocabulary summary.
- [ ] Manual book-completion flow: finish at final page, see full book vocabulary.
- [ ] Manual Anotacoes flow: open Vocabulario folder, search, filter by book, open details.
- [ ] Light/dark/system visual pass for vocabulary modal, reading history, summaries, and Anotacoes folder.
- [ ] Mobile pass for vocabulary modal and reading secondary tools.
- [ ] Apply `supabase/fixes/012_vocabulary_entries.sql` in the target Supabase project before browser QA.
- [x] `git diff --check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Phase 17B - Dicionário funcional na leitura

Goal:
- [x] Make the reading tool work first as a dictionary, with saved vocabulary as a consequence.
- [x] Let the reader search a word, see the definition inside SERENE, and optionally save it to the book vocabulary.
- [x] Never invent definitions without a source.

A. Dictionary lookup:
- [x] Rename the reading action to `Dicionário`.
- [x] Replace the manual-only modal with a search-first modal.
- [x] Use `Qual palavra em português você quer entender?` and support Enter/search button.
- [x] Add `/api/dictionary` as a normalized dictionary route.
- [x] Use Dicionário Aberto for Portuguese lookups.
- [x] Keep English dictionary, translation, language auto-detection, and multilingual lookup out of this version.
- [x] Show loading, found, not found, and error states without technical errors.
- [x] Show word, part of speech when available, main definition, example when available, and source.
- [x] Do not invent definitions; show unavailable/not-found messages when the source cannot provide a result.

B. Saving vocabulary:
- [x] Let the user consult without saving.
- [x] Save only when the user chooses `Salvar no vocabulário deste livro`.
- [x] Store trusted definition and source when available.
- [x] Allow manual saving if no definition is found, without inventing meaning.
- [x] Prevent duplicate saved words in the same book.
- [x] Show `Essa palavra já está no vocabulário deste livro.` when the word already exists for the book.

C. History and safety:
- [x] Keep Anotacoes as the secondary `Vocabulário` folder.
- [x] Keep Dicionário out of the annotation `+` type list and out of primary navigation.
- [x] Rename the reading history section to `Vocabulário deste livro` and show only saved words.
- [x] Add soft removal for saved vocabulary through `deleted_at`.
- [x] Add `supabase/fixes/015_vocabulary_dictionary_lookup.sql`.
- [x] Add `supabase/fixes/017_portuguese_dictionary_only.sql`.

Future:
- [ ] English dictionary support.
- [ ] Translation.
- [ ] Multilingual UI for selecting word language manually.
- [ ] Synonyms.
- [ ] Richer contextual examples.
- [ ] Configurable external dictionary/API provider.
- [ ] IA meaning suggestions only with source/confirmation.

Validation:
- [ ] Manual flow: open Dicionário during reading, search a Portuguese word, view definition, and close without saving.
- [ ] Manual flow: search a word, save it, verify it appears in `Vocabulário deste livro`.
- [ ] Manual flow: search/save same word twice and verify it does not duplicate.
- [ ] Manual flow: remove a saved word from reading/Anotacoes and verify it disappears from normal lists.
- [ ] Browser visual pass for the reading dictionary modal when the in-app browser connector is available.
- [ ] Apply `supabase/fixes/015_vocabulary_dictionary_lookup.sql` in the target Supabase project before production QA.
- [x] `npm run typecheck` passes.
- [x] `git diff --check` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Phase 18 - Calculo Inteligente de Tempo de Leitura por Audiobook

Goal:
- [x] Estimate reading done outside the app more intelligently while keeping real and estimated time clearly separated.
- [x] Use audiobook duration as an initial base when available, but prioritize the user's real reading pace when there is enough data.
- [x] Keep the experience calm and transparent, without making SERENE feel like a technical calculator.

A. Data and safety:
- [x] Add optional audiobook fields to `books`: duration in minutes, source, confirmation flag, estimated minutes per page, and estimation source.
- [x] Add `public.reading_progress_entries` for user-owned outside-app progress estimates.
- [x] Store book, optional reading session, from/to page, pages read, estimated minutes, source, and timestamps.
- [x] Add useful indexes for user history, book history, session link, and estimation source.
- [x] Enable RLS and owner-only select/insert/update policies with book/session ownership checks.
- [x] Preserve existing `timeline_events` compatibility while avoiding double-counted estimates through `progress_entry_id`.

B. Estimate priority:
- [x] First use the user's real pace in the same book when real sessions have page deltas.
- [x] Then use the user's real global pace across books.
- [x] Then use audiobook duration divided by total pages.
- [x] Then use a provisional default average.
- [x] Save the active `estimation_source` when outside-app progress is confirmed.

C. Product flow:
- [x] Add manual audiobook duration/source/confirmation fields to the book form.
- [x] Show that automatic audiobook duration lookup is still in preparation and never invent a duration.
- [x] Update `Atualizar pagina` to show pages advanced, approximate estimated time, and the source of the estimate.
- [x] Treat lower page input as progress correction and avoid creating negative/estimated reading time.
- [x] Keep real SERENE time, estimated outside-app time, historical estimated time, and approximate total separated in copy.
- [x] Show a discreet time/base summary on book cards when relevant.
- [x] Let Mente include confirmed outside-app estimates without exposing calculation details on the initial screen.

Future:
- [ ] Real automatic audiobook duration lookup through a reliable API/source.
- [ ] Confirm whether an audiobook is complete or abridged.
- [ ] Compare audiobook duration across editions.
- [ ] Advanced automatic adjustment by personal reading pace.
- [ ] Estimate by chapter.
- [ ] Estimate by book difficulty.
- [ ] Sync estimates with ISBN/edition metadata.

Validation:
- [ ] Manual flow: add audiobook duration to a book, update page outside the app, confirm estimate source, and verify separated time totals.
- [ ] Manual correction flow: lower current page and confirm no new estimated time is created.
- [ ] Manual Mente flow: verify initial copy stays simple and selected areas include estimated outside-app time.
- [ ] Apply `supabase/fixes/013_audiobook_reading_progress.sql` in the target Supabase project before browser QA.
- [x] `git diff --check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Phase 19 - Cadastro Inteligente de Livros

Goal:
- [x] Let the user start adding a book by typing only the book name.
- [x] Show possible matches with title and author before saving.
- [x] Ask for confirmation before creating the book.
- [x] Keep manual title-only cadastro available when search fails or feels unnecessary.

A. Intake flow:
- [x] Replace direct new-book form entry with a short `Nome do livro` intake modal.
- [x] Search suggestions by title through Open Library public search.
- [x] Show cover, title, author, year, pages, publisher, language, ISBN, subjects, and source when available.
- [x] Always show title plus author in each result when the source provides author.
- [x] Show a confirmation panel: `Encontramos este livro`.
- [x] Add actions: Confirmar livro, Editar dados, Buscar outro resultado, Cancelar.
- [x] Prevent automatic save without explicit confirmation.
- [x] Let the user fall back to manual cadastro with only the title.

B. Data and organization:
- [x] Add optional `books.language`, `books.isbn`, and `books.subjects`.
- [x] Reuse existing `books.publication_year` for published year instead of creating a duplicate `published_year`.
- [x] Save discovered title, author, cover, pages, description, publisher, publication year, language, ISBN, subjects, and source when available.
- [x] Keep missing fields empty instead of blocking cadastro.
- [x] Feed `subjects`, language, ISBN, publisher, description, title, and author into automatic Biblioteca shelf matching.
- [x] Feed discovered book metadata into Mente topic detection.
- [x] Preserve total pages for progress and time-estimation flows.
- [x] Update demo/beta seeds with subjects and language signals.

C. Photo cover path:
- [x] Add visible `Adicionar por foto da capa` option.
- [x] Show calm placeholder explaining OCR/IA cover identification is in preparation.
- [x] Allow the user to continue by book name instead.

Future:
- [ ] Google Books integration with project API key and production quota rules.
- [ ] ISBN-specific lookup and edition comparison.
- [ ] Open Library edition-detail enrichment for better publisher/page/language selection.
- [ ] Cover photo OCR/IA to detect title and author.
- [ ] Let photo/OCR suggestions flow through the same confirmation panel.
- [ ] Audiobook metadata lookup from reliable sources without inventing duration.
- [ ] Manual category suggestion from discovered subjects, always optional.

Validation:
- [ ] Manual flow: search by name, choose a result, confirm, and verify the book appears complete in Biblioteca.
- [ ] Manual flow: choose a result, edit data, save from the advanced form.
- [ ] Manual fallback: create a title-only book when search has no result.
- [ ] Manual photo path: open photo option and return to name-based cadastro.
- [ ] Apply `supabase/fixes/014_book_discovery_metadata.sql` in the target Supabase project before browser QA.
- [x] `git diff --check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Phase 20 - Mural mais visivel e encontravel

Goal:
- [x] Make the Mural easier to find in the right contexts.
- [x] Keep Mural contextual to reading and annotations, not a primary menu area.
- [x] Preserve the calm hierarchy of Inicio, Biblioteca, Anotacoes, and Mente.

A. Reading screen:
- [x] Rename/reinforce the reading action as `Mural de ideias`.
- [x] Add calm microcopy: organize ideas visually without pausing the session.
- [x] Keep Finalizar leitura visually primary.
- [x] Preserve active/paused session state when opening Mural.

B. Annotation `+` flow:
- [x] Add a discreet `Abrir Mural` callout inside the annotation modal during reading.
- [x] Keep Anotacao Rapida as the default.
- [x] Keep Mural as visual organization, not an annotation type.

C. Book and Biblioteca context:
- [x] Add secondary `Mural` action to book cards without changing primary reading/progress actions.
- [x] Open directly when the book has an active or paused session.
- [x] Show calm `Mural deste livro` prompt and `Iniciar leitura` when no session is open.

D. Anotacoes context:
- [x] Add `Organizar no Mural` when a folder is filtered by a specific book.
- [x] Present Mural as a visual way to arrange annotations.
- [x] Avoid adding Mural as a main folder or annotation type.

Preserved rules:
- [x] Mural remains contextual under `/leitura/[bookId]/mural`.
- [x] No main navigation item was added.
- [x] No infinite canvas, zoom, or pan behavior was added.
- [x] Existing suggestion cap/position behavior was not changed.
- [x] Opening Mural does not pause reading.

Validation:
- [ ] Manual flow: open Mural from reading while active and verify the timer keeps running.
- [ ] Manual flow: pause reading, open Mural, and verify the session remains paused.
- [ ] Manual flow: open Mural from a Biblioteca card with and without an active session.
- [ ] Manual flow: filter Anotacoes by a book and use `Organizar no Mural`.
- [x] `git diff --check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Phase 21 - Revisao final de simplicidade apos novos fluxos

Goal:
- [x] Keep SERENE calm after Vocabulary, audiobook estimates, intelligent book intake, and the more visible Mural.
- [x] Preserve the primary hierarchy: Inicio, Biblioteca, Anotacoes, and Mente.
- [x] Avoid adding new functionality while reviewing weight, language, and discoverability.

A. Essencial agora:
- [x] Confirm Mural, Vocabulario, Timeline, Exportar, and beta tooling are not competing as primary navigation.
- [x] Keep Mural contextual to Leitura, Livro/Biblioteca, and filtered Anotacoes.
- [x] Keep Vocabulario as reading support in Leitura and a secondary Anotacoes folder.
- [x] Keep audiobook duration as an estimate base, not an absolute truth.
- [x] Keep real SERENE time, estimated outside-app time, and approximate total separated in user-facing copy.
- [x] Keep intelligent book intake starting with `Nome do livro` and requiring confirmation before saving.
- [x] Keep Biblioteca organized around automatic shelves plus `Todos os livros`.
- [x] Keep Mente focused on interpretation with details shown after selection.

B. Simplificado/oculto:
- [x] Removed the duplicate large Mural action block from the reading controls and kept a smaller onboarding hint.
- [x] Left Mural out of the main menu and out of annotation-type choices.
- [x] Left Vocabulario out of the main menu and out of flashcard/quiz/study flows.
- [x] Left cover-photo registration as a calm prepared path instead of implementing OCR now.
- [x] Left audiobook lookup as a prepared/manual field instead of inventing durations.
- [x] Kept Timeline parked outside the current product flow.

C. Futuro:
- [ ] Additional dictionary/API sources for Vocabulario, with source selection and redundancy.
- [ ] Translation, synonyms, contextual examples, and optional IA meaning suggestions.
- [ ] Connect saved words to Mente only when it can stay quiet and useful.
- [ ] Real reliable audiobook duration lookup, complete-vs-abridged confirmation, edition comparison, chapter estimates, difficulty estimates, and ISBN sync.
- [ ] Cover-photo OCR/IA flowing through the same book confirmation panel.
- [ ] Manual adjustment of automatic Biblioteca shelves without making categories mandatory.
- [ ] Further Mente drill-down only on demand, without turning it into analytics.

Validation:
- [ ] Manual visual pass in light/dark themes for Inicio, Biblioteca, Anotacoes, Leitura, Mural, Mente, Configuracoes, Lixeira, and Perfil.
- [ ] Manual responsive pass for reading controls, Mural fixed area, Biblioteca shelves, Anotacoes folders, and Mente area details.
- [ ] Manual flow: verify Mural opens from reading without pausing the timer.
- [ ] Manual flow: save a vocabulary word during reading and confirm it appears in the book/session summaries.
- [ ] Manual flow: update page outside the app and confirm estimated/real time labels stay separate.
- [ ] Manual flow: create a book from `Nome do livro`, confirm/edit before saving, and verify the photo option remains a placeholder.
- [ ] Manual flow: confirm Mural and Vocabulario are not primary menu items.
- [ ] Browser QA with the in-app browser when the connector is available.
- [ ] Apply pending Supabase phase fixes in the target project before production browser QA.
- [x] `git diff --check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.

## Phase 22 - Revisao do Beta Existente e Liberacao Controlada

Goal:
- [x] Revisar o beta fechado existente sem recriar `/beta`, feedback, perfis ou fluxos de acesso.
- [x] Preservar perfis beta, acesso ativo/inativo/pendente, `last_seen_at`, painel `/beta`, politicas admin e remocao do login demo publico.
- [x] Reforcar RLS/grants das tabelas usadas por Vocabulário/Dicionário, `reading_progress_entries`, cadastro inteligente, Biblioteca/Estantes, Mural, Mente e Anotacoes em pastas.
- [x] Adicionar `supabase/fixes/016_beta_release_review.sql` como fix idempotente de revisao do beta.
- [x] Manter `public.feedback` como tabela unica de feedback beta.
- [x] Garantir labels de feedback para Erro, Sugestao, Confusao, Elogio, Ideia e Dificuldade.
- [x] Trocar erros tecnicos visiveis por mensagens calmas, mantendo detalhes no console.
- [x] Adicionar microcopy curta no primeiro estado vazio do Inicio para orientar novos testadores.

Checklist de liberacao beta:
- [x] build passou.
- [ ] login funciona.
- [ ] beta access funciona.
- [ ] `/beta` funciona para admin.
- [ ] usuario comum nao acessa `/beta`.
- [ ] RLS testado com dois usuarios.
- [ ] livros isolados por usuario.
- [ ] anotacoes isoladas.
- [ ] vocabulario isolado.
- [ ] progresso estimado isolado.
- [ ] Mural isolado.
- [ ] feedback funcionando.
- [ ] tema claro/escuro ok.
- [ ] erros crus removidos.
- [ ] app online testado.

Teste real com dois usuarios:
- [ ] Usuario A cadastra livro.
- [ ] Usuario A inicia leitura.
- [ ] Usuario A atualiza pagina.
- [ ] Usuario A cria anotacao.
- [ ] Usuario A cria post-it.
- [ ] Usuario A consulta/salva palavra no Dicionário.
- [ ] Usuario A abre Mural.
- [ ] Usuario A envia feedback.
- [ ] Usuario B entra em outra conta.
- [ ] Usuario B nao ve nenhum dado do Usuario A.
- [ ] Usuario B cria seus proprios dados.
- [ ] Usuario B envia feedback.
- [ ] Confirmar que nenhum dado vazou entre contas.

Plano de liberacao:
- Primeira rodada: 3 a 5 usuarios.
- Objetivo: encontrar erros grandes e telas confusas.
- Segunda rodada: 10 a 15 usuarios.
- Objetivo: validar uso real.
- Nao divulgar publicamente ainda.

Validation:
- [ ] Apply `supabase/fixes/016_beta_release_review.sql` in the target Supabase project.
- [ ] Manual deployed Supabase/Vercel pass with two beta users and one admin user.
- [x] `git diff --check` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.
