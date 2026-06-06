// 주요 오르막 리스트.
// - climb 가 비어 있으면 안내 문구
// - 선택된 오르막은 activeClimbId 로 강조

import { Mountain } from 'lucide-react';
import type { RouteClimb } from '../types/climb';
import { ClimbCard } from './ClimbCard';

interface ClimbListProps {
  climbs: RouteClimb[];
  activeClimbId?: string | null;
  onSelectClimb?: (climb: RouteClimb) => void;
  maxHeightPx?: number;
  emptyHint?: string;
}

export function ClimbList({
  climbs,
  activeClimbId = null,
  onSelectClimb,
  maxHeightPx = 320,
  emptyHint
}: ClimbListProps) {
  if (climbs.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/10 bg-ink-700/40 p-4 text-xs text-zinc-500">
        <Mountain className="h-4 w-4 text-zinc-600" aria-hidden />
        <span>{emptyHint ?? '뚜렷한 오르막 구간이 없습니다.'}</span>
      </div>
    );
  }
  return (
    <ul
      className="flex flex-col gap-1.5 overflow-y-auto pr-1"
      style={{ maxHeight: maxHeightPx }}
    >
      {climbs.map((c) => (
        <li key={c.id}>
          <ClimbCard
            climb={c}
            selected={c.id === activeClimbId}
            onClick={onSelectClimb ? () => onSelectClimb(c) : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
