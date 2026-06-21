// Simple in-memory database for web fallback when expo-sqlite isn't available
// Persists to localStorage for session continuity

type Row = { [key: string]: any };

class Table {
  rows: Row[] = [];

  insert(row: Row) {
    this.rows.push({ ...row });
  }

  findAll(predicate?: (r: Row) => boolean): Row[] {
    const results = predicate ? this.rows.filter(predicate) : this.rows;
    return results.map((r) => ({ ...r }));
  }

  findFirst(predicate: (r: Row) => boolean): Row | null {
    const found = this.rows.find(predicate);
    return found ? { ...found } : null;
  }

  update(predicate: (r: Row) => boolean, updates: Partial<Row>) {
    for (const row of this.rows) {
      if (predicate(row)) {
        Object.assign(row, updates);
      }
    }
  }

  delete(predicate: (r: Row) => boolean) {
    this.rows = this.rows.filter((r) => !predicate(r));
  }
}

class WebDatabase {
  private tables: { [name: string]: Table } = {};
  private storageKey = 'nunis_webdb';

  constructor() {
    this.tables = {
      users: new Table(),
      activities: new Table(),
      mood_entries: new Table(),
      entry_activities: new Table(),
      journal_entries: new Table(),
      psych_patients: new Table(),
    };
    this.load();
  }

