# ROADMAP.md - SERENE Safe Implementation Roadmap

This roadmap uses the following as source of truth:
- `AGENTS.md`
- `PRD.md`
- `DATABASE.md`
- `supabase/schema.sql`
- `supabase/seed.sql`

Core product rule:
Every new feature must make the app more comfortable, not heavier.

Execution model:
- Small phases
- Small PRs
- Stable checkpoints
- No big-bang delivery

## Cross-Phase Guardrails

- Preserve existing behavior before adding new behavior.
- Do not break reading focus to add visual complexity.
- Keep real reading time and estimated historical time separated.
- Use soft delete (`deleted_at`) for books/annotations by default.
- Respect reduced-motion settings in every animated flow.
- Validate TypeScript/build/lint/tests at each phase boundary.

---

## Phase 0 - Project Setup

### Goal
Confirm a stable technical foundation before any product feature implementation.

### Scope
- Confirm project structure and runtime stack.
- Install missing dependencies.
- Configure Supabase client and environment variables.
- Confirm app boot, routing base, and theme base.
- Confirm `schema.sql` and `seed.sql` are executable assets.
- Build basic layout shell and primary navigation placeholders.

### Files Likely To Be Touched
- `package.json`
- `.env.example`
- `.env.local` (local only)
- `supabase/schema.sql` (read/validate only unless fix is required)
- `supabase/seed.sql` (read/validate only unless fix is required)
- `src/lib/supabase.ts` or equivalent
- `src/app/layout.*` or `src/layout.*`
- `src/app/router.*` or `src/routes.*`
- `src/styles/*` (theme tokens base)
- `README.md`

### Implementation Notes
- Treat this phase as infrastructure and app shell only.
- Keep UI minimal and calm (no feature logic yet).
- Ensure env docs clearly state local Supabase/auth requirements.

### Acceptance Criteria
- App runs locally without critical errors.
- Supabase client initializes with documented env keys.
- Main shell and top-level navigation placeholders render.
- Lint/build/test commands are documented and runnable.
- Team can run schema + seed in the expected order.

### What Not To Implement Yet
- No book CRUD.
- No reading sessions.
- No annotations.
- No Mural behavior.
- No Mente analytics.

---

## Phase 1 - Auth, Profile, And App Shell

### Goal
Enable reliable app entry with profile loading and foundational comfort settings.

### Scope
- Implement auth connection/login or demo access flow.
- Load `profiles` row for current user.
- Render main navigation:
  - Início
  - Biblioteca
  - Anotações
  - Mente
- Render hamburger menu:
  - Configurações
  - Lixeira
  - Exportar
  - Atalhos
  - Perfil
- Implement theme switch (`light/dark/system`).
- Implement reduced motion setting.
- Implement pressure-free mode setting.
- Add SERENE brain loading placeholder.

### Files Likely To Be Touched
- `src/features/auth/*`
- `src/features/profile/*`
- `src/components/navigation/*`
- `src/components/loading/*`
- `src/features/settings/*`
- `src/styles/theme/*`
- `src/lib/supabase.ts`

### Implementation Notes
- Keep auth UI lightweight and non-stressful.
- Avoid onboarding overload.
- Respect persisted profile settings on app load.

### Acceptance Criteria
- User enters app successfully.
- Profile data loads and displays.
- Navigation and menu are visible and stable.
- Theme switching works and persists.
- Reduced motion and pressure-free mode settings persist.

### What Not To Implement Yet
- No Biblioteca CRUD flows.
- No session timer logic.
- No annotation modal.
- No Mural interactions.

---

## Phase 2 - Biblioteca And Books

### Goal
Deliver a complete and calm Biblioteca flow with soft-delete safety.

### Scope
- List books.
- Create/edit books.
- Soft delete books.
- Book statuses:
  - Quero ler
  - Lendo
  - Pausado
  - Lido
- Filters:
  - Todos
  - Lendo
  - Quero ler
  - Pausados
  - Lidos
- Historical grouping:
  - Histórico de leitura
  - Lido no SERENE
- Manual categories and multi-category assignment.
- Hover statistics.
- Current book highlight.
- Profile photo on Início.
- Closable literary curiosity placeholder.

### Files Likely To Be Touched
- `src/features/books/*`
- `src/features/library/*`
- `src/features/categories/*`
- `src/features/home/*`
- `src/components/book/*`
- `src/components/filters/*`
- `src/components/stats/*`

