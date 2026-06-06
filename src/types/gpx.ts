// GPX 파싱/도메인 관련 타입 정의

/**
 * 단일 좌표점을 표현한다.
 */
export interface RoutePoint {
  /** 위도 (latitude) */
  lat: number;
  /** 경도 (longitude) */
  lng: number;
}

/**
 * Leaflet 의 LatLngBounds 표현.
 * [[southLat, westLng], [northLat, eastLng]]
 */
export type LatLngBounds = [[number, number], [number, number]];

/**
 * GPX 파일을 파싱한 후 화면에 표시하기 위한 정규화된 라우트 데이터.
 *
 * coordinates 는 GeoJSON 표준을 따라 [lng, lat] 쌍의 배열이다.
 */
export interface ParsedRoute {
  /** 원본 파일명 */
  fileName: string;
  /** 좌표 배열 (GeoJSON 형식: [lng, lat]) */
  coordinates: [number, number][];
  /** 총 거리 (킬로미터) */
  totalDistanceKm: number;
  /** 시작점 */
  startPoint: RoutePoint;
  /** 종료점 */
  endPoint: RoutePoint;
  /** 트랙 포인트 개수 */
  pointCount: number;
  /** 지도 bounds */
  bounds: LatLngBounds;
}

/**
 * 여러 개의 라우트를 관리하기 위한 컨테이너 타입.
 * 현재 MVP 에서는 단일 라우트만 사용하지만, 추후 다중 라우트 지원을 위해
 * 배열 형태로 정의한다.
 */
export interface RouteCollection {
  routes: ParsedRoute[];
  selectedId: string | null;
}
