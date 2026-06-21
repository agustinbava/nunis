// Seed mock data for demo purposes
// Run this once to populate the DB with sample data
import {
  createUser, getUserByEmail, createActivity, createMoodEntry,
  createJournalEntry, linkPatientToPsych,
} from './database';
import { hashPassword, deriveKey, generateKeyPair, encryptText } from './crypto';
import naclUtil from 'tweetnacl-util';

function genId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let r = '';
  for (let i = 0; i < 20; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function genShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = '';
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export async function seedMockData() {
  // Check if already seeded
  const existing = await getUserByEmail('agustinbava@nunis.com');
  if (existing) return; // Already seeded

  const password = '1234';

  // ── Create Agustín (patient) ──
  const agustinId = 'seed_agustin_001';
  const agustinHash = await hashPassword(password);
  const agustinKey = await deriveKey(password, agustinId);
  const agustinKP = generateKeyPair();
  const agustinPubKey = naclUtil.encodeBase64(agustinKP.publicKey);
  const agustinPrivKey = encryptText(naclUtil.encodeBase64(agustinKP.secretKey), agustinKey);

  await createUser(
    agustinId, 'agustinbava@nunis.com', agustinHash, 'Agustín Bava', 'patient',
    'AGU123', agustinPubKey, agustinPrivKey
  );

  // ── Create Marcela (psychologist) ──
  const marcelaId = 'seed_marcela_001';
  const marcelaHash = await hashPassword(password);
  const marcelaKey = await deriveKey(password, marcelaId);
  const marcelaKP = generateKeyPair();
  const marcelaPubKey = naclUtil.encodeBase64(marcelaKP.publicKey);
  const marcelaPrivKey = encryptText(naclUtil.encodeBase64(marcelaKP.secretKey), marcelaKey);

  await createUser(
    marcelaId, 'marcela@nunis.com', marcelaHash, 'Marcela López', 'psychologist',
    'MRC456', marcelaPubKey, marcelaPrivKey
  );

  // ── Link patient to psychologist ──
  await linkPatientToPsych(genId(), marcelaId, agustinId);

  // ── Create activities for Agustín ──
  const activities = [
    { id: 'act_correr', name: 'Correr', emoji: '🏃' },
    { id: 'act_trabajar', name: 'Trabajar', emoji: '💻' },
    { id: 'act_dormir', name: 'Dormir bien', emoji: '😴' },
    { id: 'act_amigos', name: 'Amigos', emoji: '🤝' },
    { id: 'act_meditar', name: 'Meditar', emoji: '🧘' },
    { id: 'act_leer', name: 'Leer', emoji: '📚' },
    { id: 'act_cocinar', name: 'Cocinar', emoji: '🍳' },
    { id: 'act_musica', name: 'Música', emoji: '🎵' },
  ];

  for (const act of activities) {
    await createActivity(act.id, agustinId, act.name, act.emoji, '#6C5CE7');
  }

  // ── Create 21 days of mood entries ──
  const moodData: { daysAgo: number; score: number; acts: string[]; note: string }[] = [
    { daysAgo: 0, score: 7, acts: ['act_trabajar', 'act_correr'], note: 'Buen día, productivo en el trabajo y salí a correr 5k.' },
    { daysAgo: 1, score: 8, acts: ['act_amigos', 'act_musica'], note: 'Salí con amigos a un recital. Muy buena energía.' },
    { daysAgo: 2, score: 5, acts: ['act_trabajar'], note: 'Día normal de trabajo, nada especial. Un poco cansado.' },
    { daysAgo: 3, score: 9, acts: ['act_correr', 'act_dormir', 'act_amigos'], note: 'Día increíble. Corrí 10k por primera vez, dormí genial la noche anterior.' },
    { daysAgo: 4, score: 4, acts: ['act_trabajar'], note: 'Discusión en el trabajo. Me costó concentrarme después.' },
    { daysAgo: 5, score: 6, acts: ['act_meditar', 'act_leer'], note: 'Medité 20 minutos a la mañana. Leí un rato antes de dormir.' },
    { daysAgo: 6, score: 3, acts: [], note: 'Mal día. Insomnio, ansiedad, no pude hacer nada productivo.' },
    { daysAgo: 7, score: 7, acts: ['act_cocinar', 'act_musica'], note: 'Cociné algo rico, escuché música tranquila. Recuperándome.' },
    { daysAgo: 8, score: 8, acts: ['act_correr', 'act_dormir'], note: 'Corrí temprano, dormí 8 horas. Me siento con mucha energía.' },
    { daysAgo: 9, score: 6, acts: ['act_trabajar', 'act_leer'], note: 'Trabajo normal. Leí un capítulo del libro que estoy leyendo.' },
    { daysAgo: 10, score: 7, acts: ['act_amigos', 'act_cocinar'], note: 'Cena con amigos en casa. Cociné pasta.' },
    { daysAgo: 11, score: 5, acts: ['act_trabajar'], note: 'Día pesado. Muchas reuniones.' },
    { daysAgo: 12, score: 8, acts: ['act_meditar', 'act_correr', 'act_dormir'], note: 'Rutina perfecta: meditar, correr, dormir bien. Me siento genial.' },
    { daysAgo: 13, score: 4, acts: ['act_trabajar'], note: 'Estrés por un deadline. No almorcé.' },
    { daysAgo: 14, score: 6, acts: ['act_leer', 'act_musica'], note: 'Fin de semana tranquilo. Leí y escuché vinilos.' },
    { daysAgo: 15, score: 7, acts: ['act_amigos'], note: 'Asado con amigos. Buen humor general.' },
    { daysAgo: 16, score: 9, acts: ['act_correr', 'act_amigos', 'act_dormir'], note: 'Corrí con un amigo. Mejor día de la semana.' },
    { daysAgo: 17, score: 5, acts: ['act_trabajar'], note: 'Lunes. Normal.' },
    { daysAgo: 18, score: 3, acts: [], note: 'Dormí mal, dolor de cabeza todo el día.' },
    { daysAgo: 19, score: 6, acts: ['act_meditar'], note: 'Medité para relajarme. Ayudó un poco.' },
    { daysAgo: 20, score: 7, acts: ['act_cocinar', 'act_dormir'], note: 'Buen descanso, cociné algo nuevo.' },
  ];

  for (const entry of moodData) {
    const encryptedNote = encryptText(entry.note, agustinKey);
    await createMoodEntry(
      genId(), agustinId, dateStr(entry.daysAgo), entry.score,
      encryptedNote, entry.acts
    );
  }

  // ── Create journal entries ──
  const journalData = [
    { daysAgo: 0, prompt: '¿Qué 3 cosas agradecés de hoy?', response: 'Agradezco mi salud, tener amigos que me bancan, y poder correr sin dolor.' },
    { daysAgo: 1, prompt: '¿Quién te hizo sentir bien hoy y por qué?', response: 'Mis amigos en el recital. La energía del grupo me levantó mucho el ánimo.' },
    { daysAgo: 3, prompt: '¿De qué te sentís orgulloso/a hoy?', response: 'Corrí 10k por primera vez. Vengo entrenando hace 2 meses y lo logré.' },
    { daysAgo: 4, prompt: '¿Qué situación te generó más estrés y cómo la manejaste?', response: 'La discusión con mi jefe. No la manejé bien, me callé en vez de expresar lo que pensaba.' },
    { daysAgo: 6, prompt: '¿Hay algo que te preocupa y no dijiste en voz alta hoy?', response: 'Me preocupa no estar avanzando lo suficiente en mi carrera. Siento que estoy estancado.' },
    { daysAgo: 8, prompt: '¿Cómo trataste a tu cuerpo hoy?', response: 'Muy bien. Corrí, comí sano, dormí 8 horas. Es la combinación ganadora.' },
    { daysAgo: 12, prompt: '¿Qué hábito positivo mantuviste hoy?', response: 'La rutina de meditar al despertar. Llevo 5 días seguidos.' },
    { daysAgo: 14, prompt: '¿Qué momento simple disfrutaste hoy?', response: 'Escuchar un vinilo de Pink Floyd con un café a la tarde. Silencio y paz.' },
  ];

  for (const j of journalData) {
    const encryptedResponse = encryptText(j.response, agustinKey);
    await createJournalEntry(genId(), agustinId, dateStr(j.daysAgo), j.prompt, encryptedResponse);
  }

  console.log('✅ Mock data seeded successfully');
  console.log('📧 Patient: agustinbava@nunis.com / 1234');
  console.log('📧 Psychologist: marcela@nunis.com / 1234');
}
