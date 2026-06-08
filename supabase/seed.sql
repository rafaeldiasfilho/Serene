-- SERENE demo seed
-- Source of truth: AGENTS.md, PRD.md, DATABASE.md, supabase/schema.sql
--
-- Goal: realistic demo data for testing reading sessions, annotations, Mural, Biblioteca, Mente, timeline, exports, and trash flows.
--
-- IMPORTANT AUTH NOTE:
-- If auth.users cannot be seeded directly in your environment, create this user first in Supabase Auth:
--   Name: Rafael Teste
--   Email: teste@serene.app
--   Password: 12345678
--
-- Preferred demo auth UUID (if you create via Admin API/CLI): 11111111-1111-1111-1111-111111111111
-- This seed first tries the preferred UUID, then falls back to lookup by email.
-- Data inserts only happen when the auth user exists.
-- That keeps the FK constraint (profiles.id -> auth.users.id) valid.
--
-- Product rule notes in this seed:
-- - Real reading time (reading_sessions.active_seconds) and estimated historical time
--   (books.estimated_reading_seconds) are stored separately.
-- - Opening Mural does NOT pause reading. A session can be status='active' with mural_opened=true.
-- - annotation_mural_positions stores only visual layout; annotation content remains in annotations.
-- - Books and annotations use soft delete via deleted_at.
-- - Mural suggestions are stable within a session and max 5 per session.

begin;

-- ----------------------------------------------------------------------------
-- Resolve demo auth user
-- ----------------------------------------------------------------------------

create temporary table if not exists seed_demo_user (
  user_id uuid primary key
) on commit drop;

truncate seed_demo_user;

insert into seed_demo_user (user_id)
select u.id
from auth.users u
where u.id = '11111111-1111-1111-1111-111111111111'::uuid
limit 1
on conflict do nothing;

insert into seed_demo_user (user_id)
select u.id
from auth.users u
where lower(u.email) = lower('teste@serene.app')
  and not exists (select 1 from seed_demo_user)
order by u.created_at
limit 1
on conflict do nothing;

do $$
begin
  if not exists (select 1 from seed_demo_user) then
    raise notice 'SERENE seed: auth user teste@serene.app not found. Create it in Supabase Auth first, then re-run seed.sql.';
  else
    raise notice 'SERENE seed: demo auth user found. Seeding data now.';
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- 1) Profile
-- ----------------------------------------------------------------------------

insert into public.profiles (
  id,
  name,
  email,
  avatar_url,
  role,
  is_beta_tester,
  access_status,
  theme_preference,
  reduced_motion_enabled,
  reading_close_behavior,
  pressure_free_mode_enabled,
  created_at,
  updated_at
)
select
  s.user_id,
  'Rafael Teste',
  'teste@serene.app',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
  'reader',
  true,
  'active',
  'system',
  false,
  'minimize',
  true,
  '2026-05-01 09:00:00-03'::timestamptz,
  '2026-05-01 09:00:00-03'::timestamptz
from seed_demo_user s
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  avatar_url = excluded.avatar_url,
  role = excluded.role,
  is_beta_tester = excluded.is_beta_tester,
  access_status = excluded.access_status,
  theme_preference = excluded.theme_preference,
  reduced_motion_enabled = excluded.reduced_motion_enabled,
  reading_close_behavior = excluded.reading_close_behavior,
  pressure_free_mode_enabled = excluded.pressure_free_mode_enabled,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 2) Books (10 base books + 1 soft-deleted example)
-- ----------------------------------------------------------------------------

insert into public.books (
  id,
  user_id,
  title,
  author,
  cover_url,
  description,
  publisher,
  edition,
  publication_year,
  total_pages,
  current_page,
  status,
  source,
  reading_origin,
  is_current,
  is_private,
  show_in_home,
  show_in_notifications,
  show_in_mente,
  include_in_quick_exports,
  estimated_reading_seconds,
  estimated_reading_source,
  estimated_reading_confidence,
  read_before_serene,
  completed_inside_serene,
  deleted_at,
  created_at,
  updated_at
)
select
  b.id,
  s.user_id,
  b.title,
  b.author,
  b.cover_url,
  b.description,
  b.publisher,
  b.edition,
  b.publication_year,
  b.total_pages,
  b.current_page,
  b.status,
  b.source,
  b.reading_origin,
  b.is_current,
  b.is_private,
  b.show_in_home,
  b.show_in_notifications,
  b.show_in_mente,
  b.include_in_quick_exports,
  b.estimated_reading_seconds,
  b.estimated_reading_source,
  b.estimated_reading_confidence,
  b.read_before_serene,
  b.completed_inside_serene,
  b.deleted_at,
  b.created_at,
  b.updated_at
