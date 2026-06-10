import type { BallSize, ItemType } from './types';

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 640;
export const HUD_H = 40;
export const GROUND_Y = 595;
export const CEILING_Y = HUD_H;

export const PLAYER_W = 24;
export const PLAYER_H = 36;
export const PLAYER_SPEED = 4;

export const WIRE_SPEED = 12;
export const GRAVITY = 0.35;

export const INITIAL_LIVES = 3;
export const DYING_FRAMES = 90;
export const STAGE_CLEAR_FRAMES = 90;
export const MISSION_CLEAR_FRAMES = 150;

// 파워업 관련
export const SCORE_PER_LIFE = 20000;
export const ITEM_DROP_CHANCE = 0.20;
export const ITEM_SIZE = 22;
export const ITEM_FALL_SPEED = 2.5;
export const ITEM_LIFE_FRAMES = 420;

export const POWER_WIRE_STUCK_FRAMES = 180;
export const VULCAN_COOLDOWN_FRAMES = 8;
export const CLOCK_FRAMES = 300;

export const BALL_CONFIG: Record<BallSize, {
  radius: number;
  speedX: number;
  bounceVY: number;
  score: number;
  color: string;
}> = {
  large:  { radius: 36, speedX: 0.8, bounceVY: -13.0, score: 100, color: '#e74c3c' },
  medium: { radius: 24, speedX: 1.3, bounceVY: -14.5, score: 200, color: '#e67e22' },
  small:  { radius: 15, speedX: 1.8, bounceVY: -15.0, score: 400, color: '#f1c40f' },
  tiny:   { radius:  9, speedX: 2.6, bounceVY: -10.0, score: 800, color: '#2ecc71' },
};

export const NEXT_BALL_SIZE: Partial<Record<BallSize, BallSize>> = {
  large: 'medium',
  medium: 'small',
  small: 'tiny',
};

export const ITEM_CONFIG: Record<ItemType, { label: string; color: string }> = {
  doubleWire: { label: '2W', color: '#3498db' },
  powerWire:  { label: 'PW', color: '#9b59b6' },
  vulcan:     { label: 'VM', color: '#e74c3c' },
  forceField: { label: 'FF', color: '#1abc9c' },
  clock:      { label: 'CK', color: '#f39c12' },
  dynamite:   { label: 'DY', color: '#c0392b' },
  food:       { label: '★',  color: '#f1c40f' },
};

// 아이템 가중치 드롭 테이블
export const ITEM_WEIGHTS: [ItemType, number][] = [
  ['doubleWire', 15],
  ['powerWire',  10],
  ['vulcan',     10],
  ['forceField', 15],
  ['clock',      15],
  ['dynamite',    5],
  ['food',       30],
];
