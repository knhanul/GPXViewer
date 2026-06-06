import { useRef, useState } from 'react';
import { MapPin, Upload, Loader2, FileWarning } from 'lucide-react';
import { GpxParseError, parseGpxFile } from '../utils/gpxParser';
import type { ParsedRoute } from '../types/gpx';

interface GpxUploaderProps {
  /** 라우트 파싱 성공 시 호출 */
  onParsed: (route: ParsedRoute) => void;
  /** 파싱 실패/에러 시 호출 (한국어 메시지) */
  onError: (message: string) => void;
  /** 현재 로드된 파일명 (헤더에 표시) */
  currentFileName?: string;
}

/**
 * GPX 업로드 컴포넌트.
 * - 버튼 클릭 또는 드래그앤드롭으로 .gpx 파일을 업로드한다.
 * - FileReader + DOMParser + togeojson 으로 브라우저 내부에서 파싱한다.
 * - 로딩 상태는 컴포넌트 내부에서 관리한다.
 * - 성공 시 onParsed, 실패 시 onError 콜백을 호출한다.
 */
export function GpxUploader({
  onParsed,
  onError,
  currentFileName
}: GpxUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsLoading(true);
    try {
      const route = await parseGpxFile(file);
      onParsed(route);
    } catch (err) {
      if (err instanceof GpxParseError) {
        onError(err.message);
      } else {
        console.error('[GpxUploader] 알 수 없는 파싱 오류:', err);
        onError('파싱 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
      // 같은 파일을 다시 선택할 수 있도록 input 초기화
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (isLoading) return;
    inputRef.current?.click();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLLabelElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleDrop: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLoading) return;
    void handleFiles(e.dataTransfer.files);
  };

  const handleDragOver: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave: React.DragEventHandler<HTMLLabelElement> = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex items-center gap-3">
      {/* 숨겨진 input - label 클릭으로 트리거 */}
      <input
        ref={inputRef}
        type="file"
        accept=".gpx,application/gpx+xml,text/xml,application/xml"
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
        aria-label="GPX 파일 선택"
      />

      <label
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'group relative inline-flex select-none items-center gap-2 rounded-xl',
          'px-4 py-2.5 text-sm font-semibold transition-all',
          'bg-accent text-ink-900 hover:bg-accent-soft',
          'shadow-glow focus:outline-none focus:ring-2 focus:ring-accent/60',
          isLoading ? 'pointer-events-none opacity-70' : 'cursor-pointer',
          isDragging ? 'ring-2 ring-accent/70' : ''
        ].join(' ')}
        aria-label="GPX 파일 업로드"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="h-4 w-4" aria-hidden />
        )}
        <span>{isLoading ? '파싱 중...' : 'GPX 파일 선택'}</span>
      </label>

      {currentFileName && !isLoading ? (
        <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-700/60 px-3 py-1.5 text-xs text-zinc-300">
          <MapPin className="h-3.5 w-3.5 text-trail-start" aria-hidden />
          <span className="max-w-[220px] truncate font-mono">{currentFileName}</span>
        </div>
      ) : null}

      {isDragging ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-ink-900/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-ink-700 px-6 py-4 text-zinc-100 shadow-2xl">
            <FileWarning className="h-6 w-6 text-accent" aria-hidden />
            <p className="font-display text-base">GPX 파일을 여기에 놓으세요</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