### Implementation Notes
- Ensure Biblioteca works well even with zero manual categories.
- Keep historical vs SERENE-read distinction clear but subtle.
- Soft delete should update Trash-facing queries immediately.

### Acceptance Criteria
- User can create, edit, filter, and soft delete books.
- Books appear correctly in grouped reading origins.
- Multiple manual categories per book works.
- Current reading book can be highlighted cleanly.

### What Not To Implement Yet
- No session timer engine.
- No annotation type system.
- No Mural canvas.
- No Mente insights.

---

## Phase 3 - Reading Sessions

### Goal
Implement trustworthy real reading sessions and active-time tracking.

### Scope
- Iniciar Leitura.
- Immediate visible timer.
- Pausar/Retomar.
- Finalizar Leitura.
- Ask final page.
- Persist start page/end page.
- Persist and display:
  - `active_seconds` (active only)
  - `paused_seconds` (separate)
- Reading status:
  - active
  - paused
  - finished
  - cancelled
- Calm focused reading screen.
- `+` button visible in reading screen.
- Button to open Mural (placeholder allowed this phase).
- Apply close behavior setting:
  - minimize
  - close

### Files Likely To Be Touched
- `src/features/reading-sessions/*`
- `src/screens/reading/*`
- `src/components/timer/*`
- `src/hooks/useReadingSession*`
- `src/features/settings/*`
- `src/services/readingSessions/*`

### Implementation Notes
- Opening Mural must not change session to paused.
- Only explicit Pause action can set paused state.
- Timer accuracy is a correctness priority over visual polish.

### Acceptance Criteria
- Timer starts immediately on session start.
- Paused intervals are excluded from active time.
- Session summary reflects real active time.
- Active session can coexist with `mural_opened = true`.

### What Not To Implement Yet
- No full Mural canvas interactions.
- No annotation type-rich UI beyond simple entry hooks.
- No final symbolic animation sequence.

---

## Phase 4 - Annotation System

### Goal
Ship robust annotation creation/edit/review flows tied to books and sessions.

### Scope
- `+` opens annotation modal.
- Default type: Anotação Rápida.
- Type switch:
  - Reflexão
  - Marca-texto
  - Post-it
  - Flag
  - Dúvida
  - Pensamento
  - Ideia
  - Ação
- Create/edit/soft-delete annotations.
- Link annotation to book and optional session.
- Page number and color.
- Favorite/private flags.
- `review_status`:
  - none
  - to_review
  - reviewed
- Para revisar filter/area.
- Type-based visual identity.

### Files Likely To Be Touched
- `src/features/annotations/*`
- `src/components/annotation-modal/*`
- `src/components/annotation-cards/*`
- `src/screens/annotations/*`
- `src/services/annotations/*`
- `src/styles/annotations/*`

### Implementation Notes
- Keep modal simple and fast.
- Preserve annotation identity by type without clutter.
- Ensure soft-deleted annotations disappear from default views.

### Acceptance Criteria
- User can create/edit/favorite/review/delete annotations.
- Annotation types render with clear visual identity.
- Review filters and privacy flags work reliably.

### What Not To Implement Yet
- No drag-resize Mural board.
- No complex session-end ritual animation.
- No Mente dashboards.

---

## Phase 5 - Mural Mode

### Goal
Implement Mural as a separate visual space over the same annotation records.

### Scope
- Smooth transition from reading to Mural.
- Mural never pauses reading timer.
- Show annotations for current session/book.
- Include annotations created outside Mural.
- Initial order by creation time.
- Drag/move and resize annotations.
- Save visual data in `annotation_mural_positions`.
- No duplicated annotation content.
- Edit from Mural updates same annotation globally.
- Delete from Mural sends annotation to Trash (soft delete).
- New manual annotation starts at visible center.
- Floating/sticky new annotation button.
- Suggested balloons:
  - max 5/session
  - randomized once/session
  - stable within session
  - no overlap with existing annotations
  - movable by user
  - click does not remove
  - remove only by explicit close/hide/delete/cancel
  - after 5 used, manual creation only

### Files Likely To Be Touched
- `src/features/mural/*`
- `src/screens/mural/*`
- `src/components/mural-canvas/*`
- `src/services/mural/*`
- `src/services/annotations/*`
- `src/features/reading-sessions/*`

### Implementation Notes
- Persist coordinates and transforms independently from annotation content.
- Keep Mural interactions smooth but not heavy.
- Respect reduced motion in transitions and drag feedback.

