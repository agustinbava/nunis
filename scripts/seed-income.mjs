// Seed idempotente de ingresos de demo para Marcela.
// Requiere haber corrido supabase/income.sql antes.
// Correr: node scripts/seed-income.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

function genId() { const c = 'abcdefghijklmnopqrstuvwxyz0123456789'; let r = 'inc_'; for (let i = 0; i < 16; i++) r += c[Math.floor(Math.random() * c.length)]; return r; }
function day(d) { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString().split('T')[0]; }

async function main() {
  const { data, error } = await sb.auth.signInWithPassword({ email: 'marcela@nunis.com', password: 'nunis1234' });
  if (error) throw new Error('signIn Marcela: ' + error.message);
  const psychId = data.user.id;

  const { count, error: cErr } = await sb.from('session_income').select('id', { count: 'exact', head: true }).eq('psychologist_id', psychId);
  if (cErr) throw new Error('¿Corriste income.sql? ' + cErr.message);
  if ((count ?? 0) > 0) { console.log('Ya hay ingresos cargados, no hago nada (idempotente).'); return; }

  const { data: links } = await sb.from('psych_patients').select('patient_id').eq('status', 'active');
  const patients = (links ?? []).map((l) => l.patient_id);

  const rows = [];
  patients.forEach((pid, i) => {
    // 3 sesiones del mes por paciente: 2 pagas + 1 pendiente (algunos)
    rows.push({ id: genId(), psychologist_id: psychId, patient_id: pid, amount: 18000, session_date: day(2 + i), status: 'paid' });
    rows.push({ id: genId(), psychologist_id: psychId, patient_id: pid, amount: 18000, session_date: day(9 + i), status: 'paid' });
    if (i % 2 === 0) rows.push({ id: genId(), psychologist_id: psychId, patient_id: pid, amount: 18000, session_date: day(1), status: 'pending' });
  });

  const { error: insErr } = await sb.from('session_income').insert(rows);
  if (insErr) throw new Error('insert: ' + insErr.message);
  console.log(`✅ ${rows.length} registros de ingresos cargados para ${patients.length} pacientes.`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
