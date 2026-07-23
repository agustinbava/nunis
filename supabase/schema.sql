-- ============================================================================
-- Nunis — Schema Postgres + Row Level Security para Supabase
-- Pegá TODO este archivo en el SQL Editor de Supabase y ejecutalo.
-- Empieza con un RESET destructivo de las tablas public (seguro en el prototipo,
-- NO borra usuarios de auth.users). Volvé a correrlo cuando quieras dejar la
-- base en estado limpio.
--
-- IDs: las tablas cuyas filas crea la app usan id TEXT (la app genera ids de
-- texto propios). profiles.id y los *_id que apuntan a usuarios son UUID porque
-- vienen de Supabase Auth (auth.users.id).
-- ============================================================================

-- ── RESET (prototipo) ──
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.psych_can_read(uuid, text) cascade;
drop function if exists public.lookup_by_share_code(text) cascade;
drop table if exists public.tasks           cascade;
drop table if exists public.entry_activities cascade;
drop table if exists public.journal_entries cascade;
drop table if exists public.mood_entries    cascade;
drop table if exists public.activities      cascade;
drop table if exists public.psych_patients  cascade;
drop table if exists public.profiles        cascade;

-- ── Extensiones ──
create extension if not exists "pgcrypto";

-- ============================================================================
-- TABLAS
-- ============================================================================

-- profiles: 1:1 con auth.users (mismo id UUID). Datos de negocio + claves E2E.
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  name                  text not null,
  role                  text not null default 'patient' check (role in ('patient','psychologist')),
  theme_primary         text default '#6C5CE7',
  theme_secondary       text default '#a29bfe',
  theme_accent          text default '#e4dfff',
  theme_bg              text default '#F8F7FF',
  theme_card            text default '#FFFFFF',
  theme_text            text default '#1c1b1b',
  personality           text default 'calm',
  share_code            text unique,
  public_key            text,
  encrypted_private_key text,
  created_at            timestamptz default now()
);

create table public.activities (
  id         text primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  emoji      text default '',
  color      text default '#6C5CE7',
  created_at timestamptz default now()
);

create table public.mood_entries (
  id              text primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  date            text not null,
  score           integer not null check (score >= 1 and score <= 10),
  notes_encrypted text,
  emotions        text,
  created_at      timestamptz default now(),
  unique (user_id, date)
);

create table public.entry_activities (
  entry_id    text not null references public.mood_entries(id) on delete cascade,
  activity_id text not null references public.activities(id) on delete cascade,
  primary key (entry_id, activity_id)
);

create table public.journal_entries (
  id                 text primary key,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  date               text not null,
  prompt             text,
  response_encrypted text not null,
  created_at         timestamptz default now()
);

create table public.psych_patients (
  id               text primary key,
  psychologist_id  uuid not null references public.profiles(id) on delete cascade,
  patient_id       uuid not null references public.profiles(id) on delete cascade,
  status           text default 'active',
  share_scores     boolean default true,
  share_activities boolean default true,
  share_journal    boolean default false,
  share_notes      boolean default false,
  created_at       timestamptz default now(),
  unique (psychologist_id, patient_id)
);

create table public.tasks (
  id              text primary key,
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  description     text not null,
  due_date        text,
  status          text not null default 'pending',
  created_at      timestamptz default now()
);

create index if not exists idx_activities_user on public.activities(user_id);
create index if not exists idx_mood_user       on public.mood_entries(user_id);
create index if not exists idx_journal_user    on public.journal_entries(user_id);
create index if not exists idx_pp_psych        on public.psych_patients(psychologist_id);
create index if not exists idx_pp_patient      on public.psych_patients(patient_id);
create index if not exists idx_tasks_patient   on public.tasks(patient_id);
create index if not exists idx_tasks_psych     on public.tasks(psychologist_id);

-- ============================================================================
-- HELPERS
-- ============================================================================

-- ¿Existe un vínculo activo psicólogo->paciente entre auth.uid() y el user dado,
-- que además comparta el "scope" pedido? (scores/activities/journal/notes)
create or replace function public.psych_can_read(target_user uuid, scope text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.psych_patients pp
    where pp.psychologist_id = auth.uid()
      and pp.patient_id = target_user
      and pp.status = 'active'
      and case scope
            when 'scores'     then pp.share_scores
            when 'activities' then pp.share_activities
            when 'journal'    then pp.share_journal
            when 'notes'      then pp.share_notes
            else false
          end
  );
$$;

-- Lookup por share_code sin exponer toda la tabla profiles vía RLS.
create or replace function public.lookup_by_share_code(code text)
returns table (id uuid, name text, role text, public_key text)
language sql
security definer
set search_path = public
as $$
  select id, name, role, public_key
  from public.profiles
  where share_code = code
  limit 1;
$$;

-- Al crear un usuario en auth.users, crea el profile mínimo automáticamente.
-- Los campos E2E (public_key, encrypted_private_key, share_code) los completa
-- el cliente con un UPDATE tras el signUp (necesitan el password del usuario).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'patient')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles        enable row level security;
alter table public.activities      enable row level security;
alter table public.mood_entries    enable row level security;
alter table public.entry_activities enable row level security;
alter table public.journal_entries enable row level security;
alter table public.psych_patients  enable row level security;
alter table public.tasks           enable row level security;

-- ── profiles ──
create policy profiles_select_own on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.psych_patients pp
      where pp.status = 'active'
        and ( (pp.psychologist_id = auth.uid() and pp.patient_id = profiles.id)
           or (pp.patient_id = auth.uid() and pp.psychologist_id = profiles.id) )
    )
  );

create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ── activities ──
create policy activities_owner on public.activities
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy activities_psych_read on public.activities
  for select using (public.psych_can_read(user_id, 'activities'));

-- ── mood_entries ──
create policy mood_owner on public.mood_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy mood_psych_read on public.mood_entries
  for select using (public.psych_can_read(user_id, 'scores'));

-- ── entry_activities ── (hereda del dueño del entry)
create policy ea_owner on public.entry_activities
  for all using (
    exists (select 1 from public.mood_entries me
            where me.id = entry_activities.entry_id and me.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.mood_entries me
            where me.id = entry_activities.entry_id and me.user_id = auth.uid())
  );

create policy ea_psych_read on public.entry_activities
  for select using (
    exists (select 1 from public.mood_entries me
            where me.id = entry_activities.entry_id
              and public.psych_can_read(me.user_id, 'activities'))
  );

-- ── journal_entries ──
create policy journal_owner on public.journal_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy journal_psych_read on public.journal_entries
  for select using (public.psych_can_read(user_id, 'journal'));

-- ── psych_patients ──
create policy pp_select on public.psych_patients
  for select using (psychologist_id = auth.uid() or patient_id = auth.uid());

create policy pp_insert on public.psych_patients
  for insert with check (psychologist_id = auth.uid() or patient_id = auth.uid());

create policy pp_update on public.psych_patients
  for update using (psychologist_id = auth.uid() or patient_id = auth.uid())
  with check (psychologist_id = auth.uid() or patient_id = auth.uid());

-- ── tasks ──
create policy tasks_psych on public.tasks
  for all using (psychologist_id = auth.uid()) with check (psychologist_id = auth.uid());

create policy tasks_patient_read on public.tasks
  for select using (patient_id = auth.uid());

create policy tasks_patient_update on public.tasks
  for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());

-- Fin.
