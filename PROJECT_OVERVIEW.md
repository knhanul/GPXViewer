# nuni gpx뷰어 — 프로젝트 아키텍처 개요

> 리팩토링 검토를 위한 구조 분석 문서.  
> 모든 파일 경로는 프로젝트 루트(`e:\Pjt\GPX`) 기준.

---

## 1. 프로젝트 요약

자전거 라이더를 위한 **브라우저 기반 GPX 뷰어**. React 18 + Vite 5 + TypeScript로 구축되었으며, Capacitor를 통해 Android 네이티브 앱으로도 빌드 가능. GPX 파일은 서버로 전송되지 않고 **기기 내부에서만** 파싱·분석된다.

### 핵심 기능

- GPX 파일 업로드 (단일/다중, 드래그 앤 드롭)
- 지도 시각화 (Leaflet + OpenStreetMap)
- 고도 분석 (5-point 이동평균 보정, 1km 구간 통계)
- 주요 오르막 자동 탐지 (거리/상승고도/평균 경사 기준)
- 다중 경로 비교 (12+ 지표 비교표, 자연어 요약)
- 공통 km 구간 비교
- 선택 구간 분석 (드래그/탭 → 자연어 요약)
- 주행 모드 (모바일 풀스크린, 현재 위치, 남은 오르막, 경로 이탈 안내)
- PWA (오프라인 동작, 홈 화면 설치)
- 반응형 (PC 데스크탑 / 모바일 자동 전환)

---

## 2. 기술 스택

| 계층 | 기술 |
|---|---|
| 프레임워크 | React 18 |
| 빌드 도구 | Vite 5 |
| 언어 | TypeScript 5.6 |
| 스타일 | Tailwind CSS 3 + PostCSS + Autoprefixer |
| 지도 | Leaflet 1.9 + react-leaflet 4.2 (OpenStreetMap 타일) |
| GPX 파싱 | @tmcw/togeojson 6.0 (GPX → GeoJSON) |
| 공간 계산 | @turf/turf 7.1 (거리, bbox) |
| 차트 | Recharts 2.13 (고도 프로필) |
| 아이콘 | lucide-react 0.460 |
| PWA | vite-plugin-pwa 0.20 (Workbox 기반) |
| Android | @capacitor/core 6.2 + @capacitor/cli 6.2 + @capacitor/android 6.2 |
| 이미지 처리 | sharp 0.33 (아이콘 생성 스크립트용) |

---

## 3. 디렉토리 구조

