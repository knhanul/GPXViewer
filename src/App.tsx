import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Mountain, X } from 'lucide-react';
import { GpxUploader } from './components/GpxUploader';
import { MapViewer } from './components/MapViewer';
import { RouteInfoPanel } from './components/RouteInfoPanel';
import { MobileBottomSheet } from './components/MobileBottomSheet';
import { ElevationProfile } from './components/ElevationProfile';
import { SegmentList } from './components/SegmentList';
import { SegmentSummary } from './components/SegmentSummary';
import { RouteListPanel } from './components/RouteListPanel';
import { RouteCompareTable } from './components/RouteCompareTable';
import { MultiElevationProfile } from './components/MultiElevationProfile';
import { SegmentComparePanel } from './components/SegmentComparePanel';
import { ClimbList } from './components/ClimbList';
import { LocationStatus } from './components/LocationStatus';
import { RecordingDetailPanel } from './components/RecordingDetailPanel';
import { RecordingListPanel } from './components/RecordingListPanel';
import { useRecordingStats } from './hooks/useRecordingStats';
import { useRideRecorder } from './hooks/useRideRecorder';
import { useSavedRecordings } from './hooks/useSavedRecordings';
import { useIsDesktop } from './hooks/useMediaQuery';
import { useGeolocation } from './hooks/useGeolocation';
import {
  buildTrackPoints,
  computeSegments,
  computeSelectionStats,
  downsampleTrackPoints,
  toElevationPoints
} from './utils/elevationUtils';
import {
  buildCompareTable,
  buildMultiRouteSummary,
  buildSegmentCompare,
  pickNextColor
} from './utils/segmentUtils';
import { detectClimbs } from './utils/climbUtils';
import { parseGpxText } from './utils/gpxParser';
import { rideRecordingToGpxXml } from './utils/gpxWriter';
import { distanceToTrackMeters } from './utils/routeDistanceUtils';
import type {
  ComparisonSelection,
  ElevationPoint,
  ParsedRoute,
  RouteId,
  RouteSegment,
  RouteState,
  SegmentSelection,
  TrackPoint
} from './types/gpx';
import type { RouteClimb } from './types/climb';
import type { RecordingMeta, RideRecording } from './types/recording';
import { OFF_ROUTE_THRESHOLD_METERS } from './constants/route';

/**
 * GPX 뷰어 메인 앱.
 * - PC (>= 1024px): 좌측 정보 패널 + 우측 지도 + 지도 아래 차트
 * - 모바일/태블릿: 상단 헤더 + 지도 + 하단 정보 시트 (탭 UI)
 *
 * 5차 목표: 오르막 자동 탐지, 고도 보정, 선택 구간 요약, 모바일 주행 모드(현재 위치/경로 이탈) 등
 */
