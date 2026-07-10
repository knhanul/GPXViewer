# nuni track — iOS 지원을 위한 리팩토링 가이드

> 이 문서는 ChatGPT에 조언을 구하기 위해 작성된 현재 프로젝트의 기능 및 기술 구조 요약서입니다.
> 목표: **Android 전용 Capacitor 앱을 iOS까지 지원하도록 리팩토링**

---

## 1. 프로젝트 요약

| 항목 | 값 |
|---|---|
| 앱 이름 | nuni track |
| appId | `kr.co.nuni.gpxviewer` |
| 웹 프레임워크 | React 18 + Vite 5 + TypeScript 5.6 |
| 네이티브 래핑 | Capacitor 6.2 (현재 Android만 추가됨) |
| 웹 빌드 산출물 | `dist/` → Capacitor가 각 플랫폼 WebView에 복사 |
| 핵심 컨셉 | GPX 파일 서버 업로드 없음, 모든 처리 기기 내부에서만 |

---

## 2. 현재 구현된 기능

### 2.1 GPX 파일 분석

- GPX 파일 업로드 (단일/다중, 드래그 앤 드롭)
- 지도 시각화 (Leaflet + OpenStreetMap, API 키 불필요)
- 다중 경로 비교 (12+ 지표 비교표, 자연어 요약)
- 고도 분석 (5-pt 이동평균 보정, 1km 구간 통계)
- 주요 오르막 자동 탐지 (거리/상승고도/평균 경사 기준)
- 선택 구간 분석 (드래그/탭 → 자전거 친화 자연어 요약)
- 공통 km 구간 비교

### 2.2 라이딩 기록 (Recording)

- 실시간 라이딩 기록 (Geolocation 연속 위치 추적)
- 기록 통계 (거리, 속도, 고도 상승, 시간)
- 일시정지/재개
- GPX 파일 내보내기 (기록 → GPX XML 변환)
- 기록 영구 저장 (IndexedDB + localStorage)
- 기록 관리 (목록, 상세 보기, 삭제, 이름 변경)
- 위치 필터링 (정확도 40m, 최소 이동 3m, 최소 간격 1.5s, 최대 속도 75km/h)

### 2.3 모바일 주행 모드

- 풀스크린 주행 모드 (큰 글씨, 한 손 조작)
- 현재 위치 표시 (Geolocation 1회 측정)
- 남은 오르막 표시
- 경로 이탈 안내 (100m 이상 벗어나면 참고용 안내)

### 2.4 기타

- PWA (오프라인 동작, 홈 화면 설치)
- 반응형 (PC 데스크탑 / 모바일 자동 전환, iOS safe-area 대응)

---

## 3. 기술 스택

| 계층 | 기술 | 버전 | 비고 |
|---|---|---|---|
| 프레임워크 | React | 18.3 | |
| 빌드 도구 | Vite | 5.4 | mode 분기: `android` → `base: './'`, 그 외 → `base: '/'` |
| 언어 | TypeScript | 5.6 | |
| 스타일 | Tailwind CSS | 3.4 | + PostCSS + Autoprefixer |
| 지도 | Leaflet + react-leaflet | 1.9 / 4.2 | OpenStreetMap 타일 |
| GPX 파싱 | @tmcw/togeojson | 6.0 | GPX → GeoJSON |
| GPX 작성 | 자체 구현 (gpxWriter.ts) | — | 라이딩 기록 → GPX XML |
| 공간 계산 | @turf/turf | 7.1 | 거리, bbox |
| 차트 | Recharts | 2.13 | 고도 프로필 |
| 아이콘 | lucide-react | 0.460 | |
| PWA | vite-plugin-pwa | 0.20 | Workbox 기반 |
| 네이티브 래핑 | @capacitor/core | 6.2 | |
| 네이티브 CLI | @capacitor/cli | 6.2 | |
| Android 플랫폼 | @capacitor/android | 6.2 | |
| iOS 플랫폼 | @capacitor/ios | **미설치** | **추가 필요** |
| 위치 추적 (네이티브) | @capacitor/geolocation | 6.1 | 라이딩 기록용 (동적 import) |
| 위치 추적 (웹) | 브라우저 Geolocation API | — | 1회 측정 + 연속 추적 fallback |
| 저장소 | IndexedDB + localStorage | — | 라이딩 기록 영구 저장 |
| 이미지 처리 | sharp | 0.33 | 아이콘 생성 스크립트용 |

---

## 4. 현재 Capacitor 설정

### 4.1 capacitor.config.ts

```typescript
const config: CapacitorConfig = {
  appId: 'kr.co.nuni.gpxviewer',
  appName: 'nuni track',
  webDir: 'dist'
};
```

