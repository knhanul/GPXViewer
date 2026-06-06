// 고도/구간 분석 유틸.
// 누적 거리, 경사도, 상승/하강 고도, 1km 단위 구간화, 고도 보정 등을 담당한다.

import type {
  ElevationPoint,
  ParsedRoute,
  RouteSegment,
  SegmentSelection,
  SegmentStats,
  TrackPoint
} from '../types/gpx';

/**
 * 인접 좌표 사이의 평면 거리를 km 단위로 근사 계산한다.
 */
function haversineKm(
  a: [number, number],
  b: [number, number]
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 중심 이동평균으로 고도 시계열을 부드럽게 만든다.
 * - 보정 강도는 windowSize 로 조절 (기본 5)
 * - 양 끝단은 윈도우에 포함 가능한 범위로 축소
 * - 원본 길이가 0 이면 빈 배열 반환
 */
export function smoothElevationSeries(
  values: number[],
  windowSize: number = 5
): number[] {
  if (values.length === 0) return [];
  const w = Math.max(1, Math.floor(windowSize));
  if (w <= 1) return values.slice();
  const half = Math.floor(w / 2);
  const out: number[] = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(values.length - 1, i + half);
    let sum = 0;
    let count = 0;
    for (let j = lo; j <= hi; j++) {
      const v = values[j];
      if (Number.isFinite(v)) {
        sum += v;
        count++;
      }
    }
    out[i] = count > 0 ? sum / count : values[i];
  }
  return out;
}

/**
 * ParsedRoute 의 좌표를 분석용 TrackPoint 배열로 변환한다.
 * - 누적 거리(km)
 * - 인접 세그먼트 경사도(%) [원본/보정]
 * - 이동평균으로 보정된 고도(smoothedElevation)
 * - 고도(ele) 가 없거나 일부만 있으면 0 으로 채우고
 *   hasElevation=false 면 보정 결과는 원본과 동일하게 둔다.
 */
export function buildTrackPoints(
  route: ParsedRoute,
  options: { smoothingWindow?: number } = {}
): TrackPoint[] {
  const smoothingWindow = options.smoothingWindow ?? 5;
  const points: TrackPoint[] = [];
  const coords = route.coordinates;
  if (coords.length === 0) return points;

  // 1) 원본 elevation 배열 (ele 가 없거나 NaN 이면 0)
  const rawElev: number[] = coords.map((c) => {
    const v = c[2];
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  });

  // 2) 보정된 고도 (전부 0 이면 보정 효과 없음 → 원본과 동일)
  const hasAnyElevation = rawElev.some((v) => v !== 0);
  const smoothed = hasAnyElevation
    ? smoothElevationSeries(rawElev, smoothingWindow)
    : rawElev.slice();

  // 3) 누적 거리 + 원본/보정 경사도 계산
  let cumKm = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i];
    const elevation = rawElev[i];
    const smoothedElevation = smoothed[i];

    let segKm = 0;
    if (i > 0) {
      const prev = coords[i - 1];
      segKm = haversineKm([prev[0], prev[1]], [lng, lat]);
      cumKm += segKm;
    }

    const grade = computeGrade(i, coords, rawElev, segKm);
    const smoothedGrade = computeGrade(i, coords, smoothed, segKm);

    points.push({
      lat,
      lng,
      elevation,
      smoothedElevation,
      cumulativeDistanceKm: cumKm,
      gradePercent: grade,
      smoothedGradePercent: smoothedGrade
    });
  }
  return points;
}

function computeGrade(
  i: number,
  _coords: [number, number, number?][],
  elevSeries: number[],
  segKm: number
): number {
  if (i === 0) return 0;
  const elevDiff = elevSeries[i] - elevSeries[i - 1];
  if (segKm <= 0) return 0;
  const distM = segKm * 1000;
  if (distM <= 0) return 0;
  const g = (elevDiff / distM) * 100;
  if (g > 50) return 50;
  if (g < -50) return -50;
  return g;
}

/**
 * TrackPoint 배열을 Recharts 등에 넘기기 좋은 단순화 형식으로 변환.
 * - 보정된 고도/경사도를 사용한다.
 */
export function toElevationPoints(points: TrackPoint[]): ElevationPoint[] {
  return points.map((p) => ({
    distance: p.cumulativeDistanceKm,
    elevation: p.smoothedElevation,
    gradePercent: p.smoothedGradePercent
  }));
}

