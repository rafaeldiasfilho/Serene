-- SERENE fix 015: dictionary-first vocabulary flow
--
-- Purpose:
-- Keep saved vocabulary entries reversible while Phase 17B turns the reading
-- tool into a real dictionary lookup with optional saving.

alter table public.vocabulary_entries
  add column if not exists deleted_at timestamptz;

comment on table public.vocabulary_entries is
'Saved words found through the reading dictionary. Complements annotations without becoming a heavy study module.';

comment on column public.vocabulary_entries.definition is
'Manual or trusted-source meaning. Do not invent automatic definitions without a source.';

comment on column public.vocabulary_entries.source is
'Dictionary/source name used for the saved definition. Manual entries may leave this null.';

create index if not exists idx_vocabulary_entries_active_book_word
  on public.vocabulary_entries(user_id, book_id, lower(word))
  where deleted_at is null;

grant select, insert, update on table public.vocabulary_entries to authenticated;

alter table public.vocabulary_entries enable row level security;
