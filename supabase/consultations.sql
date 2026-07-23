-- ============================================================================
-- Migración additiva: micro-consultas asincrónicas (paciente -> psicólogo).
-- Corré este archivo UNA vez en el SQL Editor de Supabase. No borra nada.
-- El paciente hace una consulta puntual (con un precio), el psicólogo responde.
-- ============================================================================

create table if not exists public.consultations (
  id              text primary key,
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  question        text not null,
  answer          text,
  price           numeric(12,2) not null default 0,
  status          text not null default 'pending' check (status in ('pending','answered')),
  created_at      timestamptz default now(),
  answered_at     timestamptz
);
create index if not exists idx_consult_psych   on public.consultations(psychologist_id);
create index if not exists idx_consult_patient on public.consultations(patient_id);

alter table public.consultations enable row level security;

-- Ambos ven las suyas.
drop policy if exists consult_select on public.consultations;
create policy consult_select on public.consultations
  for select using (psychologist_id = auth.uid() or patient_id = auth.uid());

-- El paciente crea la consulta, solo hacia su psicólogo vinculado.
drop policy if exists consult_insert on public.consultations;
create policy consult_insert on public.consultations
  for insert with check (
    patient_id = auth.uid()
    and exists (
      select 1 from public.psych_patients pp
      where pp.patient_id = auth.uid()
        and pp.psychologist_id = consultations.psychologist_id
        and pp.status = 'active'
    )
  );

-- Solo el psicólogo responde (update).
drop policy if exists consult_update on public.consultations;
create policy consult_update on public.consultations
  for update using (psychologist_id = auth.uid()) with check (psychologist_id = auth.uid());

-- Fin.
