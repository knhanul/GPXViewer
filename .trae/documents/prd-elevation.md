# GPX 뷰어 — 구간 고도 분석 기능 PRD (3차 목표)

## 1. 기능 개요

자전거 라이더가 업로드한 GPX 파일에서 거리/고도 정보를 추출해, 고도 프로필 차트와 구간별(segment) 경사도 분석을 제공한다. 사용자는 차트/리스트에서 특정 구간을 선택해 지도의 해당 구간을 강조 표시하고, 평균 경사도·상승고도·거리 등 핵심 지표를 한눈에 확인할 수 있다.

## 2. 사용자 시나리오

1. 사용자가 GPX 파일을 업로드한다.
2. 화면 하단(모바일) 또는 좌측(PC)에 **고도 프로필 차트**가 표시된다.
3. 차트 X 축은 거리(km), Y 축은 고도(m). 경사에 따라 색상이 달라진다(상승=오렌지, 하강=시안, 평지=회색).
4. 차트에서 구간을 드래그/탭하여 선택하거나, 아래 **구간 리스트**에서 항목을 탭한다.
5. 지도의 해당 구간이 노란 하이라이트 폴리라인으로 강조되고, 자동 pan/zoom 된다.
6. **구간 통계 카드**에 거리/상승/하강/평균 경사도/최대 경사도가 갱신된다.

## 3. 핵심 모듈

| 모듈 | 책임 |
|------|------|
| `ElevationProfile` | Recharts AreaChart 기반 고도 차트, 구간 선택(클릭/드래그) |
| `SegmentList` | 1km (또는 사용자 지정) 단위 구간 통계 리스트 |
| `SegmentSummary` | 선택 구간의 핵심 지표 카드 (거리, 누적 상승/하강, 평균/최대 경사도) |
| `MapViewer` 확장 | 선택 구간 polyline 강조 (기존 코드와 충돌 없게 props 추가) |
| `elevationUtils` | 누적거리, 상승/하강고도, 경사도, 구간화 로직 |
| `gpxParser` 확장 | `<ele>` 태그 추출 |

## 4. UI/UX

### 4.1 PC 레이아웃
- 좌측 사이드바: 상단 = 경로 정보 / 중단 = 구간 통계 카드 / 하단 = 구간 리스트
- 우측 지도
- 지도 아래(또는 좌측 하단 보조): 고도 차트 풀폭(또는 360px)

### 4.2 모바일 레이아웃
- 상단 헤더 → 지도 → 하단 시트(탭: 정보 / 차트 / 구간)

### 4.3 인터랙션
- 차트: 클릭/드래그로 시작·끝 km 지정 → 구간 선택
- 리스트: 항목 탭 → 구간 선택, 지도 pan/zoom
- 모바일: 차트 가로 스크롤 + 두 손가락 줌(Recharts 의 `MouseMove` 이벤트로 단순화)

## 5. 데이터 모델

```ts
export interface TrackPoint {
  lat: number;
  lng: number;
  elevation: number; // m
  cumulativeDistanceKm: number;
  gradePercent: number; // ±%
}

export interface ElevationPoint {
  distance: number; // km
  elevation: number; // m
  gradePercent: number;
}

export interface RouteSegment {
  id: string;
  startIndex: number; // points index
  endIndex: number;
  startKm: number;
  endKm: number;
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  avgGradePercent: number;
  maxGradePercent: number;
}

export interface SegmentSelection {
  startIndex: number;
  endIndex: number;
}
```

## 6. 비기능 요구사항

- GPX 좌표 1만개에서도 부드럽게 동작(Recharts는 가상화하지 않으므로 1만개는 그대로 렌더, 필요시 다운샘플링)
- 기존 업로드/지도/거리 기능은 절대 깨지지 않음
- 색상 디자인은 다크 테마 유지(트레일 오렌지 + 시안 + 차트용 그라데이션)
- `prefers-reduced-motion` 존중
