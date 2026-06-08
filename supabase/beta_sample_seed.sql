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
  cover_url,
  description,
  total_pages,
  current_page,
  status,
  source,
  reading_origin,
  is_current,
  show_in_home,
  show_in_mente,
  created_at,
  updated_at
)
select
  s.user_id,
  b.title,
  b.author,
  b.cover_url,
  b.description,
  b.total_pages,
  b.current_page,
  b.status,
  'beta_sample',
  'serene',
  b.is_current,
  true,
  true,
  now(),
  now()
from seed_beta_user s
cross join (
  values
    (
      'Um livro para respirar',
      'SERENE',
      'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=420&q=80',
      'Starter calmo para testar biblioteca e leitura.',
      180,
      64,
      'lendo',
      true
    ),
    (
      'A biblioteca interior',
      'SERENE',
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=420&q=80',
      'Segundo livro em leitura para testar a mesa do Inicio.',
      220,
      83,
      'lendo',
      false
    ),
    (
      'Cadernos de marca-texto',
      'SERENE',
      'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=420&q=80',
      'Leitura paralela para ver progresso, capa e acoes rapidas.',
      156,
      41,
      'lendo',
      false
    ),
    (
      'Notas de uma leitura tranquila',
      'SERENE',
      'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=420&q=80',
      'Exemplo pequeno para testar anotacoes.',
      96,
      0,
      'quero_ler',
      false
    ),
    (
      'Memoria de leitura',
      'SERENE',
      'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?w=420&q=80',
      'Livro ja lido para observar a Mente sem pressa.',
      144,
      144,
      'lido',
      false
    )
) as b(title, author, cover_url, description, total_pages, current_page, status, is_current)
where not exists (
  select 1
  from public.books existing
  where existing.user_id = s.user_id
    and existing.source = 'beta_sample'
    and existing.title = b.title
);

update public.books existing
set
  cover_url = b.cover_url,
  current_page = b.current_page,
  status = b.status,
  is_current = b.is_current,
  show_in_home = true,
  show_in_mente = true,
  updated_at = now()
from seed_beta_user s
join (
  values
    (
      'Um livro para respirar',
      'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=420&q=80',
      64,
      'lendo',
      true
    ),
    (
      'A biblioteca interior',
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=420&q=80',
      83,
      'lendo',
      false
    ),
    (
      'Cadernos de marca-texto',
      'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=420&q=80',
      41,
      'lendo',
      false
    ),
    (
      'Notas de uma leitura tranquila',
      'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=420&q=80',
      0,
      'quero_ler',
      false
    ),
    (
      'Memoria de leitura',
      'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?w=420&q=80',
      144,
      'lido',
      false
    )
) as b(title, cover_url, current_page, status, is_current)
  on true
where existing.user_id = s.user_id
  and existing.source = 'beta_sample'
  and existing.title = b.title;

update public.books existing
set
  language = coalesce(existing.language, 'pt'),
  subjects = meta.subjects,
  updated_at = now()
from seed_beta_user s
join (
  values
    ('Um livro para respirar', array['Literatura', 'Leitura calma', 'SERENE']::text[]),
    ('A biblioteca interior', array['Biblioteca', 'Memoria', 'Organizacao']::text[]),
    ('Cadernos de marca-texto', array['Estudos', 'Anotacoes', 'Marca-texto']::text[]),
    ('Notas de uma leitura tranquila', array['Anotacoes', 'Reflexao', 'Leitura']::text[]),
    ('Memoria de leitura', array['Mente', 'Historico', 'Memoria']::text[])
) as meta(title, subjects)
  on true
where existing.user_id = s.user_id
  and existing.source = 'beta_sample'
  and existing.title = meta.title;

insert into public.shelves (
  user_id,
  name,
  description,
  created_at,
  updated_at
)
select
  s.user_id,
  sh.name,
  sh.description,
  now(),
  now()
from seed_beta_user s
cross join (
  values
    ('Filosofia', 'Ideias para reler devagar.'),
    ('Financas', 'Livros sobre escolhas, dinheiro e risco.'),
    ('Psicologia', 'Leituras sobre mente, habitos e comportamento.'),
    ('Literatura', 'Narrativas para respirar melhor.'),
    ('Livros para reler', 'Obras que merecem uma segunda passagem.'),
    ('Estudos', 'Livros que pedem caderno aberto.')
) as sh(name, description)
where not exists (
  select 1
  from public.shelves existing
  where existing.user_id = s.user_id
    and existing.deleted_at is null
    and lower(existing.name) = lower(sh.name)
);

insert into public.book_shelves (
  user_id,
  book_id,
  shelf_id,
  created_at
)
select
  s.user_id,
  b.id,
  sh.id,
  now()
from seed_beta_user s
join public.books b
  on b.user_id = s.user_id
 and b.source = 'beta_sample'
