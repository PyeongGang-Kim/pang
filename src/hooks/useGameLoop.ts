import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, HUD_H, GROUND_Y } from '../game/constants';

export function useGameLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onGameEnd: () => void,
) {
  const onGameEndRef = useRef(onGameEnd);
  useEffect(() => { onGameEndRef.current = onGameEnd; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let raf = 0;
    let running = true;

    function drawBackground() {
      // 하늘
      const sky = ctx.createLinearGradient(0, HUD_H, 0, GROUND_Y);
      sky.addColorStop(0, '#87ceeb');
      sky.addColorStop(1, '#c8e8f8');
      ctx.fillStyle = sky;
      ctx.fillRect(0, HUD_H, CANVAS_WIDTH, GROUND_Y - HUD_H);

      // 후지산 실루엣
      ctx.fillStyle = '#6b7a8d';
      ctx.beginPath();
      ctx.moveTo(40, GROUND_Y);
      ctx.lineTo(240, 140);
      ctx.lineTo(440, GROUND_Y);
      ctx.closePath();
      ctx.fill();

      // 설산 정상
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.moveTo(192, 198);
      ctx.lineTo(240, 140);
      ctx.lineTo(288, 198);
      ctx.closePath();
      ctx.fill();

      // 지면
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      ctx.fillStyle = '#66bb6a';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 6);
    }

    function drawHUD(score: number, lives: number, stage: string) {
      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_H);

      ctx.font = 'bold 14px monospace';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE  ${score}`, 10, HUD_H / 2);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#f1c40f';
      ctx.fillText(`HI  ${Number(localStorage.getItem('hiScore') || 0)}`, CANVAS_WIDTH / 2, HUD_H / 2);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(stage, CANVAS_WIDTH - 10, HUD_H / 2);

      // 목숨 아이콘
      for (let i = 0; i < lives; i++) {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(CANVAS_WIDTH - 10 - (i + 1) * 16, HUD_H / 2 - 8, 12, 16);
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    function loop() {
      if (!running) return;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawBackground();
      drawHUD(0, 3, '1-1');

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [canvasRef]);
}
