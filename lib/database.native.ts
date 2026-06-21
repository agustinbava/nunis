// Native-specific database using expo-sqlite
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('nunis.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(db);
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'patient',
      theme_primary TEXT DEFAULT '#6C5CE7',
      theme_secondary TEXT DEFAULT '#a29bfe',
      theme_accent TEXT DEFAULT '#e4dfff',
      theme_bg TEXT DEFAULT '#F8F7FF',
      theme_card TEXT DEFAULT '#FFFFFF',
      theme_text TEXT DEFAULT '#1c1b1b',
      personality TEXT DEFAULT 'calm',
      share_code TEXT,
      public_key TEXT,
      encrypted_private_key TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '⭐',
      color TEXT DEFAULT '#6C5CE7',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS mood_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      score INTEGER NOT NULL CHECK(score >= 1 AND score <= 10),
      notes_encrypted TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS entry_activities (
      entry_id TEXT NOT NULL,
      activity_id TEXT NOT NULL,
      PRIMARY KEY (entry_id, activity_id),
      FOREIGN KEY (entry_id) REFERENCES mood_entries(id),
      FOREIGN KEY (activity_id) REFERENCES activities(id)
    );
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      prompt TEXT,
      response_encrypted TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS psych_patients (
      id TEXT PRIMARY KEY,
      psychologist_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      share_scores INTEGER DEFAULT 1,
      share_activities INTEGER DEFAULT 1,
      share_journal INTEGER DEFAULT 0,
      share_notes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (psychologist_id) REFERENCES users(id),
      FOREIGN KEY (patient_id) REFERENCES users(id),
      UNIQUE(psychologist_id, patient_id)
    );
  `);
}

export async function createUser(
  id: string, email: string, passwordHash: string, name: string, role: string,
  shareCode: string, publicKey: string, encryptedPrivateKey: string
) {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO users (id, email, password_hash, name, role, share_code, public_key, encrypted_private_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id, email, passwordHash, name, role, shareCode, publicKey, encryptedPrivateKey
  );
}

export async function getUserByEmail(email: string) {
  const database = await getDatabase();
  return database.getFirstAsync<any>('SELECT * FROM users WHERE email = ?', email);
}

export async function getUserById(id: string) {
  const database = await getDatabase();
  return database.getFirstAsync<any>('SELECT * FROM users WHERE id = ?', id);
}

export async function getUserByShareCode(code: string) {
  const database = await getDatabase();
  return database.getFirstAsync<any>('SELECT * FROM users WHERE share_code = ?', code);
}

export async function updateUserTheme(
  userId: string, primary: string, secondary: string, accent: string,
  bg: string, card: string, text: string, personality: string
) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE users SET theme_primary=?, theme_secondary=?, theme_accent=?,
     theme_bg=?, theme_card=?, theme_text=?, personality=? WHERE id=?`,
    primary, secondary, accent, bg, card, text, personality, userId
  );
}

export async function createActivity(id: string, userId: string, name: string, emoji: string, color: string) {
  const database = await getDatabase();
  await database.runAsync('INSERT INTO activities (id, user_id, name, emoji, color) VALUES (?, ?, ?, ?, ?)', id, userId, name, emoji, color);
}

export async function getActivities(userId: string) {
  const database = await getDatabase();
  return database.getAllAsync<any>('SELECT * FROM activities WHERE user_id = ? ORDER BY created_at', userId);
}

export async function deleteActivity(id: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM entry_activities WHERE activity_id = ?', id);
  await database.runAsync('DELETE FROM activities WHERE id = ?', id);
}

export async function createMoodEntry(
  id: string, userId: string, date: string, score: number,
  notesEncrypted: string | null, activityIds: string[]
) {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<any>('SELECT id FROM mood_entries WHERE user_id = ? AND date = ?', userId, date);
  if (existing) {
    await database.runAsync('DELETE FROM entry_activities WHERE entry_id = ?', existing.id);
    await database.runAsync('DELETE FROM mood_entries WHERE id = ?', existing.id);
  }
  await database.runAsync('INSERT INTO mood_entries (id, user_id, date, score, notes_encrypted) VALUES (?, ?, ?, ?, ?)', id, userId, date, score, notesEncrypted);
  for (const actId of activityIds) {
    await database.runAsync('INSERT INTO entry_activities (entry_id, activity_id) VALUES (?, ?)', id, actId);
  }
}