```
e:\Pjt\GPX\
├── android/                    # Capacitor Android 네이티브 프로젝트
├── dist/                       # Vite 빌드 산출물 (gitignored)
├── node_modules/               # 의존성 (gitignored)
├── public/                     # 정적 자산 (로고, 샘플 GPX, 아이콘)
├── scripts/
│   └── generate-icons.mjs      # PWA 아이콘 생성 스크립트
├── src/
│   ├── App.tsx                 # 메인 앱 컴포넌트 (647줄) — 상태 관리 + 레이아웃 분기
│   ├── main.tsx                # React 엔트리 포인트
│   ├── index.css               # 전역 스타일 (Tailwind directives + 커스텀)
│   ├── components/             # UI 컴포넌트 (15개)
│   │   ├── ClimbCard.tsx
│   │   ├── ClimbList.tsx
│   │   ├── ElevationProfile.tsx
│   │   ├── GpxUploader.tsx
│   │   ├── LocationStatus.tsx
│   │   ├── MapViewer.tsx
│   │   ├── MobileBottomSheet.tsx
│   │   ├── MultiElevationProfile.tsx
│   │   ├── RideModePanel.tsx
│   │   ├── RouteCompareTable.tsx
│   │   ├── RouteInfoPanel.tsx
│   │   ├── RouteListPanel.tsx
│   │   ├── SegmentComparePanel.tsx
│   │   ├── SegmentList.tsx
│   │   └── SegmentSummary.tsx
│   ├── constants/
│   │   └── route.ts            # 경로 이탈 임계값 (100m)
│   ├── hooks/
│   │   ├── useGeolocation.ts   # Geolocation API 1회 측정 훅
│   │   └── useMediaQuery.ts    # 반응형 분기 (데스크탑/모바일)
│   ├── types/
│   │   ├── climb.ts            # 오르막 관련 타입 (RouteClimb, ClimbDifficulty)
│   │   ├── gpx.ts              # GPX 도메인 타입 (ParsedRoute, TrackPoint, RouteState 등)
│   │   └── location.ts         # 위치 관련 타입 (LocationState, UserLocation)
│   └── utils/
│       ├── climbUtils.ts       # 오르막 탐지 알고리즘 + 난이도 분류
│       ├── elevationUtils.ts   # 고도 보정, 누적거리, 경사도, 구간화, 다운샘플링
│       ├── gpxParser.ts        # GPX 파일 → ParsedRoute 변환 (FileReader + DOMParser + togeojson)
│       ├── locationUtils.ts    # Geolocation API 헬퍼
│       ├── routeDistanceUtils.ts # 점-폴리라인 거리 계산 (경로 이탈 안내용)
│       ├── routeUtils.ts       # turf 기반 거리/bbox/고도 메타데이터 계산
│       └── segmentUtils.ts     # 다중 경로 비교표, 난이도 점수, 자연어 요약, 색상 할당
├── capacitor.config.ts         # Capacitor 설정 (appId, appName, webDir)
├── index.html                  # HTML 엔트리
├── package.json                # 의존성 + 스크립트
├── postcss.config.js           # PostCSS 설정
├── tailwind.config.js          # Tailwind 설정 (다크 테마 컬러 팔레트)
├── tsconfig.json               # TypeScript 루트 설정
├── tsconfig.app.json           # 앱용 TS 설정
├── tsconfig.node.json          # Node용 TS 설정
├── vite.config.ts              # Vite 설정 (PWA, base 경로 분기, 서버 호스트)
├── vercel.json                 # Vercel 배포 설정 (SPA fallback)
├── deploy.bat                  # Windows 배치 배포 스크립트
├── gpxbuild.txt                # 빌드 메모
└── README.md                   # 기존 프로젝트 문서
```

---

## 4. 아키텍처 및 데이터 흐름

### 4.1 전체 데이터 흐름

```
GPX 파일 (사용자 선택)
  │
  ▼
GpxUploader (FileReader + DOMParser + @tmcw/togeojson)
  │
  ▼
ParsedRoute (정규화된 좌표 + 메타데이터)
  │ buildRouteMetadata() — routeUtils.ts
  │   ├─ calculateDistanceKm() — turf length
  │   ├─ computeBounds() — turf bbox
  │   └─ computeElevationStats() — gain/loss, min/max
  │
  ▼
RouteState (App.tsx에서 관리)
  │ buildTrackPoints() — elevationUtils.ts
  │   ├─ smoothElevationSeries() — 5-point 이동평균
  │   ├─ haversineKm() — 누적 거리
  │   └─ computeGrade() — 원본/보정 경사도
  │
  ├─ toElevationPoints() — 차트용 다운샘플
  ├─ computeSegments() — 1km 단위 구간화
  ├─ detectClimbs() — 오르막 자동 탐지 (climbUtils.ts)
  ├─ buildCompareTable() — 다중 경로 비교표 (segmentUtils.ts)
  ├─ buildSegmentCompare() — 공통 km 구간 비교
  └─ buildMultiRouteSummary() — 자연어 요약
  │
  ▼
UI 렌더링
  ├─ Desktop: 좌측 사이드바 + 우측 지도 + 차트
  └─ Mobile: 지도 + 하단 시트 (4 탭)
```

### 4.2 상태 관리

모든 상태는 `App.tsx`의 `useState`로 관리. 별도의 상태 관리 라이브러리(Redux, Zustand 등)는 사용하지 않는다.