- `appId`가 Android 패키지명으로 사용 중
- iOS에서는 이 `appId`가 Bundle Identifier로 사용됨
- `webDir: 'dist'`는 Vite 빌드 산출물 경로

### 4.2 Vite 빌드 모드 분기

```typescript
// vite.config.ts
base: mode === 'android' ? './' : '/',
```

- `mode === 'android'`일 때만 `base: './'` (상대경로)
- iOS 빌드 시에도 상대경로가 필요하므로 **mode 분기 로직 수정 필요**

### 4.3 package.json 스크립트

```json
{
  "build:android": "tsc -b && vite build --mode android && cap sync android",
  "android:add": "cap add android",
  "android:sync": "cap sync android",
  "android:open": "cap open android",
  "android:run": "cap run android"
}
```

- iOS용 스크립트 (`build:ios`, `ios:add`, `ios:sync`, `ios:open`, `ios:run`) **추가 필요**

---

## 5. 네이티브 플랫폼별 설정 현황

### 5.1 Android (현재 구축됨)

| 항목 | 값 |
|---|---|
| 패키지명 | `kr.co.nuni.gpxviewer` |
| minSdk | 22 |
| compileSdk | 34 |
| targetSdk | 34 |
| 권한 | `INTERNET`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` |
| 앱 이름 | `strings.xml` → `nuni track` |
| Gradle | AGP 8.5.2 |
| 아이콘 | `android/app/src/main/res/mipmap-*/` |

**AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 5.2 iOS (미구축)

**추가가 필요한 항목:**

| 항목 | 필요 내용 |
|---|---|
| 플랫폼 추가 | `npm run cap add ios` (또는 `npx cap add ios`) |
| Bundle Identifier | `kr.co.nuni.gpxviewer` (appId와 동일) |
| Info.plist 권한 | `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription` |
| 앱 이름 | iOS 프로젝트의 Display Name |
| 아이콘 | AppIcon.appiconset (1024x1024 PNG 원본에서 생성) |
| Launch Screen | Storyboard 기반 스플래시 |
| 최소 iOS 버전 | iOS 13 이상 권장 (Capacitor 6.x 요구사항) |
| Xcode | 최신 안정판 |
| CocoaPods | 설치 필요 (`pod install`) |

---

## 6. 위치 추적 아키텍처 (iOS 영향도 높음)

### 6.1 두 가지 위치 추적 경로

```
┌─────────────────────────────────────────────┐
│ 1회 측정 (useGeolocation.ts)                │
│   └─ 브라우저 Geolocation API만 사용         │
│      (Capacitor 네이티브 플러그인 사용 안 함)  │
│      → iOS WebView에서도 동작하지만           │
│        권한 다이얼로그가 WebView 방식으로 뜸   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 연속 추적 (useRideRecorder.ts)               │
│   ├─ Capacitor.isNativePlatform() 확인       │
│   ├─ 네이티브 → @capacitor/geolocation       │
│   │   (동적 import, watchPosition 사용)      │
│   └─ 웹 → navigator.geolocation.watchPosition│
│      (fallback)                              │
└─────────────────────────────────────────────┘
```

### 6.2 useRideRecorder.ts의 플랫폼 분기 로직

```typescript
async function resolveWatchProvider(): Promise<WatchProvider | null> {
  if (Capacitor.isNativePlatform()) {
    // 네이티브 플랫폼 (Android 또는 iOS)
    // @capacitor/geolocation을 동적 import
    const mod = await import('@capacitor/geolocation');
    const geo = mod.Geolocation;
    if (geo?.watchPosition && geo.clearWatch) {
      await geo.requestPermissions();
      return {
        watch: (onPosition, onError) =>
          geo.watchPosition(
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000, minimumUpdateInterval: 1000 },
            (position, error) => { ... }
          ),
        clear: (id) => geo.clearWatch({ id: String(id) })
      };
    }
  }
  // 웹 fallback
  if ('geolocation' in navigator) {
    return { ... navigator.geolocation.watchPosition ... };
  }
  return null;
}
```

- `Capacitor.isNativePlatform()`은 Android와 iOS 모두 `true` 반환
- `@capacitor/geolocation`은 iOS에서도 동일한 API 제공
- **iOS에서 추가 작업**: Info.plist에 위치 권한 설명 문자열 필수

### 6.3 useGeolocation.ts (1회 측정)

```typescript
// 브라우저 Geolocation API만 사용 (Capacitor 플러그인 사용 안 함)
navigator.geolocation.getCurrentPosition(
  (pos) => { ... },
  (err) => { ... },
  { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 }
);
```

- iOS WebView에서 `navigator.geolocation`은 동작하지만, 권한 다이얼로그가 WebView 방식으로 표시됨
- iOS에서 더 네이티브스러운 권한 요청을 원하면 `@capacitor/geolocation` 사용 고려

---

## 7. 저장소 아키텍처 (iOS 영향도)

### 7.1 라이딩 기록 저장

| 저장소 | 용도 | iOS 호환성 |
|---|---|---|
| IndexedDB | 전체 `RideRecording` 객체 저장 | iOS WebView(WKWebView)에서 지원 |
| localStorage | `RecordingMeta` 목록 (빠른 조회) | iOS WebView에서 지원 |

- iOS WKWebView는 IndexedDB와 localStorage 모두 지원
- 단, 앱 업데이트 시 저장소 데이터 보존 여부는 iOS 버전에 따라 다를 수 있음
- **주의**: iOS는 WebView 저장소를 앱 데이터 영역으로 관리하므로 앱 삭제 시 함께 삭제됨

### 7.2 저장소 키

```
IndexedDB: gpx-viewer-recordings (DB) / rideRecordings (store)
localStorage: gpx-viewer.recordings.metas.v1
```

---

## 8. 파일 선택 및 GPX 내보내기 (iOS 영향도)

### 8.1 파일 입력 (GPX 업로드)

- `<input type="file">` 사용
- Capacitor 3+ WebView에서 Android는 시스템 파일 선택기가 뜸
- **iOS**: WKWebView에서 `<input type="file">`은 Files 앱 연동을 지원하지만, 일부 제한이 있을 수 있음
- iOS 14+에서는 `UIDocumentPickerViewController`가 자동으로 연결됨

### 8.2 GPX 내보내기 (다운로드)

- 현재 구현: `gpxWriter.ts`가 GPX XML 문자열 생성
- 웹에서는 Blob + `<a download>` 방식
- **iOS**: WKWebView에서 `<a download>`는 Files 앱에 저장되지 않고 미리보기만 뜰 수 있음
- **대안**: `@capacitor/filesystem` 플러그인 또는 `@capacitor/share` 플러그인 사용 고려

---

## 9. PWA와 Capacitor 공존 문제

### 9.1 현재 상태

- `vite-plugin-pwa`가 Service Worker 등록
- Android WebView 내에서도 SW가 등록됨 (일반적으로 무해하지만 캐시 충돌 가능)
- `Capacitor.isNativePlatform()` 가드가 아직 구현되지 않음

### 9.2 iOS에서의 추가 고려사항

- iOS WKWebView에서 Service Worker는 제한적으로 동작
- PWA 매니페스트 아이콘이 iOS 홈 화면 아이콘과 별개로 동작
- iOS는 apple-touch-icon을 별도로 요구 (현재 `index.html`에 이미 설정됨)

---

## 10. UI/UX — iOS 특화 고려사항

### 10.1 Safe Area

- 현재 `index.html`에 `viewport-fit=cover` 설정됨
- Tailwind CSS로 safe-area 패딩 처리가 일부 적용됨
- iOS 노치/다이내믹 아일랜드 환경에서 추가 검증 필요

### 10.2 제스처/스크롤

- 모바일 하단 시트 (`MobileBottomSheet.tsx`)의 드래그 제스처
- iOS의 러버밴드 스크롤(rubber-band scroll)과 충돌 가능
- WKWebView의 스크롤 동작 차이 검증 필요

### 10.3 폰트/타이포그래피

- Google Fonts CDN 로드 (iOS WebView에서 동작하지만 오프라인 시 폴백 필요)
- iOS 시스템 폰트(San Francisco) 폴백 확인 필요

---

## 11. 빌드 파이프라인 — iOS 추가 시 필요 변경

### 11.1 package.json 스크립트 추가

```json
{
  "build:ios": "tsc -b && vite build --mode ios && cap sync ios",
  "ios:add": "cap add ios",
  "ios:sync": "cap sync ios",
  "ios:open": "cap open ios",
  "ios:run": "cap run ios"
}
```

### 11.2 vite.config.ts mode 분기 수정

```typescript
// 현재:
base: mode === 'android' ? './' : '/',

