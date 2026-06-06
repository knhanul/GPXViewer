import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Mountain, X } from 'lucide-react';
import { GpxUploader } from './components/GpxUploader';
import { MapViewer } from './components/MapViewer';
import { RouteInfoPanel } from './components/RouteInfoPanel';
import { MobileBottomSheet } from './components/MobileBottomSheet';
import { useIsDesktop } from './hooks/useMediaQuery';
import type { ParsedRoute } from './types/gpx';

/**
 * GPX 뷰어 메인 앱.
 * - PC (>= 1024px): 좌측 정보 패널 + 우측 지도
 * - 모바일/태블릿: 상단 헤더 + 지도 + 하단 정보 시트
 */
export default function App() {
  const [route, setRoute] = useState<ParsedRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDesktop = useIsDesktop();

  const handleParsed = useCallback((parsed: ParsedRoute) => {
    setRoute(parsed);
    setError(null);
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
    setRoute(null);
  }, []);

  // ESC 키로 에러 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setError(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative flex h-dvh min-h-[600px] w-full flex-col bg-ink-900 text-zinc-100">
      {/* 배경 분위기를 위한 은은한 그라데이션 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.08),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.06),transparent_55%)]"
      />

      {/* Header - 모바일 safe-area 대응 */}
      <header
        className="relative z-20 flex items-center justify-between gap-3 border-b border-white/5 bg-ink-800/70 px-4 py-3 backdrop-blur md:px-6"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Mountain className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-base font-semibold leading-tight text-zinc-50 md:text-lg">
              GPX 뷰어
            </h1>
            <p className="hidden text-xs text-zinc-400 md:block">
              브라우저에서 경로를 시각화하는 미니멀 GPX 리더
            </p>
          </div>
        </div>

        <GpxUploader
          onParsed={handleParsed}
          onError={handleError}
          currentFileName={route?.fileName}
        />
      </header>

      {/* Error Banner */}
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

      {/* Main */}
      {isDesktop ? (
        <main className="relative z-10 flex flex-1 flex-row gap-4 overflow-hidden p-4">
          <section className="order-1 h-full w-[340px] shrink-0">
            <RouteInfoPanel route={route} />
          </section>
          <section className="order-2 h-full flex-1">
            <MapViewer route={route} />
          </section>
        </main>
      ) : (
        <>
          {/* 모바일/태블릿: 지도가 시트 위로 연장되는 레이아웃 */}
          <main className="relative z-10 flex flex-1 flex-col overflow-hidden p-2 pb-0">
            <section className="h-full min-h-[300px] flex-1">
              <MapViewer route={route} />
            </section>
          </main>
          <MobileBottomSheet route={route} />
        </>
      )}
    </div>
  );
}