| 상태 | 타입 | 설명 |
|---|---|---|
| `routes` | `RouteState[]` | 업로드된 모든 경로 |
| `activeRouteId` | `RouteId \| null` | 현재 선택된 경로 ID |
| `error` | `string \| null` | 에러 메시지 |
| `selection` | `SegmentSelection \| null` | 고도 차트에서 드래그로 선택한 구간 |
| `comparison` | `ComparisonSelection \| null` | 공통 km 구간 비교 선택 |
| `fitAllTrigger` | `number` | "전체 보기" 트리거 (증가 시 MapViewer에서 fitBounds) |
| `panToUserTrigger` | `number` | "내 위치로 이동" 트리거 |
| `activeClimbId` | `RouteId \| null` | 선택된 오르막 ID |

### 4.3 파생 데이터 (useMemo)

| 파생값 | 의존성 | 설명 |
|---|---|---|
| `activeRoute` | routes, activeRouteId | 활성 경로 객체 |
| `activeTrackPoints` | activeRoute | 활성 경로의 TrackPoint 배열 |
| `activeElevationPoints` | activeRoute | 차트용 ElevationPoint 배열 |
| `activeSegments` | activeRoute | 1km 단위 구간 배열 |
| `selectionStats` | activeTrackPoints, selection | 선택 구간 통계 |
| `activeClimbs` | activeRoute | 활성 경로의 오르막 배열 |
| `compareRows` | routes | 다중 경로 비교표 행들 |
| `segmentCompareRows` | routes, comparison | 공통 km 구간 비교 행들 |
| `multiSummary` | compareRows | 자연어 다중 경로 요약 |
| `offRouteMeters` | locationState, activeRoute | 경로 이탈 거리 (m) |

---

## 5. 컴포넌트 구조

### 5.1 컴포넌트 트리

```
App
├── GpxUploader                    # 파일 업로드 (드래그 앤 드롭, 다중)
├── [error banner]                 # 에러 표시
├── DesktopLayout (≥ 1024px)
│   ├── RouteListPanel             # 경로 목록 (색상/표시/이름/삭제)
│   ├── RouteInfoPanel             # 경로 기본 정보
│   ├── SegmentSummary             # 선택 구간 요약
│   ├── ClimbList                  # 주요 오르막 리스트
│   ├── SegmentList                # 1km 구간 리스트
│   ├── MapViewer                  # 지도
│   ├── RouteCompareTable          # 다중 경로 비교표
│   ├── ElevationProfile           # 단일 고도 차트
│   ├── MultiElevationProfile      # 다중 고도 차트
│   ├── LocationStatus             # 현재 위치 상태
│   └── SegmentComparePanel        # 공통 km 구간 비교
└── MobileLayout (< 1024px)
    ├── MapViewer                  # 지도
    └── MobileBottomSheet          # 하단 시트
        ├── Tab: routes            # 경로 탭
        │   ├── RouteListPanel
        │   ├── ElevationProfile
        │   ├── SegmentSummary
        │   ├── ClimbList
        │   └── SegmentList
        ├── Tab: compare           # 비교 탭
        │   └── RouteCompareTable
        ├── Tab: chart             # 차트 탭
        │   ├── MultiElevationProfile
        │   └── LocationStatus
        ├── Tab: segment           # 구간 탭
        │   └── SegmentComparePanel
        └── RideModePanel          # 주행 모드 (풀스크린 오버레이)
            ├── LocationStatus
            └── ClimbList (남은 오르막)
```

### 5.2 컴포넌트별 역할

