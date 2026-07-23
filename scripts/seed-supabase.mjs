// Seeder de datos de demo contra Supabase real (usa .env).
// Crea Marcela (psicóloga) + 6 pacientes conectados, con datos de todo julio.
// Idempotente: si un usuario ya existe, intenta signIn con el mismo password.
//
// Cripto replicada EXACTAMENTE de lib/crypto.web.ts para que el paciente pueda
// desencriptar sus notas/journal al loguearse en la app.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const URL_ = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = 'nunis1234';

// ── cripto (igual que la app) ──
function deriveKey(password, salt) {
  return new Uint8Array(createHash('sha256').update(password + ':' + salt).digest());
}
function encryptText(plaintext, key) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const enc = nacl.secretbox(naclUtil.decodeUTF8(plaintext), nonce, key);
  const full = new Uint8Array(nonce.length + enc.length);
  full.set(nonce); full.set(enc, nonce.length);
  return naclUtil.encodeBase64(full);
}
function genShareCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r = '';
  for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}
function genId(prefix = 'id') {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789'; let r = '';
  for (let i = 0; i < 16; i++) r += c[Math.floor(Math.random() * c.length)];
  return prefix + '_' + r;
}
const clamp = (n) => Math.max(1, Math.min(10, Math.round(n)));
const day = (d) => `2026-07-${String(d).padStart(2, '0')}`;
const pick = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

// cliente nuevo por usuario, sin persistencia
function freshClient() {
  return createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function ensureUser(name, role) {
  const email = name.email;
  const sb = freshClient();
  let { data, error } = await sb.auth.signUp({
    email, password: PASSWORD, options: { data: { name: name.name, role } },
  });
  if (error && /already registered/i.test(error.message)) {
    ({ data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD }));
    if (error) throw new Error(`${email}: existe pero no pude entrar (¿otro password?): ${error.message}`);
  } else if (error) {
    throw new Error(`${email}: signUp: ${error.message}`);
  }
  if (!data.session) throw new Error(`${email}: sin sesión (¿"Confirm email" activado?)`);
  const id = data.user.id;
  const key = deriveKey(PASSWORD, id);
  const kp = nacl.box.keyPair();
  await sb.from('profiles').upsert({
    id, email, name: name.name, role,
    share_code: genShareCode(),
    public_key: naclUtil.encodeBase64(kp.publicKey),
    encrypted_private_key: encryptText(naclUtil.encodeBase64(kp.secretKey), key),
  });
  return { sb, id, key, email, name: name.name };
}

const ACT_POOL = ['Correr', 'Trabajar', 'Dormir bien', 'Amigos', 'Meditar', 'Leer',
  'Cocinar', 'Música', 'Yoga', 'Familia', 'Naturaleza', 'Terapia'];

const NOTES = [
  'Día productivo, me sentí en control.',
  'Un poco cansado pero salí adelante.',
  'Ansiedad a la mañana, mejoró con la rutina.',
  'Buen descanso, se notó todo el día.',
  'Discusión que me dejó pensando.',
  'Me hizo bien moverme y despejarme.',
  'Día tranquilo, sin grandes sobresaltos.',
  'Me costó arrancar, mejoró a la tarde.',
];
const JOURNAL = [
  { prompt: '¿Qué 3 cosas agradecés hoy?', response: 'Mi salud, la gente que me banca, y poder frenar un rato.' },
  { prompt: '¿Qué te generó estrés y cómo lo manejaste?', response: 'El trabajo. Respiré, hice una lista y prioricé.' },
  { prompt: '¿De qué te sentís orgulloso/a?', response: 'De sostener la rutina aunque no tenía ganas.' },
  { prompt: '¿Qué momento simple disfrutaste?', response: 'Un café al sol sin apuro.' },
];

// perfiles de ánimo por paciente (trend sobre el mes)
const PATIENTS = [
  { email: 'agustin@nunis.com',   name: 'Agustín Bava',      trend: (i) => 5 + i * 0.12 + (Math.random() * 2 - 1), lastDay: 23 },
  { email: 'sofia@nunis.com',     name: 'Sofía Duarte',      trend: (i) => 8 + (Math.random() * 1.4 - 0.7),        lastDay: 23 },
  { email: 'mateo@nunis.com',     name: 'Mateo Ferreyra',    trend: (i) => 5.5 + Math.sin(i / 2) * 3 + (Math.random() * 1 - 0.5), lastDay: 23 },
  { email: 'valentina@nunis.com', name: 'Valentina Ríos',    trend: (i) => 8 - i * 0.18 + (Math.random() * 1.4 - 0.7), lastDay: 23 },
  { email: 'lucas@nunis.com',     name: 'Lucas Medina',      trend: (i) => (i >= 18 ? 2.5 : 6) + (Math.random() * 1.2 - 0.6), lastDay: 23 },
  { email: 'camila@nunis.com',    name: 'Camila Sosa',       trend: (i) => 6.5 + (Math.random() * 2 - 1),          lastDay: 19 }, // dejó de registrar
];

