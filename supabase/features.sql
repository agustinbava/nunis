-- ============================================================================
-- Migración additiva: mensajería (psicólogo -> paciente) + directorio de
-- profesionales. Corré este archivo UNA vez en el SQL Editor de Supabase.
-- NO borra nada de lo existente.
-- ============================================================================

-- ── Mensajes (psicólogo -> paciente) ──
create table if not exists public.messages (
  id              text primary key,
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  body            text not null,
  created_at      timestamptz default now(),
  read_at         timestamptz
);
create index if not exists idx_messages_patient on public.messages(patient_id);
create index if not exists idx_messages_psych   on public.messages(psychologist_id);

alter table public.messages enable row level security;

drop policy if exists messages_patient_select on public.messages;
create policy messages_patient_select on public.messages
  for select using (patient_id = auth.uid());

drop policy if exists messages_patient_update on public.messages;
create policy messages_patient_update on public.messages
  for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());

drop policy if exists messages_psych_select on public.messages;
create policy messages_psych_select on public.messages
  for select using (psychologist_id = auth.uid());

-- El psicólogo solo puede enviar a pacientes vinculados (activos).
drop policy if exists messages_psych_insert on public.messages;
create policy messages_psych_insert on public.messages
  for insert with check (
    psychologist_id = auth.uid()
    and exists (
      select 1 from public.psych_patients pp
      where pp.psychologist_id = auth.uid()
        and pp.patient_id = messages.patient_id
        and pp.status = 'active'
    )
  );

-- ── Directorio de profesionales (perfiles públicos, no son cuentas) ──
create table if not exists public.professionals (
  id         text primary key,
  name       text not null,
  specialty  text not null,
  focus      text,
  bio        text,
  rating     numeric(2,1) default 5.0,
  reviews    integer default 0,
  price      text,
  modality   text,
  accepting  boolean default true,
  created_at timestamptz default now()
);

alter table public.professionals enable row level security;

-- Directorio público: cualquiera lo puede leer.
drop policy if exists professionals_read on public.professionals;
create policy professionals_read on public.professionals
  for select using (true);

-- Seed de profesionales (idempotente por id).
insert into public.professionals (id, name, specialty, focus, bio, rating, reviews, price, modality, accepting) values
  ('prof_valentina', 'Lic. Valentina Rossi', 'Terapia cognitivo-conductual',
   'Ansiedad, estrés y hábitos',
   'Psicóloga clínica con 8 años de experiencia acompañando a jóvenes adultos. Trabaja desde la TCC con foco en herramientas prácticas para el día a día.',
   4.9, 127, '$18.000 / sesión', 'Online y presencial (Palermo, CABA)', true),
  ('prof_matias', 'Lic. Matías Fernández', 'Mindfulness y bienestar',
   'Estrés laboral y burnout',
   'Especialista en mindfulness y regulación emocional. Combina meditación con intervenciones basadas en evidencia para reducir el estrés.',
   4.8, 94, '$16.000 / sesión', 'Online', true),
  ('prof_camila', 'Lic. Camila López', 'Psicología positiva',
   'Autoestima y proyectos de vida',
   'Acompaña procesos de autoconocimiento y crecimiento personal desde la psicología positiva y la terapia narrativa.',
   4.7, 76, '$17.000 / sesión', 'Online', true),
  ('prof_lucas', 'Lic. Lucas Medina', 'Terapia de pareja y vínculos',
   'Relaciones y comunicación',
   'Terapeuta sistémico con foco en vínculos y comunicación. Sesiones individuales y de pareja.',
   4.8, 58, '$19.000 / sesión', 'Presencial (Belgrano, CABA)', false),
  ('prof_sofia', 'Lic. Sofía Duarte', 'Trastornos del estado de ánimo',
   'Depresión y regulación emocional',
   'Psicóloga clínica especializada en estados de ánimo. Enfoque integrador con base cognitivo-conductual.',
   4.9, 143, '$20.000 / sesión', 'Online y presencial (Núñez, CABA)', true)
on conflict (id) do nothing;

-- Fin.
