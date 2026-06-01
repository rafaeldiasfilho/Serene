# PRD - SERENE

## 1. Product vision

SERENE is a calm, premium reading and annotation app focused on reading sessions, books, notes, memory, and the user's reading mind.

SERENE should help people protect reading time, think more deeply about what they read, and build a long-term memory of their intellectual and emotional reading journey.

The product must feel calm, comfortable, safe, organized, premium, and deeply connected to reading.

Core rule:
Every new feature must make the app more comfortable, not heavier. If it makes the interface polluted, confusing, tiring, or stressful, simplify it, hide it, postpone it, or rethink it.

`AGENTS.md` is the permanent product direction and implementation guardrail.

## 2. Core principles

- Calm first: reading focus has higher priority than feature quantity.
- Comfort over complexity: no cluttered controls or noisy interactions.
- Reading-centered design: the app should not feel like a generic timer utility.
- Emotional continuity: reading time is "time of life dedicated to reading."
- Data safety by default: books, annotations, and memories are never silently destroyed.
- Soft deletion always: deleted content goes to `Lixeira` first.
- Trustworthy polish: light and dark themes must be equally readable and premium.
- Predictable behavior: core flows must be stable and easy to understand.

## 3. Target users

- Consistent readers who want to track reading sessions with intention.
- Reflective readers who write thoughts, questions, highlights, and ideas.
- Learners and knowledge workers who revisit notes and patterns over time.
- Readers who care about long-term reading memory, not only short-term productivity.
- Privacy-conscious users who want private books/annotations and safe data handling.

## 4. Main navigation

Primary navigation:
- `Início`
- `Biblioteca`
- `Anotações`
- `Mente`

Hamburger menu:
- `Configurações`
- `Lixeira`
- `Exportar`
- `Atalhos`
- `Perfil`

Navigation requirements:
- Primary tabs are always easy to reach.
- Secondary options are available without polluting the core reading UI.
- Navigation labels remain consistent across screens and states.

## 5. Main screens

`Início`
- Daily entry point.
- Shows current reading status, recent session context, and access to start/resume reading.
- Keeps visual load low and invites focused continuation.

`Biblioteca`
- Complete book collection view.
- Works even if the user never creates manual categories.
- Supports book state organization and category metadata.

`Anotações`
- Unified list of user notes and highlights.
- Supports filtering, review workflows, favorites, and privacy visibility.

`Mente`
- Reading mind map and insight layer.
- Automatically organizes areas from books + annotations.
- Presents separated time metrics (real vs estimated historical).

`Leitura` (reading session screen)
- Focused session view with active timer and minimal controls.
- Keeps annotations accessible via `+` without visual overload.
- Allows smooth transition to `Mural`.

`Mural`
- Separate whiteboard/map-style annotation surface.
- Visual representation of the same annotation records.

## 6. Reading session flow

Session lifecycle:
1. User starts reading from `Início`, `Biblioteca`, or book context.
2. Active timer starts immediately in real time.
3. Timer counts only active time.
4. Timer pauses only if user explicitly presses `Pause`.
5. Opening `Mural` does not pause time.
6. Closing `Mural` does not pause time.
7. Minimizing reading does not end the session.
8. User finishes session manually.
9. System asks which page the user stopped on.
10. System shows calm end-of-session summary.

Time model requirements:
- Keep real SERENE time and estimated historical reading time separate at all times.
- Session duration calculations must exclude paused intervals.
- Emotionally frame reading as meaningful life time, while preserving precise tracking semantics.

Summary requirements:
- Show total active time.
- Show pauses (if any) without judgment.
- Show ending page.
- Optionally surface quick reflection prompt without forcing interaction.

## 7. Annotation system

Creation:
- `+` opens a single annotation window.
- Default type: `Anotação Rápida`.
- User can switch type in-window to:
  - `Reflexão`
  - `Marca-texto`
  - `Post-it`
  - `Flag`
  - `Dúvida`
  - `Pensamento`
  - `Ideia`
  - `Ação`

Editing and lifecycle:
- Every annotation is editable after creation.
- Any annotation can be deleted to `Lixeira` (soft delete).
- Users can favorite annotations.
- Users can mark annotations as private.
- Books can also be marked as private.

Visual identity:
- Expanded annotations preserve type identity.
- `Post-it` looks like a physical post-it.
- `Reflexão` looks like a thought/literary bubble.
- `Marca-texto` highlights selected words only, never a whole card block.
- Quick notes keep a simple note style and may be sent to `Para revisar`.

Data model rule:
- Annotation records are single-source entities shared across all views (Reading, Anotações, Mural, etc.).

## 8. Mural mode

Purpose:
- A separate idea canvas for visual thinking during/after reading.
- Keeps reading screen clean by moving complex spatial note work into a dedicated space.

Behavior rules:
- Opens with smooth transition from reading.
- Opening or closing Mural never pauses reading time.
- Reading screen still includes `+` quick note entry.
- Mural has a floating/sticky new annotation button, always accessible.
- New manual annotation starts at visible center of current Mural viewport.

