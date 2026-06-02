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
- [ ] Stronger Mente drill-down by area with related books, notes, and area statistics.
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
