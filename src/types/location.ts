// 브라우저 Geolocation API 관련 타입

/** 위치 권한 상태 */
export type LocationPermission = 'unknown' | 'granted' | 'denied' | 'unsupported';

/** 위치 가져오기 결과 */
export type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'denied'
  | 'unsupported'
  | 'error';

/** 사용자 현재 위치 */
export interface UserLocation {
  lat: number;
  lng: number;
  /** GPS 정확도 (m). 0 이면 알 수 없음 */
  accuracyM: number;
  /** 마지막 측정 시각 (ms) */
  timestamp: number;
}

/** 위치 훅이 노출하는 상태 */
export interface LocationState {
  status: LocationStatus;
  permission: LocationPermission;
  location: UserLocation | null;
  /** 사용자에게 보여줄 한국어 메시지 (없으면 null) */
  message: string | null;
}
