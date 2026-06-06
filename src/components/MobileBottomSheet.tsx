import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronUp, Mountain, ListOrdered, BarChart3, GitCompareArrows, TrendingUp } from 'lucide-react';
import type {
  ComparisonSelection,
  RouteCompareRow,
  RouteId,
  RouteSegmentCompareRow,
  RouteState,
  SegmentSelection,
  SegmentStats,
  TrackPoint
} from '../types/gpx';
import { ElevationProfile } from './ElevationProfile';
import { SegmentList } from './SegmentList';
import { SegmentSummary } from './SegmentSummary';
import { RouteListPanel } from './RouteListPanel';
import { RouteCompareTable } from './RouteCompareTable';
import { MultiElevationProfile } from './MultiElevationProfile';
import { SegmentComparePanel } from './SegmentComparePanel';
import type { ElevationPoint } from '../types/gpx';

type SheetState = 'peek' | 'expanded';
export type SheetTab = 'routes' | 'compare' | 'chart' | 'segment';

const DEFAULT_COMPARISON: ComparisonSelection = { startKm: 0, endKm: 1 };

interface MobileBottomSheetProps {
  routes: RouteState[];
  activeRouteId: RouteId | null;
  onActivate: (id: RouteId) => void;
  onToggleVisible: (id: RouteId) => void;
  onRemove: (id: RouteId) => void;
  onRename: (id: RouteId, name: string) => void;
  onRecolor: (id: RouteId, color: string) => void;
  onFitAll: () => void;
  /** 단일 라우트 활성 시 사용되는 데이터 */
  trackPoints: TrackPoint[];
  elevationPoints: ElevationPoint[];
  selection: SegmentSelection | null;
  selectionStats: SegmentStats;
  onSelectionChange: (s: SegmentSelection | null) => void;
  /** 공통 km 구간 비교용 */
  comparison: ComparisonSelection | null;
  onComparisonChange: (s: ComparisonSelection | null) => void;
  segmentCompareRows: RouteSegmentCompareRow[];
  /** 경로별 비교표 (12개 지표) */
  compareRows: RouteCompareRow[];
}