### Acceptance Criteria
- Mural feels predictable and calm.
- Reading timer remains correct while Mural is open.
- Suggested balloon rules are enforced and stable.
- Annotation edits/deletes stay consistent across all screens.

### What Not To Implement Yet
- No Mente intelligence layer.
- No advanced OCR ingestion.
- No deep export formatting engine.

---

## Phase 6 - Final Session Animation And Summary

### Goal
Create a calm and meaningful session ending ritual with optional depth.

### Scope
- Book-open animation.
- Annotations move into book.
- Book closes.
- Reduced motion fallback.
- Skip option.
- Message: “Sessão de leitura finalizada”.
- Summary contents:
  - active time
  - start page
  - end page
  - annotations by type
  - favorites
  - review later
  - emotional reading-time phrase
- Actions:
  - Revisar agora
  - Revisar depois

### Files Likely To Be Touched
- `src/features/reading-summary/*`
- `src/components/session-end/*`
- `src/components/animations/*`
- `src/features/annotations/*`

### Implementation Notes
- Animation should feel symbolic, short, and non-blocking.
- Skip and reduced-motion paths are first-class behavior.

### Acceptance Criteria
- Session completion feels calm and clear.
- Summary data is accurate and useful.
- User can skip animation without losing data.

### What Not To Implement Yet
- No minimized floating session card enhancements beyond baseline.
- No Mente timeline analytics expansion.

---

## Phase 7 - Minimization And Active Reading State

### Goal
Keep active reading context persistent and visible without screen clutter.

### Scope
- Minimize reading view.
- Floating card.
- Timer continues while minimized.
- Card is movable.
- Corner docking when possible.
- Restore to full reading screen.
- Active state indicators:
  - Leitura em andamento
  - Sessão ativa
- If Mural is open, session active state remains visible.

### Files Likely To Be Touched
- `src/features/reading-minimize/*`
- `src/components/floating-session-card/*`
- `src/features/reading-sessions/*`
- `src/screens/reading/*`
- `src/screens/mural/*`

### Implementation Notes
- Minimized state must never silently end session.
- Keep card discoverable, subtle, and non-intrusive.

### Acceptance Criteria
- User always knows when reading is active.
- Timer continuity is preserved across minimize/restore/Mural.

### What Not To Implement Yet
- No Mente recommendations.
- No AI/OCR capture flows.

---

## Phase 8 - Trash, Settings, And Privacy

### Goal
Implement recovery safety and user control over comfort and privacy.

### Scope
- Trash screen.
- Show deleted books and annotations.
- Restore items.
- Permanent delete with clear confirmation.
- Settings:
  - theme
  - reduced motion
  - pressure free mode
  - reading close behavior
  - Mural preferences
  - annotation colors
  - privacy
  - notifications placeholder
  - shortcuts
- Private books and private annotations.
- Exclude private content from quick exports by default.

### Files Likely To Be Touched
- `src/screens/trash/*`
- `src/features/trash/*`
- `src/features/settings/*`
- `src/features/privacy/*`
- `src/features/annotations/*`
- `src/features/books/*`

### Implementation Notes
- Soft delete remains default for normal user actions.
- Permanent deletion should require explicit, unambiguous confirmation.

### Acceptance Criteria
- User can recover deleted content safely.
- Privacy settings are understandable and respected.
- Quick export privacy behavior is explicit and correct.

### What Not To Implement Yet
- No full Mente analytics suite.
- No OCR pipeline beyond placeholders.

---

## Phase 9 - Mente

### Goal
Launch the first useful Mente dashboard from real data.

### Scope
- Automatic categories.
- Books grouped by automatic categories.
- Avoid double-counting unique books.
- Time blocks:
  - real time registered in SERENE
  - estimated historical time
  - approximate total
- Clear estimated labels.
- Cards:
  - books
  - sessions
  - annotations
  - favorite ideas
  - items to review
  - strongest categories
  - reading evolution
- Brain symbol placeholder.
- Timeline access link.
- “Books that talk to each other” simple section.
- Suggest converting automatic category into manual Biblioteca category.

### Files Likely To Be Touched
- `src/screens/mente/*`
- `src/features/mente/*`
- `src/services/analytics/*`
- `src/services/categories/*`
- `src/components/cards/*`

### Implementation Notes
- Mente depends on real data quality from phases 2-8.
- Keep insight density moderate; avoid dashboard overload.

### Acceptance Criteria
- Mente provides meaningful, calm insight from existing data.
- Time separation and labels are always explicit.
- Unique book totals are correct.

