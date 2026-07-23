-- ============================================================================
-- Migración additiva: notas de sesión del psicólogo (privadas por paciente).
-- Corré este archivo UNA vez en el SQL Editor de Supabase. No borra nada.
-- Solo el psicólogo dueño ve sus notas (el paciente NO las ve).
-- ============================================================================

create table if not exists public.session_notes (
  id              text primary key,
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  body            text not null,
  session_date    text not null,
  created_at      timestamptz default now()
);
create index if not exists idx_notes_patient on public.session_notes(patient_id);
create index if not exists idx_notes_psych   on public.session_notes(psychologist_id);

alter table public.session_notes enable row level security;

-- Solo el psicólogo dueño lee/escribe sus notas.
drop policy if exists notes_owner on public.session_notes;
create policy notes_owner on public.session_notes
  for all using (psychologist_id = auth.uid()) with check (psychologist_id = auth.uid());

-- Fin.
