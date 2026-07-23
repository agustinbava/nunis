-- ============================================================================
-- Migración additiva: agenda / turnos.
-- Corré este archivo UNA vez en el SQL Editor de Supabase. No borra nada.
-- El psicólogo publica slots disponibles; el paciente vinculado reserva/cancela.
-- ============================================================================

create table if not exists public.appointments (
  id              text primary key,
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  patient_id      uuid references public.profiles(id) on delete set null,
  slot_date       text not null,   -- YYYY-MM-DD
  slot_time       text not null,   -- HH:MM
  status          text not null default 'available' check (status in ('available','booked')),
  created_at      timestamptz default now()
);
create index if not exists idx_appt_psych   on public.appointments(psychologist_id);
create index if not exists idx_appt_patient on public.appointments(patient_id);

alter table public.appointments enable row level security;

-- ¿El usuario actual (paciente) está vinculado a ese psicólogo?
-- (reutilizamos el patrón inline para no depender de otra función)

-- SELECT: el psicólogo ve los suyos; el paciente ve los disponibles de SU
-- psicólogo + los que reservó.
drop policy if exists appt_select on public.appointments;
create policy appt_select on public.appointments
  for select using (
    psychologist_id = auth.uid()
    or patient_id = auth.uid()
    or (
      status = 'available'
      and exists (
        select 1 from public.psych_patients pp
        where pp.patient_id = auth.uid()
          and pp.psychologist_id = appointments.psychologist_id
          and pp.status = 'active'
      )
    )
  );

-- INSERT: solo el psicólogo crea sus slots.
drop policy if exists appt_insert on public.appointments;
create policy appt_insert on public.appointments
  for insert with check (psychologist_id = auth.uid());

-- UPDATE: el psicólogo edita los suyos; el paciente puede reservar un slot
-- disponible de su psicólogo, o cancelar/tocar el suyo.
drop policy if exists appt_update on public.appointments;
create policy appt_update on public.appointments
  for update using (
    psychologist_id = auth.uid()
    or patient_id = auth.uid()
    or (
      status = 'available'
      and exists (
        select 1 from public.psych_patients pp
        where pp.patient_id = auth.uid()
          and pp.psychologist_id = appointments.psychologist_id
          and pp.status = 'active'
      )
    )
  ) with check (
    psychologist_id = auth.uid()
    or patient_id = auth.uid()
    or (
      status = 'available'
      and exists (
        select 1 from public.psych_patients pp
        where pp.patient_id = auth.uid()
          and pp.psychologist_id = appointments.psychologist_id
          and pp.status = 'active'
      )
    )
  );

-- DELETE: solo el psicólogo borra sus slots.
drop policy if exists appt_delete on public.appointments;
create policy appt_delete on public.appointments
  for delete using (psychologist_id = auth.uid());

-- Fin.
