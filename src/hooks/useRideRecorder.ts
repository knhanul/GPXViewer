import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UserLocation } from '../types/location';
import type {
  RecordedPoint,
  RecordingStatus,
  RideRecording,
  RideRecorderSession
} from '../types/recording';
import { rideRecordingToGpxXml } from '../utils/gpxWriter';
import {
  DEFAULT_RECORDING_FILTERS,
  buildRecordingIdentity,
  recordedPointToUserLocation,
  shouldAcceptRecordedPoint,
  type RecordingFilterOptions
} from '../utils/recordingUtils';
import {
  calculateMaxSpeedKph,
  calculateRecordedDistanceKm,
  calculateRecordedElevationGainM
} from '../utils/recordingStats';

type PositionLike = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number | null;
    speed?: number | null;
    heading?: number | null;
  };
  timestamp: number;
};

type WatchIdentifier = string | number;

type WatchCallback = (position: PositionLike) => void;
type WatchErrorCallback = (error: unknown) => void;

interface WatchProvider {
  watch: (onPosition: WatchCallback, onError: WatchErrorCallback) => Promise<WatchIdentifier>;
  clear: (id: WatchIdentifier) => Promise<void>;
}

interface UseRideRecorderOptions {
  filters?: Partial<RecordingFilterOptions>;
  onRecordingFinished?: (payload: {
    recording: RideRecording;
    gpxXml: string;
  }) => Promise<string | null> | string | null;
}

interface UseRideRecorderResult {
  status: RecordingStatus;
  session: RideRecorderSession | null;
  recordings: RideRecording[];
  error: string | null;
  liveLocation: UserLocation | null;
  isSupported: boolean;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<RideRecording | null>;
  dismissError: () => void;
  removeRecording: (id: string) => void;
  updateRecording: (id: string, updater: (recording: RideRecording) => RideRecording) => void;
}

function normalizePoint(position: PositionLike): RecordedPoint {
  const altitudeM =
    position.coords.altitude != null && Number.isFinite(position.coords.altitude)
      ? position.coords.altitude
      : null;
  const speedMps =
    position.coords.speed != null && Number.isFinite(position.coords.speed) && position.coords.speed >= 0
      ? position.coords.speed
      : null;
  const headingDeg =
    position.coords.heading != null && Number.isFinite(position.coords.heading)
      ? position.coords.heading
      : null;
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracyM: position.coords.accuracy ?? 0,
    altitudeM,
    speedMps,
    headingDeg,
    timestamp: position.timestamp ?? Date.now(),
    elevation: altitudeM,
    accuracy: position.coords.accuracy ?? 0,
    speed: speedMps,
    heading: headingDeg
  };
}

function buildWatchErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const maybeMessage = 'message' in error ? error.message : null;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage;
    }
    const maybeCode = 'code' in error ? error.code : null;
    if (maybeCode === 1 || maybeCode === 'OS-PLUG-GLOC-0003') {
      return '위치 권한이 거부되었습니다. 브라우저 또는 기기 설정에서 권한을 허용해 주세요.';
    }
  }
  return '라이딩 기록용 위치 추적을 시작하지 못했습니다.';
}

