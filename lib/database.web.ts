// Web-specific database implementation using in-memory storage + localStorage
// No dependency on expo-sqlite (which requires OPFS/SharedArrayBuffer)
export {
  w_createUser as createUser,
  w_getUserByEmail as getUserByEmail,
  w_getUserById as getUserById,
  w_getUserByShareCode as getUserByShareCode,
  w_updateUserTheme as updateUserTheme,
  w_createActivity as createActivity,
  w_getActivities as getActivities,
  w_deleteActivity as deleteActivity,
  w_createMoodEntry as createMoodEntry,
  w_getMoodEntries as getMoodEntries,
  w_getEntryActivities as getEntryActivities,
  w_getAllMoodEntries as getAllMoodEntries,
  w_createJournalEntry as createJournalEntry,
  w_getJournalEntries as getJournalEntries,
  w_linkPatientToPsych as linkPatientToPsych,
  w_getPsychPatients as getPsychPatients,
  w_getPatientPsych as getPatientPsych,
  w_updateSharePermissions as updateSharePermissions,
  w_unlinkPatient as unlinkPatient,
  w_getCorrelationData as getCorrelationData,
} from './web-db';

// No-op for web — entry with activities just returns null
export async function getMoodEntryWithActivities(_entryId: string) {
  return null;
}
