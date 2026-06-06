import { useEffect, useRef, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import type { ParsedRoute } from '../types/gpx'
import { RouteInfoPanel } from './RouteInfoPanel'

interface MobileBottomSheetProps {
  route: ParsedRoute | null
  /** 시트가 열려 있는지 (route 가 변경되면 자동 확장) */
  autoExpandOnRoute?: boolean
}

type SheetState = 'peek' | 'expanded'

/**
 * 모바일에서 사용하는 하단 시트 컴포넌트.
 * - 기본 상태: peek (32vh)
 * - 핸들 드래그 또는 ChevronUp 클릭 시 expanded (70vh)
 * - iOS safe-area-inset-bottom 적용
 */
export function MobileBottomSheet({
  route,
  autoExpandOnRoute = true
}: MobileBottomSheetProps) {
  const [state, setState] = useState<SheetState>('peek')
  const dragStartY = useRef<number | null>(null)
  const lastHeightPx = useRef<number | null>(null)

  // 라우트가 로드되면 자동으로 expanded 로 전환
  useEffect(() => {
    if (route && autoExpandOnRoute) {
      setState('expanded')
    }
    if (!route) {
      setState('peek')
    }
  }, [route, autoExpandOnRoute])

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    dragStartY.current = e.clientY
  }

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (dragStartY.current == null) return
    const dy = e.clientY - dragStartY.current
    if (dy < -40) {
      setState('expanded')
    } else if (dy > 40) {
      setState('peek')
    }
    dragStartY.current = null
  }

  const heightClass =
    state === 'expanded' ? 'h-[70vh]' : 'h-[34vh] min-h-[200px]'

  return (
    <div
      className={[
        'bottom-sheet',
        'fixed inset-x-0 bottom-0 z-30',
        'flex flex-col rounded-t-2xl border-t border-white/10 bg-ink-800/95',
        'shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur',
        'transition-[height] duration-300 ease-out',
        heightClass
      ].join(' ')}
      role="region"
      aria-label="경로 정보 패널"
      aria-expanded={state === 'expanded'}
    >
      {/* 핸들 영역 - 드래그/탭으로 확장/접힘 */}
      <div
        className="flex shrink-0 cursor-grab touch-none items-center justify-center pt-2.5 pb-2 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={() =>
          setState((s) => (s === 'expanded' ? 'peek' : 'expanded'))
        }
        role="button"
        tabIndex={0}
        aria-label={state === 'expanded' ? '패널 접기' : '패널 펼치기'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setState((s) => (s === 'expanded' ? 'peek' : 'expanded'))
          }
        }}
      >
        <div className="h-1.5 w-12 rounded-full bg-white/15" />
      </div>

      {/* peek 모드일 때 화살표 + 라벨을 살짝 보이게 */}
      <div className="flex shrink-0 items-center justify-between px-4 pb-2">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {route ? '경로 정보' : '안내'}
        </p>
        <button
          type="button"
          onClick={() =>
            setState((s) => (s === 'expanded' ? 'peek' : 'expanded'))
          }
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/5 active:scale-95"
          aria-label={state === 'expanded' ? '패널 접기' : '패널 펼치기'}
        >
          <ChevronUp
            className={[
              'h-4 w-4 transition-transform duration-300',
              state === 'expanded' ? 'rotate-180' : ''
            ].join(' ')}
          />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto px-1 pb-[max(env(safe-area-inset-bottom),12px)]"
        // lastHeightPx ref 는 향후 측정용 자리만 유지
        ref={(el) => {
          if (el) lastHeightPx.current = el.clientHeight
        }}
      >
        <RouteInfoPanel route={route} variant="embedded" />
      </div>
    </div>
  )
}
