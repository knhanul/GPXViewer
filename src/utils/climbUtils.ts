// 오르막(클라이밍) 탐지 유틸.
// 보정된 고도/경사도를 사용해 연속 상승 구간을 묶어 RouteClimb 배열을 만든다.

import type { RouteClimb, ClimbDifficulty } from '../types/climb';
import type { RouteId, TrackPoint } from '../types/gpx';

/** 난이도 → 한국어 라벨 */
export const CLIMB_DIFFICULTY_LABEL: Record<ClimbDifficulty, string> = {
  gentle: '완만함',
  moderate: '보통',
  hard: '힘든 오르막',
  extreme: '매우 힘든 오르막'
};

/** 난이도 → 표시 색상 */
export const CLIMB_DIFFICULTY_COLOR: Record<ClimbDifficulty, string> = {
  gentle: '#34D399',
  moderate: '#FACC15',
  hard: '#F97316',
  extreme: '#F472B6'
};

/** 평균 경사도(%) 로 난이도를 분류한다. */
export function classifyClimb(avgGradePercent: number): ClimbDifficulty {
  const g = Math.abs(avgGradePercent);
  if (g < 3) return 'gentle';
  if (g < 6) return 'moderate';
  if (g < 9) return 'hard';
  return 'extreme';
}

/** 단일 오르막에 대한 자연어 해석 문장. */
export function buildClimbInterpretation(input: {
  index: number;
  name: string;
  distanceKm: number;
  gain: number;
  avgGrade: number;
  maxGrade: number;
  difficulty: ClimbDifficulty;
}): string {
  const { name, distanceKm, gain, avgGrade, maxGrade, difficulty } = input;
  const km = distanceKm.toFixed(1);
  const m = Math.round(gain);
  const avg = avgGrade.toFixed(1);
  const max = maxGrade.toFixed(1);

  if (difficulty === 'gentle') {
    return `${name} 의 오르막 ${input.index} (${km}km, +${m}m) 은 평균 ${avg}% 로 완만한 코스입니다.`;
  }
  if (difficulty === 'moderate') {
    return `${name} 의 오르막 ${input.index} 은 ${km}km 동안 +${m}m, 평균 ${avg}% 로 보통 수준의 오르막입니다.`;
  }
  if (difficulty === 'hard') {
    return `${name} 의 오르막 ${input.index} 은 평균 ${avg}%, 최대 ${max}% 로 힘든 오르막입니다 (${km}km, +${m}m).`;
  }
  return `${name} 의 오르막 ${input.index} 은 평균 ${avg}%, 최대 ${max}% 로 매우 힘든 오르막입니다. 짧지만 체감 난이도가 매우 높습니다 (${km}km, +${m}m).`;
}

/**
 * TrackPoint 배열에서 주요 오르막을 탐지한다.
 *
 * 알고리즘:
 * 1) smoothedGradePercent > minGrade 인 인접 구간을 "상승 구간"으로 표시
 * 2) 연속된 상승 구간을 묶어 candidate 오르막 생성
 * 3) candidate 의 거리/상승고도/평균 경사를 계산해 최소 기준을 충족하면 채택
 * 4) 너무 짧은 candidate 는 인접 오르막과 병합 (선택)
 */
