import { useEffect, useState } from 'react'

/**
 * 미디어 쿼리를 구독하는 React 훅.
 * - SSR 안전: 초기값은 false (서버에서는 window 가 없으므로 false 가정)
 * - 변경 시 자동 리렌더
 */
export function useMediaQuery(query: string): boolean {
  const getInitial = (): boolean => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  }

  const [matches, setMatches] = useState<boolean>(getInitial)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    // 초기 동기화 (effect 안에서 한 번 더 확인)
    setMatches(mql.matches)
    // 구독 등록 (addEventListener 가 구식 addListener 의 호환)
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    } else {
      mql.addListener(onChange)
      return () => mql.removeListener(onChange)
    }
  }, [query])

  return matches
}

/**
 * 미리 정의된 브레이크포인트 매처.
 * Tailwind 의 md(768) 와 lg(1024) 와 일치한다.
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767.98px)')
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023.98px)')
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
