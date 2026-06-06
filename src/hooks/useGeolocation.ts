// 브라우저 Geolocation API 를 React 훅으로 추상화.
// - 1회 측정만 (실시간 추적 X)
// - 위치 권한/실패 상태를 한국어 메시지와 함께 노출

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCurrentLocationOnce,
  initialLocationState,
  isGeolocationSupported
} from '../utils/locationUtils';
import type { LocationState, UserLocation } from '../types/location';

interface UseGeolocationResult {
  state: LocationState;
  /** 권한 요청 + 현재 위치 1회 측정 */
  request: () => Promise<void>;
  /** 상태 초기화 (메시지/위치 제거) */
  reset: () => void;
}

export function useGeolocation(): UseGeolocationResult {
  const [state, setState] = useState<LocationState>(() => initialLocationState());
  // 중복 호출 방지용
  const inFlightRef = useRef(false);

  const request = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setState((prev) => ({ ...prev, status: 'requesting', message: null }));
    try {
      const { state: next } = await getCurrentLocationOnce();
      setState(next);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialLocationState());
  }, []);

  // 컴포넌트 언마운트 시 별도 정리 없음 (1회 측정이라 watch 가 없음)
  useEffect(() => {
    return () => {
      // no-op
    };
  }, []);

  return { state, request, reset };
}

/** Hook 결과의 location 만 추출 */
export function getLocationOrNull(state: LocationState): UserLocation | null {
  return state.location;
}

/** 브라우저에서 위치 기능을 지원하는지 빠르게 확인 */
export function geolocationSupported(): boolean {
  return isGeolocationSupported();
}