| 컴포넌트 | 파일 크기 | 주요 역할 |
|---|---|---|
| `App.tsx` | 647줄 | 최상위 상태 관리, 레이아웃 분기, 모든 핸들러 정의 |
| `MobileBottomSheet.tsx` | 421줄 | 모바일 하단 시트, 4 탭 UI, 주행 모드 토글 |
| `MapViewer.tsx` | ~380줄 | Leaflet 지도, 경로 렌더링, fitBounds, 위치 마커 |
| `ElevationProfile.tsx` | ~300줄 | Recharts 고도 차트, 드래그 선택 |
| `MultiElevationProfile.tsx` | ~280줄 | 다중 경로 고도 오버레이 차트 |
| `RouteCompareTable.tsx` | ~240줄 | 12+ 지표 비교표 |
| `SegmentComparePanel.tsx` | ~260줄 | 공통 km 구간 선택 + 비교 |
| `GpxUploader.tsx` | 188줄 | 파일 입력, 드래그 앤 드롭, 파싱 호출 |
| `RouteListPanel.tsx` | 183줄 | 경로 목록, 색상/표시/이름/삭제 |
| `RideModePanel.tsx` | 129줄 | 주행 모드 풀스크린 패널 |
| `SegmentSummary.tsx` | ~200줄 | 선택 구간 자연어 요약 |
| `SegmentList.tsx` | ~130줄 | 1km 구간 리스트 |
| `LocationStatus.tsx` | 108줄 | 위치 권한/측정 상태 + 버튼 |
| `ClimbList.tsx` | ~42줄 | 오르막 카드 리스트 |
| `ClimbCard.tsx` | ~75줄 | 개별 오르막 카드 |
| `RouteInfoPanel.tsx` | ~160줄 | 경로 기본 정보 표시 |

---

## 6. 유틸리티 모듈

### 6.1 `gpxParser.ts` (165줄)

GPX 파일 → `ParsedRoute` 변환.

- `parseGpxFile(file: File): Promise<ParsedRoute>` — 메인 함수
- `FileReader`로 텍스트 읽기 → `DOMParser`로 XML 파싱 → `@tmcw/togeojson`으로 GeoJSON 변환
- `GpxParseError` 커스텀 에러 클래스로 한국어 에러 메시지 제공
- LineString / MultiLineString 좌표 추출

### 6.2 `routeUtils.ts` (187줄)

`turf` 기반 메타데이터 계산.

- `buildRouteMetadata(fileName, coordinates): ParsedRoute` — 좌표 배열로부터 거리/bounds/고도 통계 생성
- `calculateDistanceKm()` — turf `length`로 총 거리 계산
- `computeBounds()` — turf `bbox`로 경계 계산
- `computeElevationStats()` — 인접 고도 차분으로 gain/loss 계산 (0.5m 노이즈 임계값)
- `formatCoordinate()`, `formatDistanceKm()` — 포맷 헬퍼

### 6.3 `elevationUtils.ts` (437줄)

고도/구간 분석 핵심 모듈.

- `buildTrackPoints(route, options): TrackPoint[]` — ParsedRoute → 분석용 TrackPoint 변환
  - 누적 거리 (haversine)
  - 5-point 중심 이동평균 고도 보정 (`smoothElevationSeries`)
  - 원본/보정 경사도 계산 (`computeGrade`, ±50% 클램프)
- `toElevationPoints(points): ElevationPoint[]` — 차트용 변환
- `computeSelectionStats(points, selection): SegmentStats` — 구간 통계 (거리, gain/loss, 평균/최대 경사, upRatio)
- `downsampleTrackPoints(points, targetCount): TrackPoint[]` — extremum 보존 다운샘플링 (2000개 초과 시 1500개로 축소)
- `computeSegments(points, segmentLengthKm): RouteSegment[]` — 1km 단위 구간화
- `gradeColor(grade)`, `formatGrade(grade)`, `formatElevation(m)` — 시각화 헬퍼

### 6.4 `climbUtils.ts` (238줄)

오르막 자동 탐지.

- `detectClimbs(trackPoints, routeId, routeName, options): RouteClimb[]` — 연속 상승 구간 탐지
  - 알고리즘: smoothedGrade > 0.5%인 인접 구간을 묶어 candidate 생성 → 거리/상승고도/평균 경사 최소 기준 필터
  - 기준: 거리 ≥ 0.3km, 상승고도 ≥ 20m, 평균 경사 ≥ 3%
