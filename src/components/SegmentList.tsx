import { ChevronRight, Mountain, TrendingDown, TrendingUp } from 'lucide-react';
import { formatDistanceKm } from '../utils/routeUtils';
import { formatGrade } from '../utils/elevationUtils';
import type { RouteSegment, SegmentSelection } from '../types/gpx';

interface SegmentListProps {
  segments: RouteSegment[];
  selection: SegmentSelection | null;
  onSelect: (segment: RouteSegment) => void;
  maxHeightPx?: number;
}

/**
 * 1km 단위 구간 리스트.
 * - 모바일에서는 maxHeight 제한 + 스크롤
 * - 선택된 구간은 강조 스타일
 */
export function SegmentList({
  segments,
  selection,
  onSelect,
  maxHeightPx = 280
}: SegmentListProps) {
  if (segments.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/10 bg-ink-700/40 p-4 text-xs text-zinc-500">
        <Mountain className="h-4 w-4 text-zinc-600" aria-hidden />
        <span>구간 데이터가 없습니다.</span>
      </div>
    );
  }

  return (
    <ul
      className="flex flex-col gap-1.5 overflow-y-auto pr-1"
      style={{ maxHeight: maxHeightPx }}
    >
      {segments.map((seg, idx) => {
        const isSelected =
          selection != null &&
          ((selection.startIndex <= selection.endIndex &&
            selection.startIndex === seg.startIndex) ||
            (selection.startIndex > selection.endIndex &&
              selection.endIndex === seg.startIndex));
        const grade = seg.avgGradePercent;
        const isUphill = grade > 0.5;
        const isDownhill = grade < -0.5;
        const GradeIcon = isUphill
          ? TrendingUp
          : isDownhill
            ? TrendingDown
            : Mountain;
        const gradeColorClass = isUphill
          ? 'text-accent'
          : isDownhill
            ? 'text-trail-start'
            : 'text-zinc-400';

        return (
          <li key={seg.id}>
            <button
              type="button"
              onClick={() => onSelect(seg)}
              className={[
                'group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition',
                isSelected
                  ? 'border-accent/60 bg-accent/10 ring-1 ring-accent/40'
                  : 'border-white/5 bg-ink-900/40 hover:border-white/15 hover:bg-ink-900/70'
              ].join(' ')}
            >
              <div
                className={[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  isUphill
                    ? 'bg-accent/15 text-accent'
                    : isDownhill
                      ? 'bg-trail-start/15 text-trail-start'
                      : 'bg-zinc-700/30 text-zinc-400'
                ].join(' ')}
              >
                <GradeIcon className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] text-zinc-400">
                  {seg.startKm.toFixed(2)} – {seg.endKm.toFixed(2)} km
                </p>
                <p className="font-display text-sm font-semibold text-zinc-100">
                  구간 {idx + 1} · {formatDistanceKm(seg.distanceKm)} km
                </p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-sm font-semibold ${gradeColorClass}`}>
                  {formatGrade(grade)}
                </p>
                <p className="font-mono text-[10px] text-zinc-500">
                  {Math.round(seg.elevationGainM)}↑ {Math.round(seg.elevationLossM)}↓
                </p>
              </div>
              <ChevronRight
                className={[
                  'h-4 w-4 shrink-0 transition',
                  isSelected ? 'text-accent' : 'text-zinc-600 group-hover:text-zinc-400'
                ].join(' ')}
                aria-hidden
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
