import { getAllPending, markSynced, markConflicted } from './db.js';

const API_BASE = '/api';

// ─── In-memory sync lock to prevent concurrent sync runs ───
let isSyncing = false;
let syncListeners = [];

export const onSyncStatusChange = (cb) => {
  syncListeners.push(cb);
  return () => { syncListeners = syncListeners.filter(l => l !== cb); };
};

const notifyListeners = (status) => {
  syncListeners.forEach(cb => cb(status));
};

// ─── Helper: POST to API ───
const syncRecord = async (endpoint, data, accessToken) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(data),
  });

  const json = await response.json();

  if (response.status === 409) {
    // SYNC_CONFLICT: server data changed since offline write
    return { conflict: true, serverData: json.data || {}, status: 409 };
  }

  if (!response.ok) {
    // Auth error — queue is safe, just stop sync
    if (response.status === 401 || response.status === 403) {
      return { authError: true, status: response.status };
    }
    throw new Error(json.message || `HTTP ${response.status}`);
  }

  return { success: true, data: json.data };
};

// ─── Main Sync Function ───
export const runSync = async (getAccessToken) => {
  if (isSyncing) return;
  if (!navigator.onLine) return;

  const accessToken = getAccessToken ? getAccessToken() : localStorage.getItem('accessToken');
  if (!accessToken) return; // Not logged in — don't sync

  isSyncing = true;
  notifyListeners({ syncing: true, progress: 0 });

  try {
    const { farmers, form2a, form2b } = await getAllPending();
    const total = farmers.length + form2a.length + form2b.length;
    let done = 0;

    // ─── Sync Farmers (Form 1) ───
    for (const record of farmers) {
      try {
        const result = await syncRecord('/farmers', record, accessToken);

        if (result.authError) {
          notifyListeners({ syncing: false, authExpired: true, pending: total - done });
          return;
        }

        if (result.conflict) {
          await markConflicted('pending_farmers', record.id, result.serverData, record);
        } else {
          await markSynced('pending_farmers', record.id);
          done++;
        }
      } catch (err) {
        console.warn('Sync farmer failed:', err.message);
      }
      notifyListeners({ syncing: true, progress: Math.round((done / total) * 100) });
    }

    // ─── Sync Form 2a ───
    for (const record of form2a) {
      try {
        const result = await syncRecord('/form2/2a', record, accessToken);

        if (result.authError) {
          notifyListeners({ syncing: false, authExpired: true, pending: total - done });
          return;
        }

        if (result.conflict) {
          await markConflicted('pending_form2a', record.id, result.serverData, record);
        } else {
          await markSynced('pending_form2a', record.id);
          done++;
        }
      } catch (err) {
        console.warn('Sync form2a failed:', err.message);
      }
      notifyListeners({ syncing: true, progress: Math.round((done / total) * 100) });
    }

    // ─── Sync Form 2b Visits ───
    for (const record of form2b) {
      try {
        const result = await syncRecord('/form2/2b', record, accessToken);

        if (result.authError) {
          notifyListeners({ syncing: false, authExpired: true, pending: total - done });
          return;
        }

        if (result.conflict) {
          await markConflicted('pending_form2b', record.id, result.serverData, record);
        } else {
          await markSynced('pending_form2b', record.id);
          done++;
        }
      } catch (err) {
        console.warn('Sync form2b failed:', err.message);
      }
      notifyListeners({ syncing: true, progress: Math.round((done / total) * 100) });
    }

    notifyListeners({ syncing: false, done: true, synced: done, total });
  } catch (err) {
    console.error('Sync engine error:', err);
    notifyListeners({ syncing: false, error: err.message });
  } finally {
    isSyncing = false;
  }
};

// ─── Auto-sync on network reconnection ───
export const initSyncEngine = (getAccessToken) => {
  const handleOnline = () => {
    console.log('🌐 Network online — starting background sync...');
    setTimeout(() => runSync(getAccessToken), 1000);
  };

  window.addEventListener('online', handleOnline);

  // Initial sync if already online
  if (navigator.onLine) {
    setTimeout(() => runSync(getAccessToken), 2000);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
};
