import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { GameState } from '../game/types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, HUD_H, GROUND_Y, CEILING_Y,
  PLAYER_W, PLAYER_H, PLAYER_SPEED,
  WIRE_SPEED,
  INITIAL_LIVES, DYING_FRAMES,
} from '../game/constants';

function initState(hiScore: number): GameState {
  return {
    player: { x: CANVAS_WIDTH / 2 - PLAYER_W / 2 },
    wire: null,
    lives: INITIAL_LIVES,
    score: 0,
    hiScore,
    stage: 0,
    status: 'playing',
    statusTimer: 0,
  };
}

export function useGameLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onGameEnd: (score: number, hiScore: number) => void,
) {
  const onGameEndRef = useRef(onGameEnd);
  useEffect(() => { onGameEndRef.current = onGameEnd; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const hiStart = Number(localStorage.getItem('hiScore') || 0);
    const s: GameState = initState(hiStart);

    const keys = new Set<string>();
    let raf = 0;
    let running = true;

    function onKeyDown(e: KeyboardEvent) {
      keys.add(e.code);
      if (e.code === 'Space') e.preventDefault();

      // 와이어 발사 — 키를 처음 누를 때만 발사 (hold 무시)
      if ((e.code === 'Space' || e.code === 'KeyZ') && s.status === 'playing' && !s.wire) {
        s.wire = { x: s.player.x + PLAYER_W / 2, topY: GROUND_Y - PLAYER_H };
      }
    }
    function onKeyUp(e: KeyboardEvent) { keys.delete(e.code); }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ── update ──────────────────────────────────────────────
    function update() {
      if (s.status === 'dying') {
        s.statusTimer--;
        if (s.statusTimer <= 0) {
          if (s.lives <= 0) {
            running = false;
            if (s.score > s.hiScore) {
              s.hiScore = s.score;
              localStorage.setItem('hiScore', String(s.score));
            }
            onGameEndRef.current(s.score, s.hiScore);
            return;
          }
          // 목숨 남음 → 스테이지 재시작
          s.player.x = CANVAS_WIDTH / 2 - PLAYER_W / 2;
          s.wire = null;
          s.status = 'playing';
        }
        return;
      }

      // 좌우 이동
      if (keys.has('ArrowLeft') || keys.has('KeyA')) {
        s.player.x = Math.max(0, s.player.x - PLAYER_SPEED);
      }
      if (keys.has('ArrowRight') || keys.has('KeyD')) {
        s.player.x = Math.min(CANVAS_WIDTH - PLAYER_W, s.player.x + PLAYER_SPEED);
      }

      // 와이어 이동
      if (s.wire) {
        s.wire.topY -= WIRE_SPEED;
        if (s.wire.topY <= CEILING_Y) {
          s.wire = null; // 천장 도달 → 소멸, 재발사 가능
        }
      }
    }

    // ── draw ────────────────────────────────────────────────
    function drawBackground() {
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

    function drawWire() {
      if (!s.wire) return;
      ctx.strokeStyle = '#ffe000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.wire.x, GROUND_Y - PLAYER_H);
      ctx.lineTo(s.wire.x, s.wire.topY);
      ctx.stroke();
      // 와이어 끝부분 (tip)
      ctx.fillStyle = '#ffe000';
      ctx.beginPath();
      ctx.arc(s.wire.x, s.wire.topY, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawPlayer() {
      // 사망 중 깜빡임
      const visible = s.status !== 'dying' || Math.floor(s.statusTimer / 5) % 2 === 0;
      if (!visible) return;

      const px = s.player.x;
      const py = GROUND_Y - PLAYER_H;

      // 몸통
      ctx.fillStyle = '#2980b9';
      ctx.fillRect(px + 2, py + PLAYER_H * 0.35, PLAYER_W - 4, PLAYER_H * 0.65);

      // 머리
      ctx.fillStyle = '#f5cba7';
      ctx.beginPath();
      ctx.arc(px + PLAYER_W / 2, py + PLAYER_H * 0.2, PLAYER_W / 2 - 1, 0, Math.PI * 2);
      ctx.fill();

      // 모자
      ctx.fillStyle = '#8b0000';
      ctx.fillRect(px + 3, py + 1, PLAYER_W - 6, 6);
    }

    function drawHUD() {
      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_H);

      ctx.font = 'bold 14px monospace';
      ctx.textBaseline = 'middle';
      const midY = HUD_H / 2;

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE  ${s.score}`, 10, midY);

      ctx.fillStyle = '#f1c40f';
      ctx.textAlign = 'center';
      ctx.fillText(`HI  ${s.hiScore}`, CANVAS_WIDTH / 2, midY);

      ctx.fillStyle = '#aaaaaa';
      ctx.textAlign = 'right';
      ctx.fillText(`1-${s.stage + 1}`, CANVAS_WIDTH - 8, midY);

      // 목숨 아이콘 (stage 표시 왼쪽)
      for (let i = 0; i < s.lives; i++) {
        const ix = CANVAS_WIDTH - 44 - i * 16;
        ctx.fillStyle = '#3498db';
        ctx.fillRect(ix, midY - 8, 10, 16);
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    function draw() {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawBackground();
      drawWire();
      drawPlayer();
      drawHUD();
    }

    // ── loop ────────────────────────────────────────────────
    function loop() {
      if (!running) return;
      update();
      if (!running) return;
      draw();
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [canvasRef]);
}
