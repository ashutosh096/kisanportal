import Dexie from 'dexie';

// ─── IndexedDB Schema via Dexie.js ───
// Stores offline pending records for Form 1 (farmers), Form 2a, and Form 2b
// Survives browser restarts and app crashes
const offlineDb = new Dexie('FarmerSurveyOfflineDB');

offlineDb.version(1).stores({
  // Pending farmer registrations (Form 1)
  pending_farmers: '++id, client_generated_id, status, created_at',

  // Pending Form 2a seasonal data
  pending_form2a: '++id, client_generated_id, farmer_id, status, created_at',

  // Pending Form 2b farm visits
  pending_form2b: '++id, client_generated_id, farmer_id, status, created_at',

  // Sync conflict queue — records server returned 409 for
  sync_conflicts: '++id, client_generated_id, type, created_at',
});

// ─── Storage Cap Constants ───
export const SOFT_WARN_LIMIT = 150;  // Yellow banner warning
export const HARD_CAP_LIMIT = 200;   // Block new entries

// ─── Get total pending count across all queues ───
export const getTotalPendingCount = async () => {
  const [f, f2a, f2b] = await Promise.all([
    offlineDb.pending_farmers.where('status').equals('pending_sync').count(),
    offlineDb.pending_form2a.where('status').equals('pending_sync').count(),
    offlineDb.pending_form2b.where('status').equals('pending_sync').count(),
  ]);
  return f + f2a + f2b;
};

// ─── Check if we can add more offline records ───
export const checkQueueCapacity = async () => {
  const total = await getTotalPendingCount();
  return {
    total,
    canAdd: total < HARD_CAP_LIMIT,
    nearLimit: total >= SOFT_WARN_LIMIT,
    atLimit: total >= HARD_CAP_LIMIT,
  };
};

// ─── Add offline farmer registration ───
export const addOfflineFarmer = async (farmerData) => {
  const cap = await checkQueueCapacity();
  if (!cap.canAdd) {
    throw new Error(`Offline queue full (${cap.total} records). Please sync to continue.`);
  }
  const client_generated_id = farmerData.client_generated_id || crypto.randomUUID();
  await offlineDb.pending_farmers.add({
    ...farmerData,
    client_generated_id,
    status: 'pending_sync',
    created_at: new Date().toISOString(),
  });
  return client_generated_id;
};

// ─── Add offline Form2a ───
export const addOfflineForm2a = async (data) => {
  const cap = await checkQueueCapacity();
  if (!cap.canAdd) {
    throw new Error(`Offline queue full (${cap.total} records). Please sync to continue.`);
  }
  const client_generated_id = data.client_generated_id || crypto.randomUUID();
  await offlineDb.pending_form2a.add({
    ...data,
    client_generated_id,
    status: 'pending_sync',
    created_at: new Date().toISOString(),
  });
  return client_generated_id;
};

// ─── Add offline Form2b visit ───
export const addOfflineForm2b = async (data) => {
  const cap = await checkQueueCapacity();
  if (!cap.canAdd) {
    throw new Error(`Offline queue full (${cap.total} records). Please sync to continue.`);
  }
  const client_generated_id = data.client_generated_id || crypto.randomUUID();
  await offlineDb.pending_form2b.add({
    ...data,
    client_generated_id,
    status: 'pending_sync',
    created_at: new Date().toISOString(),
  });
  return client_generated_id;
};

// ─── Get all pending records ───
export const getAllPending = async () => {
  const [farmers, form2a, form2b] = await Promise.all([
    offlineDb.pending_farmers.where('status').equals('pending_sync').toArray(),
    offlineDb.pending_form2a.where('status').equals('pending_sync').toArray(),
    offlineDb.pending_form2b.where('status').equals('pending_sync').toArray(),
  ]);
  return { farmers, form2a, form2b };
};

// ─── Mark a record as synced ───
export const markSynced = async (table, id) => {
  await offlineDb[table].update(id, { status: 'synced' });
};

// ─── Mark a record as conflicted (needs review) ───
export const markConflicted = async (table, id, serverData, clientData) => {
  await offlineDb[table].update(id, { status: 'conflict' });
  await offlineDb.sync_conflicts.add({
    table,
    record_id: id,
    client_generated_id: clientData.client_generated_id,
    server_data: serverData,
    client_data: clientData,
    type: table,
    created_at: new Date().toISOString(),
  });
};

// ─── Get all conflicts for review ───
export const getConflicts = async () => {
  return offlineDb.sync_conflicts.toArray();
};

// ─── Resolve conflict: accept server version ───
export const resolveConflictAcceptServer = async (conflictId) => {
  await offlineDb.sync_conflicts.delete(conflictId);
};

// ─── Resolve conflict: keep local version (force push) ───
export const resolveConflictKeepLocal = async (conflictId, conflict, accessToken) => {
  const { table, client_data } = conflict;
  const endpoint = table === 'pending_farmers' ? '/api/farmers'
    : table === 'pending_form2a' ? '/api/form2/2a'
    : '/api/form2/2b';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Force-Sync': 'true',
    },
    body: JSON.stringify({ ...client_data, force: true }),
  });

  if (response.ok) {
    await offlineDb.sync_conflicts.delete(conflictId);
  }
};

export default offlineDb;