Suggested balloons:
- Appear only after some active reading time or after first annotation.
- Maximum 5 suggested balloons per session.
- Positions are randomized once per session.
- Positions remain stable within the same session.
- Balloons must not appear over existing annotations.
- User can move balloons.
- Clicking a balloon does not make it disappear.
- Balloon disappears only by explicit user action: close, hide, delete, or cancel.
- After 5 suggestions are used, users create balloons manually.

Data consistency:
- Annotations created outside Mural also appear in Mural.
- Initial order for externally created annotations is creation time.
- Mural is a visual representation of the same annotation records, never duplicated data.

## 9. Library

Core behavior:
- `Biblioteca` shows all books even without manual categories.
- Manual categories are optional.
- Books can belong to multiple categories.

Read books organization:
- `Lidos` includes both:
  - `Histórico de leitura`
  - `Lido no SERENE`
- These two groups appear together but are visually separated.

Historical reading:
- Users can add books read before SERENE at any time.
- Historical books can receive retroactive annotations.

Cross-system consistency:
- Library metadata must feed `Mente` while allowing independent manual categorization.

## 10. Mente screen

Purpose:
- Reveal the user's reading mind through automatically inferred areas/themes.

Rules:
- Does not depend on manual categories.
- Automatically detects categories from books and annotations.
- A book can appear in multiple automatic categories.
- Unique books are never double-counted in totals.

Time display:
- Always separate:
  - real time registered in SERENE
  - estimated historical reading time
  - approximate total
- Historical reading time must always be explicitly labeled as estimated/approximate.

Suggestions:
- Mente may suggest converting an automatic category into a manual `Biblioteca` category.
- Suggestions are optional and never forced.

## 11. Timeline

Purpose:
- Provide a calm chronological memory of reading life, sessions, and note moments.

Scope:
- Session events (start, pause/resume, finish, page stop).
- Annotation events (created/edited/favorited/reviewed).
- Book journey events (added, moved to read states, historical additions).

Design requirements:
- Timeline must stay readable and non-noisy.
- Use visual grouping by day/session/book to reduce cognitive load.
- Prioritize meaning over density; collapse low-value detail by default.

Time semantics:
- Timeline entries must preserve separation between real SERENE time and estimated historical time.

## 12. Trash and data safety

Deletion policy:
- Soft delete by default for books and annotations.
- Deleted items move to `Lixeira`.
- Permanent deletion requires clear, explicit confirmation.
- No silent destructive actions.

Recovery:
- Restore must be straightforward from `Lixeira`.
- Restored items should preserve metadata and relationships when possible.

Safety UX:
- Confirm destructive actions in plain language.
- Avoid ambiguous button text in critical actions.

## 13. Settings

Settings location:
- Available through hamburger menu as `Configurações`.

Minimum settings scope:
- Theme: `Light`, `Dark`, `Automatic/system`.
- Motion: reduced motion support.
- Privacy controls for books/annotations where relevant.
- Reading defaults and comfort preferences.
- Account/profile access path.

Quality expectations:
- Dark mode polish equals light mode polish.
- Changes apply predictably and without UI instability.

## 14. Exporting

Access:
- Available from hamburger menu as `Exportar`.

Product intent:
- Give users control over their reading memory and ownership of data.

Functional scope (MVP):
- Export books list.
- Export annotations (including types, favorites, privacy flags where appropriate).
- Export reading session summaries.

Safety and trust:
- Private content handling must be explicit in export options.
- Export actions should include clear feedback states (start, progress, success/failure).

## 15. Future AI/OCR features

Status:
- Future/prepared capability, not required in early phases.

Constraints:
- OCR must run from user-provided images only.
- No fetching copyrighted book pages from internet sources.

Planned detection possibilities:
- Physical post-it.
- Highlighted text.
- Handwritten note.
- Page photo.
- Loose paper.

Optional markers (never mandatory):
- `R` = Reflexão
- `I` = Ideia
- `?` = Dúvida
- `!` = Insight
- `A` = Ação
- `P` = Pensamento

Experience rule:
- Marker support must remain optional and simple, never adding friction.

## 16. Premium philosophy

SERENE premium value should come from care, polish, comfort, and trust.

Rules:
- Essential features must not feel blocked or held hostage.
- Users should want to pay because SERENE feels valuable and supportive.
- Avoid manipulative pressure tactics and aggressive upsell interruptions.
- Premium should deepen calm and quality, not fragment the core experience.

## 17. Implementation phases

Phase 1 - Base, Supabase, auth, layout, themes
- Establish project foundation, authentication, and core UI shell.
- Implement typography system (`Nunito Sans`, `Lora`), theme modes, reduced motion baseline.

Phase 2 - Biblioteca and books
- Implement book model, list/grid, detail, read states, and category relationships.
- Support historical books and visual separation inside `Lidos`.

