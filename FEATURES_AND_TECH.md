# nuni track — 구현된 기능과 기술 스택

> 현재 구현된 기능과 사용된 기술에 대한 상세 문서  
> 프로젝트 루트: `e:\Pjt\GPXViewer`

---

## 1. 프로젝트 개요

자전거 라이더를 위한 **브라우저 기반 GPX 뷰어 및 라이딩 기록 앱**. React 18 + Vite 5 + TypeScript로 구축되었으며, Capacitor를 통해 Android 네이티브 앱으로도 빌드 가능. GPX 파일은 서버로 전송되지 않고 **기기 내부에서만** 파싱·분석됩니다.

---

## 2. 핵심 기능

### 2.1 GPX 파일 분석

- **GPX 업로드** — 단일 또는 여러 파일을 한 번에 업로드 (드래그 앤 드롭 지원)
- **지도 시각화** — Leaflet + OpenStreetMap 기반 (외부 지도 API 키 불필요)
- **다중 경로 비교** — 색상·표시·이름·삭제·전체 보기, 12+ 지표 비교표
- **고도 분석** — 5-pt 이동평균으로 보정한 고도/경사도 차트, 1km 구간 통계
- **주요 오르막 자동 탐지** — 거리·상승고도·평균 경사 기준을 만족하는 연속 오르막을 묶어 카드 리스트로 표시
- **선택 구간 분석** — 드래그/탭으로 구간 선택 → 자전거 친화 자연어 요약
- **공통 km 구간 비교** — 여러 경로의 동일 거리 구간을 한눈에 비교

### 2.2 라이딩 기록 (Recording)

- **실시간 라이딩 기록** — Geolocation API를 사용한 연속 위치 추적
- **기록 통계** — 거리, 속도, 고도 상승, 시간 등 실시간 통계
- **일시정지/재개** — 라이딩 중 일시정지 및 재개 기능
- **GPX 내보내기** — 기록된 라이딩을 GPX 파일로 변환 및 다운로드
- **기록 저장소** — IndexedDB + localStorage를 사용한 영구 저장
- **기록 관리** — 저장된 기록 목록, 상세 보기, 삭제, 이름 변경
- **위치 필터링** — 정확도, 이동 거리, 시간 간격, 속도 기반 필터링으로 노이즈 제거

### 2.3 모바일 주행 모드

- **풀스크린 주행 모드** — 모바일에서 한 손으로 보기 좋은 큰 글씨
- **현재 위치 표시** — Geolocation API 1회 측정
- **남은 오르막 표시** — 경로 이탈 안내 (경로에서 100m 이상 벗어나면 참고용 안내)

### 2.4 기타 기능

- **PWA** — 오프라인에서도 기본 동작, 홈 화면에 설치 가능
- **반응형** — PC(데스크탑) / 모바일 자동 전환, iOS safe-area 대응

---

## 3. 기술 스택

| 계층 | 기술 | 용도 |
|---|---|---|
| 프레임워크 | React 18 | UI 라이브러리 |
| 빌드 도구 | Vite 5 | 개발 서버 및 빌드 |
| 언어 | TypeScript 5.6 | 타입 안전성 |
| 스타일 | Tailwind CSS 3 + PostCSS + Autoprefixer | 스타일링 |
| 지도 | Leaflet 1.9 + react-leaflet 4.2 | 지도 렌더링 (OpenStreetMap) |
| GPX 파싱 | @tmcw/togeojson 6.0 | GPX → GeoJSON 변환 |
| GPX 작성 | 자체 구현 (gpxWriter.ts) | 라이딩 기록 → GPX 변환 |
| 공간 계산 | @turf/turf 7.1 | 거리, bbox 계산 |
| 차트 | Recharts 2.13 | 고도 프로필 차트 |
| 아이콘 | lucide-react 0.460 | UI 아이콘 |
| PWA | vite-plugin-pwa 0.20 | Workbox 기반 PWA |
| Android | @capacitor/core 6.2 + @capacitor/cli 6.2 + @capacitor/android 6.2 | Android 네이티브 래핑 |
| 위치 추적 | Geolocation API (브라우저) + @capacitor/geolocation (선택적) | 연속 위치 추적 |
| 저장소 | IndexedDB + localStorage | 라이딩 기록 영구 저장 |
| 이미지 처리 | sharp 0.33 | 아이콘 생성 스크립트용 |