async function resolveWatchProvider(): Promise<WatchProvider | null> {
  if (typeof window === 'undefined') return null;

  if (Capacitor.isNativePlatform()) {
    try {
      const moduleName = '@capacitor/geolocation';
      const mod = (await import(/* @vite-ignore */ moduleName)) as {
        Geolocation?: {
          requestPermissions?: () => Promise<unknown>;
          watchPosition?: (
            options: Record<string, unknown>,
            callback: (position: PositionLike | null, error?: unknown) => void
          ) => Promise<WatchIdentifier>;
          clearWatch?: (options: { id: string }) => Promise<void>;
        };
      };
      const geo = mod.Geolocation;
      if (geo?.watchPosition && geo.clearWatch) {
        const requestPermissions = geo.requestPermissions;
        const watchPosition = geo.watchPosition;
        const clearWatch = geo.clearWatch;
        if (requestPermissions) {
          await requestPermissions();
        }
        return {
          watch: (onPosition, onError) =>
            watchPosition(
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 1000,
                minimumUpdateInterval: 1000
              },
              (position, error) => {
                if (error) {
                  onError(error);
                  return;
                }
                if (position) onPosition(position);
              }
            ),
          clear: (id) => clearWatch({ id: String(id) })
        };
      }
    } catch {
      // fallback to browser geolocation
    }
  }

  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    return {
      watch: async (onPosition, onError) =>
        navigator.geolocation.watchPosition(
          (position) => onPosition(position as PositionLike),
          (error) => onError(error),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 1000
          }
        ),
      clear: async (id) => {
        navigator.geolocation.clearWatch(Number(id));
      }
    };
  }

  return null;
}

