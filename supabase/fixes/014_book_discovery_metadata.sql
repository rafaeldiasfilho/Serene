-- SERENE fix 014: intelligent book intake metadata
--
-- Purpose:
-- Store trusted metadata returned by book discovery sources after user
-- confirmation. Manual cadastro remains possible with title only.

alter table public.books
  add column if not exists language text,
  add column if not exists isbn text,
  add column if not exists subjects text[];

alter table public.books
  drop constraint if exists books_language_not_blank,
  add constraint books_language_not_blank
    check (language is null or length(trim(language)) > 0);

alter table public.books
  drop constraint if exists books_isbn_not_blank,
  add constraint books_isbn_not_blank
    check (isbn is null or length(trim(isbn)) > 0);

comment on column public.books.language is
'Optional book language from a trusted source or manual correction.';
comment on column public.books.isbn is
'Optional ISBN from a trusted source or manual correction. Do not invent.';
comment on column public.books.subjects is
'Optional subjects/tags from book discovery sources. Used as calm signals for Biblioteca and Mente.';

create index if not exists idx_books_isbn
  on public.books(user_id, lower(isbn))
  where isbn is not null;

create index if not exists idx_books_subjects
  on public.books using gin(subjects);