---

## 4. 디렉토리 구조

```
e:\Pjt\GPXViewer\
├── android/                    # Capacitor Android 네이티브 프로젝트
├── dist/                       # Vite 빌드 산출물 (gitignored)
├── node_modules/               # 의존성 (gitignored)
├── public/                     # 정적 자산 (로고, 샘플 GPX, 아이콘)
├── scripts/
│   └── generate-icons.mjs      # PWA 아이콘 생성 스크립트
├── src/
│   ├── App.tsx                 # 메인 앱 컴포넌트 (상태 관리 + 레이아웃 분기)
│   ├── main.tsx                # React 엔트리 포인트
│   ├── index.css               # 전역 스타일 (Tailwind directives + 커스텀)
│   ├── components/             # UI 컴포넌트 (19개)
│   │   ├── ClimbCard.tsx        # 오르막 카드
│   │   ├── ClimbList.tsx        # 오르막 리스트
│   │   ├── ElevationProfile.tsx # 고도 차트
│   │   ├── GpxUploader.tsx     # GPX 업로더
│   │   ├── LocationStatus.tsx   # 위치 상태
│   │   ├── MapViewer.tsx        # 지도 뷰어
│   │   ├── MobileBottomSheet.tsx # 모바일 하단 시트
│   │   ├── MultiElevationProfile.tsx # 다중 고도 차트
│   │   ├── RecordingDetailPanel.tsx # 기록 상세 패널
│   │   ├── RecordingListPanel.tsx   # 기록 목록 패널
│   │   ├── RecordingStatsPanel.tsx  # 기록 통계 패널
│   │   ├── RideRecorderPanel.tsx    # 라이딩 기록 패널
│   │   ├── RideModePanel.tsx   # 주행 모드 패널
│   │   ├── RouteCompareTable.tsx    # 경로 비교표
│   │   ├── RouteInfoPanel.tsx  # 경로 정보 패널
│   │   ├── RouteListPanel.tsx  # 경로 목록 패널
│   │   ├── SegmentComparePanel.tsx # 구간 비교 패널
│   │   ├── SegmentList.tsx     # 구간 리스트
│   │   └── SegmentSummary.tsx  # 구간 요약
│   ├── constants/
│   │   └── route.ts            # 경로 이탈 임계값 (100m)
│   ├── hooks/                  # React 훅 (5개)
│   │   ├── useGeolocation.ts   # Geolocation API 1회 측정 훅
│   │   ├── useMediaQuery.ts    # 반응형 분기 (데스크탑/모바일)
│   │   ├── useRecordingStats.ts # 라이딩 기록 통계 훅
│   │   ├── useRideRecorder.ts  # 라이딩 기록 훅
│   │   └── useSavedRecordings.ts # 저장된 기록 관리 훅
│   ├── types/                  # TypeScript 타입 (4개)
│   │   ├── climb.ts            # 오르막 관련 타입
│   │   ├── gpx.ts              # GPX 도메인 타입
│   │   ├── location.ts         # 위치 관련 타입
│   │   └── recording.ts        # 라이딩 기록 타입
│   └── utils/                  # 유틸리티 함수 (11개)
│       ├── climbUtils.ts       # 오르막 탐지 알고리즘
│       ├── elevationUtils.ts   # 고도 보정, 경사도, 구간화
│       ├── gpxParser.ts        # GPX 파일 → ParsedRoute 변환
│       ├── gpxWriter.ts        # 라이딩 기록 → GPX 변환
│       ├── locationUtils.ts    # Geolocation API 헬퍼
│       ├── recordingStats.ts   # 라이딩 통계 계산
│       ├── recordingStorage.ts # IndexedDB 저장소
│       ├── recordingUtils.ts   # 라이딩 유틸리티 (필터링, 거리 등)
│       ├── routeDistanceUtils.ts # 경로 이탈 거리 계산
│       ├── routeUtils.ts       # turf 기반 메타데이터 계산
│       └── segmentUtils.ts     # 다중 경로 비교, 난이도 분석
├── capacitor.config.ts         # Capacitor 설정
├── index.html                  # HTML 엔트리
├── package.json                # 의존성 + 스크립트
├── postcss.config.js           # PostCSS 설정
├── tailwind.config.js          # Tailwind 설정
├── tsconfig.json               # TypeScript 루트 설정
├── vite.config.ts              # Vite 설정 (PWA, base 경로 분기)
└── vercel.json                 # Vercel 배포 설정
```