from seed_demo_user s
cross join (
  values
    (
      '20000000-0000-0000-0000-000000000001'::uuid,
      'Meditações',
      'Marco Aurélio',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
      'Leituras sobre virtude, disciplina e serenidade diante do caos.',
      'Principis',
      '1a',
      2019,
      304,
      134,
      'lendo',
      'manual',
      'serene',
      true,
      false,
      true,
      true,
      true,
      true,
      null::int,
      null::text,
      null::text,
      false,
      false,
      null::timestamptz,
      '2026-05-01 09:10:00-03'::timestamptz,
      '2026-05-27 21:20:00-03'::timestamptz
    ),
    (
      '20000000-0000-0000-0000-000000000002'::uuid,
      'Hábitos Atômicos',
      'James Clear',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
      'Sistemas pequenos e consistentes para mudança de comportamento.',
      'Alta Life',
      '2a',
      2019,
      320,
      320,
      'lido',
      'manual',
      'serene',
      false,
      false,
      true,
      true,
      true,
      true,
      null::int,
      null::text,
      null::text,
      false,
      true,
      null::timestamptz,
      '2026-05-01 09:20:00-03'::timestamptz,
      '2026-05-20 22:10:00-03'::timestamptz
    ),
    (
      '20000000-0000-0000-0000-000000000003'::uuid,
      'Pai Rico, Pai Pobre',
      'Robert T. Kiyosaki',
      'https://images.unsplash.com/photo-1455885666463-9ca4ea0dc206?w=400&q=80',
      'Educação financeira e mentalidade de ativos.',
      'Alta Books',
      '1a',
      2018,
      336,
      336,
      'lido',
      'manual',
      'historico',
      false,
      false,
      true,
      true,
      true,
      true,
      28800,
      'demo_estimate',
      'medium',
      true,
      false,
      null::timestamptz,
      '2026-05-01 09:30:00-03'::timestamptz,
      '2026-05-18 18:00:00-03'::timestamptz
    ),
    (
      '20000000-0000-0000-0000-000000000004'::uuid,
      'O Poder do Agora',
      'Eckhart Tolle',
      'https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=400&q=80',
      'Presença e consciência no momento atual.',
      'Sextante',
      '1a',
      2017,
      224,
      86,
      'pausado',
      'manual',
      'serene',
      false,
      false,
      true,
      true,
      true,
      true,
      null::int,
      null::text,
      null::text,
      false,
      false,
      null::timestamptz,
      '2026-05-01 09:40:00-03'::timestamptz,
      '2026-05-26 10:12:00-03'::timestamptz
    ),
    (
      '20000000-0000-0000-0000-000000000005'::uuid,
      'A Coragem de Ser Imperfeito',
      'Brené Brown',
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=80',
      'Vulnerabilidade, pertencimento e autocompaixão.',
      'Sextante',
      '1a',
      2016,
      208,
      0,
      'quero_ler',
      'manual',
      'serene',
      false,
      false,
      true,
      true,
      true,
      true,
      null::int,
      null::text,
      null::text,
      false,
      false,
      null::timestamptz,
      '2026-05-01 09:50:00-03'::timestamptz,
      '2026-05-12 08:30:00-03'::timestamptz
    ),
    (
      '20000000-0000-0000-0000-000000000006'::uuid,
      'A Psicologia Financeira',
      'Morgan Housel',
      'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&q=80',
      'Decisões financeiras guiadas por comportamento humano.',
      'HarperCollins',
      '1a',
      2021,
      304,
      55,
      'lendo',
      'manual',
      'serene',
      false,
      false,
      true,
      true,
      true,
      true,
      null::int,
      null::text,
      null::text,
      false,
      false,
      null::timestamptz,
      '2026-05-01 10:00:00-03'::timestamptz,
      '2026-05-27 07:50:00-03'::timestamptz
    ),
    (
      '20000000-0000-0000-0000-000000000007'::uuid,
      'O Alquimista',
      'Paulo Coelho',
      'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&q=80',
      'Uma jornada literária sobre propósito e escuta interior.',
      'Paralela',
      '1a',
      2015,
      208,
      208,
      'lido',
      'manual',
      'historico',
      false,
      false,
      true,
      true,
      true,
      true,
      18000,
      'demo_estimate',
      'medium',
      true,
      false,
      null::timestamptz,
      '2026-05-01 10:10:00-03'::timestamptz,
      '2026-05-15 16:45:00-03'::timestamptz
    ),
    (
      '20000000-0000-0000-0000-000000000008'::uuid,
      'Essencialismo',
      'Greg McKeown',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80',
      'Menos, porém melhor: foco no que realmente importa.',
      'Sextante',
      '1a',
      2017,
      272,
      102,
      'pausado',
      'manual',
      'serene',
      false,
      false,
      true,
      true,
      true,
      true,
      null::int,
      null::text,
      null::text,
      false,
      false,
      null::timestamptz,
      '2026-05-01 10:20:00-03'::timestamptz,
      '2026-05-26 22:20:00-03'::timestamptz
    ),
    (
      '20000000-0000-0000-0000-000000000009'::uuid,
      'O Homem Mais Rico da Babilônia',
      'George S. Clason',
      'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&q=80',
      'Princípios clássicos de finanças pessoais.',
      'HarperCollins',
      '1a',
      2018,
      176,
      0,
      'quero_ler',
      'manual',
      'serene',
      false,
      false,
      true,
      true,
      true,
      true,
      null::int,
      null::text,
      null::text,
      false,
      false,
      null::timestamptz,
      '2026-05-01 10:30:00-03'::timestamptz,
      '2026-05-09 11:00:00-03'::timestamptz
    ),
    (
      '20000000-0000-0000-0000-000000000010'::uuid,
      'Mindset',
      'Carol S. Dweck',
      'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=400&q=80',
      'Mentalidade fixa x crescimento aplicada ao aprendizado.',
      'Objetiva',
      '1a',
      2017,
      312,
      312,
      'lido',
      'manual',
      'historico',
      false,
      true,
      false,
      false,
      false,
      false,
      25200,
      'demo_estimate',
      'medium',
      true,
      false,
      null::timestamptz,
      '2026-05-01 10:40:00-03'::timestamptz,
      '2026-05-14 20:00:00-03'::timestamptz
    ),
    (
      '20000000-0000-0000-0000-000000000011'::uuid,
      'Trabalho Profundo',
      'Cal Newport',
      'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&q=80',
      'Exemplo de livro removido para testar Lixeira.',
      'Alta Books',
      '1a',
      2016,
      304,
      304,
      'lido',
      'manual',
      'serene',
      false,
      false,
      false,
      false,
      false,
      false,
      null::int,
      null::text,
      null::text,
      false,
      true,
      '2026-05-27 08:00:00-03'::timestamptz,
      '2026-05-01 10:50:00-03'::timestamptz,
      '2026-05-27 08:00:00-03'::timestamptz
    )
) as b(
  id,
  title,
  author,
  cover_url,
  description,
  publisher,
  edition,
  publication_year,
  total_pages,
  current_page,
  status,
  source,
  reading_origin,
  is_current,
  is_private,
  show_in_home,
  show_in_notifications,
  show_in_mente,
  include_in_quick_exports,
  estimated_reading_seconds,
  estimated_reading_source,
  estimated_reading_confidence,
  read_before_serene,
  completed_inside_serene,
  deleted_at,
  created_at,
  updated_at
)
on conflict (id) do update
set
  title = excluded.title,
  author = excluded.author,
  cover_url = excluded.cover_url,
  description = excluded.description,
  publisher = excluded.publisher,
  edition = excluded.edition,
  publication_year = excluded.publication_year,
  total_pages = excluded.total_pages,
  current_page = excluded.current_page,
  status = excluded.status,
  source = excluded.source,
  reading_origin = excluded.reading_origin,
  is_current = excluded.is_current,
  is_private = excluded.is_private,
  show_in_home = excluded.show_in_home,
  show_in_notifications = excluded.show_in_notifications,
  show_in_mente = excluded.show_in_mente,
  include_in_quick_exports = excluded.include_in_quick_exports,
  estimated_reading_seconds = excluded.estimated_reading_seconds,
  estimated_reading_source = excluded.estimated_reading_source,
  estimated_reading_confidence = excluded.estimated_reading_confidence,
  read_before_serene = excluded.read_before_serene,
  completed_inside_serene = excluded.completed_inside_serene,
  deleted_at = excluded.deleted_at,
  updated_at = excluded.updated_at;

update public.books book
set
  language = coalesce(book.language, meta.language),
  isbn = coalesce(book.isbn, meta.isbn),
  subjects = meta.subjects,
  updated_at = now()
from seed_demo_user s
join (
  values
    ('20000000-0000-0000-0000-000000000001'::uuid, 'pt', null::text, array['Filosofia', 'Estoicismo', 'Classicos']::text[]),
    ('20000000-0000-0000-0000-000000000002'::uuid, 'pt', null::text, array['Desenvolvimento pessoal', 'Habitos', 'Psicologia']::text[]),
    ('20000000-0000-0000-0000-000000000003'::uuid, 'pt', null::text, array['Financas', 'Comportamento', 'Dinheiro']::text[]),
    ('20000000-0000-0000-0000-000000000004'::uuid, 'pt', null::text, array['Literatura', 'Romance', 'Classicos']::text[]),
    ('20000000-0000-0000-0000-000000000005'::uuid, 'pt', null::text, array['Estudos', 'Aprendizado', 'Metodo']::text[]),
    ('20000000-0000-0000-0000-000000000006'::uuid, 'pt', null::text, array['Filosofia', 'Espiritualidade', 'Sentido']::text[]),
    ('20000000-0000-0000-0000-000000000007'::uuid, 'pt', null::text, array['Literatura', 'Narrativa', 'Poesia']::text[]),
    ('20000000-0000-0000-0000-000000000008'::uuid, 'pt', null::text, array['Matematica', 'Logica', 'Numeros']::text[]),
    ('20000000-0000-0000-0000-000000000009'::uuid, 'pt', null::text, array['Psicologia', 'Emocoes', 'Autoconhecimento']::text[]),
    ('20000000-0000-0000-0000-000000000010'::uuid, 'pt', null::text, array['Psicologia', 'Aprendizado', 'Mentalidade']::text[]),
    ('20000000-0000-0000-0000-000000000011'::uuid, 'pt', null::text, array['Trabalho', 'Foco', 'Produtividade']::text[])
) as meta(id, language, isbn, subjects)
  on true
where book.user_id = s.user_id
  and book.id = meta.id;

-- ----------------------------------------------------------------------------
-- 3) Manual categories
-- ----------------------------------------------------------------------------

insert into public.manual_categories (
  id,
  user_id,
  name,
  color,
  deleted_at,
  created_at,
  updated_at
)
select
  c.id,
  s.user_id,
  c.name,
  c.color,
  null::timestamptz,
  '2026-05-02 09:00:00-03'::timestamptz,
  '2026-05-02 09:00:00-03'::timestamptz