/**
 * 인덱스 범위에 해당하는 TrackPoint 들의 통계를 계산한다.
 * - startIndex > endIndex 면 자동 swap
 * - 보정된 고도/경사도를 기준으로 산출한다.
 */
export function computeSelectionStats(
  points: TrackPoint[],
  selection: SegmentSelection | null
): SegmentStats {
  if (
    !selection ||
    points.length === 0 ||
    selection.startIndex >= points.length ||
    selection.endIndex >= points.length
  ) {
    return emptyStats();
  }
  const startIndex = Math.min(selection.startIndex, selection.endIndex);
  const endIndex = Math.max(selection.startIndex, selection.endIndex);
  const slice = points.slice(startIndex, endIndex + 1);
  if (slice.length < 2) {
    return {
      ...emptyStats(),
      minElevation: slice[0]?.smoothedElevation ?? 0,
      maxElevation: slice[0]?.smoothedElevation ?? 0
    };
  }

  const distanceKm = Math.max(
    0,
    slice[slice.length - 1].cumulativeDistanceKm -
      slice[0].cumulativeDistanceKm
  );
  let gain = 0;
  let loss = 0;
  let gradeSum = 0;
  let gradeCount = 0;
  let maxAbsGrade = 0;
  // 오르막 비율(%) - 이동 거리에 대한 상승 거리의 비율
  let upDistanceKm = 0;
  let lastUpPoint: TrackPoint | null = null;

  for (let i = 1; i < slice.length; i++) {
    const a = slice[i - 1];
    const b = slice[i];
    const dKm = Math.max(0, b.cumulativeDistanceKm - a.cumulativeDistanceKm);
    const diff = b.smoothedElevation - a.smoothedElevation;
    if (Math.abs(diff) >= 0.5) {
      if (diff > 0) {
        gain += diff;
        if (dKm > 0) {
          upDistanceKm += dKm;
          lastUpPoint = b;
        }
      } else {
        loss += -diff;
      }
    }
    if (Math.abs(b.smoothedGradePercent) > 0) {
      gradeSum += b.smoothedGradePercent;
      gradeCount++;
      if (Math.abs(b.smoothedGradePercent) > maxAbsGrade) {
        maxAbsGrade = Math.abs(b.smoothedGradePercent);
      }
    }
  }
  // 연속 상승만 추적해서 합산 (위 단순 누적은 노이즈가 있을 수 있어,
  // 보정 고도에서 diff > 0.5 인 인접 구간의 거리만 더한다)
  // upDistanceKm 자체가 이미 그 합.
  void lastUpPoint;

  const avgGrade = gradeCount > 0 ? gradeSum / gradeCount : 0;
  const minElev = Math.min(...slice.map((p) => p.smoothedElevation));
  const maxElev = Math.max(...slice.map((p) => p.smoothedElevation));
  const upRatio = distanceKm > 0 ? (upDistanceKm / distanceKm) * 100 : 0;

  return {
    distanceKm,
    elevationGainM: gain,
    elevationLossM: loss,
    avgGradePercent: avgGrade,
    maxGradePercent: findSignedMaxGrade(slice, maxAbsGrade),
    minElevation: minElev,
    maxElevation: maxElev,
    upRatioPercent: upRatio
  };
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

function findSignedMaxGrade(
  slice: TrackPoint[],
  maxAbs: number
): number {
  if (maxAbs === 0) return 0;
  for (let i = 1; i < slice.length; i++) {
    if (Math.abs(slice[i].smoothedGradePercent) === maxAbs) {
      return slice[i].smoothedGradePercent;
    }
  }
  return 0;
}

/**
 * 입력 배열을 일정 거리 간격으로 다운샘플링한다.
 * - 시작/종료점은 항상 포함
 * - 보정된 고도 기준의 로컬 extremum 보강
 */
export function downsampleTrackPoints(
  points: TrackPoint[],
  targetCount: number
): TrackPoint[] {
  if (points.length <= targetCount) return points;
  if (targetCount < 4) return points;

  const bucketSize = points.length / (targetCount - 2);
  const result: TrackPoint[] = [points[0]];

  for (let i = 1; i < targetCount - 1; i++) {
    const bucketStart = Math.floor((i - 1) * bucketSize) + 1;
    const bucketEnd = Math.max(
      bucketStart + 1,
      Math.floor(i * bucketSize) + 1
    );
    let extremeIdx = bucketStart;
    let extremeVal = points[bucketStart].smoothedElevation;
    const isAscending =
      points[bucketStart].smoothedElevation <
      points[Math.min(bucketEnd - 1, points.length - 1)].smoothedElevation;
    for (let j = bucketStart + 1; j < bucketEnd && j < points.length; j++) {
      if (isAscending) {
        if (points[j].smoothedElevation > extremeVal) {
          extremeVal = points[j].smoothedElevation;
          extremeIdx = j;
        }
      } else {
        if (points[j].smoothedElevation < extremeVal) {
          extremeVal = points[j].smoothedElevation;
          extremeIdx = j;
        }
      }
    }
    result.push(points[extremeIdx]);
  }
  result.push(points[points.length - 1]);
  return result;
}

/**
 * 1km 단위로 트랙을 구간화한다.
 * - segmentLengthKm 기본 1km
 * - 보정된 고도/경사도 기준
 */
export function computeSegments(
  points: TrackPoint[],
  segmentLengthKm: number = 1
): RouteSegment[] {
  const segments: RouteSegment[] = [];
  if (points.length < 2) return segments;

  let segStartIdx = 0;
  let segNumber = 0;

  for (let i = 1; i < points.length; i++) {
    const reached =
      points[i].cumulativeDistanceKm - points[segStartIdx].cumulativeDistanceKm >=
      segmentLengthKm;
    if (!reached) continue;

    segments.push(
      buildSegment(points, segStartIdx, i, `seg-${segNumber}`, segmentLengthKm)
    );
    segNumber++;
    segStartIdx = i;
  }

  if (segStartIdx < points.length - 1) {
    segments.push(
      buildSegment(
        points,
        segStartIdx,
        points.length - 1,
        `seg-${segNumber}`,
        segmentLengthKm
      )
    );
  }

  return segments;
}

function buildSegment(
  points: TrackPoint[],
  startIndex: number,
  endIndex: number,
  id: string,
  targetLengthKm: number
): RouteSegment {
  const slice = points.slice(startIndex, endIndex + 1);
  const startKm = points[startIndex].cumulativeDistanceKm;
  const endKm = points[endIndex].cumulativeDistanceKm;
  const distanceKm = Math.max(0, endKm - startKm);

  let gain = 0;
  let loss = 0;
  let maxAbsGrade = 0;
  let signedMaxGrade = 0;
  let gradeSum = 0;
  let gradeCount = 0;
  for (let i = 1; i < slice.length; i++) {
    const a = slice[i - 1];
    const b = slice[i];
    const diff = b.smoothedElevation - a.smoothedElevation;
    if (Math.abs(diff) >= 0.5) {
      if (diff > 0) gain += diff;
      else loss += -diff;
    }
    if (Math.abs(b.smoothedGradePercent) > 0) {
      gradeSum += b.smoothedGradePercent;
      gradeCount++;
      if (Math.abs(b.smoothedGradePercent) > maxAbsGrade) {
        maxAbsGrade = Math.abs(b.smoothedGradePercent);
        signedMaxGrade = b.smoothedGradePercent;
      }
    }
  }
  const avgGrade = gradeCount > 0 ? gradeSum / gradeCount : 0;
  const startPoint = {
    lat: points[startIndex].lat,
    lng: points[startIndex].lng
  };
  const endPoint = {
    lat: points[endIndex].lat,
    lng: points[endIndex].lng
  };

  return {
    id,
    startIndex,
    endIndex,
    startKm,
    endKm,
    distanceKm: distanceKm > 0 ? distanceKm : targetLengthKm,
    elevationGainM: gain,
    elevationLossM: loss,
    avgGradePercent: avgGrade,
    maxGradePercent: signedMaxGrade,
    startPoint,
    endPoint
  };
}

/** 경사도에 따른 색상 (다크 테마) */
export function gradeColor(grade: number): string {
  if (grade >= 8) return '#F97316';
  if (grade >= 4) return '#FB923C';
  if (grade >= 1) return '#FDBA74';
  if (grade > -1) return '#9CA3AF';
  if (grade > -4) return '#67E8F9';
  if (grade > -8) return '#22D3EE';
  return '#0891B2';
}

/** 경사도/거리를 사람이 읽기 좋은 문자열로 */
export function formatGrade(grade: number): string {
  if (Math.abs(grade) < 0.1) return '0%';
  const sign = grade > 0 ? '+' : '';
  return `${sign}${grade.toFixed(1)}%`;
}

export function formatElevation(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)}km`;
  return `${Math.round(m)}m`;
}
