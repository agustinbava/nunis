-- ============================================================================
-- Migración additiva: foto de perfil (avatar) para todos los usuarios.
-- Corré este archivo UNA vez en el SQL Editor de Supabase. No borra nada.
-- Crea la columna avatar_url, el bucket de Storage 'avatars' (público) y las
-- policies para que cada usuario suba solo su propia foto.
-- ============================================================================

-- Columna en profiles
alter table public.profiles add column if not exists avatar_url text;

-- Bucket público de avatares
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policies sobre storage.objects para el bucket 'avatars'.
-- La ruta es "<user_id>/<archivo>", así cada uno solo toca su carpeta.
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fin.
