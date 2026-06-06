// 다중 경로 비교 / 난이도 분석 유틸.
// 단순 규칙 기반 점수로 경로 난이도를 산출하고, 비교표/구간비교에
// 사용할 수 있는 정규화된 데이터를 만든다.

import type {
  ComparisonSelection,
  RouteCompareRow,
  RouteDifficulty,
  RouteId,
  RouteSegmentCompareRow,
  RouteState,
  SegmentStats,
  TrackPoint
} from '../types/gpx';
import { computeSelectionStats } from './elevationUtils';
import { detectClimbs, summarizeClimbs } from './climbUtils';

/** 경로 자동 할당용 다크 테마 친화 팔레트 */
export const ROUTE_COLOR_PALETTE: readonly string[] = [
  '#F97316', // 오렌지
  '#22D3EE', // 시안
  '#A78BFA', // 바이올렛
  '#34D399', // 에메랄드
  '#F472B6', // 핑크
  '#FACC15', // 옐로우
  '#60A5FA', // 블루
  '#FB7185', // 로즈
  '#10B981', // 그린
  '#E879F9' // 푸시아
] as const;

/** 라우트 색상 자동 할당 (이미 사용된 색은 피한다) */
export function pickNextColor(used: readonly string[]): string {
  for (const c of ROUTE_COLOR_PALETTE) {
    if (!used.includes(c)) return c;
  }
  // 모두 사용 중이면 팔레트 사이클
  return ROUTE_COLOR_PALETTE[used.length % ROUTE_COLOR_PALETTE.length];
}

/**
 * 난이도 점수 (단순 규칙):
 *   score = 0.6 * (gain/100) + 0.3 * |avgGrade| + 0.1 * |maxGrade|
 *   < 5   easy
 *   5~10  moderate
 *   10~20 hard
 *   20+   extreme
 */
export function calculateDifficultyScore(
  totalElevationGainM: number,
  avgGradePercent: number,
  maxGradePercent: number
): number {
  const gainTerm = totalElevationGainM / 100;
  const avgTerm = Math.abs(avgGradePercent);
  const maxTerm = Math.abs(maxGradePercent);
  return 0.6 * gainTerm + 0.3 * avgTerm + 0.1 * maxTerm;
}

export function scoreToDifficulty(score: number): RouteDifficulty {
  if (score < 5) return 'easy';
  if (score < 10) return 'moderate';
  if (score < 20) return 'hard';
  return 'extreme';
}

export const DIFFICULTY_LABEL: Record<RouteDifficulty, string> = {
  easy: '완만',
  moderate: '보통',
  hard: '어려움',
  extreme: '매우 어려움'
};

export const DIFFICULTY_COLOR: Record<RouteDifficulty, string> = {
  easy: '#34D399',
  moderate: '#FACC15',
  hard: '#F97316',
  extreme: '#F472B6'
};

/**
 * 1줄 해석 문장.
 * - 거리가 길고 고도가 낮으면 "완만"
 * - 거리가 짧고 최대 경사가 크면 "체감 난이도 높음"
 * - 오르막 정보가 있으면 함께 언급한다.
 */
export function buildInterpretation(
  state: RouteState,
  summary: ReturnType<typeof summarizeClimbs> | null = null
): string {
  const { route } = state;
  const distance = route.totalDistanceKm;
  const gain = route.totalElevationGain;
  const avgGrade = avgGradeOf(state.trackPoints);
  const maxGrade = maxGradeOf(state.trackPoints);
  const score = calculateDifficultyScore(gain, avgGrade, maxGrade);
  const level = scoreToDifficulty(score);

  const climbPart =
    summary && summary.count > 0
      ? ` 주요 오르막 ${summary.count}개, 가장 힘든 오르막 평균 ${summary.hardestAvgGradePercent.toFixed(1)}%`
      : '';

  if (level === 'easy') {
    return `${state.name}은(는) 거리는 ${distance.toFixed(1)}km 이지만 누적 상승고도가 ${Math.round(gain)}m 로 비교적 완만한 코스입니다.${climbPart}`;
  }
  if (level === 'moderate') {
    return `${state.name}은(는) 평균 경사가 완만하지만 누적 상승고도 ${Math.round(gain)}m 로 체감 난이도가 있습니다.${climbPart}`;
  }
  if (level === 'hard') {
    return `${state.name}은(는) 누적 상승고도 ${Math.round(gain)}m 와 평균 경사가 모두 높아 체력 소모가 큽니다.${climbPart}`;
  }
  return `${state.name}은(는) 짧은 거리라도 누적 상승고도 ${Math.round(gain)}m · 최대 경사가 가파라 숙련자용 코스입니다.${climbPart}`;
}