  private load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        for (const [name, rows] of Object.entries(parsed)) {
          if (this.tables[name]) {
            this.tables[name].rows = rows as Row[];
          }
        }
      }
    } catch {}
  }

  save() {
    try {
      const data: { [key: string]: Row[] } = {};
      for (const [name, table] of Object.entries(this.tables)) {
        data[name] = table.rows;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {}
  }

  table(name: string): Table {
    if (!this.tables[name]) {
      this.tables[name] = new Table();
    }
    return this.tables[name];
  }
}

let webDb: WebDatabase | null = null;

export function getWebDb(): WebDatabase {
  if (!webDb) {
    webDb = new WebDatabase();
  }
  return webDb;
}

// ── User CRUD ──

export async function w_createUser(
  id: string, email: string, passwordHash: string, name: string, role: string,
  shareCode: string, publicKey: string, encryptedPrivateKey: string
) {
  const db = getWebDb();
  db.table('users').insert({
    id, email, password_hash: passwordHash, name, role,
    theme_primary: '#6C5CE7', theme_secondary: '#a29bfe', theme_accent: '#e4dfff',
    theme_bg: '#F8F7FF', theme_card: '#FFFFFF', theme_text: '#1c1b1b',
    personality: 'calm', share_code: shareCode, public_key: publicKey,
    encrypted_private_key: encryptedPrivateKey, created_at: new Date().toISOString(),
  });
  db.save();
}

export async function w_getUserByEmail(email: string) {
  const db = getWebDb();
  return db.table('users').findFirst((r) => r.email === email);
}

export async function w_getUserById(id: string) {
  const db = getWebDb();
  return db.table('users').findFirst((r) => r.id === id);
}

export async function w_getUserByShareCode(code: string) {
  const db = getWebDb();
  return db.table('users').findFirst((r) => r.share_code === code);
}

export async function w_updateUserTheme(
  userId: string, primary: string, secondary: string, accent: string,
  bg: string, card: string, text: string, personality: string
) {
  const db = getWebDb();
  db.table('users').update((r) => r.id === userId, {
    theme_primary: primary, theme_secondary: secondary, theme_accent: accent,
    theme_bg: bg, theme_card: card, theme_text: text, personality,
  });
  db.save();
}

// ── Activities CRUD ──

export async function w_createActivity(id: string, userId: string, name: string, emoji: string, color: string) {
  const db = getWebDb();
  db.table('activities').insert({ id, user_id: userId, name, emoji, color, created_at: new Date().toISOString() });
  db.save();
}

export async function w_getActivities(userId: string) {
  const db = getWebDb();
  return db.table('activities').findAll((r) => r.user_id === userId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function w_deleteActivity(id: string) {
  const db = getWebDb();
  db.table('entry_activities').delete((r) => r.activity_id === id);
  db.table('activities').delete((r) => r.id === id);
  db.save();
}

// ── Mood Entries CRUD ──

export async function w_createMoodEntry(
  id: string, userId: string, date: string, score: number,
  notesEncrypted: string | null, activityIds: string[]
) {
  const db = getWebDb();
  // Remove existing entry for this date
  const existing = db.table('mood_entries').findFirst((r) => r.user_id === userId && r.date === date);
  if (existing) {
    db.table('entry_activities').delete((r) => r.entry_id === existing.id);
    db.table('mood_entries').delete((r) => r.id === existing.id);
  }
  db.table('mood_entries').insert({
    id, user_id: userId, date, score, notes_encrypted: notesEncrypted,
    created_at: new Date().toISOString(),
  });
  for (const actId of activityIds) {
    db.table('entry_activities').insert({ entry_id: id, activity_id: actId });
  }
  db.save();
}

export async function w_getMoodEntries(userId: string, limit = 30) {
  const db = getWebDb();
  return db.table('mood_entries').findAll((r) => r.user_id === userId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export async function w_getEntryActivities(entryId: string) {
  const db = getWebDb();
  const links = db.table('entry_activities').findAll((r) => r.entry_id === entryId);
  const actIds = links.map((l) => l.activity_id);
  return db.table('activities').findAll((r) => actIds.includes(r.id));
}

export async function w_getAllMoodEntries(userId: string) {
  const db = getWebDb();
  return db.table('mood_entries').findAll((r) => r.user_id === userId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ── Journal CRUD ──

export async function w_createJournalEntry(
  id: string, userId: string, date: string, prompt: string | null, responseEncrypted: string
) {
  const db = getWebDb();
  db.table('journal_entries').insert({
    id, user_id: userId, date, prompt, response_encrypted: responseEncrypted,
    created_at: new Date().toISOString(),
  });
  db.save();
}

export async function w_getJournalEntries(userId: string, limit = 30) {
  const db = getWebDb();
  return db.table('journal_entries').findAll((r) => r.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

// ── Psychologist-Patient ──

export async function w_linkPatientToPsych(id: string, psychId: string, patientId: string) {
  const db = getWebDb();
  // Remove existing link
  db.table('psych_patients').delete(
    (r) => r.psychologist_id === psychId && r.patient_id === patientId
  );
  db.table('psych_patients').insert({
    id, psychologist_id: psychId, patient_id: patientId,
    status: 'active', share_scores: 1, share_activities: 1,
    share_journal: 0, share_notes: 0, created_at: new Date().toISOString(),
  });
  db.save();
}

export async function w_getPsychPatients(psychId: string): Promise<Row[]> {
  const db = getWebDb();
  const links = db.table('psych_patients').findAll(
    (r) => r.psychologist_id === psychId && r.status === 'active'
  );
  return links.map((link) => {
    const user = db.table('users').findFirst((r) => r.id === link.patient_id);
    return { ...link, name: user?.name || '', email: user?.email || '' };
  });
}

export async function w_getPatientPsych(patientId: string): Promise<Row | null> {
  const db = getWebDb();
  const link = db.table('psych_patients').findFirst(
    (r) => r.patient_id === patientId && r.status === 'active'
  );
  if (!link) return null;
  const user = db.table('users').findFirst((r) => r.id === link.psychologist_id);
  return { ...link, name: user?.name || '', email: user?.email || '' };
}

export async function w_updateSharePermissions(
  psychPatientId: string, shareScores: number, shareActivities: number,
  shareJournal: number, shareNotes: number
) {
  const db = getWebDb();
  db.table('psych_patients').update((r) => r.id === psychPatientId, {
    share_scores: shareScores, share_activities: shareActivities,
    share_journal: shareJournal, share_notes: shareNotes,
  });
  db.save();
}

export async function w_unlinkPatient(psychPatientId: string) {
  const db = getWebDb();
  db.table('psych_patients').update((r) => r.id === psychPatientId, { status: 'revoked' });
  db.save();
}

// ── Correlations ──

export async function w_getCorrelationData(userId: string) {
  const db = getWebDb();
  const activities = db.table('activities').findAll((r) => r.user_id === userId);
  const entries = db.table('mood_entries').findAll((r) => r.user_id === userId);
  const links = db.table('entry_activities').findAll();

  const avgOverall = entries.length > 0
    ? entries.reduce((s, e) => s + e.score, 0) / entries.length
    : 0;

  return activities.map((act) => {
    const entryIds = links.filter((l) => l.activity_id === act.id).map((l) => l.entry_id);
    const matchedEntries = entries.filter((e) => entryIds.includes(e.id));
    const avgWith = matchedEntries.length > 0
      ? matchedEntries.reduce((s, e) => s + e.score, 0) / matchedEntries.length
      : 0;
    return {
      id: act.id, name: act.name, emoji: act.emoji, color: act.color,
      times_used: matchedEntries.length, avg_mood_with: avgWith, avg_mood_overall: avgOverall,
    };
  }).filter((c) => c.times_used > 0).sort((a, b) => b.avg_mood_with - a.avg_mood_with);
}