// 수정 필요:
base: mode === 'android' || mode === 'ios' ? './' : '/',
```

### 11.3 의존성 추가

```json
{
  "dependencies": {
    "@capacitor/ios": "^6.2.0"
  }
}
```

### 11.4 iOS 플랫폼 추가

```bash
npm install
npx cap add ios
```

### 11.5 Info.plist 권한 추가

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>라이딩 기록 및 현재 위치 표시를 위해 위치 정보가 필요합니다.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>라이딩 기록을 위해 백그라운드 위치 추적이 필요합니다.</string>
```

---

## 12. iOS 리팩토링 체크리스트

### 12.1 필수 (Must Have)

- [ ] `@capacitor/ios` 의존성 추가
- [ ] `npx cap add ios`로 iOS 플랫폼 추가
- [ ] `vite.config.ts` mode 분기에 `ios` 추가
- [ ] `package.json`에 iOS용 스크립트 추가
- [ ] Info.plist에 위치 권한 설명 문자열 추가
- [ ] iOS AppIcon.appiconset 생성 (1024x1024 PNG 원본)
- [ ] iOS Launch Screen 설정
- [ ] Xcode에서 Signing & Capabilities 설정 (Apple Developer 계정)

### 12.2 권장 (Should Have)

- [ ] `useGeolocation.ts`에 `@capacitor/geolocation` 네이티브 경로 추가 (iOS 권한 다이얼로그 개선)
- [ ] GPX 파일 다운로드를 `@capacitor/share` 또는 `@capacitor/filesystem`으로 변경
- [ ] `Capacitor.isNativePlatform()` 가드로 Service Worker 등록 건너뛰기
- [ ] iOS safe-area 추가 검증 (노치/다이내믹 아일랜드)
- [ ] WKWebView 스크롤/제스처 동작 검증

