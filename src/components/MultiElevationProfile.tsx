import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { AlertTriangle, X } from 'lucide-react';
import type {
  ComparisonSelection,
  ElevationPoint,
  TrackPoint
} from '../types/gpx';
import type { RouteState } from '../types/gpx';

interface MultiElevationProfileProps {
  routes: RouteState[];
  highlightRange?: ComparisonSelection | null;
  onHighlightChange?: (range: ComparisonSelection | null) => void;
  height?: number;
}

/**
 * 여러 GPX 의 고도 그래프를 겹쳐서 그리는 차트.
 * - X 축: 누적거리 km (모든 경로의 최대값 기준)
 * - Y 축: 고도 m
 * - 각 경로의 선 색상 = route.color
 * - 드래그/더블탭으로 공통 km 구간 선택 → 상위 onHighlightChange 호출
 * - 고도 데이터가 없는 경로는 자동으로 제외 + 안내
 */
export function MultiElevationProfile({
  routes,
  highlightRange = null,
  onHighlightChange,
  height = 240
}: MultiElevationProfileProps) {
  // 고도 있는 경로만 분리
  const elevRoutes = useMemo(
    () => routes.filter((r) => r.visible && r.route.hasElevation),
    [routes]
  );
  const noElevRoutes = useMemo(
    () => routes.filter((r) => r.visible && !r.route.hasElevation),
    [routes]
  );

  // X축 최대값
  const maxX = useMemo(() => {
    let m = 0;
    for (const s of routes) {
      if (s.trackPoints.length === 0) continue;
      const last = s.trackPoints[s.trackPoints.length - 1].cumulativeDistanceKm;
      if (last > m) m = last;
    }
    return m;
  }, [routes]);

  // Y축 도메인 (모든 고도 데이터의 min/max)
  const yDomain = useMemo<[number, number]>(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const s of elevRoutes) {
      for (const p of s.elevationPoints) {
        if (p.elevation < min) min = p.elevation;
        if (p.elevation > max) max = p.elevation;
      }
    }
    if (!isFinite(min)) return [0, 1];
    const pad = Math.max(5, (max - min) * 0.05);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [elevRoutes]);

  // 차트 데이터: distance 기준으로 모든 시리즈를 정렬 병합
  // (재빌드 비용을 줄이기 위해 별도 key 사용)
  const dataKey = useMemo(
    () =>
      elevRoutes
        .map((s) => s.id)
        .sort()
        .join('|'),
    [elevRoutes]
  );

  // ===== 드래그 선택 =====
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const draggingRef = useRef(false);

  const pxToKm = (clientX: number): number | null => {
    const el = containerRef.current;
    if (!el || maxX <= 0) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    return (x / rect.width) * maxX;
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!elevRoutes.length) return;
    const km = pxToKm(e.clientX);
    if (km == null) return;
    draggingRef.current = true;
    setDragStart(km);
    setDragEnd(km);
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const km = pxToKm(e.clientX);
    if (km == null) return;
    setDragEnd(km);
  };
  const onMouseUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragStart == null || dragEnd == null) return;
    onHighlightChange?.({
      startKm: Math.min(dragStart, dragEnd),
      endKm: Math.max(dragStart, dragEnd)
    });
  };
  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!elevRoutes.length) return;
    const km = pxToKm(e.clientX);
    if (km == null) return;
    onHighlightChange?.({ startKm: km, endKm: km + 1 });
  };

  useEffect(() => {
    if (!highlightRange) {
      setDragStart(null);
      setDragEnd(null);
    }
  }, [highlightRange]);

  const refLeft = dragStart ?? highlightRange?.startKm ?? null;
  const refRight = dragEnd ?? highlightRange?.endKm ?? null;

  // ===== 빈 상태 =====
  if (routes.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-ink-700/40 px-4 text-sm text-zinc-500">
        경로를 업로드하면 고도 비교가 가능합니다.
      </div>
    );
  }
  if (elevRoutes.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-ink-700/40 px-4 text-sm text-zinc-500">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span>고도 정보가 있는 경로가 없습니다.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-ink-700/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
          고도 비교 ({elevRoutes.length}개)
        </p>
        {highlightRange ? (
          <button
            type="button"
            onClick={() => onHighlightChange?.(null)}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-900/60 px-2 py-0.5 text-[11px] text-zinc-300 transition hover:bg-ink-900"
          >
            <X className="h-3 w-3" /> 구간 해제
          </button>
        ) : (
          <p className="text-[11px] text-zinc-500">
            드래그: 공통 구간 선택 · 더블탭: 1km 단일
          </p>
        )}
      </div>
      {noElevRoutes.length > 0 ? (
        <p className="text-[11px] text-zinc-500">
          고도 데이터 없음: {noElevRoutes.map((r) => r.name).join(', ')}
        </p>
      ) : null}
      <div
        ref={containerRef}
        className="relative select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => {
          if (draggingRef.current) draggingRef.current = false;
        }}
        onDoubleClick={onDoubleClick}
        style={{ cursor: 'crosshair' }}
      >
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={[]}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            key={dataKey}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.05)" />
            <XAxis
              type="number"
              dataKey="distance"
              domain={[0, maxX]}
              tickFormatter={(v: number) => `${v.toFixed(1)}`}
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
            />
            <YAxis
              type="number"
              domain={yDomain}
              tickFormatter={(v: number) => `${Math.round(v)}`}
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
              width={36}
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
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="plainline"
              formatter={(value) => (
                <span className="text-zinc-300">{value}</span>
              )}
            />
            {elevRoutes.map((s) => (
              <Line
                key={s.id}
                data={s.elevationPoints as ElevationPoint[]}
                type="monotone"
                dataKey="elevation"
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
            {refLeft != null && refRight != null ? (
              <ReferenceArea
                x1={Math.min(refLeft, refRight)}
                x2={Math.max(refLeft, refRight)}
                strokeOpacity={0.3}
                stroke="#FBBF24"
                fill="#FBBF24"
                fillOpacity={0.15}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function _findClosest(_points: TrackPoint[], _km: number): number {
  return 0;
}
void _findClosest;