- `classifyClimb(avgGrade): ClimbDifficulty` — 난이도 분류 (gentle/moderate/hard/extreme)
- `buildClimbInterpretation()` — 난이도별 자연어 해석
- `summarizeClimbs(climbs): ClimbSummary` — 오르막 통계 요약 (개수, 총 거리, 총 gain, 최장, 최경사)

### 6.5 `segmentUtils.ts` (440줄)

다중 경로 비교 + 난이도 분석.

- `ROUTE_COLOR_PALETTE` — 10색 다크 테마 팔레트
- `pickNextColor(used): string` — 색상 자동 할당
- `calculateDifficultyScore(gain, avgGrade, maxGrade): number` — 규칙 기반 난이도 점수
  - `score = 0.6 * (gain/100) + 0.3 * |avgGrade| + 0.1 * |maxGrade|`
  - < 5: easy, 5~10: moderate, 10~20: hard, 20+: extreme
- `buildInterpretation(state, summary): string` — 경로별 1줄 해석
- `buildMultiRouteSummary(rows): string` — 다중 경로 자연어 요약
- `buildCompareRow(state): RouteCompareRow` — 비교표 1행 생성 (12+ 지표)
- `buildCompareTable(states): RouteCompareRow[]` — 전체 비교표
- `buildSegmentCompare(states, selection): RouteSegmentCompareRow[]` — 공통 km 구간 비교
- `computeUnionBounds(states): LatLngBounds` — 전체 경로 bounds (visible만)
- `findClosestIndex(points, km): number` — 이진 탐색으로 누적거리 기준 인덱스 찾기

### 6.6 `routeDistanceUtils.ts` (76줄)

경로 이탈 거리 계산.

- `distanceToTrackMeters(p, trackPoints): number` — 점과 폴리라인 사이 최소 거리 (m)
- `pointToSegmentMeters(p, a, b): number` — 점-세그먼트 거리 (평면 근사 + haversine)
- 임계값 100m (`OFF_ROUTE_THRESHOLD_METERS`) 초과 시 이탈 안내

### 6.7 `locationUtils.ts` (104줄)

Geolocation API 헬퍼.

- `getCurrentLocationOnce(): Promise<{ state: LocationState }>` — 1회 위치 측정
  - `enableHighAccuracy: true`, `timeout: 10s`, `maximumAge: 30s`
- `isGeolocationSupported()`, `isSecureContext()` — 환경 확인
- `initialLocationState()` — 초기 상태

---

## 7. 타입 시스템

### 7.1 핵심 타입 관계

```
ParsedRoute (파싱 결과)
  │
  ▼
RouteState (App 관리 상태)
  ├─ route: ParsedRoute
  ├─ trackPoints: TrackPoint[]
  ├─ elevationPoints: ElevationPoint[]
  └─ segments: RouteSegment[]

TrackPoint
  ├─ lat, lng
  ├─ elevation (원본)
  ├─ smoothedElevation (보정)
  ├─ cumulativeDistanceKm
  ├─ gradePercent (원본 경사)
  └─ smoothedGradePercent (보정 경사)

RouteClimb (오르막)
  ├─ startIndex, endIndex (TrackPoint 인덱스)
  ├─ startKm, endKm, distanceKm
  ├─ elevationGainM, avgGradePercent, maxGradePercent
  └─ difficulty: ClimbDifficulty

RouteCompareRow (비교표 행)
  ├─ 12+ 지표 (거리, 고도, 경사, 난이도, 오르막 요약)
  └─ interpretation: string (자연어)
```

### 7.2 타입 파일

| 파일 | 주요 타입 |
|---|---|
| `types/gpx.ts` (190줄) | `RoutePoint`, `ParsedRoute`, `TrackPoint`, `ElevationPoint`, `RouteSegment`, `SegmentSelection`, `SegmentStats`, `RouteState`, `ComparisonSelection`, `RouteCompareRow`, `RouteSegmentCompareRow` |
| `types/climb.ts` (64줄) | `ClimbDifficulty`, `RouteClimb`, `ClimbDetectionOptions` |
| `types/location.ts` (33줄) | `LocationPermission`, `LocationStatus`, `UserLocation`, `LocationState` |

