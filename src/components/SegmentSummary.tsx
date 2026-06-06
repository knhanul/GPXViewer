import { ArrowDown, ArrowUp, Gauge, Map, Mountain, Ruler } from 'lucide-react';
import { formatDistanceKm } from '../utils/routeUtils';
import { formatElevation, formatGrade } from '../utils/elevationUtils';
import type { SegmentSelection, SegmentStats, TrackPoint } from '../types/gpx';

interface SegmentSummaryProps {
  selection: SegmentSelection | null;
  stats: SegmentStats;
  trackPoints: TrackPoint[];
}

/**
 * 선택 구간에 대한 핵심 지표 요약 카드.
 * - 거리, 상승/하강, 평균/최대 경사도, 고도 범위
 * - 선택된 구간의 시작/종료 km 표시
 */
export function SegmentSummary({
  selection,
  stats,
  trackPoints
}: SegmentSummaryProps) {
  const startKm =
    selection && trackPoints[Math.min(selection.startIndex, selection.endIndex)]
      ? trackPoints[Math.min(selection.startIndex, selection.endIndex)]
          .cumulativeDistanceKm
      : null;
  const endKm =
    selection && trackPoints[Math.max(selection.startIndex, selection.endIndex)]
      ? trackPoints[Math.max(selection.startIndex, selection.endIndex)]
          .cumulativeDistanceKm
      : null;

  if (!selection) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-ink-700/40 p-4 text-xs text-zinc-500">
        구간을 선택하면 상세 통계가 표시됩니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard
        icon={<Ruler className="h-3.5 w-3.5 text-zinc-300" aria-hidden />}
        label="거리"
        value={`${formatDistanceKm(stats.distanceKm)}`}
        unit="km"
        subline={
          startKm != null && endKm != null
            ? `${startKm.toFixed(2)}–${endKm.toFixed(2)} km`
            : undefined
        }
      />
      <StatCard
        icon={<ArrowUp className="h-3.5 w-3.5 text-accent" aria-hidden />}
        label="상승"
        value={formatElevation(stats.elevationGainM)}
        subline="누적"
        tone="accent"
      />
      <StatCard
        icon={<ArrowDown className="h-3.5 w-3.5 text-trail-start" aria-hidden />}
        label="하강"
        value={formatElevation(stats.elevationLossM)}
        subline="누적"
        tone="trail"
      />
      <StatCard
        icon={<Gauge className="h-3.5 w-3.5 text-zinc-300" aria-hidden />}
        label="평균 경사"
        value={formatGrade(stats.avgGradePercent)}
        tone={
          stats.avgGradePercent > 0
            ? 'accent'
            : stats.avgGradePercent < 0
              ? 'trail'
              : 'neutral'
        }
      />
      <StatCard
        icon={<Mountain className="h-3.5 w-3.5 text-zinc-300" aria-hidden />}
        label="최고점"
        value={`${Math.round(stats.maxElevation)}`}
        unit="m"
      />
      <StatCard
        icon={<Map className="h-3.5 w-3.5 text-zinc-300" aria-hidden />}
        label="최저점"
        value={`${Math.round(stats.minElevation)}`}
        unit="m"
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  subline?: string;
  tone?: 'accent' | 'trail' | 'neutral';
}

function StatCard({ icon, label, value, unit, subline, tone = 'neutral' }: StatCardProps) {
  const toneClass =
    tone === 'accent'
      ? 'text-accent'
      : tone === 'trail'
        ? 'text-trail-start'
        : 'text-zinc-100';
  return (
    <div className="rounded-xl bg-ink-900/60 p-3">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
        {icon} {label}
      </p>
      <p className={`mt-1 font-mono text-lg font-semibold ${toneClass}`}>
        {value}
        {unit ? <span className="ml-0.5 text-xs text-zinc-500">{unit}</span> : null}
      </p>
      {subline ? (
        <p className="mt-0.5 font-mono text-[10px] text-zinc-500">{subline}</p>
      ) : null}
    </div>
  );
}
