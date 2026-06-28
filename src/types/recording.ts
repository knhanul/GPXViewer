import type { RouteId } from './gpx';

export type RecordingStatus =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'finished'
  | 'error';

export interface RecordedPoint {
  lat: number;
  lng: number;
  accuracyM: number;
  altitudeM: number | null;
  speedMps: number | null;
  headingDeg: number | null;
  timestamp: number;
  elevation?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
}

export interface RideRecording {
  id: string;
  name: string;
  fileName: string;
  status: RecordingStatus;
  startedAt: number;
  endedAt: number;
  elapsedMs: number;
  pausedDurationMs: number;
  totalDistanceKm: number;
  totalElevationGainM: number;
  averageSpeedKph: number;
  maxSpeedKph: number;
  createdAt: number;
  updatedAt: number;
  points: RecordedPoint[];
  analyzedRouteId: RouteId | null;
}

export interface RecordingMeta {
  id: string;
  name: string;
  fileName: string;
  startedAt: number;
  endedAt: number;
  elapsedMs: number;
  pausedDurationMs: number;
  totalDistanceKm: number;
  totalElevationGainM: number;
  averageSpeedKph: number;
  maxSpeedKph: number;
  pointCount: number;
  analyzedRouteId: RouteId | null;
  createdAt: number;
  updatedAt: number;
}

export interface RideRecorderSession {
  id: string;
  name: string;
  fileName: string;
  startedAt: number;
  pausedAt: number | null;
  pausedDurationMs: number;
  points: RecordedPoint[];
  livePoint: RecordedPoint | null;
}

export interface RecordingStats {
  elapsedMs: number;
  totalDistanceKm: number;
  currentSpeedKph: number;
  averageSpeedKph: number;
  maxSpeedKph: number;
  currentElevationM: number | null;
  totalElevationGainM: number;
  pointCount: number;
  lastAccuracyM: number | null;
}
