// 오르막(클라이밍) 분석 관련 타입 정의

import type { RouteId } from './gpx';

/**
 * 오르막 난이도 단계.
 * - 'gentle': 완만 (평균 경사 < 3%)
 * - 'moderate': 보통 (3% ~ 6%)
 * - 'hard': 힘든 오르막 (6% ~ 9%)
 * - 'extreme': 매우 힘든 오르막 (>= 9%)
 */
export type ClimbDifficulty = 'gentle' | 'moderate' | 'hard' | 'extreme';

/**
 * 한 개의 오르막 구간.
 * - TrackPoint 인덱스는 보정된 고도 기준으로 산출된다.
 */
export interface RouteClimb {
  /** 고유 ID (경로 ID + 오르막 인덱스 기반) */
  id: string;
  /** 1부터 시작하는 오르막 번호 (해당 경로 내) */
  index: number;
  /** 소속 경로 ID */
  routeId: RouteId;
  /** 시작 거리 (km) */
  startKm: number;
  /** 종료 거리 (km) */
  endKm: number;
  /** 트랙포인트 시작 인덱스 */
  startIndex: number;
  /** 트랙포인트 종료 인덱스 */
  endIndex: number;
  /** 오르막 거리 (km) */
  distanceKm: number;
  /** 누적 상승고도 (m) */
  elevationGainM: number;
  /** 평균 경사도 (%) */
  avgGradePercent: number;
  /** 최대 경사도 (%) */
  maxGradePercent: number;
  /** 시작 고도 (m) */
  startElevation: number;
  /** 종료 고도 (m) */
  endElevation: number;
  /** 난이도 */
  difficulty: ClimbDifficulty;
  /** 라벨 (예: "힘든 오르막") */
  difficultyLabel: string;
  /** 색상 (난이도 시각화) */
  difficultyColor: string;
  /** 자연어 한 줄 해석 */
  interpretation: string;
}

/** 오르막 탐지 옵션 */
export interface ClimbDetectionOptions {
  /** 최소 오르막 거리 (km). 기본 0.3 */
  minDistanceKm?: number;
  /** 최소 상승고도 (m). 기본 20 */
  minElevationGainM?: number;
  /** 최소 평균 경사도 (%). 기본 3 */
  minAvgGradePercent?: number;
}
