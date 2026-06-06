import { Eye, EyeOff } from 'lucide-react';
import { formatDistanceKm } from '../utils/routeUtils';
import { formatGrade } from '../utils/elevationUtils';
import { DIFFICULTY_COLOR } from '../utils/segmentUtils';
import type { RouteCompareRow } from '../types/gpx';

interface RouteCompareTableProps {
  rows: RouteCompareRow[];
  onToggleVisible?: (id: string) => void;
}

/**
 * 12개 지표 비교표.
 * - 모바일: 가로 스크롤 (overflow-x-auto)
 * - 각 행 첫 열은 색상 칩 + 경로명 + 표시 토글 버튼
 */
export function RouteCompareTable({ rows, onToggleVisible }: RouteCompareTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-ink-700/40 p-4 text-xs text-zinc-500">
        비교할 경로가 없습니다.
      </div>
    );
  }

  const metrics: Array<{
    label: string;
    key: keyof RouteCompareRow;
    render: (r: RouteCompareRow) => React.ReactNode;
    highlight?: boolean;
  }> = [
    {
      label: '총 거리',
      key: 'totalDistanceKm',
      render: (r) => `${formatDistanceKm(r.totalDistanceKm)} km`
    },
    {
      label: '포인트 수',
      key: 'pointCount',
      render: (r) => `${r.pointCount.toLocaleString()}개`
    },
    {
      label: '시작 고도',
      key: 'startElevation',
      render: (r) => `${Math.round(r.startElevation)} m`
    },
    {
      label: '종료 고도',
      key: 'endElevation',
      render: (r) => `${Math.round(r.endElevation)} m`
    },
    {
      label: '최저 고도',
      key: 'minElevation',
      render: (r) => `${Math.round(r.minElevation)} m`
    },
    {
      label: '최고 고도',
      key: 'maxElevation',
      render: (r) => `${Math.round(r.maxElevation)} m`
    },
    {
      label: '누적 상승',
      key: 'totalElevationGain',
      render: (r) => `${Math.round(r.totalElevationGain)} m`,
      highlight: true
    },
    {
      label: '누적 하강',
      key: 'totalElevationLoss',
      render: (r) => `${Math.round(r.totalElevationLoss)} m`
    },
    {
      label: '평균 경사',
      key: 'avgGradePercent',
      render: (r) => formatGrade(r.avgGradePercent)
    },
    {
      label: '최대 경사',
      key: 'maxGradePercent',
      render: (r) => formatGrade(r.maxGradePercent)
    },
    {
      label: '난이도',
      key: 'difficulty',
      render: (r) => (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-900/60 px-2 py-0.5 text-[11px] font-semibold"
          style={{ color: DIFFICULTY_COLOR[r.difficulty] }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: DIFFICULTY_COLOR[r.difficulty] }}
          />
          {r.difficultyLabel}
        </span>
      ),
      highlight: true
    }
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-ink-700/60">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-ink-800/70 text-left text-[11px] uppercase tracking-wider text-zinc-400">
            <th className="sticky left-0 z-10 bg-ink-800/70 px-3 py-2 font-semibold">
              지표
            </th>
            {rows.map((r) => (
              <th
                key={r.id}
                className="min-w-[140px] px-3 py-2 font-semibold"
                style={{ color: r.visible ? r.color : '#6B7280' }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: r.color, opacity: r.visible ? 1 : 0.4 }}
                  />
                  <span className="truncate font-display" title={r.name}>
                    {r.name}
                  </span>
                  {onToggleVisible ? (
                    <button
                      type="button"
                      onClick={() => onToggleVisible(r.id)}
                      className="ml-auto rounded p-1 text-zinc-400 transition hover:bg-white/5"
                      title={r.visible ? '숨기기' : '표시'}
                      aria-label={r.visible ? '숨기기' : '표시'}
                    >
                      {r.visible ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="sticky left-0 z-10 bg-ink-800/40 px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
              해석
            </td>
            {rows.map((r) => (
              <td
                key={r.id}
                className="px-3 py-2 text-xs leading-relaxed text-zinc-300"
              >
                {r.interpretation}
              </td>
            ))}
          </tr>
          {metrics.map((m, idx) => (
            <tr
              key={m.key as string}
              className={idx % 2 === 0 ? 'bg-ink-900/30' : 'bg-ink-900/0'}
            >
              <td className="sticky left-0 z-10 bg-ink-800/40 px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
                {m.label}
              </td>
              {rows.map((r) => (
                <td
                  key={r.id}
                  className={[
                    'px-3 py-2 font-mono text-[13px]',
                    m.highlight ? 'text-zinc-50 font-semibold' : 'text-zinc-200'
                  ].join(' ')}
                >
                  {m.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