export function MobileBottomSheet(props: MobileBottomSheetProps) {
  const {
    routes,
    activeRouteId,
    onActivate,
    onToggleVisible,
    onRemove,
    onRename,
    onRecolor,
    onFitAll,
    trackPoints,
    elevationPoints,
    selection,
    selectionStats,
    onSelectionChange,
    comparison,
    onComparisonChange,
    segmentCompareRows,
    compareRows
  } = props;
  const [state, setState] = useState<SheetState>('peek');
  const [tab, setTab] = useState<SheetTab>('routes');
  const dragStartY = useRef<number | null>(null);

  const activeRoute = useMemo(
    () => routes.find((r) => r.id === activeRouteId) ?? null,
    [routes, activeRouteId]
  );

  useEffect(() => {
    if (routes.length > 0) {
      setState('expanded');
    } else {
      setState('peek');
      setTab('routes');
    }
  }, [routes.length]);

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    dragStartY.current = e.clientY;
  };
  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (dragStartY.current == null) return;
    const dy = e.clientY - dragStartY.current;
    if (dy < -40) setState('expanded');
    else if (dy > 40) setState('peek');
    dragStartY.current = null;
  };

  const heightClass =
    state === 'expanded' ? 'h-[84vh]' : 'h-[36vh] min-h-[200px]';

  return (
    <div
      className={[
        'bottom-sheet',
        'fixed inset-x-0 bottom-0 z-30',
        'flex flex-col rounded-t-2xl border-t border-white/10 bg-ink-800/95',
        'shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur',
        'transition-[height] duration-300 ease-out',
        heightClass
      ].join(' ')}
      role="region"
      aria-label="경로 패널"
      aria-expanded={state === 'expanded'}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none items-center justify-center pt-2.5 pb-2 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={() =>
          setState((s) => (s === 'expanded' ? 'peek' : 'expanded'))
        }
        role="button"
        tabIndex={0}
        aria-label={state === 'expanded' ? '패널 접기' : '패널 펼치기'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setState((s) => (s === 'expanded' ? 'peek' : 'expanded'));
          }
        }}
      >
        <div className="h-1.5 w-12 rounded-full bg-white/15" />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pb-2">
        <div role="tablist" className="flex items-center gap-1">
          <TabButton
            active={tab === 'routes'}
            onClick={() => setTab('routes')}
            label="경로"
            icon={<ListOrdered className="h-3.5 w-3.5" />}
          />
          <TabButton
            active={tab === 'compare'}
            onClick={() => setTab('compare')}
            label="비교"
            icon={<GitCompareArrows className="h-3.5 w-3.5" />}
          />
          {routes.length > 0 ? (
            <>
              <TabButton
                active={tab === 'chart'}
                onClick={() => setTab('chart')}
                label="차트"
                icon={<BarChart3 className="h-3.5 w-3.5" />}
              />
              <TabButton
                active={tab === 'segment'}
                onClick={() => setTab('segment')}
                label="구간"
                icon={<TrendingUp className="h-3.5 w-3.5" />}
              />
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() =>
            setState((s) => (s === 'expanded' ? 'peek' : 'expanded'))
          }
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/5 active:scale-95"
          aria-label={state === 'expanded' ? '패널 접기' : '패널 펼치기'}
        >
          <ChevronUp
            className={[
              'h-4 w-4 transition-transform duration-300',
              state === 'expanded' ? 'rotate-180' : ''
            ].join(' ')}
          />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto px-2 pb-[max(env(safe-area-inset-bottom),12px)]"
      >
        {tab === 'routes' ? (
          <div className="space-y-3">
            <RouteListPanel
              routes={routes}
              activeRouteId={activeRouteId}
              onActivate={onActivate}
              onToggleVisible={onToggleVisible}
              onRemove={onRemove}
              onRename={onRename}
              onRecolor={onRecolor}
              onFitAll={onFitAll}
            />
            {activeRoute ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: activeRoute.color }}
                  />
                  <p className="text-xs font-semibold text-zinc-300">
                    {activeRoute.name}
                  </p>
                </div>
                <ElevationProfile
                  points={elevationPoints}
                  selection={selection}
                  trackPoints={trackPoints}
                  onSelectionChange={onSelectionChange}
                  totalDistanceKm={activeRoute.route.totalDistanceKm}
                  minElevation={activeRoute.route.minElevation}
                  maxElevation={activeRoute.route.maxElevation}
                  hasElevation={activeRoute.route.hasElevation}
                  height={170}
                />
                <SegmentSummary
                  selection={selection}
                  stats={selectionStats}
                  trackPoints={trackPoints}
                />
                <SegmentList
                  segments={activeRoute.segments}
                  selection={selection}
                  onSelect={(seg) =>
                    onSelectionChange({
                      startIndex: seg.startIndex,
                      endIndex: seg.endIndex
                    })
                  }
                  maxHeightPx={window.innerHeight * 0.4}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-ink-700/40 p-4 text-xs text-zinc-500">
                <Mountain className="h-4 w-4" />
                경로를 업로드하면 분석이 시작됩니다.
              </div>
            )}
          </div>
        ) : tab === 'compare' ? (
          <RouteCompareTable
            rows={compareRows}
            onToggleVisible={onToggleVisible}
          />
        ) : tab === 'chart' ? (
          <MultiElevationProfile
            routes={routes}
            highlightRange={comparison}
            onHighlightChange={onComparisonChange}
            height={200}
          />
        ) : (
          <SegmentComparePanel
            routes={routes}
            selection={comparison ?? DEFAULT_COMPARISON}
            onSelectionChange={(s) => onComparisonChange(s)}
            rows={segmentCompareRows}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition',
        active
          ? 'bg-accent/15 text-accent'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}
