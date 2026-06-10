export type BallSize = 'large' | 'medium' | 'small' | 'tiny';
export type GameScreen = 'menu' | 'playing' | 'gameOver';
export type GameStatus = 'playing' | 'dying';

export interface Player {
  x: number;
}

export interface Wire {
  x: number;
  topY: number;
}

export interface GameState {
  player: Player;
  wire: Wire | null;
  lives: number;
  score: number;
  hiScore: number;
  stage: number;
  status: GameStatus;
  statusTimer: number;
}
