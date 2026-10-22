import type { AnnotationSessionV2, ResearchContext } from './types';

const DATABASE_NAME = 'mood-rater-v2';
const STORE_NAME = 'sessions';
const PARTICIPATIONS_STORE = 'participations';
let databasePromise: Promise<IDBDatabase> | undefined;

function database(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB is unavailable. Export your annotation to keep a copy.')); return; }
    const request = indexedDB.open(DATABASE_NAME, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      // Preserve all v1 annotation drafts while adding cross-tab participation recovery.
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(PARTICIPATIONS_STORE)) db.createObjectStore(PARTICIPATIONS_STORE, { keyPath: 'studyToken' });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); databasePromise = undefined; };
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('Unable to open local annotation storage.'));
    request.onblocked = () => reject(new Error('Local storage upgrade is blocked. Close other Mood Rater tabs and retry.'));
  }).catch(error => { databasePromise = undefined; throw error; });
  return databasePromise;
}

export async function saveSession(session: AnnotationSessionV2): Promise<void> {
  // Snapshot immediately, before awaiting database startup or any other pending operation.
  const snapshot = structuredClone(session);
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const current = store.get(snapshot.id);
    current.onsuccess = () => {
      const existing = current.result as AnnotationSessionV2 | undefined;
      // A slow autosave from an earlier render must not replace a newer revision.
      if (!existing || existing.revision <= snapshot.revision) store.put(snapshot);
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save the annotation locally.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Local annotation save was interrupted.'));
  });
}

export async function loadSession(id: string): Promise<AnnotationSessionV2 | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to load the annotation.'));
  });
}

export async function loadSessions(): Promise<AnnotationSessionV2[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const sessions: AnnotationSessionV2[] = [];
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).index('updatedAt').openCursor(null, 'prev');
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { resolve(sessions); return; }
      sessions.push(cursor.value as AnnotationSessionV2); cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error('Unable to load local annotations.'));
  });
}

export async function deleteSession(id: string): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to delete the local annotation.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Local annotation deletion was interrupted.'));
  });
}

/** Keep the credential alongside local drafts so closing a tab does not orphan research work. */
export async function saveParticipation(studyToken: string, context: ResearchContext): Promise<void> {
  if (!studyToken || context.study.token !== studyToken || !context.participantId || !context.participationToken) {
    throw new Error('Participation credentials do not match this study.');
  }
  const snapshot = { studyToken, context: structuredClone(context) };
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PARTICIPATIONS_STORE, 'readwrite');
    transaction.objectStore(PARTICIPATIONS_STORE).put(snapshot);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save participation credentials on this device.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Saving participation credentials was interrupted.'));
  });
}

export async function loadParticipation(studyToken: string): Promise<ResearchContext | null> {
  if (!studyToken) return null;
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(PARTICIPATIONS_STORE, 'readonly').objectStore(PARTICIPATIONS_STORE).get(studyToken);
    request.onsuccess = () => {
      const context = request.result?.context as ResearchContext | undefined;
      if (!context || context.study?.token !== studyToken || !context.participantId || !context.participationToken) { resolve(null); return; }
      resolve(context);
    };
    request.onerror = () => reject(request.error ?? new Error('Unable to restore participation credentials.'));
  });
}
