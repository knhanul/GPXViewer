# GPX 뷰어 (PWA)

> 브라우저에서만 동작하는 모바일 우선 반응형 GPX 경로 뷰어 PWA.
> 서버 없이 GPX 파일을 분석해 Leaflet 지도에 경로를 그리고, 거리/시작·종료 좌표/포인트 수를 보여줍니다.

![preview](public/favicon.svg)

## 주요 기능

- **GPX 파싱 100% 클라이언트** — `FileReader` + `DOMParser` + `@tmcw/togeojson`. 데이터는 외부로 전송되지 않습니다.
- **지도 시각화** — Leaflet + OpenStreetMap 타일, Polyline + 시작/종료 마커, 자동 `fitBounds`.
- **거리 계산** — `@turf/turf` 의 `lineLength` 로 km 단위 산출.
- **반응형 UI**
  - PC (`>= 1024px`): 좌측 정보 패널 + 우측 지도
  - 모바일/태블릿: 상단 헤더 + 지도 + 하단 정보 시트 (peek/expand)
- **PWA** — `vite-plugin-pwa` + Workbox 로 오프라인 셸, 홈 화면에 추가 가능
- **클라우드 배포** — Vercel / Netlify 에 그대로 정적 호스팅 가능

## 기술 스택

| 영역 | 사용 |
|------|------|
| 프레임워크 | React 18 + Vite 5 + TypeScript |
| 스타일 | Tailwind CSS 3 |
| 상태 관리 | React `useState` |
| 지도 | `leaflet` + `react-leaflet` |
| 데이터 변환 | `@tmcw/togeojson` |
| 공간 계산 | `@turf/turf` |
| 아이콘 | `lucide-react` |
| PWA | `vite-plugin-pwa` (Workbox) |
| 배포 | Vercel / Netlify |

## 폴더 구조

```
.
├── public/                      # 정적 자산 (그대로 dist/ 로 복사)
│   ├── favicon.svg
│   ├── favicon-64.png
│   ├── apple-touch-icon.png     (180x180)
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   ├── maskable-icon-512x512.png
│   ├── sample-bukhansan.gpx     (테스트용 샘플)
│   └── _redirects               (Netlify SPA fallback)
├── scripts/
│   └── generate-icons.mjs       (sharp 로 아이콘 1회 생성)
├── src/
│   ├── components/
│   │   ├── GpxUploader.tsx
│   │   ├── MapViewer.tsx
│   │   ├── MobileBottomSheet.tsx
│   │   └── RouteInfoPanel.tsx
│   ├── hooks/
│   │   └── useMediaQuery.ts
│   ├── utils/
│   │   ├── gpxParser.ts
│   │   └── routeUtils.ts
│   ├── types/
│   │   └── gpx.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── vercel.json                  (Vercel SPA fallback)
├── vite.config.ts
├── tailwind.config.js
├── package.json
└── README.md
```

## 로컬 실행

```bash
# 의존성 설치
npm install

# 개발 서버
npm run dev          # → http://127.0.0.1:5173

# 프로덕션 빌드
npm run build        # → dist/

# 빌드 결과 미리보기
npm run preview      # → http://127.0.0.1:4173

# 아이콘 재생성 (디자인 변경 시)
npm run icons
```

### Windows 에서 포트 바인딩 오류가 나는 경우

`vite.config.ts` 가 IPv4 (127.0.0.1) 만 바인딩하도록 설정되어 있습니다.
만약 또 오류가 발생하면 다음을 시도하세요.

```bash
# 다른 포트 지정
npm run dev -- --port 3000

# 포트 점유 프로세스 확인
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

## PWA 설치

`vite-plugin-pwa` 가 빌드 시 manifest + service worker 를 자동으로 생성합니다.

### PWA 가 활성화되려면

- HTTPS (또는 `localhost`) 에서 동작해야 함
- `manifest` 가 유효해야 함
- `service worker` 가 등록되어야 함
- 192x192 / 512x512 / maskable 아이콘이 모두 제공되어야 함

### 모바일에서 "홈 화면에 추가"

| OS | 동작 |
|----|------|
| iOS Safari | 공유 메뉴 → "홈 화면에 추가" |
| Android Chrome | 주소창 옆 설치 아이콘 또는 메뉴 → "홈 화면에 추가" |
| Desktop Chrome | 주소창 끝 설치 아이콘 |

설치 후 standalone 모드로 실행되어 네이티브 앱처럼 동작합니다.

## 배포

### 1) Vercel

#### GitHub 연동 (권장)

1. 이 저장소를 GitHub 에 push
2. https://vercel.com → "New Project" → 저장소 import
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Deploy

`vercel.json` 이 SPA 라우팅 fallback 을 제공합니다 (필요시 추가).

#### CLI 배포

```bash
npm i -g vercel
vercel login
vercel        # preview
vercel --prod # production
```

### 2) Netlify

#### GitHub 연동

1. https://app.netlify.com → "Add new site" → "Import an existing project"
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Deploy

`public/_redirects` 가 모든 경로를 `/index.html` 로 라우팅해 줍니다.

#### CLI 배포

```bash
npm i -g netlify-cli
netlify login
netlify init
netlify deploy --dir=dist --prod
```

## OSM 타일 정책

본 프로젝트는 기본으로 [OpenStreetMap](https://www.openstreetmap.org/) 의 공개 타일 서버를 사용합니다.
오픈소스/개인/저트래픽 용도에서는 정책상 사용 가능하지만, **상용 서비스 또는 고트래픽** 시에는
[OSM Foundation 의 타일 사용 정책](https://operations.osmfoundation.org/policies/tiles/) 을 반드시 확인하고
Mapbox / MapTiler / Thunderforest / Stadia Maps 등 공식 제공자 키를 사용해야 합니다.

자세한 코멘트는 [`src/components/MapViewer.tsx`](src/components/MapViewer.tsx) 의 `TileLayer` 위에 있습니다.

## 디자인 가이드

- **컬러**: `#0F1419` (Background) / `#1A1F26` (Surface) / `#F97316` (Accent) / `#22D3EE` (시작 마커)
- **타이포**: Space Grotesk (제목) + JetBrains Mono (수치) + Inter (본문)
- **터치 타깃**: 44x44px 이상
- **반응형**: Tailwind `md`(768) / `lg`(1024) 기준

## 알려진 제약

- **공유/저장/로그인 없음** — MVP 단계로 의도적으로 제외
- **다중 파일** — UI 는 단일 파일 기준. 데이터 모델(`ParsedRoute[]`)과 상태 구조는 확장 가능하게 마련되어 있음.
- **HTTPS 필요** — PWA 설치/Service Worker 는 HTTPS 또는 localhost 에서만 동작

## 라이선스

MIT
