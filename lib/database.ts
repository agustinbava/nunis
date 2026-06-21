// Type declarations for platform-specific database modules
// Metro resolves database.web.ts or database.native.ts automatically
// This file serves as TypeScript fallback for type checking
export { createUser, getUserByEmail, getUserById, getUserByShareCode, updateUserTheme,
  createActivity, getActivities, deleteActivity,
  createMoodEntry, getMoodEntries, getMoodEntryWithActivities, getEntryActivities, getAllMoodEntries,
  createJournalEntry, getJournalEntries,
  linkPatientToPsych, getPsychPatients, getPatientPsych, updateSharePermissions, unlinkPatient,
  getCorrelationData,
} from './database.web';
