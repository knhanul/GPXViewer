// 위치 권한/측정 상태 표시 + 액션 버튼.
// - 권한 요청, 다시 시도, 해제 등을 한 곳에서 처리한다.

import {
  AlertTriangle,
  Crosshair,
  Loader2,
  MapPin,
  X
} from 'lucide-react';
import type { LocationState } from '../types/location';

interface LocationStatusProps {
  state: LocationState;
  onRequest: () => void;
  onReset?: () => void;
  compact?: boolean;
  /** 경로 이탈 거리 (m). null 이면 이탈도 표시 안 함 */
  offRouteMeters?: number | null;
  /** 이탈 안내 임계값 (m) */
  offRouteThresholdM?: number;
}

export function LocationStatus({
  state,
  onRequest,
  onReset,
  compact = false,
  offRouteMeters = null,
  offRouteThresholdM = 100
}: LocationStatusProps) {
  const { status, location, message } = state;
  const isLoading = status === 'requesting';
  const isReady = status === 'ready' && location;
  const showOffRoute =
    isReady &&
    offRouteMeters !== null &&
    Number.isFinite(offRouteMeters) &&
    offRouteMeters > offRouteThresholdM;

  return (
    <div
      className={[
        'rounded-xl border bg-ink-700/50 text-xs text-zinc-200',
        compact ? 'p-2' : 'p-3',
        'space-y-1.5'
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" aria-hidden />
        ) : isReady ? (
          <MapPin className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
        ) : status === 'denied' || status === 'error' || status === 'unsupported' ? (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-300" aria-hidden />
        ) : (
          <MapPin className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
        )}
        <p className="flex-1 truncate font-display text-[12px] font-semibold text-zinc-100">
          {isLoading
            ? '현재 위치 확인 중...'
            : isReady
              ? `현재 위치: ${location!.lat.toFixed(4)}, ${location!.lng.toFixed(4)} (±${Math.round(location!.accuracyM)}m)`
              : status === 'denied'
                ? '위치 권한이 거부됨'
                : status === 'unsupported'
                  ? '위치 미지원 브라우저'
                  : status === 'error'
                    ? '위치를 가져올 수 없음'
                    : '위치 정보가 비어 있음'}
        </p>
        {isReady && onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded p-0.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            aria-label="위치 사용 종료"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {message ? (
        <p className="leading-snug text-zinc-400">{message}</p>
      ) : null}

      {showOffRoute ? (
        <p className="leading-snug text-amber-200/90">
          현재 위치가 경로에서 약 {Math.round(offRouteMeters!)}m 떨어져 있습니다. GPS 오차가 있을 수 있습니다.
        </p>
      ) : null}

      {!isReady ? (
        <button
          type="button"
          onClick={onRequest}
          disabled={isLoading || status === 'unsupported'}
          className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-500/90 px-3 py-1.5 text-xs font-semibold text-ink-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Crosshair className="h-3.5 w-3.5" />
          {status === 'denied' ? '권한 다시 시도' : '현재 위치 표시'}
        </button>
      ) : null}
    </div>
  );
}