Phase 3 - Reading sessions
- Implement active timer engine and session lifecycle invariants.
- Add finish flow with stop-page prompt and calm summary.

Phase 4 - Annotations
- Implement annotation model, type system, editor window, and list/review screens.
- Add favorites, private flags, and soft-delete integration.

Phase 5 - Mural
- Implement separate Mural surface and shared annotation data projection.
- Add suggestion balloons with per-session behavior constraints.

Phase 6 - Trash and settings
- Implement `Lixeira` restoration/permanent-delete confirmations.
- Implement `Configurações` for themes, motion, and core user comfort controls.

Phase 7 - Mente
- Implement automatic category inference and aggregated metrics.
- Enforce unique-book counting and separated time metrics.

Phase 8 - Export
- Implement export flows for books, annotations, and reading sessions.
- Add explicit handling for private content and feedback states.

Phase 9 - Future AI/OCR preparation
- Prepare architecture hooks and data structures for camera/OCR workflows.
- Keep feature flags off by default until validated.

Execution policy for all phases:
- Build in small, safe increments.
- Preserve existing working behavior before changing flows.
- Avoid broad rewrites unless explicitly requested.
- Run TypeScript/build/lint/tests when available before completion.

## 18. Acceptance criteria

### 18.1 Navigation and IA

- Primary nav always shows `Início`, `Biblioteca`, `Anotações`, `Mente`.
- Hamburger menu includes `Configurações`, `Lixeira`, `Exportar`, `Atalhos`, `Perfil`.
- Primary reading actions are reachable without opening secondary menus.

### 18.2 Visual system and themes

- Interface uses `Nunito Sans`; literary/emotional text uses `Lora`.
- `Light`, `Dark`, and `Automatic/system` modes are available and persisted.
- Dark mode readability and contrast are validated to match light mode quality.
- Reduced motion preference disables or softens non-essential animations.

### 18.3 Reading sessions

- Starting a session immediately starts visible real-time active timer.
- Active timer excludes paused intervals.
- Timer pauses only via explicit `Pause` user action.
- Opening/closing Mural does not pause timer.
- Minimizing reading does not end session.
- Finishing asks for stop page before closing flow.
- Session finish always shows a calm summary.

### 18.4 Annotations

- `+` opens one annotation window with default `Anotação Rápida`.
- User can switch to all required annotation types.
- All annotation types are editable after creation.
- Deletion routes to `Lixeira`, not immediate hard delete.
- Highlight applies to selected words, not full-card block.
- Favorites, privacy flags, and `Para revisar` quick-note flow are functional.

### 18.5 Mural

- Mural is a separate screen with smooth transition.
- Reading timer behavior remains correct while opening/closing Mural.
- Suggested balloons appear only under allowed conditions.
- Suggested balloons are capped at 5 per session.
- Suggested balloons keep stable per-session positions and avoid overlap with existing annotations.
- Balloons persist on click and disappear only after explicit user action.
- Mural annotations and non-Mural annotations are the same records with synchronized edits/deletes.

### 18.6 Biblioteca

- Biblioteca renders all books even with zero manual categories.
- Books can belong to multiple categories.
- `Lidos` shows both historical and SERENE-read books with visual separation.
- Historical books accept retroactive annotations.

### 18.7 Mente

- Automatic categories are generated from books + annotations without dependency on manual categories.
- Books may appear in multiple categories, while unique totals avoid double counting.
- Real SERENE time, estimated historical time, and approximate total are all shown separately.
- Historical time is always labeled estimated/approximate.
- Optional suggestion flow to convert auto category to manual Biblioteca category works without forcing action.

### 18.8 Timeline

- Timeline shows a chronological reading memory view with session and annotation events.
- Timeline remains visually calm, readable, and non-cluttered under typical and heavy usage.
- Time labels preserve real vs estimated semantics.

### 18.9 Trash and data safety

- Deleting books/annotations moves them to `Lixeira`.
- Permanent deletion requires explicit confirmation step.
- Restore flow returns items with key metadata intact.
- No destructive action occurs without user intent.

### 18.10 Settings

- Theme and reduced motion settings are available and applied consistently.
- Core privacy and comfort settings are accessible through `Configurações`.

### 18.11 Exporting

- Users can export books, annotations, and session summaries.
- Export flow provides clear feedback and failure messaging.
- Private content export handling is explicit and user-controlled.

### 18.12 Future AI/OCR preparation

- OCR inputs are restricted to user-provided images.
- Optional marker support exists in specification/design without forcing user behavior.
- AI/OCR preparation does not increase friction in current core flows.

### 18.13 Premium philosophy compliance

- Essential core reading features remain usable without manipulative gating patterns.
- Monetization UI does not interrupt active reading or annotation flow.
- Premium perception is driven by quality, comfort, and trust.

### 18.14 Delivery quality gates

- Every phase ships in incremental, reversible steps.
- Existing working behavior is preserved unless intentionally changed.
- TypeScript/build/lint/tests pass when available.
- Any feature violating the comfort core rule is revised before release.
