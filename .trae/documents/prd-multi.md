# GPX Viewer — 다중 경로 비교 기능 PRD (4차 목표)

## 1. 기능 개요

자전거 여행자가 여러 GPX 코스를 동시에 업로드·비교하여 어떤 코스가 더 힘든지 판단할 수 있도록 한다. **거리보다 오르막, 누적 상승고도, 최대 경사도, 고도 변화** 를 핵심 비교 지표로 다룬다.

## 2. 사용자 시나리오

1. 사용자가 한 번에 여러 `.gpx` 파일을 업로드한다.
2. 각 경로는 지도에서 고유 색상으로 표시된다.
3. 좌측(PC) / 하단 시트(모바일) 에서 경로 목록(색상, 이름, 표시/숨김, 삭제)을 관리한다.
4. **비교표** 에서 모든 경로의 12개 핵심 지표를 한눈에 비교한다.
5. **고도 비교 차트** 에서 여러 경로의 고도 그래프를 거리 기준으로 겹쳐서 본다.
6. **구간 선택 비교** 에서 공통 km 구간을 지정해, 각 경로별 상승/하강/평균·최대 경사를 비교한다.
7. 각 경로에 대해 **난이도 해석 문장** 을 본다.

## 3. 핵심 모듈

| 모듈 | 책임 |
|------|------|
| `RouteListPanel` | 경로 목록, 색상, 표시/숨김, 삭제, 활성 선택 |
| `RouteCompareTable` | 12개 지표 비교표 (가로 스크롤 가능) |
| `MultiElevationProfile` | 여러 GPX 의 고도를 겹쳐서 그리는 차트 |
| `SegmentComparePanel` | 공통 km 구간 비교 (시작/종료 km 입력 + 결과 카드) |
| `segmentUtils` | 구간별 난이도 문장 생성 등 비교 유틸 |

## 4. UI/UX

### 4.1 PC
- 좌측 사이드바: 상단 = 경로 목록 / 중단 = 선택 경로 정보 / 하단 = 구간 비교
- 우측: 지도 위 / 고도 비교 차트 아래

### 4.2 모바일
- 하단 시트 탭: **경로 / 비교 / 차트 / 구간** 4 탭
- 비교표는 가로 스크롤

## 5. 비교표 지표 (12개)

1. 파일명/경로명
2. 총 거리 (km)
3. 트랙 포인트 수
4. 시작 고도 (m)
5. 종료 고도 (m)
6. 최저 고도 (m)
7. 최고 고도 (m)
8. 누적 상승고도 (m)
9. 누적 하강고도 (m)
10. 평균 경사도 (%)
11. 최대 경사도 (%)
12. **오르막 난이도** (단순 규칙: 쉬움/보통/어려움/매우 어려움)

## 6. 고도 비교

- X 축: 누적거리 km
- Y 축: 고도 m
- 각 GPX 의 선 색상 = 지도 경로 색상
- 고도 데이터 없는 경로는 차트에서 제외 + 안내
- 기존 단일 경로의 `ElevationProfile` 도 그대로 유지 (활성 경로 표시용)

## 7. 구간 선택 비교

- 시작 km / 종료 km 입력 (number input + 슬라이더)
- 짧은 구간(< 0.1km) 시 "분석이 어렵습니다" 안내
- 결과 카드: 각 경로별 거리, 상승고도, 평균/최대 경사, 난이도 문장

## 8. 난이도 해석 규칙 (단순 규칙 기반)

```
난이도 점수 = 0.6 * (누적상승/100m) + 0.3 * (평균경사 절대값/%) + 0.1 * (최대경사 절대값/%)
점수 < 5  → "완만"
점수 5~10 → "보통"
점수 10~20 → "어려움"
점수 20+  → "매우 어려움"
```

문장 템플릿:
- "A코스는 거리는 길지만 상승고도가 낮아 비교적 완만한 코스입니다."
- "B코스는 거리는 짧지만 최대 경사도가 높아 체감 난이도가 높을 수 있습니다."

## 9. 데이터 모델

```ts
export type RouteId = string;

export interface RouteState {
  id: RouteId;
  /** 표시 이름 (기본: 파일명) */
  name: string;
  /** 경로 색상 (HEX) */
  color: string;
  /** 지도/차트 표시 여부 */
  visible: boolean;
  /** 파싱된 라우트 */
  route: ParsedRoute;
  /** 분석된 트랙 포인트 (메모) */
  trackPoints: TrackPoint[];
  /** 다운샘플된 차트용 포인트 */
  elevationPoints: ElevationPoint[];
  /** 1km 단위 구간 */
  segments: RouteSegment[];
}

export interface RouteScopedSelection {
  routeId: RouteId;
  startIndex: number;
  endIndex: number;
}

export type ComparisonSelection = {
  /** 공통 km 구간 (모든 경로에 동일하게 적용) */
  startKm: number;
  endKm: number;
};

export type RouteDifficulty = 'easy' | 'moderate' | 'hard' | 'extreme';
```

## 10. 호환성

- 기존 단일 GPX 업로드 → `RouteState[]` 길이 1인 배열로 정상 처리
- `RouteInfoPanel` / `SegmentList` / `SegmentSummary` / `ElevationProfile` 모두 단일 경로 prop 그대로 유지
- `SegmentSelection` 은 그대로 두고, 비교는 `ComparisonSelection` (km 기반) 을 사용해 의미 충돌 회피
- PWA, vite.config, 배포 구조 변경 없음
