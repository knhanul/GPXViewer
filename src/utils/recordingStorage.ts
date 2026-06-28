import type { RecordingMeta, RideRecording } from '../types/recording';

const META_STORAGE_KEY = 'gpx-viewer.recordings.metas.v1';
const DB_NAME = 'gpx-viewer-recordings';
const DB_VERSION = 1;
const STORE_NAME = 'rideRecordings';

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function readMetaListFromStorage(): RecordingMeta[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecordingMeta).sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

function writeMetaListToStorage(metas: RecordingMeta[]): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metas));
}

function isRecordingMeta(value: unknown): value is RecordingMeta {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RecordingMeta>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.fileName === 'string' &&
    typeof candidate.startedAt === 'number' &&
    typeof candidate.endedAt === 'number' &&
    typeof candidate.elapsedMs === 'number' &&
    typeof candidate.pausedDurationMs === 'number' &&
    typeof candidate.totalDistanceKm === 'number' &&
    typeof candidate.totalElevationGainM === 'number' &&
    typeof candidate.averageSpeedKph === 'number' &&
    typeof candidate.maxSpeedKph === 'number' &&
    typeof candidate.pointCount === 'number' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number'
  );
}

function buildRecordingMeta(recording: RideRecording): RecordingMeta {
  return {
    id: recording.id,
    name: recording.name,
    fileName: recording.fileName,
    startedAt: recording.startedAt,
    endedAt: recording.endedAt,
    elapsedMs: recording.elapsedMs,
    pausedDurationMs: recording.pausedDurationMs,
    totalDistanceKm: recording.totalDistanceKm,
    totalElevationGainM: recording.totalElevationGainM,
    averageSpeedKph: recording.averageSpeedKph,
    maxSpeedKph: recording.maxSpeedKph,
    pointCount: recording.points.length,
    analyzedRouteId: recording.analyzedRouteId,
    createdAt: recording.createdAt,
    updatedAt: recording.updatedAt
  };
}

function openDatabase(): Promise<IDBDatabase> {
  if (!hasWindow() || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB를 사용할 수 없습니다.'));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onerror = () => reject(request.error ?? new Error('IndexedDB를 열 수 없습니다.'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = run(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 요청이 실패했습니다.'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB 트랜잭션이 실패했습니다.'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB 트랜잭션이 중단되었습니다.'));
  });
}

async function getRecordingMetaInternal(id: string): Promise<RecordingMeta | null> {
  const metas = readMetaListFromStorage();
  return metas.find((meta) => meta.id === id) ?? null;
}

export async function saveRecording(recording: RideRecording): Promise<RecordingMeta> {
  const now = Date.now();
  const storedRecording: RideRecording = {
    ...recording,
    status: 'finished',
    createdAt: recording.createdAt || now,
    updatedAt: now
  };
  await withStore('readwrite', (store) => store.put(storedRecording));

  const meta = buildRecordingMeta(storedRecording);
  const metas = readMetaListFromStorage().filter((item) => item.id !== meta.id);
  metas.unshift(meta);
  writeMetaListToStorage(metas);
  return meta;
}

export async function getRecordingMetas(): Promise<RecordingMeta[]> {
  return readMetaListFromStorage();
}

export async function getRecordingById(id: string): Promise<RideRecording | null> {
  try {
    const recording = await withStore('readonly', (store) => store.get(id));
    return recording ?? null;
  } catch {
    return null;
  }
}

export async function deleteRecording(id: string): Promise<void> {
  const metas = readMetaListFromStorage().filter((meta) => meta.id !== id);
  writeMetaListToStorage(metas);
  try {
    await withStore('readwrite', (store) => store.delete(id));
  } catch {
    // 메타 삭제는 유지하고 원본 삭제는 best-effort
  }
}

export async function updateRecordingMeta(meta: RecordingMeta): Promise<void> {
  const next = readMetaListFromStorage();
  const index = next.findIndex((item) => item.id === meta.id);
  const updated = index >= 0 ? [...next.slice(0, index), meta, ...next.slice(index + 1)] : [meta, ...next];
  updated.sort((a, b) => b.startedAt - a.startedAt);
  writeMetaListToStorage(updated);
}

export async function loadRecordingMeta(id: string): Promise<RecordingMeta | null> {
  return getRecordingMetaInternal(id);
}
