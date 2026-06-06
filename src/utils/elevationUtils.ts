// 고도/구간 분석 유틸.
// 누적 거리, 경사도, 상승/하강 고도, 1km 단위 구간화 등을 담당한다.

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
 * - turf distance 와 거의 같은 결과 (작은 구간에서는 차이 무시)
 * - 좌표가 [lng, lat, ele?] 형식이라는 점에 주의
 */
function haversineKm(
  a: [number, number],
  b: [number, number]
): number {
  const R = 6371; // km
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
 * ParsedRoute 의 좌표를 분석용 TrackPoint 배열로 변환한다.
 * - 누적 거리(km)
 * - 인접 세그먼트 경사도(%)
 * - 고도(ele) 가 없으면 0
 */
export function buildTrackPoints(route: ParsedRoute): TrackPoint[] {
  const points: TrackPoint[] = [];
  const coords = route.coordinates;
  if (coords.length === 0) return points;

  let cumKm = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lng, lat, ele] = coords[i];
    const elevation = typeof ele === 'number' ? ele : 0;

    let segKm = 0;
    if (i > 0) {
      const prev = coords[i - 1];
      segKm = haversineKm(
        [prev[0], prev[1]],
        [lng, lat]
      );
      cumKm += segKm;
    }

    // 경사도: 인접 거리 > 0 일 때만 계산
    let grade = 0;
    if (i > 0) {
      const prev = coords[i - 1];
      const prevEle = typeof prev[2] === 'number' ? prev[2] : elevation;
      const elevDiff = elevation - prevEle;
      if (segKm > 0) {
        // % = (Δelev_m / Δdist_m) * 100
        const distM = segKm * 1000;
        if (distM > 0) {
          grade = (elevDiff / distM) * 100;
          // 합리적 범위로 클램프 (±50%)
          if (grade > 50) grade = 50;
          else if (grade < -50) grade = -50;
        }
      }
    }

    points.push({
      lat,
      lng,
      elevation,
      cumulativeDistanceKm: cumKm,
      gradePercent: grade
    });
  }
  return points;
}

/**
 * TrackPoint 배열을 Recharts 등에 넘기기 좋은 단순화 형식으로 변환.
 */
export function toElevationPoints(points: TrackPoint[]): ElevationPoint[] {
  return points.map((p) => ({
    distance: p.cumulativeDistanceKm,
    elevation: p.elevation,
    gradePercent: p.gradePercent
  }));
}

/**
 * 인덱스 범위에 해당하는 TrackPoint 들의 통계를 계산한다.
 * - startIndex > endIndex 면 자동 swap
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
    return {
      distanceKm: 0,
      elevationGainM: 0,
      elevationLossM: 0,
      avgGradePercent: 0,
      maxGradePercent: 0,
      minElevation: 0,
      maxElevation: 0
    };
  }
  const startIndex = Math.min(selection.startIndex, selection.endIndex);
  const endIndex = Math.max(selection.startIndex, selection.endIndex);
  const slice = points.slice(startIndex, endIndex + 1);
  if (slice.length < 2) {
    return {
      distanceKm: 0,
      elevationGainM: 0,
      elevationLossM: 0,
      avgGradePercent: 0,
      maxGradePercent: 0,
      minElevation: slice[0]?.elevation ?? 0,
      maxElevation: slice[0]?.elevation ?? 0
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
  for (let i = 1; i < slice.length; i++) {
    const a = slice[i - 1];
    const b = slice[i];
    const diff = b.elevation - a.elevation;
    if (Math.abs(diff) >= 0.5) {
      if (diff > 0) gain += diff;
      else loss += -diff;
    }
    if (Math.abs(b.gradePercent) > 0) {
      gradeSum += b.gradePercent;
      gradeCount++;
      if (Math.abs(b.gradePercent) > maxAbsGrade) {
        maxAbsGrade = Math.abs(b.gradePercent);
      }
    }
  }
  const avgGrade = gradeCount > 0 ? gradeSum / gradeCount : 0;
  const minElev = Math.min(...slice.map((p) => p.elevation));
  const maxElev = Math.max(...slice.map((p) => p.elevation));

  return {
    distanceKm,
    elevationGainM: gain,
    elevationLossM: loss,
    avgGradePercent: avgGrade,
    maxGradePercent:
      maxAbsGrade === 0
        ? 0
        : // maxAbsGrade 와 부호가 일치하는 실제 grade
          (() => {
            let signed = 0;
            for (let i = 1; i < slice.length; i++) {
              if (Math.abs(slice[i].gradePercent) === maxAbsGrade) {
                signed = slice[i].gradePercent;
                break;
              }
            }
            return signed;
          })(),
    minElevation: minElev,
    maxElevation: maxElev
  };
}

/**
 * 입력 배열을 일정 거리 간격으로 다운샘플링한다.
 * - 시작/종료점은 항상 포함
 * - local min/max (피크/밸리) 도 우선 보존
 * - downsampleThreshold 초과 시 적용
 */
