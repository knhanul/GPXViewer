# nuni gpx뷰어

자전거 라이더를 위한 브라우저 기반 GPX 뷰어.
**GPX 파일은 서버로 절대 업로드되지 않으며, 모든 분석은 브라우저 안에서만** 처리됩니다.

## 로고 / 브랜딩

- 공식 이름: **nuni gpx뷰어**
- 로고: `public/nuni_logo_v1.0.png` (PNG 원본, **SVG 변환하지 않음**)
  - 브라우저 헤더의 `<img class="app-logo">` 로 표시
  - favicon, apple-touch-icon, PWA manifest icons 모두 동일 PNG 파일 참조
- PWA manifest: `vite.config.ts` 의 `manifest.icons` — `purpose: "any"` (maskable 강제하지 않음)
- 잘림 방지를 위해 `object-fit: contain` + `overflow: visible` 적용

> PNG 파일이 `public/nuni_logo_v1.0.png` 경로에 있어야 한다. 다른 이름/경로로 두면 헤더·favicon·PWA 아이콘이 비어 보이게 된다.

## 주요 기능

- **GPX 업로드** — 단일 또는 여러 파일을 한 번에 업로드
- **지도 시각화** — Leaflet + OpenStreetMap 기반 (외부 지도 API 키 불필요)
- **다중 경로 비교** — 색상·표시·이름·삭제·전체 보기, 12+ 지표 비교표
- **고도 분석** — 5-pt 이동평균으로 보정한 고도/경사도 차트, 1km 구간 통계
- **주요 오르막 자동 탐지** — 거리·상승고도·평균 경사 기준을 만족하는 연속 오르막을 묶어 카드 리스트로 표시
- **선택 구간 분석** — 드래그/탭으로 구간 선택 → 자전거 친화 자연어 요약
- **공통 km 구간 비교** — 여러 경로의 동일 거리 구간을 한눈에 비교
- **주행 모드** — 모바일에서 한 손으로 보기 좋은 큰 글씨 + 현재 위치 표시 + 남은 오르막
- **현재 위치 / 경로 이탈 안내** — Geolocation API 1회 측정, 경로에서 100m 이상 벗어나면 참고용 안내
- **PWA** — 오프라인에서도 기본 동작, 홈 화면에 설치 가능
- **반응형** — PC(데스크탑) / 모바일 자동 전환, iOS safe-area 대응

## GPX 파일은 서버로 가지 않습니다

- 모든 파싱(`@tmcw/togeojson`)과 분석(`@turf/turf`, 자체 유틸)은 브라우저에서만 실행됩니다.
- 네트워크 요청은 **OSM 타일**을 받아오기 위한 GET 호출과 PWA 정적 자산 캐싱용으로만 발생합니다.
- 따라서 안심하고 개인 경로/민감한 위치를 업로드할 수 있습니다.

## 고도 분석

- 원본 `elevation` 값은 그대로 보존(`TrackPoint.elevation`)
- 화면 표시와 경사도 계산은 **5-pt 이동평균으로 보정한 `smoothedElevation` / `smoothedGradePercent`** 사용
- 보정 강도(윈도우 크기)는 `buildTrackPoints(route, { smoothingWindow })` 인자로 조절 가능
- 고도 데이터가 없는 GPX는 "고도 정보가 없습니다" 안내 표시
- 일부 포인트만 고도가 있어도 평균 계산 시 0 으로 처리되며, `hasElevation === false` 일 때는 분석을 비활성화하고 안내한다.

## 주요 오르막 자동 탐지

- 보정된 경사도/고도 기준으로 연속 상승 구간을 묶어 1개의 오르막으로 만든다.
- 기본 필터:
  - 최소 거리 ≥ **0.3km**
  - 최소 상승고도 ≥ **20m**
  - 평균 경사 ≥ **3%**
- 난이도 분류:
  - 평균 < 3% → **완만함**
  - 3% ~ 6% → **보통**
  - 6% ~ 9% → **힘든 오르막**
  - ≥ 9% → **매우 힘든 오르막**
- 오르막 카드를 클릭하면 해당 구간이 지도와 고도 차트에서 강조되고, 모바일/주행 모드에서도 그대로 강조된다.

## 여러 GPX 비교

- 업로드한 경로마다 자동으로 다른 색상 할당
- 표시/숨기기, 이름 변경, 색상 변경, 삭제, 전체 보기(fitBounds) 지원
- 비교표(12+ 지표)에 **주요 오르막 개수, 총 오르막 거리, 가장 긴 오르막, 가장 힘든 오르막 경사** 항목 포함
- 2개 이상일 때 상단에 자연어 요약 제공
  > 예: "A코스는 거리는 길지만 오르막이 완만하고, B코스는 짧지만 주요 오르막의 경사도가 높아 체감 난이도가 더 높을 수 있습니다."

## 모바일 주행 모드

