-- ============================================================================
-- Migración additiva: registro simple de ingresos del psicólogo.
-- Corré este archivo UNA vez en el SQL Editor de Supabase. No borra nada.
-- Es un ledger privado del psicólogo (no facturación): cuánto cobró, quién
-- debe, total del mes.
-- ============================================================================

create table if not exists public.session_income (
  id              text primary key,
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  amount          numeric(12,2) not null default 0,
  session_date    text not null,
  status          text not null default 'pending' check (status in ('paid','pending')),
  note            text,
  created_at      timestamptz default now()
);
create index if not exists idx_income_psych on public.session_income(psychologist_id);

alter table public.session_income enable row level security;

-- Solo el psicólogo dueño ve y edita su ledger.
drop policy if exists income_owner on public.session_income;
create policy income_owner on public.session_income
  for all using (psychologist_id = auth.uid()) with check (psychologist_id = auth.uid());

-- Fin.