async function seedPatient(marcelaId, def) {
  const u = await ensureUser(def, 'patient');
  console.log(`  · ${def.name} (${u.id.slice(0, 8)})`);

  // actividades
  const acts = pick(ACT_POOL, 6).map((n) => ({ id: genId('act'), user_id: u.id, name: n, emoji: '', color: '#6C5CE7' }));
  await u.sb.from('activities').insert(acts);

  // mood entries de julio (1..lastDay), con actividades y notas encriptadas
  const moods = [], links = [];
  for (let d = 1; d <= def.lastDay; d++) {
    if (Math.random() < 0.12) continue; // algún día sin registro (realista)
    const score = clamp(def.trend(d - 1));
    const id = genId('mood');
    const note = Math.random() < 0.55 ? encryptText(NOTES[Math.floor(Math.random() * NOTES.length)], u.key) : null;
    moods.push({ id, user_id: u.id, date: day(d), score, notes_encrypted: note, emotions: '[]' });
    for (const a of pick(acts, 1 + Math.floor(Math.random() * 2))) links.push({ entry_id: id, activity_id: a.id });
  }
  await u.sb.from('mood_entries').insert(moods);
  if (links.length) await u.sb.from('entry_activities').insert(links);

  // journal encriptado
  const jrows = pick(JOURNAL, 3).map((j, k) => ({
    id: genId('jrn'), user_id: u.id, date: day(5 + k * 6), prompt: j.prompt,
    response_encrypted: encryptText(j.response, u.key),
  }));
  await u.sb.from('journal_entries').insert(jrows);

  // vínculo con Marcela (lo crea el paciente) — comparte scores + actividades
  await u.sb.from('psych_patients').upsert({
    id: genId('pp'), psychologist_id: marcelaId, patient_id: u.id,
    status: 'active', share_scores: true, share_activities: true, share_journal: false, share_notes: false,
  }, { onConflict: 'psychologist_id,patient_id' });

  return { id: u.id, name: def.name, email: def.email };
}

async function main() {
  console.log('Seeding Nunis demo →', URL_);
  console.log('Creando psicóloga Marcela…');
  const marcela = await ensureUser({ email: 'marcela@nunis.com', name: 'Marcela López' }, 'psychologist');
  console.log(`  · Marcela (${marcela.id.slice(0, 8)})`);

  console.log('Creando pacientes y cargando julio…');
  const patients = [];
  for (const def of PATIENTS) patients.push(await seedPatient(marcela.id, def));

  // tareas de Marcela a algunos pacientes (requiere sesión de Marcela)
  console.log('Creando tareas de Marcela…');
  const agustin = patients.find((p) => p.email === 'agustin@nunis.com');
  const lucas = patients.find((p) => p.email === 'lucas@nunis.com');
  const tasks = [
    { patient: agustin, desc: 'Registrá tu ánimo 2 veces al día esta semana', status: 'completed' },
    { patient: agustin, desc: 'Escribí en el journal sobre cómo te sentís en el trabajo', status: 'pending' },
    { patient: agustin, desc: 'Practicá 5 min de respiración antes de dormir', status: 'pending' },
    { patient: lucas, desc: 'Salí a caminar 20 min los días que puedas', status: 'pending' },
    { patient: lucas, desc: 'Anotá un momento bueno de cada día', status: 'pending' },
  ];
  for (const t of tasks) {
    if (!t.patient) continue;
    await marcela.sb.from('tasks').insert({
      id: genId('task'), psychologist_id: marcela.id, patient_id: t.patient.id,
      description: t.desc, due_date: null, status: t.status,
    });
  }

  console.log('\n✅ Seed completo.');
  console.log('   Psicóloga: marcela@nunis.com /', PASSWORD);
  console.log('   Pacientes:', patients.map((p) => p.email).join(', '));
  console.log('   Password de todos:', PASSWORD);
}

main().catch((e) => { console.error('\n❌ FALLÓ:', e.message); process.exit(1); });
