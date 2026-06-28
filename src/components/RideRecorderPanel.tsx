import { AlertTriangle, Pause, Play, Square, TimerReset } from 'lucide-react';
import type { RecordingStatus } from '../types/recording';

interface RideRecorderPanelProps {
  status: RecordingStatus;
  isSupported: boolean;
  error: string | null;
  onStart: () => void | Promise<unknown>;
  onPause: () => void | Promise<unknown>;
  onResume: () => void | Promise<unknown>;
  onStop: () => void | Promise<unknown>;
  onDismissError: () => void;
}

export function RideRecorderPanel({
  status,
  isSupported,
  error,
  onStart,
  onPause,
  onResume,
  onStop,
  onDismissError
}: RideRecorderPanelProps) {
  const isBusy = status === 'starting' || status === 'stopping';
  const canStart = (status === 'idle' || status === 'error') && isSupported;
  const canPause = status === 'recording';
  const canResume = status === 'paused';
  const canStop = status === 'recording' || status === 'paused';

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-700/60 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
          라이딩 기록
        </p>
        <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
          {status === 'recording'
            ? 'GPS 기록 중'
            : status === 'paused'
              ? '일시정지'
              : status === 'starting'
                ? '준비 중'
                : status === 'stopping'
                  ? '저장 중'
                  : '대기'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => void onStart()}
          disabled={!canStart || isBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/90 px-3 py-2 text-sm font-semibold text-ink-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-4 w-4" /> 시작
        </button>
        <button
          type="button"
          onClick={() => void onPause()}
          disabled={!canPause || isBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400/90 px-3 py-2 text-sm font-semibold text-ink-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pause className="h-4 w-4" /> 일시정지
        </button>
        <button
          type="button"
          onClick={() => void onResume()}
          disabled={!canResume || isBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-400/90 px-3 py-2 text-sm font-semibold text-ink-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <TimerReset className="h-4 w-4" /> 재개
        </button>
        <button
          type="button"
          onClick={() => void onStop()}
          disabled={!canStop || isBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/90 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Square className="h-4 w-4" /> 종료
        </button>
      </div>

      {!isSupported ? (
        <p className="mt-3 text-xs leading-snug text-amber-200">
          이 환경에서는 연속 위치 추적을 사용할 수 없습니다.
        </p>
      ) : null}

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-xs text-rose-100">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
          <div className="flex-1">
            <p>{error}</p>
            <button
              type="button"
              onClick={onDismissError}
              className="mt-1 text-[11px] font-semibold text-rose-200 underline underline-offset-2"
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
