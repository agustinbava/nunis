// Smoke test end-to-end contra Supabase real (usa los valores de .env).
// Registra un usuario de prueba, completa el profile y lo lee de vuelta.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
console.log('URL:', url);
console.log('KEY:', key ? key.slice(0, 20) + '…' : '(vacía)');

const supabase = createClient(url, key, { auth: { persistSession: false } });

const email = `smoketest_${Date.now()}@nunis-test.com`;
const password = 'test1234';

async function main() {
  // 1. signUp
  const { data: signup, error: signupErr } = await supabase.auth.signUp({
    email, password, options: { data: { name: 'Smoke Test', role: 'patient' } },
  });
  if (signupErr) throw new Error('signUp: ' + signupErr.message);
  if (!signup.session) throw new Error('signUp no devolvió sesión → "Confirm email" sigue ACTIVADO');
  console.log('✓ signUp OK, sesión creada. user id:', signup.user.id);

  // 2. el trigger debería haber creado el profile
  const { data: prof0, error: e0 } = await supabase.from('profiles').select('*').eq('id', signup.user.id).maybeSingle();
  if (e0) throw new Error('select profile (trigger): ' + e0.message);
  if (!prof0) throw new Error('El trigger NO creó el profile');
  console.log('✓ trigger creó el profile:', prof0.email, '/', prof0.role);

  // 3. completar el profile (como hace el registro real) → prueba RLS UPDATE
  const { error: eUp } = await supabase.from('profiles').update({
    share_code: 'SMOKE1', public_key: 'pk_test', encrypted_private_key: 'epk_test', name: 'Smoke Test',
  }).eq('id', signup.user.id);
  if (eUp) throw new Error('update profile (RLS): ' + eUp.message);
  console.log('✓ update de profile OK (RLS insert/update funciona)');

  // 4. crear actividad + mood entry + link, usando IDs de TEXTO como la app real
  //    (esto es lo que fallaba con columnas uuid: error 22P02)
  const actId = 'act_test_' + Date.now();
  const moodId = 'mood_test_' + Date.now();
  const { error: eAct } = await supabase.from('activities').insert({
    id: actId, user_id: signup.user.id, name: 'trabajo', emoji: '', color: '#6C5CE7',
  });
  if (eAct) throw new Error('insert activity (id texto): ' + eAct.message);
  const { error: eMood } = await supabase.from('mood_entries').insert({
    id: moodId, user_id: signup.user.id, date: '2026-07-22', score: 7, notes_encrypted: 'blob', emotions: '[]',
  });
  if (eMood) throw new Error('insert mood_entry (id texto): ' + eMood.message);
  const { error: eLink } = await supabase.from('entry_activities').insert({ entry_id: moodId, activity_id: actId });
  if (eLink) throw new Error('insert entry_activities (id texto): ' + eLink.message);
  console.log('✓ actividad + registro + link con IDs de texto OK');

  // 5. lookup por share_code vía RPC
  const { data: rpc, error: eRpc } = await supabase.rpc('lookup_by_share_code', { code: 'SMOKE1' });
  if (eRpc) throw new Error('rpc lookup_by_share_code: ' + eRpc.message);
  console.log('✓ RPC lookup_by_share_code OK:', Array.isArray(rpc) ? rpc[0]?.name : rpc);

  console.log('\n✅ TODO OK. La migración funciona end-to-end.');
  console.log('   Usuario de prueba creado:', email, '(podés borrarlo en Auth → Users)');
}

main().catch((e) => { console.error('\n❌ FALLÓ:', e.message); process.exit(1); });