from seed_demo_user s
cross join (
  values
    ('30000000-0000-0000-0000-000000000001'::uuid, 'Filosofia', '#A88B6B'),
    ('30000000-0000-0000-0000-000000000002'::uuid, 'Finanças', '#6E8E59'),
    ('30000000-0000-0000-0000-000000000003'::uuid, 'Desenvolvimento Pessoal', '#5F7EA8'),
    ('30000000-0000-0000-0000-000000000004'::uuid, 'Psicologia', '#9A7AA8'),
    ('30000000-0000-0000-0000-000000000005'::uuid, 'Literatura', '#B68D5A'),
    ('30000000-0000-0000-0000-000000000006'::uuid, 'Produtividade', '#4F8A8B')
) as c(id, name, color)
on conflict (id) do update
set
  name = excluded.name,
  color = excluded.color,
  deleted_at = excluded.deleted_at,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 4) Book <-> manual categories
-- ----------------------------------------------------------------------------

insert into public.book_manual_categories (
  id,
  user_id,
  book_id,
  category_id,
  created_at
)
select
  m.id,
  s.user_id,
  m.book_id,
  m.category_id,
  '2026-05-02 10:00:00-03'::timestamptz
from seed_demo_user s
cross join (
  values
    ('50000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000001'::uuid),
    ('50000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000003'::uuid),
    ('50000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000003'::uuid),
    ('50000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000006'::uuid),
    ('50000000-0000-0000-0000-000000000005'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000002'::uuid),
    ('50000000-0000-0000-0000-000000000006'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000003'::uuid),
    ('50000000-0000-0000-0000-000000000007'::uuid, '20000000-0000-0000-0000-000000000004'::uuid, '30000000-0000-0000-0000-000000000001'::uuid),
    ('50000000-0000-0000-0000-000000000008'::uuid, '20000000-0000-0000-0000-000000000004'::uuid, '30000000-0000-0000-0000-000000000004'::uuid),
    ('50000000-0000-0000-0000-000000000009'::uuid, '20000000-0000-0000-0000-000000000005'::uuid, '30000000-0000-0000-0000-000000000004'::uuid),
    ('50000000-0000-0000-0000-000000000010'::uuid, '20000000-0000-0000-0000-000000000005'::uuid, '30000000-0000-0000-0000-000000000003'::uuid),
    ('50000000-0000-0000-0000-000000000011'::uuid, '20000000-0000-0000-0000-000000000006'::uuid, '30000000-0000-0000-0000-000000000002'::uuid),
    ('50000000-0000-0000-0000-000000000012'::uuid, '20000000-0000-0000-0000-000000000006'::uuid, '30000000-0000-0000-0000-000000000004'::uuid),
    ('50000000-0000-0000-0000-000000000013'::uuid, '20000000-0000-0000-0000-000000000007'::uuid, '30000000-0000-0000-0000-000000000005'::uuid),
    ('50000000-0000-0000-0000-000000000014'::uuid, '20000000-0000-0000-0000-000000000007'::uuid, '30000000-0000-0000-0000-000000000001'::uuid),
    ('50000000-0000-0000-0000-000000000015'::uuid, '20000000-0000-0000-0000-000000000008'::uuid, '30000000-0000-0000-0000-000000000006'::uuid),
    ('50000000-0000-0000-0000-000000000016'::uuid, '20000000-0000-0000-0000-000000000008'::uuid, '30000000-0000-0000-0000-000000000003'::uuid),
    ('50000000-0000-0000-0000-000000000017'::uuid, '20000000-0000-0000-0000-000000000009'::uuid, '30000000-0000-0000-0000-000000000002'::uuid),
    ('50000000-0000-0000-0000-000000000018'::uuid, '20000000-0000-0000-0000-000000000010'::uuid, '30000000-0000-0000-0000-000000000004'::uuid),
    ('50000000-0000-0000-0000-000000000019'::uuid, '20000000-0000-0000-0000-000000000010'::uuid, '30000000-0000-0000-0000-000000000003'::uuid)
) as m(id, book_id, category_id)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 5) Shelves (manual Biblioteca organization)
-- ----------------------------------------------------------------------------

insert into public.shelves (
  id,
  user_id,
  name,
  description,
  deleted_at,
  created_at,
  updated_at
)
select
  sh.id,
  s.user_id,
  sh.name,
  sh.description,
  null::timestamptz,
  '2026-05-02 11:00:00-03'::timestamptz,
  '2026-05-02 11:00:00-03'::timestamptz
from seed_demo_user s
cross join (
  values
    ('36000000-0000-0000-0000-000000000001'::uuid, 'Filosofia', 'Ideias para reler devagar.'),
    ('36000000-0000-0000-0000-000000000002'::uuid, 'Financas', 'Livros sobre dinheiro, risco e escolhas.'),
    ('36000000-0000-0000-0000-000000000003'::uuid, 'Psicologia', 'Leituras sobre mente, habitos e comportamento.'),
    ('36000000-0000-0000-0000-000000000004'::uuid, 'Literatura', 'Narrativas para respirar melhor.'),
    ('36000000-0000-0000-0000-000000000005'::uuid, 'Livros para reler', 'Obras que merecem uma segunda passagem.'),
    ('36000000-0000-0000-0000-000000000006'::uuid, 'Estudos', 'Livros que pedem caderno aberto.')
) as sh(id, name, description)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  deleted_at = excluded.deleted_at,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 6) Book <-> shelves
-- ----------------------------------------------------------------------------

insert into public.book_shelves (
  id,
  user_id,
  book_id,
  shelf_id,
  created_at
)
select
  bs.id,
  s.user_id,
  bs.book_id,
  bs.shelf_id,
  '2026-05-02 11:20:00-03'::timestamptz