---

## 5. 라이딩 기록 시스템 상세

### 5.1 데이터 흐름

```
Geolocation API (연속 추적)
  │
  ▼
useRideRecorder 훅
  │ (위치 필터링: 정확도, 거리, 시간, 속도)
  ▼
RecordedPoint[] (세션 내 포인트)
  │
  ▼
recordingStats (실시간 통계 계산)
  │
  ▼
RideRecording (완료된 기록)
  │
  ├─► gpxWriter.ts → GPX XML (다운로드)
  └─► recordingStorage.ts → IndexedDB (영구 저장)
```

### 5.2 위치 필터링 기준

| 필터 | 기본값 | 설명 |
|---|---|---|
| `maxAccuracyM` | 40m | 최대 허용 정확도 (이상이면 무시) |
| `minDistanceM` | 3m | 최소 이동 거리 (이하이면 무시) |
| `minIntervalMs` | 1500ms | 최소 시간 간격 (이하이면 무시) |
| `maxJumpSpeedKph` | 75km/h | 최대 허용 속도 (초과하면 무시) |

### 5.3 저장소 구조

- **IndexedDB** (`gpx-viewer-recordings`): 전체 `RideRecording` 객체 저장
- **localStorage** (`gpx-viewer.recordings.metas.v1`): `RecordingMeta` 목록 저장 (빠른 목록 조회)

### 5.4 GPX 내보내기 형식

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="nuni gpx뷰어" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>라이딩 2024-07-06 14:30</name>
    <time>2024-07-06T05:30:00.000Z</time>
  </metadata>
  <trk>
    <name>라이딩 2024-07-06 14:30</name>
    <trkseg>
      <trkpt lat="37.5665" lon="126.9780">
        <ele>50.5</ele>
        <time>2024-07-06T05:30:00.000Z</time>
        <extensions>
          <speed>5.234</speed>
          <accuracy>10</accuracy>
        </extensions>
      </trkpt>
      ...
    </trkseg>
  </trk>
</gpx>
```

---

## 6. GPX 분석 시스템 상세

### 6.1 데이터 흐름

```
GPX 파일 (사용자 선택)
  │
  ▼
gpxParser.ts (FileReader + DOMParser + @tmcw/togeojson)
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

### 6.2 오르막 탐지 기준

| 기준 | 값 | 설명 |
|---|---|---|
| 최소 거리 | ≥ 0.3km | 오르막으로 간주할 최소 거리 |
| 최소 상승고도 | ≥ 20m | 오르막으로 간주할 최소 상승 |
| 평균 경사 | ≥ 3% | 오르막으로 간주할 최소 평균 경사 |
| 상승 구간 판정 | > 0.5% | 연속 상승으로 묶을 경사 임계값 |

### 6.3 난이도 분류

| 평균 경사 | 난이도 |
|---|---|
| < 3% | 완만함 |
| 3% ~ 6% | 보통 |
| 6% ~ 9% | 힘든 오르막 |
| ≥ 9% | 매우 힘든 오르막 |

---

## 7. 상태 관리

### 7.1 App.tsx 상태

| 상태 | 타입 | 설명 |
|---|---|---|
| `routes` | `RouteState[]` | 업로드된 모든 경로 |
| `activeRouteId` | `RouteId \| null` | 현재 선택된 경로 ID |
| `error` | `string \| null` | 에러 메시지 |
| `selection` | `SegmentSelection \| null` | 고도 차트에서 드래그로 선택한 구간 |
| `comparison` | `ComparisonSelection \| null` | 공통 km 구간 비교 선택 |
| `fitAllTrigger` | `number` | "전체 보기" 트리거 |
| `panToUserTrigger` | `number` | "내 위치로 이동" 트리거 |
| `activeClimbId` | `RouteId \| null` | 선택된 오르막 ID |

