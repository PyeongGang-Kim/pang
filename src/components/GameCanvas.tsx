import { useRef } from 'react';
import { useGameLoop } from '../hooks/useGameLoop';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/constants';

interface Props {
  onGameEnd: (score: number, hiScore: number) => void;
}

export function GameCanvas({ onGameEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useGameLoop(canvasRef, onGameEnd);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{ display: 'block', border: '2px solid #333' }}
    />
  );
}