from seed_demo_user s
cross join (
  values
    ('56000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '36000000-0000-0000-0000-000000000001'::uuid),
    ('56000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '36000000-0000-0000-0000-000000000005'::uuid),
    ('56000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '36000000-0000-0000-0000-000000000003'::uuid),
    ('56000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '36000000-0000-0000-0000-000000000006'::uuid),
    ('56000000-0000-0000-0000-000000000005'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, '36000000-0000-0000-0000-000000000002'::uuid),
    ('56000000-0000-0000-0000-000000000006'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, '36000000-0000-0000-0000-000000000005'::uuid),
    ('56000000-0000-0000-0000-000000000007'::uuid, '20000000-0000-0000-0000-000000000004'::uuid, '36000000-0000-0000-0000-000000000001'::uuid),
    ('56000000-0000-0000-0000-000000000008'::uuid, '20000000-0000-0000-0000-000000000004'::uuid, '36000000-0000-0000-0000-000000000003'::uuid),
    ('56000000-0000-0000-0000-000000000009'::uuid, '20000000-0000-0000-0000-000000000007'::uuid, '36000000-0000-0000-0000-000000000004'::uuid),
    ('56000000-0000-0000-0000-000000000010'::uuid, '20000000-0000-0000-0000-000000000007'::uuid, '36000000-0000-0000-0000-000000000005'::uuid),
    ('56000000-0000-0000-0000-000000000011'::uuid, '20000000-0000-0000-0000-000000000008'::uuid, '36000000-0000-0000-0000-000000000006'::uuid),
    ('56000000-0000-0000-0000-000000000012'::uuid, '20000000-0000-0000-0000-000000000010'::uuid, '36000000-0000-0000-0000-000000000003'::uuid)
) as bs(id, book_id, shelf_id)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 7) Automatic Mente categories
-- ----------------------------------------------------------------------------

insert into public.automatic_mente_categories (
  id,
  user_id,
  name,
  description,
  confidence,
  source,
  created_at,
  updated_at
)
select
  c.id,
  s.user_id,
  c.name,
  c.description,
  c.confidence,
  c.source,
  '2026-05-03 08:00:00-03'::timestamptz,
  '2026-05-03 08:00:00-03'::timestamptz
from seed_demo_user s
cross join (
  values
    ('40000000-0000-0000-0000-000000000001'::uuid, 'Filosofia', 'Temas de presença, ética e sentido.', 0.92::numeric, 'demo_inference'),
    ('40000000-0000-0000-0000-000000000002'::uuid, 'Finanças', 'Comportamento financeiro e construção de patrimônio.', 0.93::numeric, 'demo_inference'),
    ('40000000-0000-0000-0000-000000000003'::uuid, 'Psicologia', 'Padrões mentais, emoções e autoconsciência.', 0.90::numeric, 'demo_inference'),
    ('40000000-0000-0000-0000-000000000004'::uuid, 'Desenvolvimento Pessoal', 'Hábitos, identidade e crescimento pessoal.', 0.95::numeric, 'demo_inference'),
    ('40000000-0000-0000-0000-000000000005'::uuid, 'Literatura', 'Narrativas e imaginação simbólica.', 0.84::numeric, 'demo_inference'),
    ('40000000-0000-0000-0000-000000000006'::uuid, 'Produtividade', 'Foco, execução e priorização.', 0.88::numeric, 'demo_inference')
) as c(id, name, description, confidence, source)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  confidence = excluded.confidence,
  source = excluded.source,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 6) Book <-> automatic Mente categories
-- ----------------------------------------------------------------------------

insert into public.book_automatic_mente_categories (
  id,
  user_id,
  book_id,
  automatic_category_id,
  confidence,
  reason,
  created_at
)
select
  m.id,
  s.user_id,
  m.book_id,
  m.automatic_category_id,
  m.confidence,
  m.reason,
  '2026-05-03 09:00:00-03'::timestamptz
from seed_demo_user s
cross join (
  values
    ('60000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000001'::uuid, 0.95::numeric, 'Reflexões estoicas e foco em virtude.'),
    ('60000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000004'::uuid, 0.91::numeric, 'Disciplina e construção de caráter.'),
    ('60000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '40000000-0000-0000-0000-000000000004'::uuid, 0.97::numeric, 'Mudança de hábitos e identidade.'),
    ('60000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '40000000-0000-0000-0000-000000000006'::uuid, 0.93::numeric, 'Sistemas práticos de execução.'),
    ('60000000-0000-0000-0000-000000000005'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, '40000000-0000-0000-0000-000000000002'::uuid, 0.96::numeric, 'Fundamentos de educação financeira.'),
    ('60000000-0000-0000-0000-000000000006'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, '40000000-0000-0000-0000-000000000004'::uuid, 0.83::numeric, 'Mentalidade de longo prazo e ativos.'),
    ('60000000-0000-0000-0000-000000000007'::uuid, '20000000-0000-0000-0000-000000000004'::uuid, '40000000-0000-0000-0000-000000000001'::uuid, 0.90::numeric, 'Prática de presença e consciência.'),
    ('60000000-0000-0000-0000-000000000008'::uuid, '20000000-0000-0000-0000-000000000004'::uuid, '40000000-0000-0000-0000-000000000003'::uuid, 0.91::numeric, 'Observação de pensamentos e emoções.'),
    ('60000000-0000-0000-0000-000000000009'::uuid, '20000000-0000-0000-0000-000000000005'::uuid, '40000000-0000-0000-0000-000000000003'::uuid, 0.94::numeric, 'Vulnerabilidade e autoestima.'),
    ('60000000-0000-0000-0000-000000000010'::uuid, '20000000-0000-0000-0000-000000000006'::uuid, '40000000-0000-0000-0000-000000000002'::uuid, 0.97::numeric, 'Psicologia aplicada às finanças.'),
    ('60000000-0000-0000-0000-000000000011'::uuid, '20000000-0000-0000-0000-000000000006'::uuid, '40000000-0000-0000-0000-000000000003'::uuid, 0.92::numeric, 'Decisões guiadas por comportamento.'),
    ('60000000-0000-0000-0000-000000000012'::uuid, '20000000-0000-0000-0000-000000000007'::uuid, '40000000-0000-0000-0000-000000000005'::uuid, 0.95::numeric, 'Narrativa alegórica e simbólica.'),
    ('60000000-0000-0000-0000-000000000013'::uuid, '20000000-0000-0000-0000-000000000008'::uuid, '40000000-0000-0000-0000-000000000006'::uuid, 0.95::numeric, 'Priorização e foco no essencial.'),
    ('60000000-0000-0000-0000-000000000014'::uuid, '20000000-0000-0000-0000-000000000008'::uuid, '40000000-0000-0000-0000-000000000004'::uuid, 0.90::numeric, 'Escolhas intencionais de tempo e energia.'),
    ('60000000-0000-0000-0000-000000000015'::uuid, '20000000-0000-0000-0000-000000000009'::uuid, '40000000-0000-0000-0000-000000000002'::uuid, 0.89::numeric, 'Princípios clássicos de poupança e investimento.'),
    ('60000000-0000-0000-0000-000000000016'::uuid, '20000000-0000-0000-0000-000000000010'::uuid, '40000000-0000-0000-0000-000000000003'::uuid, 0.94::numeric, 'Crenças sobre capacidade e aprendizado.'),
    ('60000000-0000-0000-0000-000000000017'::uuid, '20000000-0000-0000-0000-000000000010'::uuid, '40000000-0000-0000-0000-000000000004'::uuid, 0.92::numeric, 'Evolução pessoal orientada por esforço.')
) as m(id, book_id, automatic_category_id, confidence, reason)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 7) Reading sessions
-- ----------------------------------------------------------------------------
-- Rule reminder:
-- Opening Mural must not pause session.
-- Active session below has mural_opened=true and status remains 'active'.

insert into public.reading_sessions (
  id,
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
  is_minimized,
  mural_opened,
  deleted_at,
  created_at,
  updated_at
)
select
  rs.id,
  s.user_id,
  rs.book_id,
  rs.started_at,
  rs.ended_at,
  rs.status,
  rs.active_seconds,
  rs.paused_seconds,
  rs.start_page,
  rs.end_page,
  rs.current_page_snapshot,
  rs.opened_from,
  rs.is_minimized,
  rs.mural_opened,
  null::timestamptz,
  rs.created_at,
  rs.updated_at
from seed_demo_user s
cross join (
  values
    (
      '70000000-0000-0000-0000-000000000001'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      '2026-05-10 19:30:00-03'::timestamptz,
      '2026-05-10 20:10:00-03'::timestamptz,
      'finished',
      2100,
      300,
      12,
      32,
      32,
      'inicio',
      false,
      false,
      '2026-05-10 19:30:00-03'::timestamptz,
      '2026-05-10 20:10:00-03'::timestamptz
    ),
    (
      '70000000-0000-0000-0000-000000000002'::uuid,
      '20000000-0000-0000-0000-000000000002'::uuid,
      '2026-05-12 21:00:00-03'::timestamptz,
      '2026-05-12 21:42:00-03'::timestamptz,
      'finished',
      2520,
      0,
      280,
      320,
      320,
      'biblioteca',
      false,
      false,
      '2026-05-12 21:00:00-03'::timestamptz,
      '2026-05-12 21:42:00-03'::timestamptz
    ),
    (
      '70000000-0000-0000-0000-000000000003'::uuid,
      '20000000-0000-0000-0000-000000000004'::uuid,
      '2026-05-18 07:10:00-03'::timestamptz,
      '2026-05-18 07:58:00-03'::timestamptz,
      'finished',
      2580,
      300,
      52,
      86,
      86,
      'inicio',
      false,
      false,
      '2026-05-18 07:10:00-03'::timestamptz,
      '2026-05-18 07:58:00-03'::timestamptz
    ),
    (
      '70000000-0000-0000-0000-000000000004'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      '2026-05-27 21:15:00-03'::timestamptz,
      null::timestamptz,
      'active',
      1860,
      0,
      120,
      null::int,
      134,
      'inicio',
      false,
      true,
      '2026-05-27 21:15:00-03'::timestamptz,
      '2026-05-27 21:46:00-03'::timestamptz
    ),
    (
      '70000000-0000-0000-0000-000000000005'::uuid,
      '20000000-0000-0000-0000-000000000006'::uuid,
      '2026-05-27 07:00:00-03'::timestamptz,
      null::timestamptz,
      'paused',
      1500,
      600,
      40,
      null::int,
      55,
      'biblioteca',
      false,
      false,
      '2026-05-27 07:00:00-03'::timestamptz,
      '2026-05-27 07:40:00-03'::timestamptz
    ),
    (
      '70000000-0000-0000-0000-000000000006'::uuid,
      '20000000-0000-0000-0000-000000000008'::uuid,
      '2026-05-26 22:00:00-03'::timestamptz,
      null::timestamptz,
      'active',
      900,
      0,
      96,
      null::int,
      102,
      'inicio',
      true,
      false,
      '2026-05-26 22:00:00-03'::timestamptz,
      '2026-05-26 22:20:00-03'::timestamptz
    ),
    (
      '70000000-0000-0000-0000-000000000007'::uuid,
      '20000000-0000-0000-0000-000000000006'::uuid,
      '2026-05-22 20:30:00-03'::timestamptz,
      '2026-05-22 21:05:00-03'::timestamptz,
      'finished',
      1800,
      300,
      20,
      40,
      40,
      'inicio',
      false,
      false,
      '2026-05-22 20:30:00-03'::timestamptz,
      '2026-05-22 21:05:00-03'::timestamptz
    ),
    (
      '70000000-0000-0000-0000-000000000008'::uuid,
      '20000000-0000-0000-0000-000000000005'::uuid,
      '2026-05-23 06:50:00-03'::timestamptz,
      '2026-05-23 07:05:00-03'::timestamptz,
      'cancelled',
      600,
      0,
      1,
      5,
      5,
      'biblioteca',
      false,
      false,
      '2026-05-23 06:50:00-03'::timestamptz,
      '2026-05-23 07:05:00-03'::timestamptz
    )
) as rs(
  id,
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
  is_minimized,
  mural_opened,
  created_at,
  updated_at
)
on conflict (id) do update
set
  book_id = excluded.book_id,
  started_at = excluded.started_at,
  ended_at = excluded.ended_at,
  status = excluded.status,
  active_seconds = excluded.active_seconds,
  paused_seconds = excluded.paused_seconds,
  start_page = excluded.start_page,
  end_page = excluded.end_page,
  current_page_snapshot = excluded.current_page_snapshot,
  opened_from = excluded.opened_from,
  is_minimized = excluded.is_minimized,
  mural_opened = excluded.mural_opened,
  updated_at = excluded.updated_at;

-- ----------------------------------------------------------------------------
-- 8) Reading pauses
-- ----------------------------------------------------------------------------
-- Pauses are created only for explicitly paused moments.
-- No pause rows are created simply because Mural was opened.

insert into public.reading_pauses (
  id,
  user_id,
  session_id,
  paused_at,
  resumed_at,
  duration_seconds,
  created_at
)
select
  rp.id,
  s.user_id,
  rp.session_id,
  rp.paused_at,
  rp.resumed_at,
  rp.duration_seconds,
  rp.created_at
from seed_demo_user s
cross join (
  values
    (
      '80000000-0000-0000-0000-000000000001'::uuid,
      '70000000-0000-0000-0000-000000000001'::uuid,
      '2026-05-10 19:50:00-03'::timestamptz,
      '2026-05-10 19:55:00-03'::timestamptz,
      300,
      '2026-05-10 19:50:00-03'::timestamptz
    ),
    (
      '80000000-0000-0000-0000-000000000002'::uuid,
      '70000000-0000-0000-0000-000000000005'::uuid,
      '2026-05-27 07:20:00-03'::timestamptz,
      '2026-05-27 07:25:00-03'::timestamptz,
      300,
      '2026-05-27 07:20:00-03'::timestamptz
    ),
    (
      '80000000-0000-0000-0000-000000000003'::uuid,
      '70000000-0000-0000-0000-000000000005'::uuid,
      '2026-05-27 07:35:00-03'::timestamptz,
      null::timestamptz,
      0,
      '2026-05-27 07:35:00-03'::timestamptz
    )
) as rp(id, session_id, paused_at, resumed_at, duration_seconds, created_at)
on conflict (id) do update
set
  session_id = excluded.session_id,
  paused_at = excluded.paused_at,
  resumed_at = excluded.resumed_at,
  duration_seconds = excluded.duration_seconds,
  created_at = excluded.created_at;

-- ----------------------------------------------------------------------------
-- 9) Annotations
-- ----------------------------------------------------------------------------

insert into public.annotations (
  id,
  user_id,
  book_id,
  session_id,
  type,
  content,
  page_number,
  color,
  text_color,
  highlight_color,
  origin,
  is_favorite,
  is_private,
  review_status,
  deleted_at,
  created_at,
  updated_at
)
select
  a.id,
  s.user_id,
  a.book_id,
  a.session_id,
  a.type,
  a.content,
  a.page_number,
  a.color,
  a.text_color,
  a.highlight_color,
  a.origin,
  a.is_favorite,
  a.is_private,
  a.review_status,
  a.deleted_at,
  a.created_at,
  a.updated_at
from seed_demo_user s
cross join (
  values
    (
      '90000000-0000-0000-0000-000000000001'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      'quick_note',
      'Anotar como a disciplina diária muda minha relação com o tempo.',
      134,
      '#F8E58C',
      '#2B2B2B',
      null::text,
      'reading',
      true,
      false,
      'to_review',
      null::timestamptz,
      '2026-05-27 21:22:00-03'::timestamptz,
      '2026-05-27 21:26:00-03'::timestamptz
    ),
    (
      '90000000-0000-0000-0000-000000000002'::uuid,
      '20000000-0000-0000-0000-000000000002'::uuid,
      '70000000-0000-0000-0000-000000000002'::uuid,
      'reflection',
      'Esse trecho me fez pensar sobre como pequenas decisões repetidas criam identidade.',
      112,
      '#DDEAFE',
      '#1F2A44',
      null::text,
      'reading',
      true,
      false,
      'reviewed',
      null::timestamptz,
      '2026-05-12 21:28:00-03'::timestamptz,
      '2026-05-13 08:00:00-03'::timestamptz
    ),
    (
      '90000000-0000-0000-0000-000000000003'::uuid,
      '20000000-0000-0000-0000-000000000002'::uuid,
      '70000000-0000-0000-0000-000000000002'::uuid,
      'highlight',
      'Você não se eleva ao nível dos seus objetivos, você cai ao nível dos seus sistemas.',
      145,
      null::text,
      null::text,
      '#F7E78A',
      'reading',
      false,
      false,
      'reviewed',
      null::timestamptz,
      '2026-05-12 21:33:00-03'::timestamptz,
      '2026-05-13 08:05:00-03'::timestamptz
    ),
    (
      '90000000-0000-0000-0000-000000000004'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      'post_it',
      'Rever este conceito quando organizar a rotina da semana.',
      136,
      '#FFE6A8',
      '#4A3A2A',
      null::text,
      'manual',
      false,
      false,
      'to_review',
      null::timestamptz,
      '2026-05-27 21:25:00-03'::timestamptz,
      '2026-05-27 21:27:00-03'::timestamptz
    ),
    (
      '90000000-0000-0000-0000-000000000005'::uuid,
      '20000000-0000-0000-0000-000000000004'::uuid,
      '70000000-0000-0000-0000-000000000003'::uuid,
      'flag',
      'Voltar a este capítulo sobre presença em situações de ansiedade.',
      86,
      '#FF8C7A',
      '#4A1F1A',
      null::text,
      'reading',
      false,
      false,
      'none',
      null::timestamptz,
      '2026-05-18 07:56:00-03'::timestamptz,
      '2026-05-18 07:56:00-03'::timestamptz
    ),
    (
      '90000000-0000-0000-0000-000000000006'::uuid,
      '20000000-0000-0000-0000-000000000006'::uuid,
      '70000000-0000-0000-0000-000000000005'::uuid,
      'doubt',
      'Será que estou confundindo produtividade com pressa?',
      55,
      '#D8E8FF',
      '#1B3557',
      null::text,
      'reading',
      false,
      false,
      'to_review',
      null::timestamptz,
      '2026-05-27 07:18:00-03'::timestamptz,
      '2026-05-27 07:18:00-03'::timestamptz
    ),
    (
      '90000000-0000-0000-0000-000000000007'::uuid,
      '20000000-0000-0000-0000-000000000003'::uuid,
      null::uuid,
      'thought',
      'Percebi que minha visão sobre risco mudou desde a primeira leitura.',
      87,
      '#EFE1D1',
      '#3A2E24',
      null::text,
      'retroactive',
      false,
      false,
      'reviewed',
      null::timestamptz,
      '2026-05-19 18:20:00-03'::timestamptz,
      '2026-05-19 18:40:00-03'::timestamptz
    ),
    (
      '90000000-0000-0000-0000-000000000008'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      'idea',
      'Criar uma rotina de leitura curta antes do treino.',
      137,
      '#DFF5E4',
      '#204030',
      null::text,
      'mural',
      true,
      false,
      'none',
      null::timestamptz,
      '2026-05-27 21:32:00-03'::timestamptz,
      '2026-05-27 21:38:00-03'::timestamptz
    ),
    (
      '90000000-0000-0000-0000-000000000009'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      'action',
      'Separar 20 minutos amanhã para revisar as anotações deste livro.',
      138,
      '#FFD9CC',
      '#5C2415',
      null::text,
      'mural',
      false,
      false,
      'to_review',
      null::timestamptz,
      '2026-05-27 21:36:00-03'::timestamptz,
      '2026-05-27 21:41:00-03'::timestamptz
    ),
    (
      '90000000-0000-0000-0000-000000000010'::uuid,
      '20000000-0000-0000-0000-000000000007'::uuid,
      null::uuid,
      'quick_note',
      'Reler a metáfora do deserto com olhar de paciência e processo.',
      61,
      '#EEE4D7',
      '#3D2F25',
      null::text,
      'retroactive',
      false,
      false,
      'reviewed',
      null::timestamptz,
      '2026-05-16 17:30:00-03'::timestamptz,
      '2026-05-16 18:00:00-03'::timestamptz
    ),
    (
      '90000000-0000-0000-0000-000000000011'::uuid,
      '20000000-0000-0000-0000-000000000010'::uuid,
      null::uuid,
      'ocr_page',
      'Trecho capturado por OCR: crescimento acontece quando o erro vira feedback.',
      23,
      '#F2E6FF',
      '#35204A',
      null::text,
      'ocr',
      false,
      true,
      'none',
      null::timestamptz,
      '2026-05-21 12:05:00-03'::timestamptz,
      '2026-05-21 12:05:00-03'::timestamptz
    ),
    (
      '90000000-0000-0000-0000-000000000012'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      'reflection',
      'Hoje li mais devagar e entendi melhor. Menos pressa, mais presença.',
      133,
      '#F4DDF8',
      '#3C2245',
      null::text,
      'manual',
      true,
      true,
      'reviewed',
      null::timestamptz,
      '2026-05-27 21:18:00-03'::timestamptz,
      '2026-05-27 21:45:00-03'::timestamptz
    ),
    (
      '90000000-0000-0000-0000-000000000013'::uuid,
      '20000000-0000-0000-0000-000000000011'::uuid,
      null::uuid,
      'quick_note',
      'Exemplo de anotação apagada para validar Lixeira.',
      44,
      '#DDDDDD',
      '#222222',
      null::text,
      'manual',
      false,
      false,
      'none',
      '2026-05-27 08:05:00-03'::timestamptz,
      '2026-05-12 09:10:00-03'::timestamptz,
      '2026-05-27 08:05:00-03'::timestamptz
    )
) as a(
  id,
  book_id,
  session_id,
  type,
  content,
  page_number,
  color,
  text_color,
  highlight_color,
  origin,
  is_favorite,
  is_private,
  review_status,
  deleted_at,
  created_at,
  updated_at
)
on conflict (id) do update
set
  book_id = excluded.book_id,
  session_id = excluded.session_id,
  type = excluded.type,
  content = excluded.content,
  page_number = excluded.page_number,
  color = excluded.color,
  text_color = excluded.text_color,
  highlight_color = excluded.highlight_color,
  origin = excluded.origin,
  is_favorite = excluded.is_favorite,
  is_private = excluded.is_private,
  review_status = excluded.review_status,
  deleted_at = excluded.deleted_at,
  updated_at = excluded.updated_at;

-- ----------------------------------------------------------------------------
-- 10) annotation_mural_positions
-- ----------------------------------------------------------------------------
-- Mural positions do not duplicate annotation content.
-- They only store visual state (x, y, width, height, rotation, z_index, visibility).