export function useRideRecorder(
  options: UseRideRecorderOptions = {}
): UseRideRecorderResult {
  const filters: RecordingFilterOptions = {
    ...DEFAULT_RECORDING_FILTERS,
    ...options.filters
  };
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [session, setSession] = useState<RideRecorderSession | null>(null);
  const [recordings, setRecordings] = useState<RideRecording[]>([]);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<{ provider: WatchProvider; id: WatchIdentifier } | null>(null);
  const sessionRef = useRef<RideRecorderSession | null>(null);
  const statusRef = useRef<RecordingStatus>('idle');

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const clearWatch = useCallback(async () => {
    const current = watchRef.current;
    if (!current) return;
    watchRef.current = null;
    await current.provider.clear(current.id);
  }, []);

  const handleIncomingPosition = useCallback(
    (position: PositionLike) => {
      const nextPoint = normalizePoint(position);
      setSession((prev) => {
        if (!prev) return prev;
        const lastAccepted = prev.points[prev.points.length - 1] ?? null;
        if (!shouldAcceptRecordedPoint(lastAccepted, nextPoint, filters)) {
          return prev;
        }
        return {
          ...prev,
          livePoint: nextPoint,
          points: [...prev.points, nextPoint]
        };
      });
    },
    [filters]
  );

  const handleWatchError = useCallback(
    async (watchError: unknown) => {
      await clearWatch();
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pausedAt: prev.pausedAt ?? Date.now()
        };
      });
      setStatus((prev) => (prev === 'idle' ? prev : 'paused'));
      setError(buildWatchErrorMessage(watchError));
    },
    [clearWatch]
  );

  const beginWatch = useCallback(async () => {
    const provider = await resolveWatchProvider();
    if (!provider) {
      throw new Error('이 환경에서는 연속 위치 추적을 사용할 수 없습니다.');
    }
    const watchId = await provider.watch(handleIncomingPosition, handleWatchError);
    watchRef.current = {
      provider,
      id: watchId
    };
  }, [handleIncomingPosition, handleWatchError]);

  const start = useCallback(async () => {
    if (statusRef.current === 'starting' || statusRef.current === 'recording' || statusRef.current === 'stopping') {
      return;
    }
    setError(null);
    setStatus('starting');
    const startedAt = Date.now();
    const identity = buildRecordingIdentity(startedAt);
    setSession({
      id: identity.id,
      name: identity.name,
      fileName: identity.fileName,
      startedAt,
      pausedAt: null,
      pausedDurationMs: 0,
      points: [],
      livePoint: null
    });
    try {
      await beginWatch();
      setStatus('recording');
    } catch (watchError) {
      setSession(null);
      setStatus('error');
      setError(buildWatchErrorMessage(watchError));
    }
  }, [beginWatch]);

  const pause = useCallback(async () => {
    if (statusRef.current !== 'recording') return;
    await clearWatch();
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pausedAt: Date.now()
      };
    });
    setStatus('paused');
  }, [clearWatch]);

  const resume = useCallback(async () => {
    if (statusRef.current !== 'paused') return;
    setError(null);
    setStatus('starting');
    const resumedAt = Date.now();
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pausedDurationMs:
          prev.pausedDurationMs + (prev.pausedAt ? Math.max(0, resumedAt - prev.pausedAt) : 0),
        pausedAt: null
      };
    });
    try {
      await beginWatch();
      setStatus('recording');
    } catch (watchError) {
      setStatus('paused');
      setError(buildWatchErrorMessage(watchError));
    }
  }, [beginWatch]);

  const stop = useCallback(async () => {
    if (statusRef.current !== 'recording' && statusRef.current !== 'paused') {
      return null;
    }
    setStatus('stopping');
    await clearWatch();
    const currentSession = sessionRef.current;
    if (!currentSession) {
      setStatus('idle');
      return null;
    }
    const endedAt = Date.now();
    const pausedDurationMs =
      currentSession.pausedDurationMs +
      (currentSession.pausedAt ? Math.max(0, endedAt - currentSession.pausedAt) : 0);
    const totalDistanceKm = calculateRecordedDistanceKm(currentSession.points);
    const totalElevationGainM = calculateRecordedElevationGainM(currentSession.points);
    const averageSpeedKph =
      Math.max(0, endedAt - currentSession.startedAt - pausedDurationMs) > 0
        ? totalDistanceKm / ((Math.max(0, endedAt - currentSession.startedAt - pausedDurationMs)) / 3600000)
        : 0;
    const maxSpeedKph = calculateMaxSpeedKph(currentSession.points);
    const recording: RideRecording = {
      id: currentSession.id,
      name: currentSession.name,
      fileName: currentSession.fileName,
      status: 'finished',
      startedAt: currentSession.startedAt,
      endedAt,
      elapsedMs: Math.max(0, endedAt - currentSession.startedAt - pausedDurationMs),
      pausedDurationMs,
      totalDistanceKm,
      totalElevationGainM,
      averageSpeedKph,
      maxSpeedKph,
      createdAt: currentSession.startedAt,
      updatedAt: endedAt,
      points: currentSession.points,
      analyzedRouteId: null
    };
    const gpxXml = rideRecordingToGpxXml(recording);
    let analyzedRouteId: string | null = null;
    if (options.onRecordingFinished) {
      try {
        analyzedRouteId = await options.onRecordingFinished({
          recording,
          gpxXml
        });
      } catch (recordingError) {
        setError(buildWatchErrorMessage(recordingError));
      }
    }
    const savedRecording = {
      ...recording,
      analyzedRouteId
    };
    setRecordings((prev) => [savedRecording, ...prev]);
    setSession(null);
    setStatus('idle');
    return savedRecording;
  }, [clearWatch, options]);

  const dismissError = useCallback(() => {
    setError(null);
    setStatus((prev) => (prev === 'error' ? 'idle' : prev));
  }, []);

  const removeRecording = useCallback((id: string) => {
    setRecordings((prev) => prev.filter((recording) => recording.id !== id));
  }, []);

  const updateRecording = useCallback(
    (id: string, updater: (recording: RideRecording) => RideRecording) => {
      setRecordings((prev) =>
        prev.map((recording) =>
          recording.id === id ? updater(recording) : recording
        )
      );
    },
    []
  );

  useEffect(() => {
    return () => {
      void clearWatch();
    };
  }, [clearWatch]);

  const liveLocation = useMemo(() => {
    const livePoint = session?.livePoint ?? session?.points[session.points.length - 1] ?? null;
    return recordedPointToUserLocation(livePoint);
  }, [session]);

  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Capacitor.isNativePlatform() || ('geolocation' in navigator);
  }, []);

  return {
    status,
    session,
    recordings,
    error,
    liveLocation,
    isSupported,
    start,
    pause,
    resume,
    stop,
    dismissError,
    removeRecording,
    updateRecording
  };
}