### 7.2 라이딩 기록 상태 (useRideRecorder)

| 상태 | 타입 | 설명 |
|---|---|---|
| `status` | `RecordingStatus` | idle, starting, recording, paused, stopping, finished, error |
| `session` | `RideRecorderSession \| null` | 현재 라이딩 세션 |
| `recordings` | `RideRecording[]` | 완료된 기록 목록 |
| `error` | `string \| null` | 에러 메시지 |
| `liveLocation` | `UserLocation \| null` | 실시간 위치 |

---

## 8. 컴포넌트 구조

### 8.1 데스크탑 레이아웃 (≥ 1024px)

```
DesktopLayout
├── RouteListPanel             # 경로 목록 (색상/표시/이름/삭제)
├── RouteInfoPanel             # 경로 기본 정보
├── SegmentSummary             # 선택 구간 요약
├── ClimbList                  # 주요 오르막 리스트
├── SegmentList                # 1km 구간 리스트
├── MapViewer                  # 지도
├── RouteCompareTable          # 다중 경로 비교표
├── ElevationProfile           # 단일 고도 차트
├── MultiElevationProfile      # 다중 고도 차트
├── LocationStatus             # 현재 위치 상태
└── SegmentComparePanel        # 공통 km 구간 비교
```

### 8.2 모바일 레이아웃 (< 1024px)

```
MobileLayout
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
    ├── Tab: recording         # 기록 탭 (新增)
    │   ├── RideRecorderPanel  # 라이딩 기록 패널
    │   ├── RecordingListPanel # 기록 목록 패널
    │   └── RecordingDetailPanel # 기록 상세 패널
    └── RideModePanel          # 주행 모드 (풀스크린 오버레이)
        ├── LocationStatus
        └── ClimbList (남은 오르막)
```

---

## 9. 주요 타입

### 9.1 GPX 관련 (types/gpx.ts)

- `RoutePoint` — 원본 GPX 포인트
- `ParsedRoute` — 파싱된 경로
- `TrackPoint` — 분석용 트랙 포인트 (고도 보정, 경사도 포함)
- `ElevationPoint` — 차트용 고도 포인트
- `RouteSegment` — 1km 구간
- `RouteState` — 앱 상태의 경로
- `RouteCompareRow` — 비교표 행

### 9.2 라이딩 기록 관련 (types/recording.ts)

- `RecordedPoint` — 기록된 위치 포인트
- `RideRecording` — 완료된 라이딩 기록
- `RecordingMeta` — 기록 메타데이터 (목록 조회용)
- `RideRecorderSession` — 진행 중인 라이딩 세션
- `RecordingStats` — 실시간 통계
- `RecordingStatus` — 기록 상태

---

## 10. 보안 및 프라이버시

- **GPX 파일** — 서버로 전송되지 않음, 기기 내부에서만 파싱/분석
- **라이딩 기록** — IndexedDB에 기기 내부 저장, 서버로 전송되지 않음
- **위치 정보** — Geolocation API로 기기 내부에서만 측정
- **네트워크 요청** — OpenStreetMap 타일 로드만 발생

---

## 11. 실행 방법

### 웹 개발 서버

```bash
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:5174` 접속

### Android 앱

```bash
npm install
npm run build:android
npm run android:open
```

Android Studio에서 실행

### 빌드 명령

| 명령 | 설명 |
|---|---|
| `npm run dev` | 웹 개발 서버 |
| `npm run build` | 웹 프로덕션 빌드 |
| `npm run build:android` | Android 빌드 |
| `npm run android:open` | Android Studio 열기 |
| `npm run android:run` | 기기/에뮬레이터 실행 |

---

## 12. 제한 사항

- Geolocation은 HTTPS (또는 localhost) 환경에서만 동작
- 경로 이탈 안내는 참고용이며 GPS 오차로 실제와 다를 수 있음
- 백엔드/DB/로그인/공유 링크 기능은 포함되지 않음
- 네이버 지도·카카오 지도·구글 지도 연동은 지원하지 않음 (OpenStreetMap만 사용)
