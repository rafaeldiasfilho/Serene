# AGENTS.md - SERENE Product Implementation Rules

This file defines the permanent product and implementation rules for SERENE.
All future changes must follow this document.

## 1) Product Mission

SERENE is a calm, premium reading and note-taking app focused on reading sessions, annotations, memory, and the user's reading mind.

Core rule:
Every new feature must make the app more comfortable, not heavier.
If a feature pollutes the interface, creates confusion, increases fatigue, or adds stress, simplify it, hide it, postpone it, or rethink it.

## 2) Non-Negotiable Product Principles

- The app must feel calm, comfortable, organized, safe, premium, and deeply focused on reading.
- Do not overload the interface.
- Reading must feel focused, not like a generic timer.
- User data, books, annotations, and reading memories must never be permanently deleted without clear confirmation.
- Use soft delete and a Trash (`Lixeira`) area for deleted books and annotations.
- Implement changes in small, safe steps.
- Avoid large rewrites unless explicitly requested.
- Before behavior changes, preserve existing working features.
- After changes, ensure TypeScript/build/lint/tests pass when available.

## 3) Information Architecture and Navigation

- Main navigation (primary): `Início`, `Biblioteca`, `Anotações`, `Mente`.
- Hamburger menu (secondary): `Configurações`, `Lixeira`, `Exportar`, `Atalhos`, `Perfil`.
- Keep primary reading tasks visible and secondary actions discoverable but not intrusive.

## 4) Visual, Typography, Theme, and Motion

- Interface font: `Nunito Sans`.
- Literary/emotional text font (reflections, highlights, quotes): `Lora`.
- Support `light`, `dark`, and `system` theme modes.
- Dark theme must be as polished and readable as light theme.
- Motion must be smooth, natural, and premium (Apple-like principles, no literal copying).
- Respect reduced motion settings.
- Use the SERENE brain symbol as a subtle loading animation: the brain draws itself with lines/loops like a boomerang.
- Loading animations must stay calm and must never slow user flow.

## 5) Reading Session Rules (Behavior Invariants)

- Starting reading must immediately show a real-time active reading counter.
- Time pauses only when the user explicitly presses `Pause`.
- Opening or closing `Mural` must never pause reading time.
- Minimizing reading must never end the session.
- The active reading timer counts only active time, never paused time.
- On finishing a session, ask which page the user stopped on.
- Show a final summary after finishing.
- Treat reading time as "time of life dedicated to reading", but keep:
  - real registered time
  - estimated historical time
  separate and clearly labeled.

## 6) Mural Rules (Separate Idea Space)

- `Mural` is a separate screen (whiteboard/map of ideas).
- Reading screen remains clean and focused.
- Reading screen keeps a `+` button for quick annotations outside Mural.
- Mural opens from reading with a smooth transition.
- Opening Mural never pauses the reading timer.
- Suggested idea balloons appear only:
  - after some active reading time, or
  - after the first annotation.
- Limit suggested balloons to at most 5 per reading session.
- Suggested balloon positions are randomized once per session.
- During the same session, suggested balloons keep fixed positions.
- Suggested balloons must not overlap existing/moved/written annotations.
- Suggested balloons are movable by the user.
- Clicking a balloon must not make it disappear.
- A balloon disappears only with explicit user action: close, hide, delete, or cancel.
- After 5 suggested balloons are used, the user creates new balloons manually.
- New annotation button inside Mural must stay floating/sticky and accessible.
- Manual annotation created inside Mural starts in the visible center of Mural.
- Annotations created outside Mural must also appear in Mural (initially ordered by creation time).
- Mural is a visual view of the same annotation records, never duplicate data.
- Editing/deleting in Mural updates the same annotation everywhere.

## 7) Annotation Rules

- The `+` button opens a single annotation window.
- Default type: `Anotação Rápida`.
- Types selectable inside the window: `Reflexão`, `Marca-texto`, `Post-it`, `Flag`, `Dúvida`, `Pensamento`, `Ideia`, `Ação`.
- Any annotation can be edited after creation.
- Any annotation can be deleted to Trash (soft delete).
- Expanded annotations must preserve visual identity by type.
- Type visuals:
  - Post-it opens as post-it
  - Reflection as thought bubble
  - Highlight as highlighted text
  - Flag as flag
  - Quick note as simple note
- Highlight must mark selected words only (Word-like), not whole card blocks.
- Quick notes can be sent to `Para revisar`.
- Users can favorite annotations.
- Users can mark annotations/private books as private.

## 8) Biblioteca Rules

- `Biblioteca` shows all books even without manual categories.
- Manual categories are optional.
- `Mente` creates automatic categories independently.
- Books can belong to multiple manual and automatic categories.
- In `Lidos`, show books read before SERENE and in SERENE together, with visual separation:
  - `Histórico de leitura`
  - `Lido no SERENE`
- Historical-reading books can receive retroactive annotations.
- User can add more already-read books later.

## 9) Mente Rules

- `Mente` must not depend on manual categories.
- `Mente` auto-detects areas/categories from books and annotations.
- A book can appear in more than one Mente category.
- Never double-count unique books in totals.
- Always separate and label:
  - real time registered in SERENE
  - estimated historical reading time
  - approximate total
- Historical reading time must always be clearly marked as estimated/approximate.
- Mente may suggest converting an automatic category into a manual Biblioteca category, but must never force it.

## 10) Future AI/OCR Rules

- Camera/OCR are future-prepared features.
- OCR must operate on user-provided images only.
- Do not fetch copyrighted book pages from the internet for OCR input.
- App may detect physical post-its, highlighted text, handwritten notes, and pages.
- Optional visual markers for subjective notes:
  - `R` = Reflexão
  - `I` = Ideia
  - `?` = Dúvida
  - `!` = Insight
  - `A` = Ação
  - `P` = Pensamento
- Markers are optional and must not add complexity.

## 11) Data Safety and Deletion Policy

- Default deletion behavior is soft delete.
- Deleted books and annotations go to `Lixeira`.
- Permanent deletion requires explicit, clear confirmation.
- Never implement silent destructive flows.
- Recovery from Trash must be straightforward.

## 12) Implementation Workflow for Contributors

For every new feature, fix, or refactor:

1. Validate against the core comfort rule first.
2. Keep reading flow focused and uncluttered.
3. Preserve existing behavior unless change is intentional and requested.
4. Prefer incremental changes over broad rewrites.
5. Maintain data safety guarantees (soft delete + explicit confirmations).
6. Verify theme parity (light/dark/system) and reduced motion behavior.
7. Run and pass available TypeScript/build/lint/tests before finalizing.

If any requirement conflicts with calmness or clarity, choose the calmer and simpler implementation.
