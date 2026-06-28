import { Activity, Route, Trash2 } from 'lucide-react';
import type { RecordingMeta } from '../types/recording';
import { formatDurationMs } from '../utils/recordingUtils';

interface RecordingListPanelProps {
  recordings: RecordingMeta[];
  selectedRecordingId?: string | null;
  onSelect?: (recordingId: string) => void | Promise<unknown>;
  onAnalyze?: (recordingId: string) => void | Promise<unknown>;
  onRemove?: (recordingId: string) => void | Promise<unknown>;
}

export function RecordingListPanel({
  recordings,
  selectedRecordingId = null,
  onSelect,
  onAnalyze,
  onRemove
}: RecordingListPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-700/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Activity className="h-4 w-4 text-cyan-300" />
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
          라이딩 기록
        </p>
      </div>

      {recordings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-ink-900/30 p-3 text-xs text-zinc-500">
          아직 저장된 주행 기록이 없습니다.
        </div>
      ) : (
        <ul className="space-y-2">
          {recordings.map((recording) => {
            const isSelected = recording.id === selectedRecordingId;
            return (
              <li
                key={recording.id}
                className="rounded-xl border border-white/5 bg-ink-900/35 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-zinc-100">
                      {recording.name}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {new Date(recording.startedAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  {onRemove ? (
                    <button
                      type="button"
                      onClick={() => void onRemove(recording.id)}
                      className="rounded-lg p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                      aria-label="기록 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-zinc-400">
                  <div>
                    <p className="text-zinc-500">거리</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-100">
                      {recording.totalDistanceKm.toFixed(2)}km
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">시간</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-100">
                      {formatDurationMs(recording.elapsedMs)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">상승</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-100">
                      +{Math.round(recording.totalElevationGainM)}m
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-zinc-300">
                    포인트 {recording.pointCount}개 · 평균 {recording.averageSpeedKph.toFixed(1)}km/h · 최대 {recording.maxSpeedKph.toFixed(1)}km/h
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onSelect ? (
                      <button
                        type="button"
                        onClick={() => void onSelect(recording.id)}
                        className={[
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition',
                          isSelected
                            ? 'bg-accent/15 text-accent'
                            : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                        ].join(' ')}
                      >
                        <Route className="h-3.5 w-3.5" /> 상세 보기
                      </button>
                    ) : null}

                    {onAnalyze ? (
                      <button
                        type="button"
                        onClick={() => void onAnalyze(recording.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25"
                      >
                        <Route className="h-3.5 w-3.5" /> 분석하기
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