/**
 * 여러 GPX 비교에 대한 자연어 요약.
 * - 거리가 길지만 오르막이 완만한 코스가 있는 경우를 우선 짚어준다.
 * - 짧지만 오르막 경사가 더 높은 경우도 함께 언급한다.
 */
export function buildMultiRouteSummary(rows: RouteCompareRow[]): string {
  if (rows.length === 0) {
    return '비교할 경로가 없습니다.';
  }
  if (rows.length === 1) {
    return rows[0].interpretation;
  }
  // 1) 거리순, 2) 오르막 경사도순 정렬
  const byDistance = [...rows].sort(
    (a, b) => b.totalDistanceKm - a.totalDistanceKm
  );
  const byClimbGrade = [...rows].sort(
    (a, b) => b.climbHardestAvgGradePercent - a.climbHardestAvgGradePercent
  );
  const long = byDistance[0];
  const short = byDistance[byDistance.length - 1];
  const steepestClimb = byClimbGrade[0];
  const gentlestClimb = byClimbGrade[byClimbGrade.length - 1];

  if (long.id === short.id) {
    return `${rows.length}개 경로의 난이도가 비슷합니다.`;
  }

  const parts: string[] = [];
  parts.push(
    `${long.name} 은(는) 거리가 ${long.totalDistanceKm.toFixed(1)}km 로 가장 길고, ${short.name} 은(는) ${short.totalDistanceKm.toFixed(1)}km 입니다.`
  );
  if (
    steepestClimb.climbHardestAvgGradePercent > 0 &&
    gentlestClimb.climbHardestAvgGradePercent > 0 &&
    steepestClimb.id !== gentlestClimb.id
  ) {
    parts.push(
      `가장 가파른 오르막은 ${steepestClimb.name} (평균 ${steepestClimb.climbHardestAvgGradePercent.toFixed(1)}%), 가장 완만한 코스는 ${gentlestClimb.name} (${gentlestClimb.climbHardestAvgGradePercent.toFixed(1)}%) 입니다.`
    );
  }
  if (long.climbCount > short.climbCount) {
    parts.push(
      `주요 오르막 개수는 ${long.name} (${long.climbCount}개) 가 더 많습니다.`
    );
  } else if (short.climbCount > long.climbCount) {
    parts.push(
      `주요 오르막 개수는 ${short.name} (${short.climbCount}개) 가 더 많습니다.`
    );
  }
  return parts.join(' ');
}

/** 선택 구간 한 줄 자연어 요약 (자전거 친화 문장) */
export function buildSelectionNarrative(input: {
  name: string;
  distanceKm: number;
  gain: number;
  avgGrade: number;
  maxGrade: number;
  difficulty: RouteDifficulty;
}): string {
  const { name, distanceKm, gain, avgGrade, maxGrade, difficulty } = input;
  const km = distanceKm.toFixed(1);
  const m = Math.round(gain);
  const avg = avgGrade.toFixed(1);
  const max = maxGrade.toFixed(1);
  if (difficulty === 'easy') {
    return `${name} 의 이 구간은 ${km}km 동안 ${m}m 상승, 평균 ${avg}% 로 비교적 완만합니다.`;
  }
  if (difficulty === 'moderate') {
    return `${name} 의 이 구간은 ${km}km 동안 ${m}m 상승, 평균 ${avg}% 로 보통 수준의 오르막입니다.`;
  }
  if (difficulty === 'hard') {
    return `이 구간은 ${km}km 동안 ${m}m 상승, 평균 ${avg}% / 최대 ${max}% 로 체감 난이도가 높은 오르막입니다.`;
  }
  return `이 구간은 짧지만 평균 ${avg}% / 최대 ${max}% 로 매우 힘든 오르막입니다. 숙련자 코스에 가깝습니다.`;
}

