// 선택 구간 상세 통계 + 자연어 요약.
// - 보정된 고도/경사도를 기준으로 산출된 SegmentStats 를 표시한다.
// - 카드 형태로 거리/상승/하강/평균 경사/최대 경사/고도 범위/오르막 비율 + 난이도 표시
// - 마지막에 자전거 친화 한 줄 해석 문장 추가

import {
  ArrowDown,
  ArrowUp,
  Gauge,
  Map,
  Mountain,
  Ruler,
  TrendingUp
} from 'lucide-react';
import { formatDistanceKm } from '../utils/routeUtils';
import { formatElevation, formatGrade } from '../utils/elevationUtils';
import { calculateDifficultyScore, scoreToDifficulty, DIFFICULTY_LABEL, DIFFICULTY_COLOR } from '../utils/segmentUtils';
import { buildSelectionNarrative } from '../utils/segmentUtils';
import type { SegmentSelection, SegmentStats, TrackPoint } from '../types/gpx';

interface SegmentSummaryProps {
  selection: SegmentSelection | null;
  stats: SegmentStats;
  trackPoints: TrackPoint[];
  /** 선택한 구간이 속한 경로의 이름 (자연어 요약에 사용) */
  routeName?: string;
}

/**
 * 선택 구간에 대한 핵심 지표 요약 카드.
 */
export function SegmentSummary({
  selection,
  stats,
  trackPoints,
  routeName
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

  const score = calculateDifficultyScore(
    stats.elevationGainM,
    stats.avgGradePercent,
    stats.maxGradePercent
  );
  const level = scoreToDifficulty(score);
  const levelColor = DIFFICULTY_COLOR[level];
  const levelLabel = DIFFICULTY_LABEL[level];
  const narrative = buildSelectionNarrative({
    name: routeName ?? '이 경로',
    distanceKm: stats.distanceKm,
    gain: stats.elevationGainM,
    avgGrade: stats.avgGradePercent,
    maxGrade: stats.maxGradePercent,
    difficulty: level
  });

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Ruler className="h-3.5 w-3.5 text-zinc-300" aria-hidden />}
          label="선택 거리"
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
          label="누적 상승"
          value={formatElevation(stats.elevationGainM)}
          subline="상승고도"
          tone="accent"
        />
        <StatCard
          icon={<ArrowDown className="h-3.5 w-3.5 text-trail-start" aria-hidden />}
          label="누적 하강"
          value={formatElevation(stats.elevationLossM)}
          subline="하강고도"
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
          icon={<TrendingUp className="h-3.5 w-3.5 text-zinc-300" aria-hidden />}
          label="최대 경사"
          value={formatGrade(stats.maxGradePercent)}
          tone={
            stats.maxGradePercent > 0
              ? 'accent'
              : stats.maxGradePercent < 0
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
        <StatCard
          icon={<ArrowUp className="h-3.5 w-3.5 text-zinc-300" aria-hidden />}
          label="오르막 비율"
          value={`${stats.upRatioPercent.toFixed(0)}%`}
          subline="구간 중 상승 거리"
        />
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-ink-900/60 px-3 py-2">
        <span
          className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold"
          style={{ color: levelColor, background: `${levelColor}22` }}
        >
          {levelLabel}
        </span>
        <p className="text-[12px] leading-snug text-zinc-200">{narrative}</p>
      </div>
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
