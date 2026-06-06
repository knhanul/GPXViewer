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
 */
export interface ParsedRoute {
  fileName: string;
  coordinates: [number, number, number?][];
  totalDistanceKm: number;
  startPoint: RoutePoint;
  endPoint: RoutePoint;
  pointCount: number;
  bounds: LatLngBounds;
  hasElevation: boolean;
  minElevation: number;
  maxElevation: number;
  totalElevationGain: number;
  totalElevationLoss: number;
}

/**
 * 여러 개의 라우트를 관리하기 위한 컨테이너 타입.
 */
export interface RouteCollection {
  routes: ParsedRoute[];
  selectedId: string | null;
}

// ===========================================================================
// 고도 / 구간 분석 타입
// ===========================================================================

export interface TrackPoint {
  lat: number;
  lng: number;
  elevation: number;
  cumulativeDistanceKm: number;
  gradePercent: number;
}

export interface ElevationPoint {
  distance: number;
  elevation: number;
  gradePercent: number;
}

export interface RouteSegment {
  id: string;
  startIndex: number;
  endIndex: number;
  startKm: number;
  endKm: number;
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  avgGradePercent: number;
  maxGradePercent: number;
  startPoint: { lat: number; lng: number };
  endPoint: { lat: number; lng: number };
}

export interface SegmentSelection {
  startIndex: number;
  endIndex: number;
}

export interface SegmentStats {
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  avgGradePercent: number;
  maxGradePercent: number;
  minElevation: number;
  maxElevation: number;
}

// ===========================================================================
// 다중 경로 비교 (4차 목표)
// ===========================================================================

/** 경로의 안정적 ID (crypto.randomUUID / 카운터) */
export type RouteId = string;

/**
 * 앱에서 관리하는 경로 1개의 상태.
 * - route: 파싱된 원본 데이터
 * - trackPoints / elevationPoints / segments: 분석 결과 (메모)
 * - name / color / visible: UI 상태
 */
export interface RouteState {
  id: RouteId;
  /** 표시 이름 (기본 = 파일명) */
  name: string;
  /** 경로 색상 (HEX) — 지도와 차트에서 동일하게 사용 */
  color: string;
  /** 지도/차트에 표시할지 여부 */
  visible: boolean;
  /** 파싱된 원본 */
  route: ParsedRoute;
  /** 누적거리/경사도가 포함된 정규화 트랙 포인트 */
  trackPoints: TrackPoint[];
  /** 차트용 다운샘플된 포인트 */
  elevationPoints: ElevationPoint[];
  /** 1km 단위 구간 */
  segments: RouteSegment[];
}

/**
 * 공통 km 구간 비교 선택 (모든 경로에 동일하게 적용).
 */
export interface ComparisonSelection {
  startKm: number;
  endKm: number;
}

/**
 * 오르막 난이도 레벨.
 */
export type RouteDifficulty = 'easy' | 'moderate' | 'hard' | 'extreme';

/** 다중 경로 비교에 사용되는 지표 한 행 */
export interface RouteCompareRow {
  id: RouteId;
  name: string;
  color: string;
  visible: boolean;
  fileName: string;
  totalDistanceKm: number;
  pointCount: number;
  startElevation: number;
  endElevation: number;
  minElevation: number;
  maxElevation: number;
  totalElevationGain: number;
  totalElevationLoss: number;
  avgGradePercent: number;
  maxGradePercent: number;
  difficulty: RouteDifficulty;
  difficultyScore: number;
  difficultyLabel: string;
  /** 한 줄 해석 문장 */
  interpretation: string;
}

/** 공통 km 구간에 대한 경로별 비교 결과 */
export interface RouteSegmentCompareRow {
  id: RouteId;
  name: string;
  color: string;
  visible: boolean;
  /** 공통 구간에 해당하는 통계 (없으면 0) */
  stats: SegmentStats;
  difficulty: RouteDifficulty;
  difficultyLabel: string;
  interpretation: string;
  hasData: boolean;
}