insert into public.annotation_mural_positions (
  id,
  user_id,
  annotation_id,
  session_id,
  book_id,
  x,
  y,
  width,
  height,
  rotation,
  z_index,
  is_visible,
  is_suggested,
  suggested_slot,
  created_at,
  updated_at
)
select
  p.id,
  s.user_id,
  p.annotation_id,
  p.session_id,
  p.book_id,
  p.x,
  p.y,
  p.width,
  p.height,
  p.rotation,
  p.z_index,
  p.is_visible,
  p.is_suggested,
  p.suggested_slot,
  p.created_at,
  p.updated_at
from seed_demo_user s
cross join (
  values
    (
      'a1000000-0000-0000-0000-000000000001'::uuid,
      '90000000-0000-0000-0000-000000000001'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      120::numeric,
      130::numeric,
      260::numeric,
      150::numeric,
      0::numeric,
      1,
      true,
      false,
      null::int,
      '2026-05-27 21:23:00-03'::timestamptz,
      '2026-05-27 21:23:00-03'::timestamptz
    ),
    (
      'a1000000-0000-0000-0000-000000000002'::uuid,
      '90000000-0000-0000-0000-000000000004'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      450::numeric,
      170::numeric,
      260::numeric,
      150::numeric,
      -2::numeric,
      2,
      true,
      false,
      null::int,
      '2026-05-27 21:26:00-03'::timestamptz,
      '2026-05-27 21:39:00-03'::timestamptz
    ),
    (
      'a1000000-0000-0000-0000-000000000003'::uuid,
      '90000000-0000-0000-0000-000000000008'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      790::numeric,
      160::numeric,
      280::numeric,
      160::numeric,
      1::numeric,
      4,
      true,
      true,
      1,
      '2026-05-27 21:33:00-03'::timestamptz,
      '2026-05-27 21:42:00-03'::timestamptz
    ),
    (
      'a1000000-0000-0000-0000-000000000004'::uuid,
      '90000000-0000-0000-0000-000000000009'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      760::numeric,
      420::numeric,
      300::numeric,
      150::numeric,
      0::numeric,
      5,
      true,
      true,
      4,
      '2026-05-27 21:36:00-03'::timestamptz,
      '2026-05-27 21:44:00-03'::timestamptz
    ),
    (
      'a1000000-0000-0000-0000-000000000005'::uuid,
      '90000000-0000-0000-0000-000000000012'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      210::numeric,
      430::numeric,
      320::numeric,
      170::numeric,
      0::numeric,
      3,
      true,
      false,
      null::int,
      '2026-05-27 21:19:00-03'::timestamptz,
      '2026-05-27 21:43:00-03'::timestamptz
    ),
    (
      'a1000000-0000-0000-0000-000000000006'::uuid,
      '90000000-0000-0000-0000-000000000003'::uuid,
      '70000000-0000-0000-0000-000000000002'::uuid,
      '20000000-0000-0000-0000-000000000002'::uuid,
      530::numeric,
      360::numeric,
      330::numeric,
      140::numeric,
      0::numeric,
      1,
      true,
      false,
      null::int,
      '2026-05-12 21:34:00-03'::timestamptz,
      '2026-05-13 08:06:00-03'::timestamptz
    )
) as p(
  id,
  annotation_id,
  session_id,
  book_id,
  x,
  y,
  width,
  height,
  rotation,
  z_index,
  is_visible,
  is_suggested,
  suggested_slot,
  created_at,
  updated_at
)
on conflict (id) do update
set
  annotation_id = excluded.annotation_id,
  session_id = excluded.session_id,
  book_id = excluded.book_id,
  x = excluded.x,
  y = excluded.y,
  width = excluded.width,
  height = excluded.height,
  rotation = excluded.rotation,
  z_index = excluded.z_index,
  is_visible = excluded.is_visible,
  is_suggested = excluded.is_suggested,
  suggested_slot = excluded.suggested_slot,
  updated_at = excluded.updated_at;