---

## 8. 빌드 및 배포

### 8.1 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (127.0.0.1:5174) |
| `npm run build` | 웹 프로덕션 빌드 (`dist/`) |
| `npm run build:android` | Android 빌드 (Vite `mode=android` + `cap sync`) |
| `npm run preview` | 빌드 결과 미리보기 (127.0.0.1:4174) |
| `npm run lint` | TypeScript 타입 체크 (`tsc -b --noEmit`) |
| `npm run icons` | PWA 아이콘 생성 |
| `npm run android:sync` | dist → android 동기화만 |
| `npm run android:open` | Android Studio 열기 |
| `npm run android:run` | 기기/에뮬레이터 실행 |

### 8.2 Vite 설정 특이사항

- `base` 경로 분기: `mode === 'android'` → `'./'` (상대경로), 그 외 → `'/'` (절대경로)
- PWA: Workbox precache (`**/*.{js,css,html,svg,png,ico,webmanifest,woff2}`) + OSM 타일 런타임 캐시 (`StaleWhileRevalidate`, 200 entries, 30일) + Google Fonts 캐시 (`CacheFirst`, 365일)
- 서버: IPv4 강제 (`127.0.0.1`) — Windows EACCES 회피

### 8.3 Capacitor 설정

```typescript
// capacitor.config.ts
{
  appId: 'kr.co.nuni.gpxviewer',
  appName: 'GPX Viewer',
  webDir: 'dist'
}
```

---

## 9. 리팩토링 검토 포인트

### 9.1 `App.tsx` 비대화 (647줄)

**현황**: 모든 상태, 핸들러, 파생 데이터, 레이아웃 분기가 `App.tsx`에 집중.

**개선 방향**:
- 상태 관리를 커스텀 훅 또는 Context로 분리 (예: `useRoutes()`, `useActiveRoute()`, `useComparison()`)
- `DesktopLayout`을 별도 파일로 분리 (현재 `App.tsx` 내부에 인라인)
- 핸들러 그룹을 별도 훅으로 추출 (예: `useRouteOperations()`)

### 9.2 상태 관리 구조

**현황**: `useState` + `useCallback` + `useMemo` 조합. Prop drilling이 심함 — `App` → `DesktopLayout` / `MobileBottomSheet` → 하위 컴포넌트로 10+ props 전달.

**개선 방향**:
- Context API 도입으로 prop drilling 제거
- 또는 Zustand 등 경량 상태 관리 라이브러리 도입
- `RouteState` 배열 조작 로직을 reducer 패턴으로 통합

### 9.3 컴포넌트 분리

**현황**: `MobileBottomSheet.tsx` (421줄)가 4개 탭의 모든 내용을 포함. `DesktopLayout`이 `App.tsx`에 인라인.

**개선 방향**:
- `MobileBottomSheet`의 각 탭을 별도 컴포넌트로 분리
- `DesktopLayout`을 `src/layouts/DesktopLayout.tsx`로 이동
- 공통 레이아웃 래퍼 (`src/layouts/`) 디렉토리 신설

### 9.4 Haversine 중복 구현

**현황**: `elevationUtils.ts`와 `routeDistanceUtils.ts`에 각각 `haversineKm` 함수가 중복 정의됨. `routeUtils.ts`는 turf의 `length`를 사용.

**개선 방향**:
- 공통 거리 계산 유틸 (`src/utils/geoUtils.ts`)로 통합
- 또는 turf의 `distance` 함수로 통일

### 9.5 `emptyStats()` 중복

**현황**: `elevationUtils.ts`와 `segmentUtils.ts`에 각각 `emptyStats()` 함수가 중복 정의됨.

**개선 방향**: 공통 팩토리를 한 곳으로 집중.

### 9.6 포맷 함수 분산

**현황**: `formatGrade()`, `formatElevation()` (elevationUtils), `formatCoordinate()`, `formatDistanceKm()` (routeUtils)가 각 유틸에 분산.

