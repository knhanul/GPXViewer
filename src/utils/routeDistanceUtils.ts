// 좌표(점)와 GPX 경로(폴리라인) 사이 거리 계산 유틸.
// "경로에서 얼마나 떨어져 있는지" 참고용 안내에 사용한다.

import type { TrackPoint } from '../types/gpx';

const R = 6371; // km

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

/** 두 점 사이의 대원거리 (km) */
function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 점 p 와 폴리라인 (trackPoints) 사이의 최소 거리 (m).
 * - 보간 없이 인접 세그먼트까지의 거리만 비교한다.
 * - 비어 있으면 Infinity 반환.
 */
export function distanceToTrackMeters(
  p: { lat: number; lng: number },
  trackPoints: TrackPoint[]
): number {
  if (trackPoints.length === 0) return Infinity;
  if (trackPoints.length === 1) {
    return haversineKm(p, trackPoints[0]) * 1000;
  }
  let minM = Infinity;
  for (let i = 1; i < trackPoints.length; i++) {
    const a = trackPoints[i - 1];
    const b = trackPoints[i];
    const d = pointToSegmentMeters(p, a, b);
    if (d < minM) minM = d;
  }
  return minM;
}

/** 점과 (a, b) 세그먼트 사이 거리 (m) - 평면 근사 */
function pointToSegmentMeters(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  // 평면 근사 (단거리는 충분히 정확)
  const ax = a.lng;
  const ay = a.lat;
  const bx = b.lng;
  const by = b.lat;
  const px = p.lng;
  const py = p.lat;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return haversineKm(p, a) * 1000;
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return haversineKm(p, { lat: projY, lng: projX }) * 1000;
}