-- ----------------------------------------------------------------------------
-- 11) Mural suggestions (max 5 for one active session)
-- ----------------------------------------------------------------------------
-- Session target: 700...0004 (active, mural_opened=true, status=active).
-- Positions are intentionally stable in this session.
-- Clicking a suggestion should not delete it; status changes only through explicit use/hide/delete.

insert into public.mural_suggestions (
  id,
  user_id,
  session_id,
  suggested_type,
  suggested_slot,
  x,
  y,
  width,
  height,
  rotation,
  status,
  converted_annotation_id,
  created_at,
  updated_at
)
select
  ms.id,
  s.user_id,
  ms.session_id,
  ms.suggested_type,
  ms.suggested_slot,
  ms.x,
  ms.y,
  ms.width,
  ms.height,
  ms.rotation,
  ms.status,
  ms.converted_annotation_id,
  ms.created_at,
  ms.updated_at
from seed_demo_user s
cross join (
  values
    (
      'b1000000-0000-0000-0000-000000000001'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      'idea',
      1,
      80::numeric,
      710::numeric,
      240::numeric,
      120::numeric,
      0::numeric,
      'used',
      '90000000-0000-0000-0000-000000000008'::uuid,
      '2026-05-27 21:29:00-03'::timestamptz,
      '2026-05-27 21:33:00-03'::timestamptz
    ),
    (
      'b1000000-0000-0000-0000-000000000002'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      'reflection',
      2,
      360::numeric,
      710::numeric,
      240::numeric,
      120::numeric,
      -1::numeric,
      'available',
      null::uuid,
      '2026-05-27 21:29:10-03'::timestamptz,
      '2026-05-27 21:29:10-03'::timestamptz
    ),
    (
      'b1000000-0000-0000-0000-000000000003'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      'doubt',
      3,
      640::numeric,
      710::numeric,
      240::numeric,
      120::numeric,
      1::numeric,
      'hidden',
      null::uuid,
      '2026-05-27 21:29:20-03'::timestamptz,
      '2026-05-27 21:37:00-03'::timestamptz
    ),
    (
      'b1000000-0000-0000-0000-000000000004'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      'action',
      4,
      920::numeric,
      710::numeric,
      240::numeric,
      120::numeric,
      0::numeric,
      'used',
      '90000000-0000-0000-0000-000000000009'::uuid,
      '2026-05-27 21:29:30-03'::timestamptz,
      '2026-05-27 21:36:00-03'::timestamptz
    ),
    (
      'b1000000-0000-0000-0000-000000000005'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      'post_it',
      5,
      1200::numeric,
      710::numeric,
      240::numeric,
      120::numeric,
      0::numeric,
      'available',
      null::uuid,
      '2026-05-27 21:29:40-03'::timestamptz,
      '2026-05-27 21:29:40-03'::timestamptz
    )
) as ms(
  id,
  session_id,
  suggested_type,
  suggested_slot,
  x,
  y,
  width,
  height,
  rotation,
  status,
  converted_annotation_id,
  created_at,
  updated_at
)
on conflict (id) do update
set
  session_id = excluded.session_id,
  suggested_type = excluded.suggested_type,
  suggested_slot = excluded.suggested_slot,
  x = excluded.x,
  y = excluded.y,
  width = excluded.width,
  height = excluded.height,
  rotation = excluded.rotation,
  status = excluded.status,
  converted_annotation_id = excluded.converted_annotation_id,
  updated_at = excluded.updated_at;