export async function getMoodEntries(userId: string, limit = 30) {
  const database = await getDatabase();
  return database.getAllAsync<any>('SELECT * FROM mood_entries WHERE user_id = ? ORDER BY date DESC LIMIT ?', userId, limit);
}

export async function getMoodEntryWithActivities(entryId: string) {
  const database = await getDatabase();
  const entry = await database.getFirstAsync<any>('SELECT * FROM mood_entries WHERE id = ?', entryId);
  if (!entry) return null;
  const activities = await database.getAllAsync<any>(
    'SELECT a.* FROM activities a JOIN entry_activities ea ON ea.activity_id = a.id WHERE ea.entry_id = ?', entryId
  );
  return { ...entry, activities };
}

export async function getEntryActivities(entryId: string) {
  const database = await getDatabase();
  return database.getAllAsync<any>('SELECT a.* FROM activities a JOIN entry_activities ea ON ea.activity_id = a.id WHERE ea.entry_id = ?', entryId);
}

export async function getAllMoodEntries(userId: string) {
  const database = await getDatabase();
  return database.getAllAsync<any>('SELECT * FROM mood_entries WHERE user_id = ? ORDER BY date DESC', userId);
}

export async function createJournalEntry(id: string, userId: string, date: string, prompt: string | null, responseEncrypted: string) {
  const database = await getDatabase();
  await database.runAsync('INSERT INTO journal_entries (id, user_id, date, prompt, response_encrypted) VALUES (?, ?, ?, ?, ?)', id, userId, date, prompt, responseEncrypted);
}

export async function getJournalEntries(userId: string, limit = 30) {
  const database = await getDatabase();
  return database.getAllAsync<any>('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', userId, limit);
}

export async function linkPatientToPsych(id: string, psychId: string, patientId: string) {
  const database = await getDatabase();
  await database.runAsync('INSERT OR REPLACE INTO psych_patients (id, psychologist_id, patient_id) VALUES (?, ?, ?)', id, psychId, patientId);
}

export async function getPsychPatients(psychId: string) {
  const database = await getDatabase();
  return database.getAllAsync<any>(
    `SELECT pp.*, u.name, u.email FROM psych_patients pp JOIN users u ON u.id = pp.patient_id WHERE pp.psychologist_id = ? AND pp.status = 'active'`, psychId
  );
}

export async function getPatientPsych(patientId: string) {
  const database = await getDatabase();
  return database.getFirstAsync<any>(
    `SELECT pp.*, u.name, u.email FROM psych_patients pp JOIN users u ON u.id = pp.psychologist_id WHERE pp.patient_id = ? AND pp.status = 'active'`, patientId
  );
}

export async function updateSharePermissions(psychPatientId: string, shareScores: number, shareActivities: number, shareJournal: number, shareNotes: number) {
  const database = await getDatabase();
  await database.runAsync('UPDATE psych_patients SET share_scores=?, share_activities=?, share_journal=?, share_notes=? WHERE id=?', shareScores, shareActivities, shareJournal, shareNotes, psychPatientId);
}

export async function unlinkPatient(psychPatientId: string) {
  const database = await getDatabase();
  await database.runAsync("UPDATE psych_patients SET status = 'revoked' WHERE id = ?", psychPatientId);
}

export async function getCorrelationData(userId: string) {
  const database = await getDatabase();
  return database.getAllAsync<any>(
    `SELECT a.id, a.name, a.emoji, a.color,
       COUNT(ea.entry_id) as times_used,
       AVG(me.score) as avg_mood_with,
       (SELECT AVG(score) FROM mood_entries WHERE user_id = ?) as avg_mood_overall
     FROM activities a
     LEFT JOIN entry_activities ea ON ea.activity_id = a.id
     LEFT JOIN mood_entries me ON me.id = ea.entry_id
     WHERE a.user_id = ?
     GROUP BY a.id
     HAVING times_used > 0
     ORDER BY avg_mood_with DESC`,
    userId, userId
  );
}
