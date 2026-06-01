-- SERENE Phase 14 optional beta sample content
--
-- This script creates light sample data for one selected beta user.
-- It does not create or depend on a shared demo account.
--
-- Usage:
-- 1) Create the beta user in Supabase Auth with their own email.
-- 2) Replace the email below.
-- 3) Run this script in the Supabase SQL editor.
--
-- To ignore/remove this sample later, soft-delete rows where source='beta_sample'
-- for the selected user, or simply leave them as starter content.

begin;

create temporary table if not exists seed_beta_user (
  user_id uuid primary key
) on commit drop;

truncate seed_beta_user;

insert into seed_beta_user (user_id)
select u.id
from auth.users u
where lower(u.email) = lower('replace-with-beta-user@email.com')
order by u.created_at
limit 1;

do $$
begin
  if not exists (select 1 from seed_beta_user) then
    raise exception 'SERENE beta sample: selected auth user was not found.';
  end if;
end
$$;

insert into public.profiles (
  id,
  email,
  name,
  role,
  is_beta_tester,
  access_status,
  created_at,
  updated_at
)
select
  s.user_id,
  u.email,
  coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'reader',
  true,
  'active',
  now(),
  now()
from seed_beta_user s
join auth.users u on u.id = s.user_id
on conflict (id) do update
set
  email = excluded.email,
  name = coalesce(public.profiles.name, excluded.name),
  is_beta_tester = true,
  access_status = 'active',
  updated_at = now();

insert into public.books (
  user_id,
  title,
  author,
  description,
  total_pages,
  current_page,
  status,
  source,
  reading_origin,
  show_in_home,
  show_in_mente,
  created_at,
  updated_at
)
select
  s.user_id,
  b.title,
  b.author,
  b.description,
  b.total_pages,
  b.current_page,
  b.status,
  'beta_sample',
  'serene',
  true,
  true,
  now(),
  now()
from seed_beta_user s
cross join (
  values
    ('Um livro para respirar', 'SERENE', 'Starter calmo para testar biblioteca e leitura.', 180, 24, 'lendo'),
    ('Notas de uma leitura tranquila', 'SERENE', 'Exemplo pequeno para testar anotações.', 96, 0, 'quero_ler'),
    ('Memória de leitura', 'SERENE', 'Livro já lido para observar a Mente sem pressa.', 144, 144, 'lido')
) as b(title, author, description, total_pages, current_page, status)
where not exists (
  select 1
  from public.books existing
  where existing.user_id = s.user_id
    and existing.source = 'beta_sample'
    and existing.title = b.title
);

insert into public.annotations (
  user_id,
  book_id,
  type,
  content,
  page_number,
  origin,
  review_status,
  created_at,
  updated_at
)
select
  s.user_id,
  b.id,
  a.type,
  a.content,
  a.page_number,
  'manual',
  a.review_status,
  now(),
  now()
from seed_beta_user s
join public.books b
  on b.user_id = s.user_id
 and b.source = 'beta_sample'
 and b.title = 'Um livro para respirar'
cross join (
  values
    ('quick_note', 'Primeira nota de teste. Pode editar ou apagar quando quiser.', 24, 'none'),
    ('reflection', 'Uma reflexão curta para sentir o fluxo de anotações.', 25, 'to_review')
) as a(type, content, page_number, review_status)
where not exists (
  select 1
  from public.annotations existing
  where existing.user_id = s.user_id
    and existing.book_id = b.id
    and existing.content = a.content
);

insert into public.reading_sessions (
  user_id,
  book_id,
  started_at,
  ended_at,
  status,
  active_seconds,
  paused_seconds,
  start_page,
  end_page,
  current_page_snapshot,
  opened_from,
  created_at,
  updated_at
)
select
  s.user_id,
  b.id,
  now() - interval '2 days',
  now() - interval '2 days' + interval '18 minutes',
  'finished',
  1080,
  0,
  12,
  24,
  24,
  'biblioteca',
  now(),
  now()
from seed_beta_user s
join public.books b
  on b.user_id = s.user_id
 and b.source = 'beta_sample'
 and b.title = 'Um livro para respirar'
where not exists (
  select 1
  from public.reading_sessions existing
  where existing.user_id = s.user_id
    and existing.book_id = b.id
    and existing.opened_from = 'biblioteca'
    and existing.active_seconds = 1080
);

commit;
