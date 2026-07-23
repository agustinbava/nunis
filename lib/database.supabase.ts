// Capa de datos contra Supabase (Postgres + RLS).
// Implementa la misma interfaz que database.web.ts / database.native.ts.
// Web y native comparten esta implementación (ambos re-exportan desde acá).
import { supabase } from './supabase';

function must<T>(data: T | null, error: any): T {
  if (error) throw new Error(error.message ?? String(error));
  return data as T;
}

// ── Users / profiles ──
// El row de profiles lo crea un trigger en el signUp. Acá completamos los
// campos E2E (claves, share_code, name, role) con un upsert.
export async function createUser(
  id: string, email: string, _passwordHash: string, name: string, role: string,
  shareCode: string, publicKey: string, encryptedPrivateKey: string
) {
  const { error } = await supabase.from('profiles').upsert({
    id, email, name, role,
    share_code: shareCode,
    public_key: publicKey,
    encrypted_private_key: encryptedPrivateKey,
  });
  if (error) throw new Error(error.message);
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getUserById(id: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Usa una función SECURITY DEFINER para no exponer toda la tabla profiles.
export async function getUserByShareCode(code: string) {
  const { data, error } = await supabase.rpc('lookup_by_share_code', { code });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

export async function updateUserTheme(
  userId: string, primary: string, secondary: string, accent: string,
  bg: string, card: string, text: string, personality: string
) {
  const { error } = await supabase.from('profiles').update({
    theme_primary: primary, theme_secondary: secondary, theme_accent: accent,
    theme_bg: bg, theme_card: card, theme_text: text, personality,
  }).eq('id', userId);
  if (error) throw new Error(error.message);
}

// ── Activities ──
export async function createActivity(id: string, userId: string, name: string, emoji: string, color: string) {
  const { error } = await supabase.from('activities').insert({ id, user_id: userId, name, emoji, color });
  if (error) throw new Error(error.message);
}

export async function getActivities(userId: string) {
  const { data, error } = await supabase.from('activities').select('*')
    .eq('user_id', userId).order('created_at', { ascending: true });
  return must(data, error);
}

export async function deleteActivity(id: string) {
  // entry_activities se borra por ON DELETE CASCADE
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Mood entries ──
export async function createMoodEntry(
  id: string, userId: string, date: string, score: number,
  notesEncrypted: string | null, activityIds: string[], emotions: string[] = []
) {
  // upsert por (user_id, date): reemplaza el registro del día
  const { data: existing } = await supabase.from('mood_entries').select('id')
    .eq('user_id', userId).eq('date', date).maybeSingle();
  if (existing?.id) {
    await supabase.from('mood_entries').delete().eq('id', existing.id); // cascade limpia entry_activities
  }
  const { error } = await supabase.from('mood_entries').insert({
    id, user_id: userId, date, score,
    notes_encrypted: notesEncrypted, emotions: JSON.stringify(emotions),
  });
  if (error) throw new Error(error.message);
  if (activityIds.length) {
    const rows = activityIds.map((activity_id) => ({ entry_id: id, activity_id }));
    const { error: e2 } = await supabase.from('entry_activities').insert(rows);
    if (e2) throw new Error(e2.message);
  }
}

export async function getMoodEntries(userId: string, limit = 30) {
  const { data, error } = await supabase.from('mood_entries').select('*')
    .eq('user_id', userId).order('date', { ascending: false }).limit(limit);
  return must(data, error);
}

export async function getMoodEntryWithActivities(entryId: string) {
  const { data: entry, error } = await supabase.from('mood_entries').select('*')
    .eq('id', entryId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!entry) return null;
  const activities = await getEntryActivities(entryId);
  return { ...entry, activities };
}

export async function getEntryActivities(entryId: string) {
  const { data, error } = await supabase.from('entry_activities')
    .select('activity_id, activities(*)').eq('entry_id', entryId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => r.activities).filter(Boolean);
}

export async function getAllMoodEntries(userId: string) {
  const { data, error } = await supabase.from('mood_entries').select('*')
    .eq('user_id', userId).order('date', { ascending: false });
  return must(data, error);
}

// ── Journal ──
export async function createJournalEntry(
  id: string, userId: string, date: string, prompt: string | null, responseEncrypted: string
) {
  const { error } = await supabase.from('journal_entries').insert({
    id, user_id: userId, date, prompt, response_encrypted: responseEncrypted,
  });
  if (error) throw new Error(error.message);
}

export async function getJournalEntries(userId: string, limit = 30) {
  const { data, error } = await supabase.from('journal_entries').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  return must(data, error);
}

// ── Psychologist <-> Patient ──
export async function linkPatientToPsych(id: string, psychId: string, patientId: string) {
  const { error } = await supabase.from('psych_patients').upsert(
    { id, psychologist_id: psychId, patient_id: patientId, status: 'active' },
    { onConflict: 'psychologist_id,patient_id' }
  );
  if (error) throw new Error(error.message);
}

export async function getPsychPatients(psychId: string) {
  const { data, error } = await supabase.from('psych_patients')
    .select('*, patient:profiles!patient_id(name, email)')
    .eq('psychologist_id', psychId).eq('status', 'active');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ ...r, name: r.patient?.name ?? '', email: r.patient?.email ?? '' }));
}

export async function getPatientPsych(patientId: string) {
  const { data, error } = await supabase.from('psych_patients')
    .select('*, psych:profiles!psychologist_id(name, email)')
    .eq('patient_id', patientId).eq('status', 'active').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, name: (data as any).psych?.name ?? '', email: (data as any).psych?.email ?? '' };
}

