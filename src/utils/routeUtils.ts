// turf 는 named import 와 default import 모두 지원하지만,
// 번들 크기/트리쉐이킹을 위해 필요한 함수만 named import 한다.
import {
  lineString,
  length,
  bbox,
  point as turfPoint
} from '@turf/turf';
import type {
  LatLngBounds,
  ParsedRoute,
  RoutePoint
} from '../types/gpx';

/**
 * GeoJSON 형식의 좌표([lng, lat]) 를 Leaflet 형식의 LatLngBounds 로 변환한다.
 * @param coordinates [lng, lat] 배열
 * @returns [[south, west], [north, east]] 형식의 bounds
 */
export function computeBounds(
  coordinates: [number, number, number?][]
): LatLngBounds {
  if (coordinates.length === 0) {
    // 좌표가 없는 경우 기본값 (전 세계)
    return [
      [-85, -180],
      [85, 180]
    ];
  }
  // bbox 는 [lng, lat] 만 사용한다.
  const flat = coordinates.map((c) => [c[0], c[1]] as [number, number]);
  const feature = lineString(flat);
  const [minX, minY, maxX, maxY] = bbox(feature);
  return [
    [minY, minX],
    [maxY, maxX]
  ];
}

/**
 * 좌표 배열의 총 길이를 킬로미터 단위로 계산한다.
 * turf 의 length 함수는 기본 단위가 kilometers 이다.
 */
export function calculateDistanceKm(
  coordinates: [number, number, number?][]
): number {
  if (coordinates.length < 2) {
    return 0;
  }
  const flat = coordinates.map((c) => [c[0], c[1]] as [number, number]);
  const line = lineString(flat);
  return length(line, { units: 'kilometers' });
}

/**
 * 좌표 배열의 시작점과 종료점을 추출한다.
 */
export function extractStartEnd(
  coordinates: [number, number, number?][]
): { start: RoutePoint; end: RoutePoint } {
  const fallback: RoutePoint = { lat: 0, lng: 0 };
  if (coordinates.length === 0) {
    return { start: fallback, end: fallback };
  }
  const [startLng, startLat] = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  const [endLng, endLat] = last;
  return {
    start: { lat: startLat, lng: startLng },
    end: { lat: endLat, lng: endLng }
  };
}

/**
 * 고도 메타데이터 계산.
 * - hasElevation: 3번째 원소가 숫자이고 0 이 아닌 값이 하나라도 있으면 true
 * - min/max: 유효한 고도 중 최솟/최댓값
 * - gain/loss: 인접 고도 차이의 양수/음수 절댓값 누적 (노이즈 임계값 0.5m)
 */
function computeElevationStats(
  coordinates: [number, number, number?][]
): {
  hasElevation: boolean;
  minElevation: number;
  maxElevation: number;
  totalElevationGain: number;
  totalElevationLoss: number;
} {
  if (coordinates.length === 0) {
    return {
      hasElevation: false,
      minElevation: 0,
      maxElevation: 0,
      totalElevationGain: 0,
      totalElevationLoss: 0
    };
  }

  // ele 추출 (없거나 NaN 이면 null)
  const elevations: Array<number | null> = coordinates.map((c) => {
    const v = c[2];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  });

  const validElevations = elevations.filter(
    (v): v is number => v !== null
  );
  if (validElevations.length === 0) {
    return {
      hasElevation: false,
      minElevation: 0,
      maxElevation: 0,
      totalElevationGain: 0,
      totalElevationLoss: 0
    };
  }

  // 모든 좌표가 ele 를 가져야 hasElevation=true
  const hasElevation = validElevations.length === coordinates.length;

  const minElevation = Math.min(...validElevations);
  const maxElevation = Math.max(...validElevations);

  // 인접 차분으로 gain/loss 계산.
  // 0.5m 미만은 노이즈로 간주.
  const NOISE_THRESHOLD = 0.5;
  let totalElevationGain = 0;
  let totalElevationLoss = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const prev = elevations[i - 1];
    const cur = elevations[i];
    if (prev == null || cur == null) continue;
    const diff = cur - prev;
    if (Math.abs(diff) < NOISE_THRESHOLD) continue;
    if (diff > 0) totalElevationGain += diff;
    else totalElevationLoss += -diff;
  }

  return {
    hasElevation,
    minElevation,
    maxElevation,
    totalElevationGain,
    totalElevationLoss
  };
}

/**
 * 좌표 배열을 통해 완전한 ParsedRoute 메타데이터를 만든다.
 */
export function buildRouteMetadata(
  fileName: string,
  coordinates: [number, number, number?][]
): ParsedRoute {
  const { start, end } = extractStartEnd(coordinates);
  const elevStats = computeElevationStats(coordinates);
  return {
    fileName,
    coordinates,
    totalDistanceKm: calculateDistanceKm(coordinates),
    startPoint: start,
    endPoint: end,
    pointCount: coordinates.length,
    bounds: computeBounds(coordinates),
    ...elevStats
  };
}

/**
 * 좌표 포맷 (소수점 5자리) - 정보 패널에서 사용한다.
 */
export function formatCoordinate(value: number): string {
  return value.toFixed(5);
}

/**
 * 거리 포맷 (소수점 2자리 km)
 */
export function formatDistanceKm(km: number): string {
  return km.toFixed(2);
}

/**
 * turf 의 point 타입 re-export (필요 시 사용)
 */
export { turfPoint };
