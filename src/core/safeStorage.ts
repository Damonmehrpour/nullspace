// The only module that touches web storage. Storage can be missing or throw (private mode,
// blocked site data), so every access falls back silently.

type StorageKind = 'local' | 'session'

function store(kind: StorageKind): Storage | null {
  try {
    return kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage
  } catch {
    return null
  }
}

export function readJSON<T>(key: string, fallback: T, kind: StorageKind = 'local'): T {
  try {
    const raw = store(kind)?.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown, kind: StorageKind = 'local'): void {
  try {
    store(kind)?.setItem(key, JSON.stringify(value))
  } catch {
    // ignore: persistence is a convenience
  }
}

export function removeKey(key: string, kind: StorageKind = 'local'): void {
  try {
    store(kind)?.removeItem(key)
  } catch {
    // ignore
  }
}
