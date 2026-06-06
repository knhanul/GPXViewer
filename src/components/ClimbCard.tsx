// 개별 오르막 한 줄 카드.
// 클릭하면 해당 구간이 선택되어 지도/차트에서 강조된다.

import { ChevronRight, Mountain, TrendingUp } from 'lucide-react';
import type { RouteClimb } from '../types/climb';
import { formatGrade } from '../utils/elevationUtils';

interface ClimbCardProps {
  climb: RouteClimb;
  selected?: boolean;
  onClick?: () => void;
}

export function ClimbCard({ climb, selected, onClick }: ClimbCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
        selected
          ? 'border-accent/60 bg-accent/10 ring-1 ring-accent/40'
          : 'border-white/5 bg-ink-900/40 hover:border-white/15 hover:bg-ink-900/70'
      ].join(' ')}
      aria-pressed={selected}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: `${climb.difficultyColor}22`,
          color: climb.difficultyColor
        }}
        aria-hidden
      >
        {climb.avgGradePercent >= 6 ? (
          <Mountain className="h-4 w-4" />
        ) : (
          <TrendingUp className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] text-zinc-400">
          {climb.startKm.toFixed(1)} – {climb.endKm.toFixed(1)} km
        </p>
        <p className="truncate font-display text-sm font-semibold text-zinc-100">
          오르막 {climb.index} · +{Math.round(climb.elevationGainM)}m ·{' '}
          {formatGrade(climb.avgGradePercent)}
        </p>
      </div>
      <div className="text-right">
        <p
          className="rounded-full border border-white/10 bg-ink-900/60 px-2 py-0.5 text-[10px] font-semibold"
          style={{ color: climb.difficultyColor }}
        >
          {climb.difficultyLabel}
        </p>
        <p className="mt-1 font-mono text-[10px] text-zinc-500">
          {climb.distanceKm.toFixed(1)}km
        </p>
      </div>
      <ChevronRight
        className={[
          'h-4 w-4 shrink-0 transition',
          selected ? 'text-accent' : 'text-zinc-600 group-hover:text-zinc-400'
        ].join(' ')}
        aria-hidden
      />
    </button>
  );
}