### 12.3 선택 (Nice to Have)

- [ ] iOS 백그라운드 위치 추적 (Background Modes)
- [ ] iOS Haptic Feedback (햅틱 피드백)
- [ ] iOS Shortcuts (Siri 단축어)
- [ ] Apple Watch 연동

---

## 13. ChatGPT에 물어볼 질문 예시

1. **Capacitor 6.x에서 Android와 iOS를 동시에 지원하는最佳实践은?**
   - `cap add ios` 후 공통 웹 코드를 유지하면서 플랫폼별 설정을 어떻게 관리해야 하는가?

2. **iOS WKWebView에서 `<input type="file">`과 `<a download>`의 제한사항과 해결 방법은?**
   - GPX 파일 업로드/다운로드를 네이티브 플러그인으로 교체해야 하는가?

3. **iOS WebView에서 Geolocation 권한 요청的最佳 방식은?**
   - `navigator.geolocation` vs `@capacitor/geolocation` 중 어떤 것을 사용해야 하는가?
   - 1회 측정도 네이티브 플러그인으로 통일하는 것이 좋은가?

4. **vite.config.ts의 mode 분기를 Android/iOS 공통으로 처리하는 방법은?**
   - `mode === 'android' || mode === 'ios'` 외에 더 우아한 방법이 있는가?

5. **iOS에서 Service Worker 등록을 건너뛰는 가드를 어떻게 구현해야 하는가?**
   - `Capacitor.isNativePlatform()` 체크 시점과 위치

6. **iOS AppIcon 생성 자동화 방법은?**
   - 1024x1024 PNG에서 모든 필수 아이콘 사이즈를 생성하는 스크립트

7. **iOS 백그라운드에서 라이딩 기록을 계속하려면 어떤 설정이 필요한가?**
   - Background Modes, `@capacitor/geolocation`의 백그라운드 추적 지원 여부

8. **IndexedDB 데이터가 iOS 앱 업데이트 시 보존되는가?**
   - WKWebView의 저장소 영속성 보장 방법

---

## 14. 디렉토리 구조 (iOS 추가 후 예상)

```
e:\Pjt\GPXViewer\
├── android/                    # Capacitor Android 프로젝트 (기존)
├── ios/                        # Capacitor iOS 프로젝트 (신규)
│   ├── App/
│   │   ├── App.xcodeproj
│   │   ├── App/
│   │   │   ├── Info.plist      # 권한 설명, 앱 설정
│   │   │   ├── AppDelegate.swift
│   │   │   └── Assets.xcassets/
│   │   │       └── AppIcon.appiconset/
│   │   └── Podfile             # CocoaPods 의존성
│   └── capacitor-cordova-ios-plugins/
├── dist/                       # Vite 빌드 산출물
├── src/                        # 공통 웹 소스코드
├── capacitor.config.ts         # Capacitor 설정 (공통)
├── vite.config.ts              # Vite 설정 (mode 분기 추가)
└── package.json                # 스크립트 + 의존성 (iOS 추가)
```

---

## 15. 현재 의존성 문제

### 15.1 package.json의 @capacitor/geolocation 버전 문제

```json
"@capacitor/geolocation": "^6.1.1"
```

- 현재 `package.json`에 명시된 버전이 npm registry에 존재하지 않을 수 있음
- `npm install` 실패 원인
- **해결**: 버전을 `^6.0.0`으로 변경하거나, npm에서 사용 가능한 최신 6.x 버전 확인 필요

### 15.2 @capacitor/ios 미설치

- iOS 플랫폼 지원을 위해 `@capacitor/ios` 패키지 추가 필요
- `npm install @capacitor/ios@^6.2.0`