export default function App() {
  const [routes, setRoutes] = useState<RouteState[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<RouteId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<SegmentSelection | null>(null);
  const [comparison, setComparison] = useState<ComparisonSelection | null>({
    startKm: 0,
    endKm: 1
  });
  const [fitAllTrigger, setFitAllTrigger] = useState(0);
  const [panToUserTrigger, setPanToUserTrigger] = useState(0);
  const [activeClimbId, setActiveClimbId] = useState<RouteId | null>(null);
  const [sheetResizeTrigger, setSheetResizeTrigger] = useState(0);
  const isDesktop = useIsDesktop();
  const idCounterRef = useRef(0);
  const routesRef = useRef<RouteState[]>([]);
  const savedRecordings = useSavedRecordings();
  const { state: locationState, request: requestLocation, reset: resetLocation } =
    useGeolocation();

  // ===== 경로 빌드 헬퍼 =====
  const buildRouteState = useCallback(
    (parsed: ParsedRoute, indexHint: number): RouteState => {
      const trackPoints = buildTrackPoints(parsed);
      const DOWNSAMPLE_THRESHOLD = 2000;
      const TARGET = 1500;
      const ds =
        trackPoints.length > DOWNSAMPLE_THRESHOLD
          ? downsampleTrackPoints(trackPoints, TARGET)
          : trackPoints;
      const elevationPoints: ElevationPoint[] = toElevationPoints(ds);
      const segments: RouteSegment[] = computeSegments(trackPoints, 1);
      idCounterRef.current += 1;
      return {
        id: makeRouteId(parsed, indexHint, idCounterRef.current),
        name: defaultNameFromFile(parsed.fileName, indexHint),
        color: '#F97316', // 아래에서 자동 할당
        visible: true,
        route: parsed,
        trackPoints,
        elevationPoints,
        segments
      };
    },
    []
  );

  const handleRecordingFinished = useCallback(
    async ({
      recording,
      gpxXml
    }: {
      recording: RideRecording;
      gpxXml: string;
    }) => {
      const parsed = parseGpxText(gpxXml, recording.fileName);
      const prevRoutes = routesRef.current;
      const usedColors = prevRoutes.map((route) => route.color);
      const nextRoute = buildRouteState(parsed, prevRoutes.length);
      nextRoute.name = recording.name;
      nextRoute.color = pickNextColor(usedColors);
      const nextRoutes = [...prevRoutes, nextRoute];
      routesRef.current = nextRoutes;
      setRoutes(nextRoutes);
      setActiveRouteId(nextRoute.id);
      setSelection(null);
      setActiveClimbId(null);
      setError(null);
      const savedWithRoute = {
        ...recording,
        analyzedRouteId: nextRoute.id,
        updatedAt: Date.now()
      };
      await savedRecordings.save(savedWithRoute);
      return nextRoute.id;
    },
    [buildRouteState, savedRecordings]
  );

  const appendRecordedRoute = useCallback(
    (recording: Pick<RideRecording, 'fileName' | 'name'>, gpxXml: string) => {
      const parsed = parseGpxText(gpxXml, recording.fileName);
      const prevRoutes = routesRef.current;
      const usedColors = prevRoutes.map((route) => route.color);
      const nextRoute = buildRouteState(parsed, prevRoutes.length);
      nextRoute.name = recording.name;
      nextRoute.color = pickNextColor(usedColors);
      const nextRoutes = [...prevRoutes, nextRoute];
      routesRef.current = nextRoutes;
      setRoutes(nextRoutes);
      setActiveRouteId(nextRoute.id);
      setSelection(null);
      setActiveClimbId(null);
      setError(null);
      return nextRoute.id;
    },
    [buildRouteState]
  );

  const rideRecorder = useRideRecorder({
    onRecordingFinished: handleRecordingFinished
  });
  const recordingStats = useRecordingStats(rideRecorder.session, rideRecorder.status);

  const handleSelectSavedRecording = useCallback(
    async (recordingId: string) => {
      await savedRecordings.select(recordingId);
    },
    [savedRecordings]
  );

  const handleCloseSavedRecordingDetail = useCallback(() => {
    savedRecordings.clearSelection();
  }, [savedRecordings]);

  const handleAnalyzeRecording = useCallback(
    async (recordingId: string) => {
      const recording =
        savedRecordings.selectedRecording?.id === recordingId
          ? savedRecordings.selectedRecording
          : await savedRecordings.select(recordingId);
      if (!recording) return;
      const gpxXml = rideRecordingToGpxXml(recording);
      const nextRouteId = appendRecordedRoute(recording, gpxXml);
      await savedRecordings.save({
        id: recording.id,
        name: recording.name,
        fileName: recording.fileName,
        status: 'finished',
        startedAt: recording.startedAt,
        endedAt: recording.endedAt,
        elapsedMs: recording.elapsedMs,
        pausedDurationMs: recording.pausedDurationMs,
        totalDistanceKm: recording.totalDistanceKm,
        totalElevationGainM: recording.totalElevationGainM,
        averageSpeedKph: recording.averageSpeedKph,
        maxSpeedKph: recording.maxSpeedKph,
        createdAt: recording.createdAt,
        updatedAt: Date.now(),
        points: recording.points,
        analyzedRouteId: nextRouteId
      });
      await savedRecordings.select(recordingId);
    },
    [appendRecordedRoute, savedRecordings]
  );

  const appendRoutes = useCallback(
    (parsedList: ParsedRoute[], opts: { replace?: boolean } = {}) => {
      if (parsedList.length === 0) return;
      setRoutes((prev) => {
        const usedColors = (opts.replace ? [] : prev).map((r) => r.color);
        const baseIndex = opts.replace ? 0 : prev.length;
        const next: RouteState[] = parsedList.map((p, i) => {
          const s = buildRouteState(p, baseIndex + i);
          s.color = pickNextColor(usedColors);
          usedColors.push(s.color);
          return s;
        });
        if (next.length > 0 && next[0]) {
          setActiveRouteId((prevActive) => prevActive ?? next[0].id);
        }
        const merged = opts.replace ? next : [...prev, ...next];
        routesRef.current = merged;
        return merged;
      });
      setError(null);
      setSelection(null);
      setActiveClimbId(null);
    },
    [buildRouteState]
  );

  // 단일 파일 업로드 (backward compat)
  const handleParsed = useCallback(
    (parsed: ParsedRoute) => {
      appendRoutes([parsed], { replace: true });
    },
    [appendRoutes]
  );

  // 다중 파일 업로드
  const handleParsedMany = useCallback(
    (parsedList: ParsedRoute[]) => {
      if (parsedList.length === 1) {
        appendRoutes(parsedList, { replace: true });
      } else {
        appendRoutes(parsedList, { replace: false });
      }
    },
    [appendRoutes]
  );

  const handleError = useCallback((message: string) => {
    setError(message);
  }, []);

  // ===== 경로 조작 핸들러 =====
  const handleActivate = useCallback((id: RouteId) => {
    setActiveRouteId(id);
    setActiveClimbId(null);
    setSelection(null);
  }, []);

  const handleToggleVisible = useCallback((id: RouteId) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, visible: !r.visible } : r))
    );
  }, []);

  const handleRemove = useCallback((id: RouteId) => {
    setRoutes((prev) => {
      const next = prev.filter((r) => r.id !== id);
      routesRef.current = next;
      return next;
    });
    setActiveRouteId((prev) => (prev === id ? null : prev));
    setActiveClimbId((prev) => (prev === id ? null : prev));
  }, []);

  const handleRename = useCallback((id: RouteId, name: string) => {
    setRoutes((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, name } : r));
      routesRef.current = next;
      return next;
    });
  }, []);

  const handleRecolor = useCallback((id: RouteId, color: string) => {
    setRoutes((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, color } : r));
      routesRef.current = next;
      return next;
    });
  }, []);

  const handleFitAll = useCallback(() => {
    setFitAllTrigger((t) => t + 1);
  }, []);

  const handleSelectClimb = useCallback((climb: RouteClimb) => {
    setActiveClimbId(climb.id);
    setActiveRouteId(climb.routeId);
    setSelection({ startIndex: climb.startIndex, endIndex: climb.endIndex });
  }, []);

  const handlePanToUser = useCallback(() => {
    setPanToUserTrigger((t) => t + 1);
  }, []);

  // 모든 경로가 사라지면 active 도 정리
  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  useEffect(() => {
    if (routes.length === 0 && activeRouteId !== null) {
      setActiveRouteId(null);
    } else if (
      activeRouteId !== null &&
      !routes.some((r) => r.id === activeRouteId)
    ) {
      setActiveRouteId(routes[0]?.id ?? null);
    }
  }, [routes, activeRouteId]);

  // ESC 키로 에러 닫기 / 선택 해제
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setError(null);
        setSelection(null);
        setActiveClimbId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ===== 활성 경로 데이터 =====
  const activeRoute = useMemo(
    () => routes.find((r) => r.id === activeRouteId) ?? null,
    [routes, activeRouteId]
  );

  const activeTrackPoints: TrackPoint[] = useMemo(
    () => activeRoute?.trackPoints ?? [],
    [activeRoute]
  );
  const activeElevationPoints: ElevationPoint[] = useMemo(
    () => activeRoute?.elevationPoints ?? [],
    [activeRoute]
  );
  const activeSegments: RouteSegment[] = useMemo(
    () => activeRoute?.segments ?? [],
    [activeRoute]
  );

  const selectionStats = useMemo(
    () => computeSelectionStats(activeTrackPoints, selection),
    [activeTrackPoints, selection]
  );

  // ===== 오르막 (활성 경로 기준) =====
  const activeClimbs: RouteClimb[] = useMemo(() => {
    if (!activeRoute) return [];
    if (!activeRoute.route.hasElevation) return [];
    return detectClimbs(
      activeRoute.trackPoints,
      activeRoute.id,
      activeRoute.name
    );
  }, [activeRoute]);

  // 클라이밍 선택이 사라졌거나 활성 경로가 바뀌면 activeClimbId 정리
  useEffect(() => {
    if (activeClimbId && !activeClimbs.some((c) => c.id === activeClimbId)) {
      setActiveClimbId(null);
    }
  }, [activeClimbs, activeClimbId]);

  // ===== 비교 데이터 =====
  const compareRows = useMemo(() => buildCompareTable(routes), [routes]);
  const segmentCompareRows = useMemo(
    () => buildSegmentCompare(routes, comparison ?? { startKm: 0, endKm: 1 }),
    [routes, comparison]
  );
  const multiSummary = useMemo(
    () => (routes.length >= 2 ? buildMultiRouteSummary(compareRows) : undefined),
    [routes.length, compareRows]
  );

  const segmentPanelSelection: ComparisonSelection = useMemo(
    () => comparison ?? { startKm: 0, endKm: 1 },
    [comparison]
  );
  const handleSegmentCompareChange = useCallback((s: ComparisonSelection) => {
    setComparison(s);
  }, []);

  const effectiveUserLocation = rideRecorder.liveLocation ?? locationState.location;

  const effectiveLocationState = useMemo(
    () =>
      rideRecorder.liveLocation
        ? {
            ...locationState,
            status: 'ready' as const,
            permission: 'granted' as const,
            location: rideRecorder.liveLocation,
            message: null
          }
        : locationState,
    [rideRecorder.liveLocation, locationState]
  );

  // ===== 경로 이탈 거리 =====
  const offRouteMeters = useMemo<number | null>(() => {
    if (!effectiveUserLocation) return null;
    if (!activeRoute) return null;
    if (activeRoute.trackPoints.length === 0) return null;
    return distanceToTrackMeters(effectiveUserLocation, activeRoute.trackPoints);
  }, [effectiveUserLocation, activeRoute]);

  return (
    <div className="relative flex h-[100dvh] min-h-[100dvh] w-full flex-col bg-ink-900 text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.08),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.06),transparent_55%)]"
      />

      <header
        className="relative z-20 flex items-center justify-between gap-3 border-b border-white/5 bg-ink-800/70 px-4 py-3 backdrop-blur md:px-6"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <div className="logo-wrap flex min-w-0 items-center gap-3">
          <img
            src="/nuni_logo_v1.0.png"
            alt="Nuni logo"
            className="app-logo"
            draggable={false}
          />
          <div className="min-w-0">
            <h1 className="font-display text-base font-semibold leading-tight text-zinc-50 md:text-lg">
              nuni track
            </h1>
            <p className="hidden text-xs text-zinc-400 md:block">
              {routes.length > 0
                ? `${routes.length}개 경로 비교 중 · 자전거 라이딩 분석`
                : '브라우저에서 경로를 시각화하는 미니멀 GPX 리더'}
            </p>
          </div>
        </div>

        <GpxUploader
          onParsed={handleParsed}
          onParsedMany={handleParsedMany}
          onError={handleError}
          multiple
          currentFileName={
            routes.length === 1 ? routes[0].route.fileName : undefined
          }
        />
      </header>

      {error ? (
        <div
          role="alert"
          className="relative z-10 flex items-center gap-3 border-b border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200 md:px-6"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" aria-hidden />
          <p className="flex-1 truncate">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded p-1 text-rose-200/80 transition hover:bg-rose-500/20 hover:text-rose-50"
            aria-label="에러 닫기"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}

      {isDesktop ? (
        <DesktopLayout
          routes={routes}
          activeRouteId={activeRouteId}
          activeRoute={activeRoute}
          activeTrackPoints={activeTrackPoints}
          activeElevationPoints={activeElevationPoints}
          activeSegments={activeSegments}
          selection={selection}
          selectionStats={selectionStats}
          onSelectionChange={setSelection}
          onActivate={handleActivate}
          onToggleVisible={handleToggleVisible}
          onRemove={handleRemove}
          onRename={handleRename}
          onRecolor={handleRecolor}
          onFitAll={handleFitAll}
          fitAllTrigger={fitAllTrigger}
          comparison={comparison}
          onComparisonChange={setComparison}
          segmentPanelSelection={segmentPanelSelection}
          onSegmentPanelChange={handleSegmentCompareChange}
          compareRows={compareRows}
          segmentCompareRows={segmentCompareRows}
          multiSummary={multiSummary}
          activeClimbs={activeClimbs}
          activeClimbId={activeClimbId}
          onSelectClimb={handleSelectClimb}
          locationState={locationState}
          onRequestLocation={requestLocation}
          onResetLocation={resetLocation}
          onPanToUser={handlePanToUser}
          panToUserTrigger={panToUserTrigger}
          offRouteMeters={offRouteMeters}
          recordings={savedRecordings.metas}
          selectedRecording={savedRecordings.selectedRecording}
          onSelectRecording={handleSelectSavedRecording}
          onAnalyzeRecording={handleAnalyzeRecording}
          onRemoveRecording={savedRecordings.remove}
          onCloseRecordingDetail={handleCloseSavedRecordingDetail}
        />
      ) : (
        <>
          {/* 모바일: 지도를 전체 화면 absolute 로 깔고, 하단 시트를 overlay 로 띄움 */}
          <div className="absolute inset-0 z-10">
            <MapViewer
              routes={routes}
              activeRouteId={activeRouteId}
              highlightRange={comparison}
              fitAllTrigger={fitAllTrigger}
              userLocation={effectiveUserLocation}
              panToUserTrigger={panToUserTrigger}
              recordedPoints={rideRecorder.session?.points ?? []}
              resizeTrigger={sheetResizeTrigger}
            />
          </div>
          <MobileBottomSheet
            routes={routes}
            activeRouteId={activeRouteId}
            onActivate={handleActivate}
            onToggleVisible={handleToggleVisible}
            onRemove={handleRemove}
            onRename={handleRename}
            onRecolor={handleRecolor}
            onFitAll={handleFitAll}
            trackPoints={activeTrackPoints}
            elevationPoints={activeElevationPoints}
            selection={selection}
            selectionStats={selectionStats}
            onSelectionChange={setSelection}
            comparison={comparison}
            onComparisonChange={setComparison}
            compareRows={compareRows}
            segmentCompareRows={segmentCompareRows}
            multiSummary={multiSummary}
            climbs={activeClimbs}
            activeClimbId={activeClimbId}
            onSelectClimb={handleSelectClimb}
            locationState={effectiveLocationState}
            onRequestLocation={requestLocation}
            onResetLocation={resetLocation}
            panToUserTrigger={panToUserTrigger}
            offRouteMeters={offRouteMeters}
            userLocation={effectiveUserLocation}
            recordings={savedRecordings.metas}
            selectedRecording={savedRecordings.selectedRecording}
            recordingStatus={rideRecorder.status}
            recordingStats={recordingStats}
            recordingError={rideRecorder.error}
            recordingSupported={rideRecorder.isSupported}
            onStartRecording={rideRecorder.start}
            onPauseRecording={rideRecorder.pause}
            onResumeRecording={rideRecorder.resume}
            onStopRecording={rideRecorder.stop}
            onDismissRecordingError={rideRecorder.dismissError}
            onSelectRecording={handleSelectSavedRecording}
            onAnalyzeRecording={handleAnalyzeRecording}
            onRemoveRecording={savedRecordings.remove}
            onCloseRecordingDetail={handleCloseSavedRecordingDetail}
            onResizeTrigger={() => setSheetResizeTrigger((t) => t + 1)}
          />
        </>
      )}
    </div>
  );
}

