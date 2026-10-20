import {
  Bible,
  BibleReading,
  BibleReflection,
  Devotional,
  DevotionalReading,
  Book,
  ReadingProgress,
  ReadingList,
  ReadingListItem,
  ReadingGoal,
  Bookmark,
  Highlight,
  Annotation,
  UserProfile,
} from '@/types';

const DB_NAME = 'altto_app_db';
const DB_VERSION = 1;

interface DBSchema {
  bibles: Bible;
  bible_readings: BibleReading;
  bible_reflections: BibleReflection;
  devotionals: Devotional;
  devotional_readings: DevotionalReading;
  books: Book;
  reading_progress: ReadingProgress;
  reading_lists: ReadingList;
  reading_list_items: ReadingListItem;
  reading_goals: ReadingGoal;
  bookmarks: Bookmark;
  highlights: Highlight;
  annotations: Annotation;
  blobs: { id: string; data: Blob | ArrayBuffer | string; mimeType: string; name: string };
  user_profile: UserProfile;
}

type StoreName = keyof DBSchema;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getIDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser environment'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      const createStore = (
        name: StoreName,
        keyPath: string = 'id',
        indices: { name: string; keyPath: string | string[]; unique?: boolean }[] = []
      ) => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath });
          indices.forEach(idx => store.createIndex(idx.name, idx.keyPath, { unique: !!idx.unique }));
        }
      };

      createStore('bibles');
      createStore('bible_readings', 'id', [
        { name: 'by_date', keyPath: 'date' },
        { name: 'by_period_date', keyPath: ['date', 'period'] }
      ]);
      createStore('bible_reflections', 'id', [
        { name: 'by_date', keyPath: 'date' },
        { name: 'by_bible', keyPath: 'bibleId' }
      ]);
      createStore('devotionals');
      createStore('devotional_readings', 'id', [
        { name: 'by_devotional', keyPath: 'devotionalId' },
        { name: 'by_date', keyPath: 'date' },
        { name: 'by_devotional_day', keyPath: ['devotionalId', 'dayNumber'], unique: true }
      ]);
      createStore('books', 'id', [
        { name: 'by_status', keyPath: 'status' },
        { name: 'by_favorite', keyPath: 'isFavorite' }
      ]);
      createStore('reading_progress', 'id', [
        { name: 'by_content', keyPath: 'contentId' }
      ]);
      createStore('reading_lists');
      createStore('reading_list_items', 'id', [
        { name: 'by_list', keyPath: 'listId' },
        { name: 'by_book', keyPath: 'bookId' }
      ]);
      createStore('reading_goals', 'id', [
        { name: 'by_book', keyPath: 'bookId' }
      ]);
      createStore('bookmarks', 'id', [
        { name: 'by_content', keyPath: 'contentId' }
      ]);
      createStore('highlights', 'id', [
        { name: 'by_content', keyPath: 'contentId' }
      ]);
      createStore('annotations', 'id', [
        { name: 'by_content', keyPath: 'contentId' }
      ]);
      createStore('blobs');
      createStore('user_profile');
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

export async function dbGetAll<T extends StoreName>(storeName: T): Promise<DBSchema[T][]> {
  const db = await getIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as DBSchema[T][]);
    request.onerror = () => reject(request.error);
  });
}

export async function dbGetAllKeys<T extends StoreName>(storeName: T): Promise<IDBValidKey[]> {
  const db = await getIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbCount<T extends StoreName>(storeName: T): Promise<number> {
  const db = await getIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbGet<T extends StoreName>(storeName: T, key: IDBValidKey): Promise<DBSchema[T] | undefined> {
  const db = await getIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as DBSchema[T] | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function dbPut<T extends StoreName>(storeName: T, value: DBSchema[T]): Promise<void> {
  const db = await getIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function dbDelete<T extends StoreName>(storeName: T, key: IDBValidKey): Promise<void> {
  if (key === undefined || key === null || key === '') {
    return;
  }
  const db = await getIDB();
  if (!db.objectStoreNames.contains(storeName)) {
    return;
  }
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Executes a high-performance atomic batch deletion across multiple stores in a single transaction.
 * Automatically falls back to isolated deletes if the browser aborts or has conflicts.
 */
export async function dbDeleteBatch(
  operations: { storeName: StoreName; key: IDBValidKey }[]
): Promise<void> {
  if (!operations || operations.length === 0) return;
  const db = await getIDB();

  const validOps = operations.filter(
    op => op && op.storeName && op.key !== undefined && op.key !== null && op.key !== ''
  );
  if (validOps.length === 0) return;

  const existingStoreNames = Array.from(db.objectStoreNames);
  const storeNames = Array.from(new Set(validOps.map(op => op.storeName)))
    .filter(name => existingStoreNames.includes(name));

  if (storeNames.length === 0) return;

  return new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction(storeNames, 'readwrite');

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        console.warn('Batch delete transaction encountered an issue, falling back to individual safe deletes:', tx.error);
        fallbackIndividualDeletes(validOps).then(resolve).catch(reject);
      };
      tx.onabort = () => {
        console.warn('Batch delete transaction aborted, falling back:', tx.error);
        fallbackIndividualDeletes(validOps).then(resolve).catch(reject);
      };

      for (const op of validOps) {
        if (existingStoreNames.includes(op.storeName)) {
          const store = tx.objectStore(op.storeName);
          store.delete(op.key);
        }
      }
    } catch (err) {
      console.warn('Unable to open multi-store transaction, falling back:', err);
      fallbackIndividualDeletes(validOps).then(resolve).catch(reject);
    }
  });
}

async function fallbackIndividualDeletes(
  operations: { storeName: StoreName; key: IDBValidKey }[]
): Promise<void> {
  for (const op of operations) {
    try {
      await dbDelete(op.storeName, op.key);
    } catch (err) {
      console.warn(`Fallback delete bypassed for ${op.storeName}:`, err);
    }
  }
}

export async function dbClear<T extends StoreName>(storeName: T): Promise<void> {
  const db = await getIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Blob helper for large book files and comics
export async function saveBlob(id: string, data: Blob | ArrayBuffer | string, mimeType: string, name?: string): Promise<void> {
  await dbPut('blobs', { id, data, mimeType, name: name || 'file' });
}

export async function getBlob(id: string): Promise<{ data: Blob | ArrayBuffer | string; mimeType: string; name: string } | undefined> {
  const item = await dbGet('blobs', id);
  return item;
}

// Backup Export & Import (Requirement 47)
export async function exportAllDataAsJSON(): Promise<string> {
  const stores: StoreName[] = [
    'bibles',
    'bible_readings',
    'bible_reflections',
    'devotionals',
    'devotional_readings',
    'books',
    'reading_progress',
    'bookmarks',
    'highlights',
    'annotations',
    'reading_lists',
    'reading_list_items',
    'reading_goals',
  ];

  const exportPayload: Record<string, any[]> = {};
  for (const st of stores) {
    exportPayload[st] = await dbGetAll(st);
  }

  return JSON.stringify({
    alttoVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: exportPayload,
  }, null, 2);
}

export async function importDataFromJSON(jsonString: string): Promise<void> {
  const parsed = JSON.parse(jsonString);
  if (!parsed || !parsed.data) {
    throw new Error('Arquivo de backup inválido.');
  }

  const stores = Object.keys(parsed.data) as StoreName[];
  for (const st of stores) {
    const items = parsed.data[st];
    if (Array.isArray(items)) {
      for (const item of items) {
        await dbPut(st, item);
      }
    }
  }
}
