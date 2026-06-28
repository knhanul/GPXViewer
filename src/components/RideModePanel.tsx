// 모바일 주행 모드 패널.
// - 활성 경로의 코스명, 총 거리, 주요 오르막 요약, 현재 위치 상태를 큰 글씨로 보여준다.

import { Mountain, Route, X } from 'lucide-react';
import type { LocationState } from '../types/location';
import type { RouteClimb } from '../types/climb';
import type { RouteState } from '../types/gpx';
import type { RecordingStats, RecordingStatus } from '../types/recording';
import { LocationStatus } from './LocationStatus';
import { RecordingStatsPanel } from './RecordingStatsPanel';
import { RideRecorderPanel } from './RideRecorderPanel';

interface RideModePanelProps {
  activeRoute: RouteState | null;
  climbs: RouteClimb[];
  activeClimbId: string | null;
  locationState: LocationState;
  offRouteMeters: number | null;
  onRequestLocation: () => void;
  onResetLocation: () => void;
  onSelectClimb?: (climb: RouteClimb) => void;
  recordingStatus: RecordingStatus;
  recordingStats: RecordingStats;
  recordingError: string | null;
  recordingSupported: boolean;
  onStartRecording: () => void | Promise<unknown>;
  onPauseRecording: () => void | Promise<unknown>;
  onResumeRecording: () => void | Promise<unknown>;
  onStopRecording: () => void | Promise<unknown>;
  onDismissRecordingError: () => void;
  onExit: () => void;
}

export function RideModePanel({
  activeRoute,
  climbs,
  activeClimbId,
  locationState,
  offRouteMeters,
  onRequestLocation,
  onResetLocation,
  onSelectClimb,
  recordingStatus,
  recordingStats,
  recordingError,
  recordingSupported,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onDismissRecordingError,
  onExit
}: RideModePanelProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-ink-800/95 p-4 text-zinc-100">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-xs font-semibold uppercase tracking-widest text-accent">
          라이딩 모드
        </p>
        <button
          type="button"
          onClick={onExit}
          className="rounded-full bg-white/5 p-1.5 text-zinc-300 hover:bg-white/10"
          aria-label="주행 모드 종료"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-1">
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
      </div>

      <div className="mt-4">
        <RecordingStatsPanel
          stats={recordingStats}
          status={recordingStatus}
        />
      </div>

      <div className="mt-4">
        <LocationStatus
          state={locationState}
          onRequest={onRequestLocation}
          onReset={onResetLocation}
          offRouteMeters={offRouteMeters}
        />
      </div>

      {activeRoute ? (
        <>
          <h2 className="font-display text-2xl font-semibold leading-tight text-zinc-50">
            {activeRoute.name}
          </h2>
          <p className="mt-1 truncate text-xs text-zinc-400">
            {activeRoute.route.fileName}
          </p>

          <div className="mt-3 flex items-end gap-1">
            <span className="font-display text-4xl font-semibold text-accent">
              {activeRoute.route.totalDistanceKm.toFixed(1)}
            </span>
            <span className="pb-1.5 text-base text-zinc-400">km</span>
            <span className="ml-3 pb-1.5 text-xs text-zinc-500">
              · 고도 {activeRoute.route.minElevation.toFixed(0)}–{activeRoute.route.maxElevation.toFixed(0)}m
            </span>
          </div>

          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
              <Mountain className="h-3.5 w-3.5" /> 남은 주요 오르막
            </p>
            {climbs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-ink-700/40 p-3 text-xs text-zinc-500">
                {activeRoute.route.hasElevation
                  ? '뚜렷한 오르막이 감지되지 않았어요.'
                  : '이 경로에는 고도 정보가 없어 오르막 분석을 할 수 없습니다.'}
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {climbs.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={onSelectClimb ? () => onSelectClimb(c) : undefined}
                      className={[
                        'flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition',
                        c.id === activeClimbId
                          ? 'border-accent/60 bg-accent/10'
                          : 'border-white/5 bg-ink-900/40 active:bg-ink-900/80'
                      ].join(' ')}
                    >
                      <span className="font-mono text-[11px] text-zinc-400">
                        {c.startKm.toFixed(1)}–{c.endKm.toFixed(1)}km
                      </span>
                      <span className="font-display text-sm font-semibold">
                        오르막 {c.index} · +{Math.round(c.elevationGainM)}m · {c.avgGradePercent.toFixed(1)}%
                      </span>
                      <span
                        className="rounded-full border border-white/10 bg-ink-900/60 px-2 py-0.5 text-[10px] font-semibold"
                        style={{ color: c.difficultyColor }}
                      >
                        {c.difficultyLabel}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-zinc-500">
          <Route className="h-6 w-6 text-zinc-600" />
          <p>경로 없이도 라이딩을 기록할 수 있습니다. GPX를 올리면 경로 이탈과 오르막 분석도 함께 볼 수 있습니다.</p>
        </div>
      )}
    </div>
  );
}