- 모바일 하단 시트 상단의 **"주행 모드"** 버튼을 누르면 풀스크린 모드로 진입
- 표시되는 정보:
  - 코스명, 총 거리, 고도 범위 (큰 글씨)
  - **현재 위치** 표시 (Geolocation)
  - **남은 주요 오르막 리스트**
  - **경로 이탈 참고 안내** (경로에서 100m 이상 벗어난 경우)
- GPS 권한이 없어도 기존 GPX 보기 기능은 정상 동작한다.
- 실시간 내비게이션/백그라운드 추적은 구현하지 않음 (의도적으로 단순화).

## 로컬 실행

```bash
# 의존성 설치
npm install

# 개발 서버 (기본 127.0.0.1:5173)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

> Vite 가 IPv4 로 바인딩되어 `EACCES` (Windows) 가 나는 경우 `vite.config.ts` 의 `server.host` 를
> `'127.0.0.1'` 로 유지하면 정상 동작한다. 그 외 포트가 필요하면 `server.port` 도 함께 조정.

## 빌드 / 배포

### 일반 정적 호스팅 (Vercel / Netlify / Alibaba OSS)

`npm run build` 결과물은 정적 자산이므로 어디든 그대로 올릴 수 있다.

- **Vercel** — `vercel.json` (SPA fallback), `npm run build` 가 그대로 빌드 명령
- **Netlify** — `public/_redirects` (SPA fallback)
- **Alibaba Cloud OSS + CDN** — `dist/` 디렉터리를 OSS 버킷에 업로드하고, 정적 웹사이트 호스팅 + CDN 적용
  1. `npm run build`
  2. OSS 콘솔에서 `dist/` 의 모든 파일을 버킷 root 에 업로드
  3. 버킷 → `정적 웹사이트 호스팅` 활성화 (`기본 페이지: index.html`, `404: index.html`)
  4. CDN 도메인 또는 자체 도메인을 CDN 에 바인딩 (HTTPS 권장 — Geolocation 은 HTTPS 가 아니면 일부 브라우저에서 차단됨)
  5. SPA 라우팅을 위해 `index.html` 을 SPA fallback 으로 매핑

### PWA

- `vite-plugin-pwa` (Workbox) 가 빌드 시 `sw.js` 와 `manifest.webmanifest` 를 생성
- OSM 타일은 precache 가 아닌 런타임 캐시
- 설치 가능한 홈 화면 아이콘은 `public/icons/` 에 포함

## Android 앱 빌드 (Capacitor)

Capacitor 로 **하나의 저장소에서** 웹앱과 Android 앱을 함께 관리한다.
`npm run build` 결과물(`dist/`)을 앱 내부에 포함해 **자체 웹서버 없이** 실행한다.
지도 타일(OpenStreetMap)만 인터넷으로 로드되며, GPX 파일은 여전히 앱 내부에서만 처리된다.

### 1) 사전 준비 (호스트 PC)

| 항목 | 권장 |
|---|---|
| Node.js | 20 LTS 이상 |
| JDK | 17 (Temurin / Microsoft OpenJDK) |
| Android Studio | 최신 안정판 (Hedgehog 이상) |
| Android SDK | Platform 34, Build-Tools 34.x, Platform-Tools |
| 환경변수 | `ANDROID_HOME` (또는 `ANDROID_SDK_ROOT`) 가 SDK 경로로 설정 |

> `JAVA_HOME` 이 JDK 17 을 가리키는지 확인. Capacitor 6.x 는 JDK 17 필수.

### 2) 최초 1회 — Android 플랫폼 추가

```bash
# 의존성 설치 (Capacitor 패키지 포함)
npm install

