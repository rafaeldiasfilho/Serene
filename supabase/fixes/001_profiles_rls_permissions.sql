-- SERENE fix 001: profiles permissions and RLS repair
--
-- Purpose:
-- Resolve "permission denied for table profiles" for authenticated users while
-- preserving owner-only profile access through RLS.

grant usage on schema public to anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

insert into public.profiles (
  id,
  name,
  email,
  avatar_url,
  theme_preference,
  reduced_motion_enabled,
  reading_close_behavior,
  pressure_free_mode_enabled,
  created_at,
  updated_at
)
select
  u.id,
  'Rafael Teste',
  u.email,
  null,
  'system',
  false,
  'minimize',
  true,
  now(),
  now()
from auth.users u
where lower(u.email) = lower('teste@serene.app')
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  theme_preference = excluded.theme_preference,
  reduced_motion_enabled = excluded.reduced_motion_enabled,
  reading_close_behavior = excluded.reading_close_behavior,
  pressure_free_mode_enabled = excluded.pressure_free_mode_enabled,
  updated_at = now();