export function detectClimbs(
  trackPoints: TrackPoint[],
  routeId: RouteId,
  routeName: string,
  options: {
    minDistanceKm?: number;
    minElevationGainM?: number;
    minAvgGradePercent?: number;
  } = {}
): RouteClimb[] {
  const minDistanceKm = options.minDistanceKm ?? 0.3;
  const minElevationGainM = options.minElevationGainM ?? 20;
  const minAvgGradePercent = options.minAvgGradePercent ?? 3;

  if (trackPoints.length < 2) return [];

  // 1) 상승 구간(grade > 0.5% 인 인접 구간) 마킹
  const isUphill: boolean[] = new Array(trackPoints.length).fill(false);
  for (let i = 1; i < trackPoints.length; i++) {
    isUphill[i] = trackPoints[i].smoothedGradePercent > 0.5;
  }

  // 2) 연속된 인덱스 묶음 만들기
  type RawClimb = { startIdx: number; endIdx: number };
  const groups: RawClimb[] = [];
  let groupStart: number | null = null;
  for (let i = 0; i < trackPoints.length; i++) {
    if (isUphill[i]) {
      if (groupStart === null) groupStart = i;
    } else if (groupStart !== null) {
      groups.push({ startIdx: groupStart, endIdx: i - 1 });
      groupStart = null;
    }
  }
  if (groupStart !== null) {
    groups.push({ startIdx: groupStart, endIdx: trackPoints.length - 1 });
  }
  if (groups.length === 0) return [];

  // 3) 각 그룹의 통계 계산 + 최소 기준 필터
  const climbs: RouteClimb[] = [];
  let climbNumber = 0;
  for (const g of groups) {
    const startIdx = g.startIdx;
    const endIdx = g.endIdx;
    if (endIdx <= startIdx) continue;
    const slice = trackPoints.slice(startIdx, endIdx + 1);
    if (slice.length < 2) continue;

    const startKm = slice[0].cumulativeDistanceKm;
    const endKm = slice[slice.length - 1].cumulativeDistanceKm;
    const distanceKm = Math.max(0, endKm - startKm);
    if (distanceKm <= 0) continue;

    // 상승고도: 보정 고도 기준 (시작 → 끝의 단순 차이)
    const startElev = slice[0].smoothedElevation;
    const endElev = slice[slice.length - 1].smoothedElevation;
    const gain = Math.max(0, endElev - startElev);

    // 평균 경사 = (end-start) / distance
    const avgGrade = distanceKm > 0 ? (gain / (distanceKm * 1000)) * 100 : 0;
    // 최대 경사 = 구간 내 인접 smoothedGradePercent 최댓값
    let maxAbsGrade = 0;
    let signedMax = 0;
    let gradeSum = 0;
    let gradeCount = 0;
    for (let i = 1; i < slice.length; i++) {
      const g2 = slice[i].smoothedGradePercent;
      if (Math.abs(g2) > 0) {
        gradeSum += g2;
        gradeCount++;
        if (Math.abs(g2) > maxAbsGrade) {
          maxAbsGrade = Math.abs(g2);
          signedMax = g2;
        }
      }
    }
    const maxGrade = gradeCount > 0 ? signedMax : avgGrade;

    if (
      distanceKm < minDistanceKm ||
      gain < minElevationGainM ||
      avgGrade < minAvgGradePercent
    ) {
      continue;
    }

    const difficulty = classifyClimb(avgGrade);
    climbNumber += 1;
    const id = `${routeId}-climb-${climbNumber}`;
    const interp = buildClimbInterpretation({
      index: climbNumber,
      name: routeName,
      distanceKm,
      gain,
      avgGrade,
      maxGrade,
      difficulty
    });

    climbs.push({
      id,
      index: climbNumber,
      routeId,
      startKm,
      endKm,
      startIndex: startIdx,
      endIndex: endIdx,
      distanceKm,
      elevationGainM: gain,
      avgGradePercent: avgGrade,
      maxGradePercent: maxGrade,
      startElevation: startElev,
      endElevation: endElev,
      difficulty,
      difficultyLabel: CLIMB_DIFFICULTY_LABEL[difficulty],
      difficultyColor: CLIMB_DIFFICULTY_COLOR[difficulty],
      interpretation: interp
    });
  }
  return climbs;
}

/** 여러 오르막 통계 요약 (RouteClimb[] → 비교표/주행모드에서 사용) */
export interface ClimbSummary {
  count: number;
  totalDistanceKm: number;
  totalGainM: number;
  longestDistanceKm: number;
  hardestAvgGradePercent: number;
  hardestClimbId: string | null;
  topClimbs: RouteClimb[]; // gain 기준 상위 3개
}

export function summarizeClimbs(climbs: RouteClimb[]): ClimbSummary {
  if (climbs.length === 0) {
    return {
      count: 0,
      totalDistanceKm: 0,
      totalGainM: 0,
      longestDistanceKm: 0,
      hardestAvgGradePercent: 0,
      hardestClimbId: null,
      topClimbs: []
    };
  }
  let totalDistanceKm = 0;
  let totalGainM = 0;
  let longest = climbs[0];
  let hardest = climbs[0];
  for (const c of climbs) {
    totalDistanceKm += c.distanceKm;
    totalGainM += c.elevationGainM;
    if (c.distanceKm > longest.distanceKm) longest = c;
    if (c.avgGradePercent > hardest.avgGradePercent) hardest = c;
  }
  const top = [...climbs]
    .sort((a, b) => b.elevationGainM - a.elevationGainM)
    .slice(0, 3);
  return {
    count: climbs.length,
    totalDistanceKm,
    totalGainM,
    longestDistanceKm: longest.distanceKm,
    hardestAvgGradePercent: hardest.avgGradePercent,
    hardestClimbId: hardest.id,
    topClimbs: top
  };
}
