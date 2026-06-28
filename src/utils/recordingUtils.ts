import type { UserLocation } from '../types/location';
import type {
  RecordedPoint,
  RecordingStats,
  RecordingStatus,
  RideRecorderSession
} from '../types/recording';

export interface RecordingFilterOptions {
  maxAccuracyM: number;
  minDistanceM: number;
  minIntervalMs: number;
  maxJumpSpeedKph: number;
}

export const DEFAULT_RECORDING_FILTERS: RecordingFilterOptions = {
  maxAccuracyM: 40,
  minDistanceM: 3,
  minIntervalMs: 1500,
  maxJumpSpeedKph: 75
};

export function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isAccurateRecordedPoint(
  point: RecordedPoint,
  options: RecordingFilterOptions = DEFAULT_RECORDING_FILTERS
): boolean {
  return Number.isFinite(point.accuracyM) && point.accuracyM > 0 && point.accuracyM <= options.maxAccuracyM;
}

export function shouldAcceptRecordedPoint(
  prev: RecordedPoint | null,
  next: RecordedPoint,
  options: RecordingFilterOptions = DEFAULT_RECORDING_FILTERS
): boolean {
  if (!isAccurateRecordedPoint(next, options)) return false;
  if (!prev) return true;
  if (next.timestamp <= prev.timestamp) return false;

  const dtMs = next.timestamp - prev.timestamp;
  const distanceM = haversineDistanceMeters(prev, next);
  const speedKph = dtMs > 0 ? distanceM / (dtMs / 3600000) : 0;

  if (speedKph > options.maxJumpSpeedKph && next.accuracyM > 12) {
    return false;
  }
  if (distanceM < options.minDistanceM && dtMs < options.minIntervalMs) {
    return false;
  }
  return true;
}

export function computeRecordedDistanceKm(points: RecordedPoint[]): number {
  if (points.length < 2) return 0;
  let totalM = 0;
  for (let i = 1; i < points.length; i++) {
    totalM += haversineDistanceMeters(points[i - 1], points[i]);
  }
  return totalM / 1000;
}

export function computeRecordedElevationGainM(points: RecordedPoint[]): number {
  if (points.length < 2) return 0;
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].altitudeM;
    const next = points[i].altitudeM;
    if (prev == null || next == null) continue;
    const diff = next - prev;
    if (diff >= 0.5) gain += diff;
  }
  return gain;
}

export function computeElapsedMs(
  session: RideRecorderSession | null,
  status: RecordingStatus,
  now: number
): number {
  if (!session) return 0;
  const pausedNow =
    status === 'paused' && session.pausedAt ? Math.max(0, now - session.pausedAt) : 0;
  return Math.max(0, now - session.startedAt - session.pausedDurationMs - pausedNow);
}

export function deriveCurrentSpeedKph(points: RecordedPoint[]): number {
  if (points.length === 0) return 0;
  const last = points[points.length - 1];
  if (last.speedMps != null && Number.isFinite(last.speedMps) && last.speedMps >= 0) {
    return last.speedMps * 3.6;
  }
  if (points.length < 2) return 0;
  const prev = points[points.length - 2];
  const dtMs = last.timestamp - prev.timestamp;
  if (dtMs <= 0) return 0;
  const distanceM = haversineDistanceMeters(prev, last);
  return distanceM / (dtMs / 3600000);
}

export function buildRecordingStats(
  session: RideRecorderSession | null,
  status: RecordingStatus,
  now: number
): RecordingStats {
  if (!session) {
    return {
      elapsedMs: 0,
      totalDistanceKm: 0,
      currentSpeedKph: 0,
      averageSpeedKph: 0,
      maxSpeedKph: 0,
      currentElevationM: null,
      totalElevationGainM: 0,
      pointCount: 0,
      lastAccuracyM: null
    };
  }

  const elapsedMs = computeElapsedMs(session, status, now);
  const totalDistanceKm = computeRecordedDistanceKm(session.points);
  const currentSpeedKph = deriveCurrentSpeedKph(session.points);
  const averageSpeedKph = elapsedMs > 0 ? totalDistanceKm / (elapsedMs / 3600000) : 0;
  const lastPoint = session.points[session.points.length - 1] ?? session.livePoint;

  return {
    elapsedMs,
    totalDistanceKm,
    currentSpeedKph,
    averageSpeedKph,
    maxSpeedKph: currentSpeedKph,
    currentElevationM: lastPoint?.altitudeM ?? null,
    totalElevationGainM: computeRecordedElevationGainM(session.points),
    pointCount: session.points.length,
    lastAccuracyM: lastPoint?.accuracyM ?? null
  };
}

export function buildRecordingIdentity(startedAt: number) {
  const date = new Date(startedAt);
  const pad = (v: number) => String(v).padStart(2, '0');
  const name = `라이딩 ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const fileName = `ride-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.gpx`;
  const id = `ride-${startedAt}`;
  return { id, name, fileName };
}

export function recordedPointToUserLocation(point: RecordedPoint | null): UserLocation | null {
  if (!point) return null;
  return {
    lat: point.lat,
    lng: point.lng,
    accuracyM: point.accuracyM,
    timestamp: point.timestamp
  };
}

export function recordingPointsToCoordinates(
  points: RecordedPoint[]
): [number, number, number?][] {
  return points.map((point) => [
    point.lng,
    point.lat,
    point.altitudeM != null ? point.altitudeM : undefined
  ]);
}

export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