export function downsampleTrackPoints(
  points: TrackPoint[],
  targetCount: number
): TrackPoint[] {
  if (points.length <= targetCount) return points;
  if (targetCount < 4) return points;

  // LTTB (Largest-Triangle-Three-Buckets) 변형:
  // 단순 균등 샘플링 + 로컬 extremum 보강
  const bucketSize = points.length / (targetCount - 2);
  const result: TrackPoint[] = [points[0]];

  for (let i = 1; i < targetCount - 1; i++) {
    const bucketStart = Math.floor((i - 1) * bucketSize) + 1;
    const bucketEnd = Math.max(
      bucketStart + 1,
      Math.floor(i * bucketSize) + 1
    );
    // bucket 내 가장 극단적인 (min or max elevation) 포인트 선택
    let extremeIdx = bucketStart;
    let extremeVal = points[bucketStart].elevation;
    const isAscending =
      points[bucketStart].elevation < points[Math.min(bucketEnd - 1, points.length - 1)].elevation;
    for (let j = bucketStart + 1; j < bucketEnd && j < points.length; j++) {
      if (isAscending) {
        if (points[j].elevation > extremeVal) {
          extremeVal = points[j].elevation;
          extremeIdx = j;
        }
      } else {
        if (points[j].elevation < extremeVal) {
          extremeVal = points[j].elevation;
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
 * 1km (또는 사용자 지정) 단위로 트랙을 구간화한다.
 * - segmentLengthKm 기본 1km
 * - 마지막 구간은 짧을 수 있음
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

    // 구간 확정 (segStartIdx ~ i)
    segments.push(
      buildSegment(points, segStartIdx, i, `seg-${segNumber}`, segmentLengthKm)
    );
    segNumber++;
    segStartIdx = i;
  }

  // 남은 잔여 구간
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
    const diff = b.elevation - a.elevation;
    if (Math.abs(diff) >= 0.5) {
      if (diff > 0) gain += diff;
      else loss += -diff;
    }
    if (Math.abs(b.gradePercent) > 0) {
      gradeSum += b.gradePercent;
      gradeCount++;
      if (Math.abs(b.gradePercent) > maxAbsGrade) {
        maxAbsGrade = Math.abs(b.gradePercent);
        signedMaxGrade = b.gradePercent;
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

/**
 * 경사도에 따른 색상 (다크 테마).
 * - 강한 상승: 진한 오렌지
 * - 약한 상승: 연한 오렌지
 * - 평지: 회색
 * - 하강: 시안
 */
export function gradeColor(grade: number): string {
  if (grade >= 8) return '#F97316';
  if (grade >= 4) return '#FB923C';
  if (grade >= 1) return '#FDBA74';
  if (grade > -1) return '#9CA3AF';
  if (grade > -4) return '#67E8F9';
  if (grade > -8) return '#22D3EE';
  return '#0891B2';
}

/**
 * 경사도/거리를 사람이 읽기 좋은 문자열로.
 */
export function formatGrade(grade: number): string {
  if (Math.abs(grade) < 0.1) return '0%';
  const sign = grade > 0 ? '+' : '';
  return `${sign}${grade.toFixed(1)}%`;
}

export function formatElevation(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)}km`;
  return `${Math.round(m)}m`;
}
