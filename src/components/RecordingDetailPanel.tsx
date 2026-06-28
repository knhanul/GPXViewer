import { ClipboardCopy, Download, Route, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { RideRecording } from '../types/recording';
import { buildGpxFromRecording, buildRecordingFileName } from '../utils/gpxWriter';
import { formatDurationMs } from '../utils/recordingUtils';

interface RecordingDetailPanelProps {
  recording: RideRecording | null;
  onAnalyze?: (recordingId: string) => void | Promise<unknown>;
  onClose?: () => void;
}

export function RecordingDetailPanel({ recording, onAnalyze, onClose }: RecordingDetailPanelProps) {
  const [gpxXml, setGpxXml] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    setGpxXml('');
    setCopyState('idle');
  }, [recording?.id]);

  const fileName = useMemo(
    () => (recording ? buildRecordingFileName(recording.startedAt) : ''),
    [recording]
  );

  if (!recording) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-ink-700/40 p-3 text-xs text-zinc-500">
        저장된 기록을 선택하면 원본 포인트와 GPX XML을 확인할 수 있습니다.
      </div>
    );
  }

  const handleBuildXml = () => {
    const next = buildGpxFromRecording(recording);
    setGpxXml(next);
    setCopyState('idle');
  };

  const handleCopy = async () => {
    const next = gpxXml || buildGpxFromRecording(recording);
    setGpxXml(next);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(next);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1500);
    }
  };

  const handleDownload = () => {
    const next = gpxXml || buildGpxFromRecording(recording);
    setGpxXml(next);
    const blob = new Blob([next], { type: 'application/gpx+xml;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-700/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
            기록 상세
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-zinc-100">{recording.name}</h3>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
            aria-label="기록 상세 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
        <div className="rounded-xl border border-white/5 bg-ink-900/40 px-3 py-2">
          <p className="text-zinc-500">시작</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">
            {new Date(recording.startedAt).toLocaleString('ko-KR')}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-ink-900/40 px-3 py-2">
          <p className="text-zinc-500">종료</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">
            {new Date(recording.endedAt).toLocaleString('ko-KR')}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-ink-900/40 px-3 py-2">
          <p className="text-zinc-500">거리</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">{recording.totalDistanceKm.toFixed(2)} km</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-ink-900/40 px-3 py-2">
          <p className="text-zinc-500">시간</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">{formatDurationMs(recording.elapsedMs)}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-ink-900/40 px-3 py-2">
          <p className="text-zinc-500">평균 속도</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">{recording.averageSpeedKph.toFixed(1)} km/h</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-ink-900/40 px-3 py-2">
          <p className="text-zinc-500">최대 속도</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">{recording.maxSpeedKph.toFixed(1)} km/h</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-ink-900/40 px-3 py-2">
          <p className="text-zinc-500">누적 상승</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">+{Math.round(recording.totalElevationGainM)} m</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-ink-900/40 px-3 py-2">
          <p className="text-zinc-500">포인트</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">{recording.points.length}개</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={handleBuildXml}
          className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-white/10"
        >
          <Route className="h-3.5 w-3.5" /> GPX XML 생성
        </button>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-white/10"
        >
          <ClipboardCopy className="h-3.5 w-3.5" /> {copyState === 'copied' ? '복사됨' : '복사'}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-white/10"
        >
          <Download className="h-3.5 w-3.5" /> 다운로드
        </button>
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

      {gpxXml ? (
        <textarea
          readOnly
          value={gpxXml}
          className="mt-3 h-48 w-full rounded-xl border border-white/10 bg-ink-900/60 p-3 font-mono text-[11px] leading-relaxed text-zinc-200 outline-none"
        />
      ) : null}
    </div>
  );
}
