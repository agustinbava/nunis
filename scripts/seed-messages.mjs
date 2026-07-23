// Seed idempotente de mensajes de demo: Marcela manda un mensaje de bienvenida
// a Agustín y una recomendación de libro (broadcast) a todos sus pacientes.
// Requiere haber corrido supabase/features.sql antes.
// Correr: node scripts/seed-messages.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

function genId() {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789'; let r = 'msg_';
  for (let i = 0; i < 16; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

async function main() {
  const { error: authErr, data } = await sb.auth.signInWithPassword({ email: 'marcela@nunis.com', password: 'nunis1234' });
  if (authErr) throw new Error('No pude entrar como Marcela: ' + authErr.message);
  const psychId = data.user.id;

  const { error: existErr, count } = await sb.from('messages').select('id', { count: 'exact', head: true }).eq('psychologist_id', psychId);
  if (existErr) throw new Error('¿Corriste features.sql? ' + existErr.message);
  if ((count ?? 0) > 0) {
    console.log('Ya hay mensajes de Marcela, no hago nada (idempotente).');
    return;
  }

  const { data: links } = await sb.from('psych_patients')
    .select('patient_id, patient:profiles!patient_id(name)').eq('status', 'active');
  const patients = links ?? [];
  const agustin = patients.find((p) => (p.patient?.name || '').includes('Agustín'));

  const rows = [];
  if (agustin) {
    rows.push({ id: genId(), psychologist_id: psychId, patient_id: agustin.patient_id,
      body: 'Hola Agustín, vi que venías con una buena semana. Seguí registrando tu ánimo a diario, nos va a servir un montón para la próxima sesión.' });
  }
  // Broadcast: recomendación de libro a todos
  const book = 'Les recomiendo el libro "El poder del ahora" de Eckhart Tolle. Un capítulo por semana y lo charlamos en sesión.';
  for (const p of patients) {
    rows.push({ id: genId(), psychologist_id: psychId, patient_id: p.patient_id, body: book });
  }

  const { error: insErr } = await sb.from('messages').insert(rows);
  if (insErr) throw new Error('insert messages: ' + insErr.message);
  console.log(`✅ ${rows.length} mensajes enviados a ${patients.length} pacientes.`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