function avgGradeOf(points: TrackPoint[]): number {
  if (points.length < 2) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < points.length; i++) {
    if (Math.abs(points[i].smoothedGradePercent) > 0) {
      sum += points[i].smoothedGradePercent;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

function maxGradeOf(points: TrackPoint[]): number {
  let m = 0;
  for (let i = 1; i < points.length; i++) {
    if (Math.abs(points[i].smoothedGradePercent) > Math.abs(m)) {
      m = points[i].smoothedGradePercent;
    }
  }
  return m;
}

/** 경로 1개의 비교표 1행을 만든다 */
export function buildCompareRow(state: RouteState): RouteCompareRow {
  const avgGrade = avgGradeOf(state.trackPoints);
  const maxGrade = maxGradeOf(state.trackPoints);
  const score = calculateDifficultyScore(
    state.route.totalElevationGain,
    avgGrade,
    maxGrade
  );
  const level = scoreToDifficulty(score);
  const startEle =
    state.trackPoints[0]?.smoothedElevation ?? state.route.minElevation;
  const endEle =
    state.trackPoints[state.trackPoints.length - 1]?.smoothedElevation ??
    state.route.maxElevation;
  // 오르막 정보 (고도 데이터가 없으면 0)
  const hasElev = state.route.hasElevation;
  const climbs = hasElev
    ? detectClimbs(state.trackPoints, state.id, state.name)
    : [];
  const summary = summarizeClimbs(climbs);
  return {
    id: state.id,
    name: state.name,
    color: state.color,
    visible: state.visible,
    fileName: state.route.fileName,
    totalDistanceKm: state.route.totalDistanceKm,
    pointCount: state.route.pointCount,
    startElevation: startEle,
    endElevation: endEle,
    minElevation: state.route.minElevation,
    maxElevation: state.route.maxElevation,
    totalElevationGain: state.route.totalElevationGain,
    totalElevationLoss: state.route.totalElevationLoss,
    avgGradePercent: avgGrade,
    maxGradePercent: maxGrade,
    difficulty: level,
    difficultyScore: score,
    difficultyLabel: DIFFICULTY_LABEL[level],
    interpretation: buildInterpretation(state, summary),
    climbCount: summary.count,
    climbTotalDistanceKm: summary.totalDistanceKm,
    climbTotalGainM: summary.totalGainM,
    climbLongestDistanceKm: summary.longestDistanceKm,
    climbHardestAvgGradePercent: summary.hardestAvgGradePercent
  };
}

/** 모든 경로의 비교표 행 만들기 */
export function buildCompareTable(states: RouteState[]): RouteCompareRow[] {
  return states.map(buildCompareRow);
}

/**
 * 공통 km 구간에서 각 경로의 통계를 산출한다.
 * - 각 경로의 trackPoints 에서 startKm/endKm 에 가장 가까운 인덱스를 찾는다.
 * - 짧은 구간(< MIN_KM) 이면 hasData=false 로 표시.
 */
export const COMPARE_MIN_KM = 0.1;

export function buildSegmentCompare(
  states: RouteState[],
  selection: ComparisonSelection
): RouteSegmentCompareRow[] {
  const { startKm, endKm } = selection;
  const lo = Math.max(0, Math.min(startKm, endKm));
  const hi = Math.max(lo + COMPARE_MIN_KM, Math.max(startKm, endKm));
  const tooShort = hi - lo < COMPARE_MIN_KM;

  return states.map((state) => {
    if (tooShort) {
      return {
        id: state.id,
        name: state.name,
        color: state.color,
        visible: state.visible,
        stats: emptyStats(),
        difficulty: 'easy',
        difficultyLabel: DIFFICULTY_LABEL.easy,
        interpretation: '구간이 너무 짧아 분석이 어렵습니다.',
        hasData: false
      };
    }
    const sIdx = findClosestIndex(state.trackPoints, lo);
    const eIdx = findClosestIndex(state.trackPoints, hi);
    if (sIdx === eIdx) {
      return {
        id: state.id,
        name: state.name,
        color: state.color,
        visible: state.visible,
        stats: emptyStats(),
        difficulty: 'easy',
        difficultyLabel: DIFFICULTY_LABEL.easy,
        interpretation: '구간에 데이터가 충분하지 않습니다.',
        hasData: false
      };
    }
    const stats = computeSelectionStats(state.trackPoints, {
      startIndex: sIdx,
      endIndex: eIdx
    });
    const score = calculateDifficultyScore(
      stats.elevationGainM,
      stats.avgGradePercent,
      stats.maxGradePercent
    );
    const level = scoreToDifficulty(score);
    return {
      id: state.id,
      name: state.name,
      color: state.color,
      visible: state.visible,
      stats,
      difficulty: level,
      difficultyLabel: DIFFICULTY_LABEL[level],
      interpretation: buildSegmentInterpretation(state.name, stats, level),
      hasData: true
    };
  });
}

function emptyStats(): SegmentStats {
  return {
    distanceKm: 0,
    elevationGainM: 0,
    elevationLossM: 0,
    avgGradePercent: 0,
    maxGradePercent: 0,
    minElevation: 0,
    maxElevation: 0,
    upRatioPercent: 0
  };
}

function buildSegmentInterpretation(
  name: string,
  stats: SegmentStats,
  level: RouteDifficulty
): string {
  const gain = Math.round(stats.elevationGainM);
  const dist = stats.distanceKm.toFixed(2);
  const grade = stats.avgGradePercent.toFixed(1);
  if (level === 'easy') {
    return `${name} 의 ${dist}km 구간은 누적 ${gain}m 상승으로 비교적 완만합니다.`;
  }
  if (level === 'moderate') {
    return `${name} 의 ${dist}km 구간은 평균 경사 ${grade}% / 누적 ${gain}m 로 보통 수준입니다.`;
  }
  if (level === 'hard') {
    return `${name} 의 ${dist}km 구간은 평균 경사 ${grade}% / 누적 ${gain}m 로 어려운 구간입니다.`;
  }
  return `${name} 의 ${dist}km 구간은 평균 경사 ${grade}% / 누적 ${gain}m 로 매우 어려운 구간입니다.`;
}

function findClosestIndex(points: TrackPoint[], km: number): number {
  if (points.length === 0) return 0;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].cumulativeDistanceKm < km) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0) {
    const a = points[lo - 1];
    const b = points[lo];
    if (
      Math.abs(a.cumulativeDistanceKm - km) <
      Math.abs(b.cumulativeDistanceKm - km)
    ) {
      return lo - 1;
    }
  }
  return lo;
}

/** ID 로 빠르게 경로를 찾는 헬퍼 */
export function indexById(
  states: RouteState[]
): Map<RouteId, RouteState> {
  const m = new Map<RouteId, RouteState>();
  for (const s of states) m.set(s.id, s);
  return m;
}

/**
 * 모든 라우트의 전체 bounds (visible 만) 를 Leaflet 형식으로 반환.
 * 0개일 때는 단일 라우트와 동일하게 fallback.
 */
export function computeUnionBounds(
  states: RouteState[]
): [[number, number], [number, number]] {
  if (states.length === 0) {
    return [
      [-85, -180],
      [85, 180]
    ];
  }
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  for (const s of states) {
    if (!s.visible) continue;
    const [[sLat, sLng], [nLat, eLng]] = s.route.bounds;
    if (sLat < minLat) minLat = sLat;
    if (sLng < minLng) minLng = sLng;
    if (nLat > maxLat) maxLat = nLat;
    if (eLng > maxLng) maxLng = eLng;
  }
  if (!isFinite(minLat)) {
    // visible 이 0개
    const first = states[0];
    return first.route.bounds;
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng]
  ];
}