// ===========================================================================
// PC 레이아웃
// ===========================================================================

interface DesktopLayoutProps {
  routes: RouteState[];
  activeRouteId: RouteId | null;
  activeRoute: RouteState | null;
  recordings: RecordingMeta[];
  selectedRecording: RideRecording | null;
  activeTrackPoints: TrackPoint[];
  activeElevationPoints: ElevationPoint[];
  activeSegments: RouteSegment[];
  selection: SegmentSelection | null;
  selectionStats: ReturnType<typeof computeSelectionStats>;
  onSelectionChange: (s: SegmentSelection | null) => void;
  onActivate: (id: RouteId) => void;
  onToggleVisible: (id: RouteId) => void;
  onRemove: (id: RouteId) => void;
  onRename: (id: RouteId, name: string) => void;
  onRecolor: (id: RouteId, color: string) => void;
  onFitAll: () => void;
  fitAllTrigger: number;
  comparison: ComparisonSelection | null;
  onComparisonChange: (s: ComparisonSelection | null) => void;
  segmentPanelSelection: ComparisonSelection;
  onSegmentPanelChange: (s: ComparisonSelection) => void;
  compareRows: ReturnType<typeof buildCompareTable>;
  segmentCompareRows: ReturnType<typeof buildSegmentCompare>;
  multiSummary: string | undefined;
  activeClimbs: RouteClimb[];
  activeClimbId: RouteId | null;
  onSelectClimb: (c: RouteClimb) => void;
  locationState: ReturnType<typeof useGeolocation>['state'];
  onRequestLocation: () => void;
  onResetLocation: () => void;
  onPanToUser?: () => void;
  panToUserTrigger: number;
  offRouteMeters: number | null;
  onSelectRecording: (id: string) => void | Promise<unknown>;
  onAnalyzeRecording: (id: string) => void | Promise<unknown>;
  onRemoveRecording: (id: string) => void | Promise<unknown>;
  onCloseRecordingDetail: () => void;
}