-- ----------------------------------------------------------------------------
-- 12) Annotation colors
-- ----------------------------------------------------------------------------

insert into public.annotation_colors (
  id,
  user_id,
  name,
  color_hex,
  applies_to,
  is_default,
  created_at,
  updated_at
)
select
  c.id,
  s.user_id,
  c.name,
  c.color_hex,
  c.applies_to,
  c.is_default,
  '2026-05-02 08:30:00-03'::timestamptz,
  '2026-05-02 08:30:00-03'::timestamptz
from seed_demo_user s
cross join (
  values
    ('c1000000-0000-0000-0000-000000000001'::uuid, 'Amarelo suave', '#F7E78A', 'highlight', true),
    ('c1000000-0000-0000-0000-000000000002'::uuid, 'Azul sereno', '#DDEAFE', 'note', false),
    ('c1000000-0000-0000-0000-000000000003'::uuid, 'Verde calmo', '#DFF5E4', 'note', false),
    ('c1000000-0000-0000-0000-000000000004'::uuid, 'Rosa claro', '#F4DDF8', 'reflection', false),
    ('c1000000-0000-0000-0000-000000000005'::uuid, 'Bege papel', '#EFE1D1', 'post_it', false),
    ('c1000000-0000-0000-0000-000000000006'::uuid, 'Cinza leitura', '#D9D9D9', 'note', false)
) as c(id, name, color_hex, applies_to, is_default)
on conflict (id) do update
set
  name = excluded.name,
  color_hex = excluded.color_hex,
  applies_to = excluded.applies_to,
  is_default = excluded.is_default,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 13) Timeline events
-- ----------------------------------------------------------------------------

insert into public.timeline_events (
  id,
  user_id,
  book_id,
  session_id,
  annotation_id,
  event_type,
  title,
  description,
  metadata,
  created_at
)
select
  t.id,
  s.user_id,
  t.book_id,
  t.session_id,
  t.annotation_id,
  t.event_type,
  t.title,
  t.description,
  t.metadata,
  t.created_at
