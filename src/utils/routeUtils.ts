// turf 는 named import 와 default import 모두 지원하지만,
// 번들 크기/트리쉐이킹을 위해 필요한 함수만 named import 한다.
import {
  lineString,
  length,
  bbox,
  point as turfPoint
} from '@turf/turf';
import type { LatLngBounds, ParsedRoute, RoutePoint } from '../types/gpx';

/**
 * GeoJSON 형식의 좌표([lng, lat]) 를 Leaflet 형식의 LatLngBounds 로 변환한다.
 * @param coordinates [lng, lat] 배열
 * @returns [[south, west], [north, east]] 형식의 bounds
 */
export function computeBounds(
  coordinates: [number, number][]
): LatLngBounds {
  if (coordinates.length === 0) {
    // 좌표가 없는 경우 기본값 (전 세계)
    return [
      [-85, -180],
      [85, 180]
    ];
  }
  const feature = lineString(coordinates);
  const [minX, minY, maxX, maxY] = bbox(feature);
  // bbox 는 [minX, minY, maxX, maxY] = [west, south, east, north]
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
  coordinates: [number, number][]
): number {
  if (coordinates.length < 2) {
    return 0;
  }
  const line = lineString(coordinates);
  // length 의 두 번째 인자 { units: 'kilometers' } 가 기본값이지만 명시한다.
  return length(line, { units: 'kilometers' });
}

/**
 * 좌표 배열의 시작점과 종료점을 추출한다.
 * 동일 좌표인 경우 start === end 이다.
 */
export function extractStartEnd(
  coordinates: [number, number][]
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
 * 좌표 배열을 통해 완전한 ParsedRoute 메타데이터를 만든다.
 * fileName 만 외부에서 주입받는다.
 */
export function buildRouteMetadata(
  fileName: string,
  coordinates: [number, number][]
): ParsedRoute {
  const { start, end } = extractStartEnd(coordinates);
  return {
    fileName,
    coordinates,
    totalDistanceKm: calculateDistanceKm(coordinates),
    startPoint: start,
    endPoint: end,
    pointCount: coordinates.length,
    bounds: computeBounds(coordinates)
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

// turf 의 point 타입 re-export (필요 시 사용)
export { turfPoint };
