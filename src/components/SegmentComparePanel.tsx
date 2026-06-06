import { useEffect, useState } from 'react';
import { AlertTriangle, Gauge, MapPin, Ruler, TrendingDown, TrendingUp } from 'lucide-react';
import { formatDistanceKm } from '../utils/routeUtils';
import { formatGrade } from '../utils/elevationUtils';
import { DIFFICULTY_COLOR, COMPARE_MIN_KM } from '../utils/segmentUtils';
import type { ComparisonSelection, RouteSegmentCompareRow, RouteState } from '../types/gpx';

interface SegmentComparePanelProps {
  routes: RouteState[];
  selection: ComparisonSelection;
  onSelectionChange: (s: ComparisonSelection) => void;
  rows: RouteSegmentCompareRow[];
}

/**
 * 공통 km 구간 비교 패널.
 * - 시작/종료 km 입력 (number)
 * - 너무 짧으면 안내
 * - 경로별 결과 카드 표시
 */
export function SegmentComparePanel({
  routes,
  selection,
  onSelectionChange,
  rows
}: SegmentComparePanelProps) {
  // 가장 긴 경로의 총 거리를 기본 끝값으로 사용
  const maxDistance = Math.max(
    1,
    ...routes.map((r) => r.route.totalDistanceKm)
  );

  const [startStr, setStartStr] = useState(selection.startKm.toFixed(2));
  const [endStr, setEndStr] = useState(selection.endKm.toFixed(2));

  // selection prop 이 외부에서 바뀌면 동기화
  useEffect(() => {
    setStartStr(selection.startKm.toFixed(2));
    setEndStr(selection.endKm.toFixed(2));
  }, [selection.startKm, selection.endKm]);

  const tooShort =
    Math.abs(parseFloat(endStr) - parseFloat(startStr)) < COMPARE_MIN_KM;

  const commit = () => {
    const s = Math.max(0, parseFloat(startStr) || 0);
    const e = Math.max(s, parseFloat(endStr) || s);
    onSelectionChange({ startKm: s, endKm: e });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-ink-700/60 p-3">
        <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
          공통 구간 선택
        </p>
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="시작 km"
            value={startStr}
            onChange={setStartStr}
            onCommit={commit}
            min={0}
            max={maxDistance}
          />
          <NumField
            label="종료 km"
            value={endStr}
            onChange={setEndStr}
            onCommit={commit}
            min={0}
            max={maxDistance}
          />
        </div>
        <input
          type="range"
          min={0}
          max={maxDistance}
          step={0.1}
          value={selection.startKm}
          onChange={(e) =>
            onSelectionChange({
              startKm: parseFloat(e.target.value),
              endKm: Math.max(parseFloat(e.target.value) + COMPARE_MIN_KM, selection.endKm)
            })
          }
          className="mt-3 w-full accent-accent"
          aria-label="시작 km 슬라이더"
        />
        <input
          type="range"
          min={0}
          max={maxDistance}
          step={0.1}
          value={selection.endKm}
          onChange={(e) =>
            onSelectionChange({
              startKm: Math.min(selection.startKm, parseFloat(e.target.value)),
              endKm: parseFloat(e.target.value)
            })
          }
          className="mt-1 w-full accent-accent"
          aria-label="종료 km 슬라이더"
        />
        <p className="mt-2 font-mono text-[11px] text-zinc-400">
          {selection.startKm.toFixed(2)} – {selection.endKm.toFixed(2)} km (
          {formatDistanceKm(
            Math.abs(selection.endKm - selection.startKm)
          )}{' '}
          km 구간)
        </p>
        {tooShort ? (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            구간이 {COMPARE_MIN_KM}km 미만이면 분석이 어렵습니다.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-white/10 bg-ink-700/40 p-3 text-center text-xs text-zinc-500">
            비교할 경로가 없습니다.
          </div>
        ) : (
          rows.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-white/10 bg-ink-700/60 p-3"
            >
              <header className="mb-2 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: r.color, opacity: r.visible ? 1 : 0.4 }}
                />
                <p className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-zinc-100">
                  {r.name}
                </p>
                <span
                  className="rounded-full border border-white/10 bg-ink-900/60 px-2 py-0.5 text-[10px] font-semibold"
                  style={{ color: DIFFICULTY_COLOR[r.difficulty] }}
                >
                  {r.difficultyLabel}
                </span>
              </header>
              {!r.hasData ? (
                <p className="text-xs text-zinc-500">{r.interpretation}</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <Mini
                      icon={<Ruler className="h-3 w-3" />}
                      label="거리"
                      value={`${formatDistanceKm(r.stats.distanceKm)} km`}
                    />
                    <Mini
                      icon={<TrendingUp className="h-3 w-3 text-accent" />}
                      label="상승"
                      value={`${Math.round(r.stats.elevationGainM)} m`}
                    />
                    <Mini
                      icon={<TrendingDown className="h-3 w-3 text-trail-start" />}
                      label="하강"
                      value={`${Math.round(r.stats.elevationLossM)} m`}
                    />
                    <Mini
                      icon={<Gauge className="h-3 w-3" />}
                      label="평균/최대"
                      value={`${formatGrade(r.stats.avgGradePercent)} / ${formatGrade(
                        r.stats.maxGradePercent
                      )}`}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                    {r.interpretation}
                  </p>
                </>
              )}
            </article>
          ))
        )}
      </div>
      <p className="flex items-center gap-1 px-1 text-[10px] text-zinc-500">
        <MapPin className="h-3 w-3" /> 지도에서 선택 구간이 노란색으로 강조됩니다.
      </p>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  onCommit,
  min,
  max
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  min: number;
  max: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <input
        type="number"
        step={0.1}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit();
        }}
        className="mt-1 w-full rounded-md border border-white/10 bg-ink-900 px-2 py-1 font-mono text-sm text-zinc-100 outline-none focus:border-accent/60"
      />
    </label>
  );
}

function Mini({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-ink-900/60 p-2">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
        {icon} {label}
      </p>
      <p className="mt-0.5 font-mono text-[12px] text-zinc-100">{value}</p>
    </div>
  );
}