# Android 프로젝트 생성. android/ 폴더가 생기고 이후부터는 git 으로 추적한다.
# (이미 android/ 가 있다면 실행하지 말 것 — 기존 설정이 덮어쓰여진다)
npm run android:add
```

생성 후 **권장**:
- `android/app/src/main/AndroidManifest.xml` 의 `<uses-permission>` 에 다음이 포함되어 있는지 확인
  ```xml
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
  ```
  (`cap add android` 시 INTERNET 은 자동 추가됨. 위치 권한은 WebView 의 Geolocation 이 OS 권한 다이얼로그를 띄울 수 있도록 미리 선언한다.)
- `android/app/src/main/res/values/strings.xml` 의 `<string name="app_name">GPX Viewer</string>` 가 앱 이름과 일치하는지 확인
- 앱 아이콘은 `android/app/src/main/res/mipmap-*/` 의 기본 Capac 아이콘을 사용 중이라면, 추후 교체

### 3) 빌드 & 동기화

```bash
# (1) Vite 가 mode 'android' 로 빌드 → dist/ 가 base='./' 로 산출
# (2) cap sync android → dist/ 를 android/app/src/main/assets/public/ 로 복사
npm run build:android
```

수동 동기화가 필요할 때:
```bash
npm run android:sync
```

### 4) Android Studio 에서 열기 / 실행

```bash
# Android Studio 가 android/ 폴더를 연다
npm run android:open
```

또는 CLI 로 바로 디바이스/에뮬레이터에 설치·실행:
```bash
npm run android:run
```

### 5) AAB (Google Play 업로드용) 생성

1. Android Studio → 상단 메뉴 **Build** → **Generate Signed Bundle / APK…**
2. **Android App Bundle** 선택 → Next
3. **Create new…** 로 키스토어 생성 (또는 기존 키스토어 선택)
   - `*.jks` / `*.keystore` / 비밀번호는 **절대 Git 에 커밋하지 말 것** (`.gitignore` 에 등록됨)
   - 키스토어는 안전한 외부 저장소(1Password, 사내 시크릿 매니저 등) 에 백업
4. release variant 선택 → Finish
5. 산출물: `android/app/release/app-release.aab`
6. Google Play Console → 신규 앱 → **App Bundle 업로드**

### 6) 자주 쓰는 명령 요약

| 명령 | 동작 |
|---|---|
| `npm run dev` | 웹 개발 서버 (127.0.0.1:5174) |
| `npm run build` | 웹 프로덕션 빌드 (`dist/`) |
| `npm run build:web` | `npm run build` 의 별칭 |
| `npm run build:android` | Vite `mode=android` 빌드 + `cap sync` |
| `npm run android:sync` | dist → android 자산 동기화만 |
| `npm run android:open` | Android Studio 열기 |
| `npm run android:run` | 디바이스/에뮬레이터에 설치·실행 |
| `npm run preview` | `dist/` 정적 미리보기 (127.0.0.1:4174) |

### 7) Android 환경에서 알아둘 점

- **자체 웹서버 미사용** — `dist/` 가 `android/app/src/main/assets/public/` 에 그대로 복사되어 앱 내 WebView 에서 `https://localhost` 스킴으로 로드된다.
- **지도 타일** — OpenStreetMap 타일은 **인터넷 연결이 필요**하다. 오프라인 지도 캐시는 PWA Workbox 런타임 캐시에 일부 저장되지만, 사용 영역 밖의 타일은 새로 받아온다.
- **GPX 파일** — 사용자가 파일 선택기로 고른 GPX 는 **앱 내부** 에서만 파싱·분석된다. 서버로 업로드하지 않는다. (`@tmcw/togeojson` + 자체 유틸)
- **현재 위치 / Geolocation** — Android WebView 70+ 에서는 `https://localhost` 스킴에서 Geolocation 이 정상 동작한다. OS 권한 다이얼로그는 WebView 가 자동 표시한다. 네이티브 위치 기능이 필요해질 경우 후속 작업으로 `@capacitor/geolocation` 플러그인 도입을 고려.
- **파일 선택 (`input type="file"`)** — Capacitor 3+ WebView 에서 정상 동작한다. 시스템 파일 선택 UI 가 뜨며, 별도 플러그인 없이 기존 웹 코드 그대로 사용 가능.
- **PWA Service Worker** — Android WebView 내에서도 SW 가 등록되며, 일반적으로 무해하다. 만약 업데이트/캐시 충돌이 보이면 후속 작업으로 Capacitor 환경 감지(`@capacitor/core` 의 `Capacitor.isNativePlatform()`) 후 SW 등록을 건너뛰는 가드를 추가할 수 있다.
- **base 경로** — `vite.config.ts` 가 `mode === 'android'` 일 때만 `base: './'` 로 빌드한다. 웹 빌드는 절대 경로(`'/'`)를 유지하므로 Vercel / Netlify / OSS 배포는 영향 없음.

## 기술 스택

- React 18 + Vite 5 + TypeScript
- Tailwind CSS 3
- Leaflet + react-leaflet (OpenStreetMap)
- @tmcw/togeojson (GPX → GeoJSON 파싱)
- @turf/turf (공간 계산)
- Recharts (고도 차트)
- vite-plugin-pwa (Workbox 기반 PWA)
- @capacitor/core / @capacitor/cli / @capacitor/android (Android 네이티브 래핑)
- lucide-react (아이콘)

## 데이터 흐름 (요약)

```
GPX 파일
  └─► gpxParser (FileReader + DOMParser)
        └─► ParsedRoute
              └─► buildTrackPoints (smoothElevationSeries, smoothedGrade)
                    └─► TrackPoint[]   ──► elevation 차트 / 비교 / 이탈 거리
                    └─► computeSegments (1km 단위)
                    └─► detectClimbs    (오르막 자동 탐지)
                    └─► buildCompareRow  (다중 경로 비교표)
```

## 주의 / 한계

- Geolocation 은 HTTPS (또는 localhost) 가 아닌 환경에서 일부 브라우저가 차단한다.
- 경로 이탈 안내는 **참고용**이며, GPS 오차·지형·도로 정책상 실제와 다를 수 있다.
- 백엔드 / DB / 로그인 / 공유 링크 기능은 포함되지 않는다.
- 네이버 지도·카카오 지도·구글 지도 연동은 **의도적으로 지원하지 않는다** (OpenStreetMap 만 사용).