from seed_demo_user s
cross join (
  values
    (
      'd1000000-0000-0000-0000-000000000001'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      null::uuid,
      null::uuid,
      'book_added',
      'Livro adicionado à biblioteca',
      'Meditações foi adicionado e marcado como leitura atual.',
      '{"source":"manual"}'::jsonb,
      '2026-05-01 09:12:00-03'::timestamptz
    ),
    (
      'd1000000-0000-0000-0000-000000000002'::uuid,
      '20000000-0000-0000-0000-000000000003'::uuid,
      null::uuid,
      null::uuid,
      'historical_book_added',
      'Histórico de leitura importado',
      'Pai Rico, Pai Pobre entrou como leitura histórica estimada.',
      '{"estimated_seconds":28800,"confidence":"medium"}'::jsonb,
      '2026-05-01 09:35:00-03'::timestamptz
    ),
    (
      'd1000000-0000-0000-0000-000000000003'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      '70000000-0000-0000-0000-000000000001'::uuid,
      null::uuid,
      'book_started',
      'Sessão iniciada com calma',
      'Leitura iniciada sem pressa, com foco em presença.',
      '{"opened_from":"inicio"}'::jsonb,
      '2026-05-10 19:30:00-03'::timestamptz
    ),
    (
      'd1000000-0000-0000-0000-000000000004'::uuid,
      '20000000-0000-0000-0000-000000000002'::uuid,
      '70000000-0000-0000-0000-000000000002'::uuid,
      null::uuid,
      'session_finished',
      'Sessão concluída',
      'Uma sessão consistente foi concluída com atenção ao processo.',
      '{"active_seconds":2520,"paused_seconds":0,"end_page":320}'::jsonb,
      '2026-05-12 21:42:00-03'::timestamptz
    ),
    (
      'd1000000-0000-0000-0000-000000000005'::uuid,
      '20000000-0000-0000-0000-000000000002'::uuid,
      '70000000-0000-0000-0000-000000000002'::uuid,
      '90000000-0000-0000-0000-000000000002'::uuid,
      'annotation_created',
      'Reflexão registrada',
      'Uma reflexão importante foi salva para revisões futuras.',
      '{"type":"reflection"}'::jsonb,
      '2026-05-12 21:28:00-03'::timestamptz
    ),
    (
      'd1000000-0000-0000-0000-000000000006'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      null::uuid,
      '90000000-0000-0000-0000-000000000001'::uuid,
      'annotation_favorited',
      'Anotação favorita',
      'Uma nota essencial foi marcada para destaque.',
      '{"favorite":true}'::jsonb,
      '2026-05-27 21:26:30-03'::timestamptz
    ),
    (
      'd1000000-0000-0000-0000-000000000007'::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      'reading_time_milestone',
      'Marco de tempo de leitura',
      'Você acumulou tempo de leitura consistente ao longo da semana.',
      '{"milestone_seconds":10800,"type":"real_time"}'::jsonb,
      '2026-05-22 22:00:00-03'::timestamptz
    ),
    (
      'd1000000-0000-0000-0000-000000000008'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      '70000000-0000-0000-0000-000000000004'::uuid,
      null::uuid,
      'mural_used',
      'Mural utilizado em sessão ativa',
      'O Mural foi aberto mantendo o contador de leitura ativo.',
      '{"session_status":"active","mural_opened":true}'::jsonb,
      '2026-05-27 21:29:00-03'::timestamptz
    ),
    (
      'd1000000-0000-0000-0000-000000000009'::uuid,
      '20000000-0000-0000-0000-000000000002'::uuid,
      null::uuid,
      null::uuid,
      'book_completed',
      'Livro concluído no SERENE',
      'Hábitos Atômicos foi concluído com anotações de revisão.',
      '{"completed_inside_serene":true}'::jsonb,
      '2026-05-12 21:43:00-03'::timestamptz
    ),
    (
      'd1000000-0000-0000-0000-000000000010'::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      'export_created',
      'Exportação concluída',
      'Resumo de leitura exportado para compartilhar progresso pessoal.',
      '{"format":"pdf"}'::jsonb,
      '2026-05-24 09:10:00-03'::timestamptz
    )
) as t(
  id,
  book_id,
  session_id,
  annotation_id,
  event_type,
  title,
  description,
  metadata,
  created_at
)
on conflict (id) do update
set
  book_id = excluded.book_id,
  session_id = excluded.session_id,
  annotation_id = excluded.annotation_id,
  event_type = excluded.event_type,
  title = excluded.title,
  description = excluded.description,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

-- ----------------------------------------------------------------------------
-- 14) Exports
-- ----------------------------------------------------------------------------

insert into public.exports (
  id,
  user_id,
  format,
  export_type,
  file_url,
  included_private_content,
  metadata,
  created_at
)
select
  e.id,
  s.user_id,
  e.format,
  e.export_type,
  e.file_url,
  e.included_private_content,
  e.metadata,
  e.created_at
from seed_demo_user s
cross join (
  values
    (
      'e1000000-0000-0000-0000-000000000001'::uuid,
      'pdf',
      'session_summary',
      'https://serene-demo.local/exports/session-summary-2026-05-24.pdf',
      false,
      '{"books":3,"sessions":5}'::jsonb,
      '2026-05-24 09:09:00-03'::timestamptz
    ),
    (
      'e1000000-0000-0000-0000-000000000002'::uuid,
      'docx',
      'annotations',
      'https://serene-demo.local/exports/annotations-2026-05-25.docx',
      true,
      '{"annotation_count":12,"private_included":true}'::jsonb,
      '2026-05-25 10:15:00-03'::timestamptz
    ),
    (
      'e1000000-0000-0000-0000-000000000003'::uuid,
      'markdown',
      'mente_snapshot',
      'https://serene-demo.local/exports/mente-2026-05-26.md',
      false,
      '{"automatic_categories":6}'::jsonb,
      '2026-05-26 18:05:00-03'::timestamptz
    )
) as e(
  id,
  format,
  export_type,
  file_url,
  included_private_content,
  metadata,
  created_at
)
on conflict (id) do update
set
  format = excluded.format,
  export_type = excluded.export_type,
  file_url = excluded.file_url,
  included_private_content = excluded.included_private_content,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

-- ----------------------------------------------------------------------------
-- 15) User settings
-- ----------------------------------------------------------------------------

insert into public.user_settings (
  id,
  user_id,
  key,
  value,
  created_at,
  updated_at
)
select
  us.id,
  s.user_id,
  us.key,
  us.value,
  '2026-05-02 07:45:00-03'::timestamptz,
  '2026-05-27 21:00:00-03'::timestamptz
from seed_demo_user s
cross join (
  values
    ('f1000000-0000-0000-0000-000000000001'::uuid, 'theme', '{"value":"system"}'::jsonb),
    ('f1000000-0000-0000-0000-000000000002'::uuid, 'reduced_motion', '{"value":false}'::jsonb),
    ('f1000000-0000-0000-0000-000000000003'::uuid, 'reading_close_behavior', '{"value":"minimize"}'::jsonb),
    ('f1000000-0000-0000-0000-000000000004'::uuid, 'pressure_free_mode', '{"value":true}'::jsonb),
    (
      'f1000000-0000-0000-0000-000000000005'::uuid,
      'mural_preferences',
      '{
        "show_suggestions": true,
        "calm_grid_enabled": true,
        "max_suggestions_per_session": 5,
        "keep_positions_stable_within_session": true,
        "suggestions_randomized_per_session": true,
        "open_mural_with_existing_annotations": true
      }'::jsonb
    ),
    (
      'f1000000-0000-0000-0000-000000000006'::uuid,
      'annotation_colors',
      '{
        "default_palette": ["#F7E78A", "#DDEAFE", "#DFF5E4", "#F4DDF8", "#EFE1D1", "#D9D9D9"],
        "preferred_highlight": "#F7E78A"
      }'::jsonb
    ),
    (
      'f1000000-0000-0000-0000-000000000007'::uuid,
      'quick_export_privacy',
      '{"include_private_content": false}'::jsonb
    )
) as us(id, key, value)
on conflict (user_id, key) do update
set
  value = excluded.value,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 16) Trash items (with soft-deleted book + annotation)
-- ----------------------------------------------------------------------------

insert into public.trash_items (
  id,
  user_id,
  item_type,
  item_id,
  title,
  deleted_at,
  metadata
)
select
  tr.id,
  s.user_id,
  tr.item_type,
  tr.item_id,
  tr.title,
  tr.deleted_at,
  tr.metadata
from seed_demo_user s
cross join (
  values
    (
      'f2000000-0000-0000-0000-000000000001'::uuid,
      'book',
      '20000000-0000-0000-0000-000000000011'::uuid,
      'Trabalho Profundo',
      '2026-05-27 08:00:00-03'::timestamptz,
      '{"source_table":"books","reason":"demo_soft_delete"}'::jsonb
    ),
    (
      'f2000000-0000-0000-0000-000000000002'::uuid,
      'annotation',
      '90000000-0000-0000-0000-000000000013'::uuid,
      'Exemplo de anotação apagada',
      '2026-05-27 08:05:00-03'::timestamptz,
      '{"source_table":"annotations","reason":"demo_soft_delete"}'::jsonb
    )
) as tr(id, item_type, item_id, title, deleted_at, metadata)
on conflict (id) do update
set
  item_type = excluded.item_type,
  item_id = excluded.item_id,
  title = excluded.title,
  deleted_at = excluded.deleted_at,
  metadata = excluded.metadata;

commit;

-- ----------------------------------------------------------------------------
-- Next steps
-- ----------------------------------------------------------------------------
-- Run schema.sql first.
-- Create demo auth user if needed.
-- Run seed.sql.
-- Then implement the app in phases.
