import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Mountain, X } from 'lucide-react';
import type {
  ElevationPoint,
  SegmentSelection,
  TrackPoint
} from '../types/gpx';

interface ElevationProfileProps {
  points: ElevationPoint[];
  selection: SegmentSelection | null;
  totalDistanceKm: number;
  trackPoints: TrackPoint[];
  onSelectionChange: (selection: SegmentSelection | null) => void;
  minElevation: number;
  maxElevation: number;
  hasElevation: boolean;
  height?: number;
}

/**
 * 고도 프로필 차트 (Recharts AreaChart).
 * - wrapper div 의 native 마우스 이벤트로 드래그/탭 영역을 잡고
 *   x 좌표 비율을 거리(km) 로 변환해 구간을 선택한다.
 * - 선택된 영역은 ReferenceArea 로 강조 표시.
 * - hasElevation=false 이면 "고도 정보 없음" 안내 표시.
 */
export function ElevationProfile({
  points,
  selection,
  trackPoints,
  onSelectionChange,
  minElevation,
  maxElevation,
  hasElevation,
  height = 200
}: ElevationProfileProps) {
  const [dragStartKm, setDragStartKm] = useState<number | null>(null);
  const [dragEndKm, setDragEndKm] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  // selection → km 범위
  const selectionRange = useMemo<{ left: number; right: number } | null>(
    () => {
      if (!selection || trackPoints.length === 0) return null;
      const lo = Math.min(selection.startIndex, selection.endIndex);
      const hi = Math.max(selection.startIndex, selection.endIndex);
      const left = trackPoints[lo]?.cumulativeDistanceKm ?? 0;
      const right = trackPoints[hi]?.cumulativeDistanceKm ?? 0;
      return { left, right };
    },
    [selection, trackPoints]
  );

  // Y축 도메인 (5% 마진)
  const yDomain = useMemo<[number, number]>(() => {
    if (!hasElevation) return [0, 1];
    const padding = Math.max(5, (maxElevation - minElevation) * 0.05);
    return [Math.floor(minElevation - padding), Math.ceil(maxElevation + padding)];
  }, [hasElevation, minElevation, maxElevation]);

  // 총 거리 (X축 매핑용)
  const totalKm = useMemo(() => {
    if (trackPoints.length === 0) return 0;
    return trackPoints[trackPoints.length - 1].cumulativeDistanceKm;
  }, [trackPoints]);

  // 컨테이너 픽셀 좌표 → 거리(km) 변환
  const pxToKm = (clientX: number): number | null => {
    const el = containerRef.current;
    if (!el || totalKm <= 0) return null;
    const rect = el.getBoundingClientRect();
    // 차트 내 margin: left=0 / right=10
    // 시각적으로 가장 단순하게는 컨테이너 폭 비율을 사용
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const ratio = rect.width > 0 ? x / rect.width : 0;
    return ratio * totalKm;
  };

  // native mouse 핸들러 (컨테이너 div)
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackPoints.length) return;
    const km = pxToKm(e.clientX);
    if (km == null) return;
    draggingRef.current = true;
    setDragStartKm(km);
    setDragEndKm(km);
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const km = pxToKm(e.clientX);
    if (km == null) return;
    setDragEndKm(km);
  };
  const onMouseUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragStartKm == null || dragEndKm == null) return;
    const left = Math.min(dragStartKm, dragEndKm);
    const right = Math.max(dragStartKm, dragEndKm);
    const startIndex = findClosestIndex(trackPoints, left);
    const endIndex = findClosestIndex(trackPoints, right);
    if (startIndex !== endIndex) {
      onSelectionChange({ startIndex, endIndex });
    }
  };
  const onMouseLeave = () => {
    if (draggingRef.current) {
      draggingRef.current = false;
    }
  };

  // 더블 클릭 시 1km 단위 단일 구간 선택
  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackPoints.length) return;
    const km = pxToKm(e.clientX);
    if (km == null) return;
    const idx = findClosestIndex(trackPoints, km);
    const endKm = (trackPoints[idx]?.cumulativeDistanceKm ?? km) + 1;
    const endIdx = findClosestIndex(trackPoints, endKm);
    onSelectionChange({ startIndex: idx, endIndex: endIdx });
  };

  // ESC 등 외부에서 selection 해제 시 내부 drag 상태도 정리
  useEffect(() => {
    if (!selection) {
      setDragStartKm(null);
      setDragEndKm(null);
    }
  }, [selection]);

  // 표시할 ReferenceArea 범위
  const refLeft = dragStartKm ?? selectionRange?.left ?? null;
  const refRight = dragEndKm ?? selectionRange?.right ?? null;

  if (!hasElevation) {
    return (
      <div
        ref={containerRef}
        className="flex h-32 items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-ink-700/40 px-4 text-center text-sm text-zinc-500"
      >
        <Mountain className="h-4 w-4 text-zinc-600" aria-hidden />
        <span>이 GPX 파일에는 고도 정보가 없습니다.</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-700/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
          고도 프로필
        </p>
        {selection ? (
          <button
            type="button"
            onClick={() => onSelectionChange(null)}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-900/60 px-2 py-0.5 text-[11px] text-zinc-300 transition hover:bg-ink-900"
          >
            <X className="h-3 w-3" /> 선택 해제
          </button>
        ) : (
          <p className="text-[11px] text-zinc-500">
            드래그: 구간 선택 · 더블탭: 1km 단일 구간
          </p>
        )}
      </div>
      <div
        ref={containerRef}
        className="relative select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onDoubleClick={onDoubleClick}
        style={{ cursor: 'crosshair' }}
      >
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={points}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="elevFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#F97316" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="distance"
              type="number"
              domain={[0, totalKm || 'dataMax']}
              tickFormatter={(v: number) => `${v.toFixed(1)}`}
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
            />
            <YAxis
              domain={yDomain}
              tickFormatter={(v: number) => `${Math.round(v)}`}
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
              width={32}
              unit="m"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0F1419',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
                color: '#E5E7EB'
              }}
              labelFormatter={(v: number) => `${v.toFixed(2)} km`}
              formatter={(value: number, key: string) => {
                if (key === 'elevation') return [`${Math.round(value)} m`, '고도'];
                if (key === 'gradePercent') return [`${value.toFixed(1)}%`, '경사'];
                return [value, key];
              }}
            />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#F97316"
              strokeWidth={2}
              fill="url(#elevFill)"
              isAnimationActive={false}
            />
            {refLeft != null && refRight != null ? (
              <ReferenceArea
                x1={Math.min(refLeft, refRight)}
                x2={Math.max(refLeft, refRight)}
                strokeOpacity={0.3}
                stroke="#FBBF24"
                fill="#FBBF24"
                fillOpacity={0.18}
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
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
    if (Math.abs(a.cumulativeDistanceKm - km) < Math.abs(b.cumulativeDistanceKm - km)) {
      return lo - 1;
    }
  }
  return lo;
}