join public.shelves sh
  on sh.user_id = s.user_id
 and sh.deleted_at is null
join (
  values
    ('Um livro para respirar', 'Filosofia'),
    ('Um livro para respirar', 'Livros para reler'),
    ('A biblioteca interior', 'Literatura'),
    ('A biblioteca interior', 'Estudos'),
    ('Cadernos de marca-texto', 'Estudos'),
    ('Notas de uma leitura tranquila', 'Psicologia'),
    ('Memoria de leitura', 'Livros para reler'),
    ('Memoria de leitura', 'Literatura')
) as links(book_title, shelf_name)
  on links.book_title = b.title
 and links.shelf_name = sh.name
on conflict (user_id, book_id, shelf_id) do nothing;

update public.books b
set
  reading_origin = 'historico',
  read_before_serene = true,
  estimated_reading_seconds = 21600,
  estimated_reading_source = 'beta_sample',
  estimated_reading_confidence = 'media',
  show_in_mente = true,
  updated_at = now()
from seed_beta_user s
where b.user_id = s.user_id
  and b.source = 'beta_sample'
  and b.title = 'Memoria de leitura';

insert into public.automatic_mente_categories (
  user_id,
  name,
  description,
  confidence,
  source,
  created_at,
  updated_at
)
select
  s.user_id,
  c.name,
  c.description,
  c.confidence,
  'beta_sample',
  now(),
  now()
from seed_beta_user s
cross join (
  values
    ('Filosofia', 'Presenca, sentido e modo de viver.', 0.9::numeric),
    ('Psicologia', 'Padroes mentais, emocoes e autoconsciencia.', 0.88::numeric),
    ('Literatura', 'Narrativas, simbolos e memoria imaginativa.', 0.86::numeric),
    ('Estudos', 'Aprendizado, metodo e caderno aberto.', 0.84::numeric),
    ('Desenvolvimento pessoal', 'Habitos, identidade e crescimento sem pressa.', 0.82::numeric),
    ('Historia', 'Memoria, tempo e contexto de leitura.', 0.78::numeric)
) as c(name, description, confidence)
where not exists (
  select 1
  from public.automatic_mente_categories existing
  where existing.user_id = s.user_id
    and lower(existing.name) = lower(c.name)
);

insert into public.book_automatic_mente_categories (
  user_id,
  book_id,
  automatic_category_id,
  confidence,
  reason,
  created_at
)
select
  s.user_id,
  b.id,
  c.id,
  links.confidence,
  links.reason,
  now()
from seed_beta_user s
join public.books b
  on b.user_id = s.user_id
 and b.source = 'beta_sample'
join (
  values
    ('Um livro para respirar', 'Filosofia', 0.9::numeric, 'Leitura ligada a presenca, calma e modo de viver.'),
    ('Um livro para respirar', 'Psicologia', 0.78::numeric, 'Anotacoes apontam para ritmo mental e autocuidado.'),
    ('A biblioteca interior', 'Literatura', 0.92::numeric, 'Narrativa sobre memoria leitora e imaginacao.'),
    ('A biblioteca interior', 'Estudos', 0.82::numeric, 'Livro usado como base de observacao e caderno.'),
    ('Cadernos de marca-texto', 'Estudos', 0.91::numeric, 'Marca-textos e metodo de leitura aparecem como sinal forte.'),
    ('Cadernos de marca-texto', 'Desenvolvimento pessoal', 0.77::numeric, 'Progresso e pratica de leitura recorrente.'),
    ('Notas de uma leitura tranquila', 'Psicologia', 0.86::numeric, 'Notas sobre mente, habitos e conforto.'),
    ('Memoria de leitura', 'Literatura', 0.88::numeric, 'Livro historico que guarda narrativa pessoal.'),
    ('Memoria de leitura', 'Historia', 0.8::numeric, 'Registro antigo usado como memoria de percurso.')
) as links(book_title, category_name, confidence, reason)
  on links.book_title = b.title
join public.automatic_mente_categories c
  on c.user_id = s.user_id
 and lower(c.name) = lower(links.category_name)
where not exists (
  select 1
  from public.book_automatic_mente_categories existing
  where existing.book_id = b.id
    and existing.automatic_category_id = c.id
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
    ('reflection', 'Uma reflexao curta para sentir o fluxo de anotacoes.', 25, 'to_review'),
    ('highlight', 'Uma frase marcada porque parecia organizar a leitura por dentro.', 28, 'none'),
    ('post_it', 'Voltar a esta ideia quando a semana estiver barulhenta.', 31, 'none'),
    (
      'post_it',
      'Post-it longo para testar o recorte visual: esta nota deve parecer papel fisico, com texto limitado, reticencias e abertura suave quando o usuario quiser ler tudo com calma dentro da pilha.',
      32,
      'to_review'
    )
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