function DesktopLayout(props: DesktopLayoutProps) {
  const {
    routes,
    activeRouteId,
    activeRoute,
    recordings,
    selectedRecording,
    activeTrackPoints,
    activeElevationPoints,
    activeSegments,
    selection,
    selectionStats,
    onSelectionChange,
    onActivate,
    onToggleVisible,
    onRemove,
    onRename,
    onRecolor,
    onFitAll,
    fitAllTrigger,
    comparison,
    onComparisonChange,
    segmentPanelSelection,
    onSegmentPanelChange,
    compareRows,
    segmentCompareRows,
    multiSummary,
    activeClimbs,
    activeClimbId,
    onSelectClimb,
    locationState,
    onRequestLocation,
    onResetLocation,
    panToUserTrigger,
    offRouteMeters,
    onSelectRecording,
    onAnalyzeRecording,
    onRemoveRecording,
    onCloseRecordingDetail
  } = props;

  return (
    <div className="relative z-10 flex flex-1 gap-3 overflow-hidden p-3">
      {/* 좌측 사이드바 */}
      <aside className="flex w-[360px] shrink-0 flex-col gap-3 overflow-y-auto pr-1">
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
        {activeRoute ? (
          <>
            <RouteInfoPanel route={activeRoute.route} variant="embedded" />
            <div className="rounded-2xl border border-white/10 bg-ink-700/60 p-3">
              <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
                선택 구간
              </p>
              <SegmentSummary
                selection={selection}
                stats={selectionStats}
                trackPoints={activeTrackPoints}
                routeName={activeRoute.name}
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-ink-700/60 p-3">
              <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
                주요 오르막
              </p>
              <ClimbList
                climbs={activeClimbs}
                activeClimbId={activeClimbId}
                onSelectClimb={onSelectClimb}
                maxHeightPx={260}
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-ink-700/60 p-3">
              <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
                구간 리스트 (1km)
              </p>
              <SegmentList
                segments={activeSegments}
                selection={selection}
                onSelect={(seg) =>
                  onSelectionChange({
                    startIndex: seg.startIndex,
                    endIndex: seg.endIndex
                  })
                }
                maxHeightPx={220}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-ink-700/40 p-6 text-xs text-zinc-500">
            <Mountain className="h-4 w-4" /> 경로를 선택하면 분석이 표시됩니다.
          </div>
        )}
      </aside>

      {/* 우측: 지도 + 비교/차트/구간 */}
      <main className="flex flex-1 flex-col gap-3 overflow-hidden">
        <section className="min-h-0 flex-[3]">
          <MapViewer
            routes={routes}
            activeRouteId={activeRouteId}
            highlightRange={comparison}
            fitAllTrigger={fitAllTrigger}
            userLocation={locationState.location}
            panToUserTrigger={panToUserTrigger}
          />
        </section>
        {routes.length > 1 ? (
          <section className="shrink-0">
            <RouteCompareTable
              rows={compareRows}
              onToggleVisible={onToggleVisible}
              multiSummary={multiSummary}
            />
          </section>
        ) : null}
        <section className="shrink-0">
          {routes.length > 1 ? (
            <MultiElevationProfile
              routes={routes}
              highlightRange={comparison}
              onHighlightChange={onComparisonChange}
              height={200}
            />
          ) : (
            <ElevationProfile
              points={activeElevationPoints}
              selection={selection}
              trackPoints={activeTrackPoints}
              onSelectionChange={onSelectionChange}
              totalDistanceKm={activeRoute?.route.totalDistanceKm ?? 0}
              minElevation={activeRoute?.route.minElevation ?? 0}
              maxElevation={activeRoute?.route.maxElevation ?? 0}
              hasElevation={activeRoute?.route.hasElevation ?? false}
              height={200}
            />
          )}
        </section>
        <section className="shrink-0 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <LocationStatus
            state={locationState}
            onRequest={onRequestLocation}
            onReset={onResetLocation}
            offRouteMeters={offRouteMeters}
            offRouteThresholdM={OFF_ROUTE_THRESHOLD_METERS}
          />
          {routes.length > 1 ? (
            <SegmentComparePanel
              routes={routes}
              selection={segmentPanelSelection}
              onSelectionChange={onSegmentPanelChange}
              rows={segmentCompareRows}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-ink-700/40 p-3 text-xs text-zinc-500">
              여러 경로를 업로드하면 공통 km 구간 비교가 표시됩니다.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ===========================================================================
// 헬퍼
// ===========================================================================

/** 안정적인 route ID 생성. 같은 파일을 두 번 업로드해도 다른 ID 가 된다. */
function makeRouteId(parsed: ParsedRoute, hint: number, counter: number): RouteId {
  return `r-${counter}-${hint}-${parsed.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 32)}`;
}

function defaultNameFromFile(fileName: string, hint: number): string {
  const base = fileName.replace(/\.gpx$/i, '');
  if (hint === 0 && base) return base || '경로';
  return base || `경로 ${hint + 1}`;
}