**개선 방향**: `src/utils/format.ts`로 통합.

### 9.7 PWA + Capacitor 환경 감지

**현황**: Android WebView 내에서도 Service Worker가 등록됨. `Capacitor.isNativePlatform()` 가드가 아직 구현되지 않음.

**개선 방향**: 네이티브 환경에서 SW 등록을 건너뛰는 가드 추가.

### 9.8 테스트 부재

**현황**: 단위 테스트, 통합 테스트가 전혀 없음.

**개선 방향**:
- 유틸리티 함수 단위 테스트 (Vitest): `elevationUtils`, `climbUtils`, `segmentUtils`, `routeDistanceUtils`
- 컴포넌트 테스트 (Testing Library): 핵심 상호작용 시나리오
- E2E 테스트 (Playwright): 업로드 → 분석 → 비교 플로우

### 9.9 타입-로직 결합도

**현황**: `types/gpx.ts`에 도메인 타입이 잘 정의되어 있으나, `RouteState`가 파싱 결과(`ParsedRoute`)와 UI 상태(`color`, `visible`, `name`)를 함께 가짐.

**개선 방향**:
- 도메인 모델과 UI 상태를 분리 (예: `Route` vs `RouteViewModel`)
- 불변성 보장을 위해 `readonly` 필드 적용 고려

---

## 10. 상수 및 매직 넘버

| 값 | 위치 | 설명 |
|---|---|---|
| `100` | `constants/route.ts` | 경로 이탈 임계값 (m) |
| `5` | `elevationUtils.ts` | 이동평균 윈도우 크기 |
| `2000` / `1500` | `App.tsx` | 다운샘플링 임계 / 타겟 |
| `0.3` / `20` / `3` | `climbUtils.ts` | 오르막 최소 거리(km) / 최소 gain(m) / 최소 평균 경사(%) |
| `0.5` | `climbUtils.ts` | 상승 구간 판정 경사 임계값 (%) |
| `0.5` | `routeUtils.ts` | 고도 노이즈 임계값 (m) |
| `50` | `elevationUtils.ts` | 경사도 클램프 (±50%) |
| `1024` | `useMediaQuery.ts` | 데스크탑/모바일 분기 (px) |

---

## 11. 외부 의존성 및 네트워크 요청

| 요청 | 용도 | 캐시 전략 |
|---|---|---|
| OSM 타일 (`tile.openstreetmap.org`) | 지도 렌더링 | StaleWhileRevalidate, 200 entries, 30일 |
| Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) | 웹폰트 | CacheFirst, 30 entries, 365일 |

GPX 파일은 **네트워크로 전송되지 않음**. 모든 파싱/분석은 브라우저(또는 Android WebView) 내부에서만 실행.

---

## 12. 파일 크기 요약

| 파일 | 크기 | 비고 |
|---|---|---|
| `App.tsx` | 22,846 B (647줄) | 가장 큰 파일, 리팩토링 1순위 |
| `segmentUtils.ts` | 14,270 B (440줄) | 비교/난이도 로직 집중 |
| `MobileBottomSheet.tsx` | 14,134 B (421줄) | 모바일 UI 집중 |
| `elevationUtils.ts` | 12,263 B (437줄) | 고도 분석 핵심 |
| `MapViewer.tsx` | 11,815 B | 지도 컴포넌트 |
| `climbUtils.ts` | 7,545 B (238줄) | 오르막 탐지 |
| `MultiElevationProfile.tsx` | 8,690 B | 다중 고도 차트 |
| `RouteCompareTable.tsx` | 7,412 B | 비교표 |
| `SegmentComparePanel.tsx` | 8,005 B | 구간 비교 |
| `gpxParser.ts` | 5,138 B (165줄) | GPX 파싱 |
| `types/gpx.ts` | 4,978 B (190줄) | 도메인 타입 |
| `routeUtils.ts` | 4,996 B (187줄) | turf 기반 메타데이터 |
