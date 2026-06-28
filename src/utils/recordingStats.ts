import type {
  RecordedPoint,
  RecordingStats,
  RecordingStatus,
  RideRecorderSession
} from '../types/recording';
import { computeElapsedMs, haversineDistanceMeters } from './recordingUtils';

export interface RecordingStatsOptions {
  maxAccuracyM?: number;
}

function isUsablePoint(point: RecordedPoint, maxAccuracyM: number): boolean {
  return Number.isFinite(point.accuracyM) && point.accuracyM > 0 && point.accuracyM <= maxAccuracyM;
}

function filterPoints(points: RecordedPoint[], maxAccuracyM: number): RecordedPoint[] {
  return points.filter((point) => isUsablePoint(point, maxAccuracyM));
}

export function calculateRecordedDistanceKm(points: RecordedPoint[], maxAccuracyM = 50): number {
  const usable = filterPoints(points, maxAccuracyM);
  if (usable.length < 2) return 0;
  let totalMeters = 0;
  for (let i = 1; i < usable.length; i++) {
    totalMeters += haversineDistanceMeters(usable[i - 1], usable[i]);
  }
  return totalMeters / 1000;
}

export function calculateRecordedElevationGainM(points: RecordedPoint[], maxAccuracyM = 50): number {
  const usable = filterPoints(points, maxAccuracyM);
  if (usable.length < 2) return 0;
  let gain = 0;
  for (let i = 1; i < usable.length; i++) {
    const prev = usable[i - 1].altitudeM ?? usable[i - 1].elevation ?? null;
    const next = usable[i].altitudeM ?? usable[i].elevation ?? null;
    if (prev == null || next == null) continue;
    const diff = next - prev;
    if (diff >= 0.5) gain += diff;
  }
  return gain;
}

export function calculateElapsedMsFromPoints(points: RecordedPoint[]): number {
  if (points.length < 2) return 0;
  return Math.max(0, points[points.length - 1].timestamp - points[0].timestamp);
}

export function calculateCurrentSpeedKph(points: RecordedPoint[], maxAccuracyM = 50): number {
  const usable = filterPoints(points, maxAccuracyM);
  if (usable.length === 0) return 0;
  const last = usable[usable.length - 1];
  const explicitSpeed = last.speedMps ?? last.speed ?? null;
  if (explicitSpeed != null && Number.isFinite(explicitSpeed) && explicitSpeed >= 0) {
    return explicitSpeed * 3.6;
  }
  if (usable.length < 2) return 0;
  const prev = usable[usable.length - 2];
  const dtMs = last.timestamp - prev.timestamp;
  if (dtMs <= 0) return 0;
  const distanceM = haversineDistanceMeters(prev, last);
  return distanceM / (dtMs / 3600000);
}

export function calculateMaxSpeedKph(points: RecordedPoint[], maxAccuracyM = 50): number {
  const usable = filterPoints(points, maxAccuracyM);
  if (usable.length === 0) return 0;

  let maxSpeed = 0;
  for (const point of usable) {
    const explicitSpeed = point.speedMps ?? point.speed ?? null;
    if (explicitSpeed != null && Number.isFinite(explicitSpeed) && explicitSpeed >= 0) {
      maxSpeed = Math.max(maxSpeed, explicitSpeed * 3.6);
    }
  }

  for (let i = 1; i < usable.length; i++) {
    const prev = usable[i - 1];
    const next = usable[i];
    const dtMs = next.timestamp - prev.timestamp;
    if (dtMs <= 0) continue;
    const speedKph = haversineDistanceMeters(prev, next) / (dtMs / 3600000);
    maxSpeed = Math.max(maxSpeed, speedKph);
  }

  return maxSpeed;
}

export function buildRecordingStats(
  session: RideRecorderSession | null,
  status: RecordingStatus,
  now: number,
  options: RecordingStatsOptions = {}
): RecordingStats {
  const maxAccuracyM = options.maxAccuracyM ?? 50;
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
  const usablePoints = filterPoints(session.points, maxAccuracyM);
  const totalDistanceKm = calculateRecordedDistanceKm(session.points, maxAccuracyM);
  const currentSpeedKph = calculateCurrentSpeedKph(session.points, maxAccuracyM);
  const maxSpeedKph = calculateMaxSpeedKph(session.points, maxAccuracyM);
  const averageSpeedKph = elapsedMs > 0 ? totalDistanceKm / (elapsedMs / 3600000) : 0;
  const lastPoint = usablePoints[usablePoints.length - 1] ?? session.livePoint;

  return {
    elapsedMs,
    totalDistanceKm,
    currentSpeedKph,
    averageSpeedKph,
    maxSpeedKph,
    currentElevationM: lastPoint?.altitudeM ?? lastPoint?.elevation ?? null,
    totalElevationGainM: calculateRecordedElevationGainM(session.points, maxAccuracyM),
    pointCount: usablePoints.length,
    lastAccuracyM: lastPoint?.accuracyM ?? lastPoint?.accuracy ?? null
  };
}
