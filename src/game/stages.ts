import type { BallSize } from './types';
import { CANVAS_WIDTH } from './constants';

export interface BallInit {
  x: number;
  size: BallSize;
  vxDir: 1 | -1;
}

export interface StageConfig {
  balls: BallInit[];
}

// Mission 1 — 후지산 (Mt. Fuji)
export const MISSION1_STAGES: StageConfig[] = [
  // 1-1: Large 1개 (중앙 = 플레이어 시작 위치이므로 좌측 배치)
  {
    balls: [
      { x: CANVAS_WIDTH * 0.30, size: 'large', vxDir: 1 },
    ],
  },
  // 1-2: Large 2개
  {
    balls: [
      { x: CANVAS_WIDTH * 0.25, size: 'large', vxDir:  1 },
      { x: CANVAS_WIDTH * 0.75, size: 'large', vxDir: -1 },
    ],
  },
  // 1-3: Large 2개 + Medium 1개
  {
    balls: [
      { x: CANVAS_WIDTH * 0.20, size: 'large',  vxDir:  1 },
      { x: CANVAS_WIDTH * 0.80, size: 'large',  vxDir: -1 },
      { x: CANVAS_WIDTH * 0.50, size: 'medium', vxDir:  1 },
    ],
  },
];