### What Not To Implement Yet
- No heavy predictive AI.
- No OCR-dependent insights.

---

## Phase 10 - Timeline

### Goal
Provide a clear chronological reading memory view.

### Scope
- Render events from `timeline_events`.
- Group by month.
- Calm visual style.
- Event types:
  - book added
  - session finished
  - book completed
  - annotation created
  - annotation favorited
  - reading milestone
  - mural used
  - export created

### Files Likely To Be Touched
- `src/screens/timeline/*`
- `src/features/timeline/*`
- `src/components/timeline/*`
- `src/services/timeline/*`

### Implementation Notes
- Prioritize clarity over density.
- Avoid noisy, feed-like overload.

### Acceptance Criteria
- User can browse reading life over time naturally.
- Timeline remains readable with growing data.

### What Not To Implement Yet
- No complex social sharing layer.
- No algorithmic recommendation engine.

---

## Phase 11 - Export

### Goal
Provide safe, organized export paths for reading memory.

### Scope
- Export formats:
  - PDF placeholder or actual
  - DOCX placeholder or actual
  - Markdown
  - TXT
- Export intentions:
  - all
  - by book
  - by period
  - reflections only
  - highlights only
  - post-its only
  - favorites only
  - items to review
  - session
  - Mural annotations
- Respect privacy filters.
- Avoid duplicated Mural content.
- Show real vs estimated time clearly.
- Create `exports` records.

### Files Likely To Be Touched
- `src/screens/export/*`
- `src/features/export/*`
- `src/services/export/*`
- `src/services/annotations/*`
- `src/services/reading-sessions/*`

### Implementation Notes
- Mural exports must reference canonical annotations, not duplicate content.
- Export feedback states should be clear and calm.

### Acceptance Criteria
- User can export data with predictable filters.
- Privacy and time-label rules are respected.
- Export record is persisted.

### What Not To Implement Yet
- No advanced OCR document parsing in export stage.

---

## Phase 12 - Future AI/OCR Preparation

### Goal
Prepare lightweight UI/data hooks for future OCR/camera features.

### Scope
- Camera button placeholders:
  - Início
  - Reading screen
- Capture flow placeholder.
- Default target: current book.
- Recent 5 books chooser.
- Search/filter book selector.
- OCR page placeholder.
- Physical annotation detection placeholder.
- Optional markers:
  - R
  - I
  - ?
  - !
  - A
  - P

### Files Likely To Be Touched
- `src/features/camera-placeholder/*`
- `src/features/ocr-placeholder/*`
- `src/screens/home/*`
- `src/screens/reading/*`
- `src/services/annotations/*`

### Implementation Notes
- Keep all AI/OCR elements non-intrusive and explicitly optional.
- Do not add heavy processing or blocking flows in this phase.

### Acceptance Criteria
- Future AI/OCR entry points are visible and coherent.
- Core reading experience remains fast and uncluttered.

### What Not To Implement Yet
- No full OCR extraction pipeline.
- No automated classifier complexity.
- No internet-based copyrighted page fetching.

---

## Phase 13 - Polish And Quality

### Goal
Refine comfort, responsiveness, accessibility, and consistency across the app.

### Scope
- Responsive layouts.
- Dark mode polish.
- Reduced motion polish.
- Keyboard shortcuts.
- Empty states.
- Loading states.
- Feedback messages.
- Remove invisible clickable areas.
- Verify no duplicated data behavior.
- TypeScript/build/lint fixes.

### Files Likely To Be Touched
- `src/components/*`
- `src/screens/*`
- `src/styles/*`
- `src/features/*`
- `src/tests/*` (if available)

### Implementation Notes
- Polish phase is not for large feature additions.
- Prioritize cognitive ease and predictability.

### Acceptance Criteria
- App feels calm, coherent, and reliable.
- Theme and motion behavior are consistent.
- Build/lint/tests pass.

### What Not To Implement Yet
- No net-new complex modules.
- No architecture rewrites unless required for stability.

---

## Recommended Implementation Order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7
9. Phase 8
10. Phase 9
11. Phase 10
12. Phase 11
13. Phase 12
14. Phase 13

Gate rule between phases:
- Do not move to the next phase until acceptance criteria of the current phase are stable.

## Critical Warnings

- Do not start Phase 5 Mural before Phase 3 sessions and Phase 4 annotations are stable.
- Do not implement Mente before there is real book/session/annotation data.
- Do not implement AI/OCR before core reading and annotations are reliable.
