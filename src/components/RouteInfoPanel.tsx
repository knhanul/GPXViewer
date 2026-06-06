import { Clock, FileText, MapPin, Navigation, Ruler, Waypoints } from 'lucide-react';
import { formatCoordinate, formatDistanceKm } from '../utils/routeUtils';
import type { ParsedRoute } from '../types/gpx';

interface RouteInfoPanelProps {
  route: ParsedRoute | null;
  /**
   * 사용 맥락.
   * - 'panel': PC 사이드바/모바일 시트 내부. 자체 컨테이너 스타일 사용.
   * - 'embedded': 시트/사이드바 컨테이너 안에 포함됨. 외곽 보더/배경 제거.
   */
  variant?: 'panel' | 'embedded';
}

/**
 * 라우트의 메타데이터를 표시하는 정보 패널.
 * - PC: 좌측 사이드바 (variant="panel")
 * - 모바일: 하단 시트 안 (variant="embedded")
 */
export function RouteInfoPanel({ route, variant = 'panel' }: RouteInfoPanelProps) {
  const containerClass =
    variant === 'panel'
      ? 'info-panel flex h-full flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-ink-700/70 p-4 text-zinc-200 shadow-2xl backdrop-blur md:p-5'
      : 'info-panel flex h-full flex-col gap-3 text-zinc-200';

  if (!route) {
    return (
      <aside className={`${containerClass} items-center justify-center text-center text-zinc-500`}>
        <div className="flex flex-col items-center gap-2 py-6">
          <MapPin className="h-5 w-5 text-zinc-600" aria-hidden />
          <p className="text-sm">아직 표시된 경로가 없어요.</p>
          {variant === 'panel' ? (
            <p className="text-xs text-zinc-600">
              상단 버튼으로 GPX 파일을 업로드해 보세요.
            </p>
          ) : null}
        </div>
      </aside>
    );
  }

  const { fileName, totalDistanceKm, startPoint, endPoint, pointCount } = route;

  return (
    <aside className={containerClass}>
      <header className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <FileText className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold text-zinc-100">파일 정보</p>
          <p className="truncate font-mono text-xs text-zinc-400" title={fileName}>
            {fileName}
          </p>
        </div>
      </header>

      <div className="rounded-xl bg-ink-900/60 p-3">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
          <Ruler className="h-3.5 w-3.5" aria-hidden /> 총 거리
        </p>
        <p className="mt-1 font-mono text-2xl font-semibold text-zinc-50">
          {formatDistanceKm(totalDistanceKm)}
          <span className="ml-1 text-sm font-medium text-zinc-400">km</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PointCard
          label="시작 좌표"
          icon={<Navigation className="h-3.5 w-3.5 text-trail-start" aria-hidden />}
          point={startPoint}
          accent="trail-start"
        />
        <PointCard
          label="종료 좌표"
          icon={<MapPin className="h-3.5 w-3.5 text-accent" aria-hidden />}
          point={endPoint}
          accent="accent"
        />
      </div>

      <div className="rounded-xl bg-ink-900/60 p-3">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
          <Waypoints className="h-3.5 w-3.5" aria-hidden /> 트랙 포인트
        </p>
        <p className="mt-1 font-mono text-lg font-semibold text-zinc-50">
          {pointCount.toLocaleString()}<span className="ml-1 text-xs text-zinc-500">개</span>
        </p>
      </div>

      <footer className="mt-auto flex items-center gap-1.5 pt-2 text-[11px] text-zinc-500">
        <Clock className="h-3 w-3" aria-hidden />
        <span>브라우저에서만 처리 · 데이터는 외부로 전송되지 않습니다</span>
      </footer>
    </aside>
  );
}

interface PointCardProps {
  label: string;
  icon: React.ReactNode;
  point: { lat: number; lng: number };
  accent: 'trail-start' | 'accent';
}

function PointCard({ label, icon, point, accent }: PointCardProps) {
  const accentClass =
    accent === 'trail-start' ? 'text-trail-start' : 'text-accent';
  return (
    <div className="rounded-xl bg-ink-900/60 p-3">
      <p className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider ${accentClass}`}>
        {icon} {label}
      </p>
      <p className="mt-1 font-mono text-[13px] leading-tight text-zinc-100">
        {formatCoordinate(point.lat)}
      </p>
      <p className="font-mono text-[13px] leading-tight text-zinc-300">
        {formatCoordinate(point.lng)}
      </p>
    </div>
  );
}