export async function updateSharePermissions(
  psychPatientId: string, shareScores: number, shareActivities: number,
  shareJournal: number, shareNotes: number
) {
  const { error } = await supabase.from('psych_patients').update({
    share_scores: !!shareScores, share_activities: !!shareActivities,
    share_journal: !!shareJournal, share_notes: !!shareNotes,
  }).eq('id', psychPatientId);
  if (error) throw new Error(error.message);
}

export async function unlinkPatient(psychPatientId: string) {
  const { error } = await supabase.from('psych_patients')
    .update({ status: 'revoked' }).eq('id', psychPatientId);
  if (error) throw new Error(error.message);
}

// ── Correlations (se computa en cliente para respetar RLS) ──
export async function getCorrelationData(userId: string) {
  const [{ data: activities }, { data: entries }] = await Promise.all([
    supabase.from('activities').select('*').eq('user_id', userId),
    supabase.from('mood_entries').select('id, score').eq('user_id', userId),
  ]);
  const acts = activities ?? [];
  const ents = entries ?? [];
  const entryIds = ents.map((e: any) => e.id);
  const { data: links } = entryIds.length
    ? await supabase.from('entry_activities').select('entry_id, activity_id').in('entry_id', entryIds)
    : { data: [] as any[] };

  const avgOverall = ents.length ? ents.reduce((s: number, e: any) => s + e.score, 0) / ents.length : 0;

  return acts.map((act: any) => {
    const matchedIds = (links ?? []).filter((l: any) => l.activity_id === act.id).map((l: any) => l.entry_id);
    const matched = ents.filter((e: any) => matchedIds.includes(e.id));
    const avgWith = matched.length ? matched.reduce((s: number, e: any) => s + e.score, 0) / matched.length : 0;
    return {
      id: act.id, name: act.name, emoji: act.emoji, color: act.color,
      times_used: matched.length, avg_mood_with: avgWith, avg_mood_overall: avgOverall,
    };
  }).filter((c) => c.times_used > 0).sort((a, b) => b.avg_mood_with - a.avg_mood_with);
}

// ── Tasks ──
export async function createTask(
  id: string, psychId: string, patientId: string, description: string, dueDate: string | null
) {
  const { error } = await supabase.from('tasks').insert({
    id, psychologist_id: psychId, patient_id: patientId, description, due_date: dueDate, status: 'pending',
  });
  if (error) throw new Error(error.message);
}

export async function getPatientTasks(patientId: string) {
  const { data, error } = await supabase.from('tasks').select('*')
    .eq('patient_id', patientId).order('created_at', { ascending: false });
  return must(data, error);
}

export async function getPsychTasks(psychId: string) {
  const { data, error } = await supabase.from('tasks').select('*')
    .eq('psychologist_id', psychId).order('created_at', { ascending: false });
  return must(data, error);
}

export async function completeTask(taskId: string) {
  const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId);
  if (error) throw new Error(error.message);
}

// ── Messages (psicólogo -> paciente, con broadcast) ──
export async function sendMessage(psychId: string, patientIds: string[], body: string) {
  const rows = patientIds.map((patient_id) => ({
    id: genMsgId(), psychologist_id: psychId, patient_id, body,
  }));
  if (!rows.length) return;
  const { error } = await supabase.from('messages').insert(rows);
  if (error) throw new Error(error.message);
}

export async function getPatientMessages(patientId: string) {
  const { data, error } = await supabase.from('messages')
    .select('*, psych:profiles!psychologist_id(name)')
    .eq('patient_id', patientId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((m: any) => ({ ...m, psych_name: m.psych?.name ?? 'Tu profesional' }));
}

export async function markMessageRead(messageId: string) {
  const { error } = await supabase.from('messages')
    .update({ read_at: new Date().toISOString() }).eq('id', messageId).is('read_at', null);
  if (error) throw new Error(error.message);
}

function genMsgId(): string {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let r = 'msg_';
  for (let i = 0; i < 16; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

// ── Directorio de profesionales ──
export async function getProfessionals() {
  const { data, error } = await supabase.from('professionals').select('*')
    .order('accepting', { ascending: false }).order('rating', { ascending: false });
  return must(data, error);
}

export async function getProfessional(id: string) {
  const { data, error } = await supabase.from('professionals').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
