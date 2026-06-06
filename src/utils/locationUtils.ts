// 브라우저 Geolocation API 헬퍼.
// 현재 위치 1회 측정만 지원한다 (실시간 추적 X).

import type { LocationState, UserLocation } from '../types/location';

/** Geolocation API 사용 가능 여부 */
export function isGeolocationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'geolocation' in navigator
  );
}

/** 안전한 HTTPS 환경 여부 (대략적 검사) */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  // localhost 는 secure context 로 간주
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  return Boolean((window as unknown as { isSecureContext?: boolean }).isSecureContext);
}

/** 초기 idle 상태 */
export function initialLocationState(): LocationState {
  return {
    status: 'idle',
    permission: isGeolocationSupported() ? 'unknown' : 'unsupported',
    location: null,
    message: null
  };
}

/**
 * 1회 위치 측정.
 * - 권한이 없거나 미지원이면 status 를 변경하고 거절한다.
 * - HTTPS 가 아니어도 시도는 하지만 사용자에게 환경 안내 메시지를 함께 보여줄 수 있다.
 */
export function getCurrentLocationOnce(): Promise<{
  state: LocationState;
}> {
  if (!isGeolocationSupported()) {
    return Promise.resolve({
      state: {
        status: 'unsupported',
        permission: 'unsupported',
        location: null,
        message:
          '이 브라우저에서는 위치 기능을 사용할 수 없습니다. 지도 보기 기능은 정상 동작합니다.'
      }
    });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: UserLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy ?? 0,
          timestamp: pos.timestamp
        };
        resolve({
          state: {
            status: 'ready',
            permission: 'granted',
            location: loc,
            message: isSecureContext()
              ? null
              : 'HTTPS 가 아닌 환경입니다. 위치가 부정확할 수 있어요.'
          }
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({
            state: {
              status: 'denied',
              permission: 'denied',
              location: null,
              message:
                '위치 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용하면 현재 위치를 표시할 수 있어요.'
            }
          });
        } else {
          resolve({
            state: {
              status: 'error',
              permission: 'unknown',
              location: null,
              message:
                '현재 위치를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.'
            }
          });
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 10_000
      }
    );
  });
}
