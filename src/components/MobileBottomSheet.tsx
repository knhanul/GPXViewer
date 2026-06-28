// 모바일 하단 시트.
// - 4개 탭: 경로 / 비교 / 차트 / 구간
// - 상단에 "주행 모드" 토글 (활성화 시 시트 내용이 RideModePanel 로 바뀜)
// - 보정된 고도/경사도와 오르막 선택/위치 상태를 모두 부모(App) 로부터 받는다.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronUp,
  Mountain,
  ListOrdered,
  BarChart3,
  GitCompareArrows,
  TrendingUp,
  Bike
} from 'lucide-react';
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
import type { RouteClimb } from '../types/climb';
import type { LocationState, UserLocation } from '../types/location';
import type {
  RecordingStats,
  RecordingStatus,
  RideRecording,
  RecordingMeta
} from '../types/recording';
import { ElevationProfile } from './ElevationProfile';
import { SegmentList } from './SegmentList';
import { SegmentSummary } from './SegmentSummary';
import { RouteListPanel } from './RouteListPanel';
import { RouteCompareTable } from './RouteCompareTable';
import { MultiElevationProfile } from './MultiElevationProfile';
import { SegmentComparePanel } from './SegmentComparePanel';
import { ClimbList } from './ClimbList';
import { RideModePanel } from './RideModePanel';
import { LocationStatus } from './LocationStatus';
import { RecordingListPanel } from './RecordingListPanel';
import { RecordingDetailPanel } from './RecordingDetailPanel';
import { RideRecorderPanel } from './RideRecorderPanel';
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
  /** 다중 경로 비교 요약 (선택) */
  multiSummary?: string;
  /** 클라이밍(오르막) 관련 */
  climbs: RouteClimb[];
  activeClimbId: string | null;
  onSelectClimb: (climb: RouteClimb) => void;
  /** 현재 위치 관련 */
  locationState: LocationState;
  onRequestLocation: () => void;
  onResetLocation: () => void;
  offRouteMeters: number | null;
  /** "내 위치로 이동" 트리거 */
  panToUserTrigger: number;
  /** 사용자 위치 (지도에 마커 표시용) */
  userLocation: UserLocation | null;
  recordings: RecordingMeta[];
  selectedRecording: RideRecording | null;
  recordingStatus: RecordingStatus;
  recordingStats: RecordingStats;
  recordingError: string | null;
  recordingSupported: boolean;
  onStartRecording: () => void | Promise<unknown>;
  onPauseRecording: () => void | Promise<unknown>;
  onResumeRecording: () => void | Promise<unknown>;
  onStopRecording: () => void | Promise<unknown>;
  onDismissRecordingError: () => void;
  onSelectRecording: (id: string) => void | Promise<unknown>;
  onAnalyzeRecording: (id: string) => void | Promise<unknown>;
  onRemoveRecording: (id: string) => void | Promise<unknown>;
  onCloseRecordingDetail: () => void;
  /** 시트 상태 변경 시 호출 — MapViewer invalidateSize 트리거용 */
  onResizeTrigger?: () => void;
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
    compareRows,
    multiSummary,
    climbs,
    activeClimbId,
    onSelectClimb,
    locationState,
    onRequestLocation,
    onResetLocation,
    offRouteMeters,
    userLocation,
    recordings,
    selectedRecording,
    recordingStatus,
    recordingStats,
    recordingError,
    recordingSupported,
    onStartRecording,
    onPauseRecording,
    onResumeRecording,
    onStopRecording,
    onDismissRecordingError,
    onSelectRecording,
    onAnalyzeRecording,
    onRemoveRecording,
    onCloseRecordingDetail,
    onResizeTrigger
  } = props;
  const [state, setState] = useState<SheetState>('peek');
  const [tab, setTab] = useState<SheetTab>('routes');
  const [rideMode, setRideMode] = useState(false);
  const dragStartY = useRef<number | null>(null);

  // 시트 상태(peek/expanded/rideMode) 가 바뀌면 부모에 알려 MapViewer 가
  // invalidateSize() 를 호출하도록 트리거한다.
  useEffect(() => {
    onResizeTrigger?.();
  }, [state, rideMode, onResizeTrigger]);

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
    if (rideMode) return;
    dragStartY.current = e.clientY;
  };
  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (rideMode) return;
    if (dragStartY.current == null) return;
    const dy = e.clientY - dragStartY.current;
    if (dy < -40) setState('expanded');
    else if (dy > 40) setState('peek');
    dragStartY.current = null;
  };

  // ===== 주행 모드 =====
  if (rideMode) {
    return (
      <div
        className={[
          'bottom-sheet ride-mode-sheet',
          'absolute inset-0 z-40 flex flex-col',
          'bg-ink-800/95 backdrop-blur'
        ].join(' ')}
        role="dialog"
        aria-label="주행 모드"
      >
        <div
          className="h-1.5 w-full bg-ink-700/60"
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 0px)'
          }}
        />
        <RideModePanel
          activeRoute={activeRoute}
          climbs={climbs}
          activeClimbId={activeClimbId}
          locationState={locationState}
          offRouteMeters={offRouteMeters}
          onRequestLocation={onRequestLocation}
          onResetLocation={onResetLocation}
          onSelectClimb={onSelectClimb}
          recordingStatus={recordingStatus}
          recordingStats={recordingStats}
          recordingError={recordingError}
          recordingSupported={recordingSupported}
          onStartRecording={onStartRecording}
          onPauseRecording={onPauseRecording}
          onResumeRecording={onResumeRecording}
          onStopRecording={onStopRecording}
          onDismissRecordingError={onDismissRecordingError}
          onExit={() => setRideMode(false)}
        />
      </div>
    );
  }

  const heightClass =
    state === 'expanded' ? 'h-[84vh]' : 'h-[36vh] min-h-[200px]';

  return (
    <div
      className={[
        'bottom-sheet',
        'absolute bottom-0 left-0 right-0 z-30',
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
        <div role="tablist" className="flex items-center gap-1 overflow-x-auto">
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
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setRideMode(true)}
            className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 active:scale-95"
            aria-label="주행 모드 열기"
          >
            <Bike className="h-3.5 w-3.5" />
            주행 모드
          </button>
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
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-[max(env(safe-area-inset-bottom),12px)]">
        {tab === 'routes' ? (
          <div className="space-y-3">
            <RideRecorderPanel
              status={recordingStatus}
              isSupported={recordingSupported}
              error={recordingError}
              onStart={onStartRecording}
              onPause={onPauseRecording}
              onResume={onResumeRecording}
              onStop={onStopRecording}
              onDismissError={onDismissRecordingError}
            />
            <RecordingListPanel
              recordings={recordings}
              selectedRecordingId={selectedRecording?.id ?? null}
              onSelect={onSelectRecording}
              onAnalyze={onAnalyzeRecording}
              onRemove={onRemoveRecording}
            />
            <RecordingDetailPanel
              recording={selectedRecording}
              onAnalyze={onAnalyzeRecording}
              onClose={onCloseRecordingDetail}
            />
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
                  routeName={activeRoute.name}
                />
                <div className="rounded-2xl border border-white/10 bg-ink-700/60 p-3">
                  <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    주요 오르막
                  </p>
                  <ClimbList
                    climbs={climbs}
                    activeClimbId={activeClimbId}
                    onSelectClimb={onSelectClimb}
                    maxHeightPx={Math.min(window.innerHeight * 0.4, 320)}
                  />
                </div>
                <div className="rounded-2xl border border-white/10 bg-ink-700/60 p-3">
                  <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    구간 리스트
                  </p>
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
            multiSummary={multiSummary}
          />
        ) : tab === 'chart' ? (
          <div className="space-y-2">
            <MultiElevationProfile
              routes={routes}
              highlightRange={comparison}
              onHighlightChange={onComparisonChange}
              height={200}
            />
            {userLocation ? (
              <div className="rounded-2xl border border-white/10 bg-ink-700/60 p-3">
                <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  현재 위치
                </p>
                <LocationStatus
                  state={locationState}
                  onRequest={onRequestLocation}
                  onReset={onResetLocation}
                  offRouteMeters={offRouteMeters}
                />
              </div>
            ) : null}
          </div>
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
