// IndexedDB-backed "mesh-sim" store.
//
// Simulates the local cache a BLE-mesh node would hold. In BLE-mesh mode the
// UI reads from this store only (no Firestore). In wifi/cellular modes the
// ConnectivityProvider keeps a background Firestore->IDB sync running, so the
// store is already warm when the user toggles to BLE.

const DB_NAME = 'scr-mesh.mesh-sim';
const DB_VERSION = 1;
const STORE = 'alerts';

export interface MeshAlertRecord {
  id: string;
  incidentId: string;
  facilityId: string;
  recipientId: string | null;
  recipientRole?: string;
  message: string;
  messageTranslations?: Record<string, string>;
  createdAtMs: number;
  relayedAtMs: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('byRecipient', 'recipientId', { unique: false });
        store.createIndex('byRelayedAt', 'relayedAtMs', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putAlert(record: MeshAlertRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function listAlertsForRecipient(recipientId: string): Promise<MeshAlertRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const idx = tx.objectStore(STORE).index('byRecipient');
    const req = idx.getAll(IDBKeyRange.only(recipientId));
    req.onsuccess = () => {
      db.close();
      const rows = (req.result as MeshAlertRecord[]) ?? [];
      rows.sort((a, b) => b.relayedAtMs - a.relayedAtMs);
      resolve(rows);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function clearAllAlerts(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
