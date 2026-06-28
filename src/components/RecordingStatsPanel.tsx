import type { RecordingStats, RecordingStatus } from '../types/recording';
import { formatDurationMs } from '../utils/recordingUtils';

interface RecordingStatsPanelProps {
  stats: RecordingStats;
  status: RecordingStatus;
}

export function RecordingStatsPanel({
  stats,
  status
}: RecordingStatsPanelProps) {
  const items = [
    {
      label: '시간',
      value: formatDurationMs(stats.elapsedMs),
      accent: true
    },
    {
      label: '거리',
      value: `${stats.totalDistanceKm.toFixed(2)} km`
    },
    {
      label: '현재 속도',
      value: `${stats.currentSpeedKph.toFixed(1)} km/h`
    },
    {
      label: '평균 속도',
      value: `${stats.averageSpeedKph.toFixed(1)} km/h`
    },
    {
      label: '최대 속도',
      value: `${stats.maxSpeedKph.toFixed(1)} km/h`
    },
    {
      label: '현재 고도',
      value: stats.currentElevationM != null ? `${Math.round(stats.currentElevationM)} m` : '-'
    },
    {
      label: '누적 상승',
      value: `${Math.round(stats.totalElevationGainM)} m`
    }
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-700/60 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
          기록 통계
        </p>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
          {status === 'recording'
            ? '기록 중'
            : status === 'paused'
              ? '일시정지'
              : status === 'starting'
                ? '시작 중'
                : '대기'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/5 bg-ink-900/40 px-3 py-2"
          >
            <p className="text-[11px] text-zinc-500">{item.label}</p>
            <p
              className={[
                'mt-1 font-display text-base font-semibold',
                item.accent ? 'text-accent' : 'text-zinc-100'
              ].join(' ')}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">
        포인트 {stats.pointCount}개
        {stats.lastAccuracyM != null ? ` · 최근 정확도 ±${Math.round(stats.lastAccuracyM)}m` : ''}
      </p>
    </div>
  );
}
