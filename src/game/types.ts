export type BallSize = 'large' | 'medium' | 'small' | 'tiny';
export type GameScreen = 'menu' | 'playing' | 'gameOver';
export type GameStatus = 'playing' | 'dying' | 'stageClear' | 'missionClear';
export type WeaponType = 'wire' | 'doubleWire' | 'powerWire' | 'vulcan';
export type ItemType = 'doubleWire' | 'powerWire' | 'vulcan' | 'forceField' | 'clock' | 'dynamite' | 'food';

export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: BallSize;
}

export interface Wire {
  id: number;
  x: number;
  topY: number;
  stuck: boolean;
  stuckTimer: number;
}

export interface Item {
  id: number;
  x: number;
  y: number;
  vy: number;
  type: ItemType;
  lifeTimer: number;
}

export interface Player {
  x: number;
}

export interface GameState {
  player: Player;
  balls: Ball[];
  wires: Wire[];
  items: Item[];
  weapon: WeaponType;
  hasForceField: boolean;
  invincibleTimer: number;
  clockTimer: number;
  vulcanCooldown: number;
  sizeCombo: number;      // 같은 크기 연속 처치 배수
  hitStreak: number;      // 와이어 연속 적중 배수 (빗나가면 리셋)
  lastHitSize: BallSize | null;
  prevLifeMilestone: number;
  lives: number;
  score: number;
  hiScore: number;
  stage: number;
  status: GameStatus;
  statusTimer: number;
}
