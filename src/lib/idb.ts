/**
 * Minimal native IndexedDB wrapper — no dependency, just Promise-wrapped
 * primitives for the two stores this app needs:
 *   - `profiles-cache`: last successfully fetched feed, served when offline
 *   - `pending-events`: profile view/click events that failed to send while
 *     offline, flushed on reconnect (see lib/metrics.ts)
 *
 * Why IndexedDB here and not localStorage: this is actual application DATA
 * (an array of profile objects, an append-only event queue) — IndexedDB is
 * structured, async (doesn't block the main thread like synchronous
 * localStorage reads/writes), and has a much higher storage ceiling.
 * localStorage stays exactly right for the small synchronous device flags
 * elsewhere in this app (swap/click counters, dev flags, terms-accepted) —
 * migrating those would only add async overhead for no benefit. Note:
 * IndexedDB is NOT "more secure" than localStorage — both are plain
 * same-origin storage, equally readable by any script on the page (XSS has
 * the same blast radius either way). The reason to use IndexedDB here is
 * suitability for structured data, not security.
 */

const DB_NAME = 'lxl-offline'
const DB_VERSION = 1

export type StoreName = 'profiles-cache' | 'pending-events'

function isSupported(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('profiles-cache')) {
        db.createObjectStore('profiles-cache', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('pending-events')) {
        db.createObjectStore('pending-events', { keyPath: 'localId', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Wholesale replace: clears the store then writes `items` in one transaction. */
export async function idbReplaceAll<T>(store: StoreName, items: T[]): Promise<void> {
  if (!isSupported()) return
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const os = tx.objectStore(store)
      os.clear()
      for (const item of items) os.put(item)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // best-effort cache — a failure here just means no offline fallback later
  }
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  if (!isSupported()) return []
  try {
    const db = await openDB()
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const req = tx.objectStore(store).getAll()
      req.onsuccess = () => resolve(req.result as T[])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

/** Appends one record (used for the pending-events queue, keyPath auto-increments). */
export async function idbAdd(store: StoreName, item: unknown): Promise<void> {
  if (!isSupported()) return
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).add(item)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // best-effort queue — losing a view/click event is not worth surfacing
  }
}

export async function idbClear(store: StoreName): Promise<void> {
  if (!isSupported()) return
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // no-op
  }
}
