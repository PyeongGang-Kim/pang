import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { Ball, BallSize, GameState } from '../game/types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, HUD_H, GROUND_Y, CEILING_Y,
  PLAYER_W, PLAYER_H, PLAYER_SPEED,
  WIRE_SPEED, GRAVITY,
  BALL_CONFIG, NEXT_BALL_SIZE,
  INITIAL_LIVES, DYING_FRAMES, STAGE_CLEAR_FRAMES, MISSION_CLEAR_FRAMES,
} from '../game/constants';
import { MISSION1_STAGES } from '../game/stages';

let _ballId = 0;

function makeBall(x: number, y: number, size: BallSize, vxDir: 1 | -1): Ball {
  const cfg = BALL_CONFIG[size];
  return { id: _ballId++, x, y, vx: cfg.speedX * vxDir, vy: cfg.bounceVY, size };
}

function buildBalls(stage: number): Ball[] {
  return MISSION1_STAGES[stage].balls.map(b => {
    const cfg = BALL_CONFIG[b.size];
    // 화면 상단 근처에서 시작 → 자유낙하 후 지면에서 자연스럽게 튀어오름
    // 자연 반사 정점(apex)에서 vy=0으로 시작 → 낙하→반사→정점이 항상 동일한 높이
    const apexY = GROUND_Y - cfg.radius - (cfg.bounceVY * cfg.bounceVY) / (2 * GRAVITY);
    const ball = makeBall(b.x, apexY, b.size, b.vxDir);
    ball.vy = 0;
    return ball;
  });
}

function initState(hiScore: number): GameState {
  return {
    player: { x: CANVAS_WIDTH / 2 - PLAYER_W / 2 },
    balls: buildBalls(0),
    wire: null,
    lives: INITIAL_LIVES,
    score: 0,
    hiScore,
    stage: 0,
    status: 'playing',
    statusTimer: 0,
  };
}

// 원-사각형 충돌
function circleRect(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= cr * cr;
}

function shadeColor(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
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

    function endGame() {
      running = false;
      if (s.score > s.hiScore) {
        s.hiScore = s.score;
        localStorage.setItem('hiScore', String(s.score));
      }
      onGameEndRef.current(s.score, s.hiScore);
    }

    function onKeyDown(e: KeyboardEvent) {
      keys.add(e.code);
      if (e.code === 'Space') e.preventDefault();
      if ((e.code === 'Space' || e.code === 'KeyZ') && s.status === 'playing' && !s.wire) {
        s.wire = { x: s.player.x + PLAYER_W / 2, topY: GROUND_Y - PLAYER_H };
      }
    }
    function onKeyUp(e: KeyboardEvent) { keys.delete(e.code); }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ── update ──────────────────────────────────────────────
    function update() {
      // 상태 전환 처리 (물리 일시정지)
      if (s.status !== 'playing') {
        s.statusTimer--;
        if (s.statusTimer > 0) return;

        if (s.status === 'dying') {
          if (s.lives <= 0) { endGame(); return; }
          s.player.x = CANVAS_WIDTH / 2 - PLAYER_W / 2;
          s.balls = buildBalls(s.stage);
          s.wire = null;
          s.status = 'playing';

        } else if (s.status === 'stageClear') {
          const next = s.stage + 1;
          if (next >= MISSION1_STAGES.length) {
            s.status = 'missionClear';
            s.statusTimer = MISSION_CLEAR_FRAMES;
          } else {
            s.stage = next;
            s.player.x = CANVAS_WIDTH / 2 - PLAYER_W / 2;
            s.balls = buildBalls(next);
            s.wire = null;
            s.status = 'playing';
          }

        } else if (s.status === 'missionClear') {
          endGame();
        }
        return;
      }

      // ── 플레이어 이동 ──
      if (keys.has('ArrowLeft') || keys.has('KeyA')) {
        s.player.x = Math.max(0, s.player.x - PLAYER_SPEED);
      }
      if (keys.has('ArrowRight') || keys.has('KeyD')) {
        s.player.x = Math.min(CANVAS_WIDTH - PLAYER_W, s.player.x + PLAYER_SPEED);
      }

      // ── 와이어 이동 ──
      if (s.wire) {
        s.wire.topY -= WIRE_SPEED;
        if (s.wire.topY <= CEILING_Y) s.wire = null;
      }

      // ── 볼 물리 ──
      for (const ball of s.balls) {
        const cfg = BALL_CONFIG[ball.size];
        ball.vy += GRAVITY;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // 벽 반사
        if (ball.x - cfg.radius < 0) {
          ball.x = cfg.radius;
          ball.vx = Math.abs(ball.vx);
        } else if (ball.x + cfg.radius > CANVAS_WIDTH) {
          ball.x = CANVAS_WIDTH - cfg.radius;
          ball.vx = -Math.abs(ball.vx);
        }

        // 바닥 반사
        if (ball.y + cfg.radius >= GROUND_Y) {
          ball.y = GROUND_Y - cfg.radius;
          ball.vy = cfg.bounceVY;
        }

        // 천장 반사 (매우 세게 튄 경우 대비)
        if (ball.y - cfg.radius < CEILING_Y) {
          ball.y = CEILING_Y + cfg.radius;
          ball.vy = Math.abs(ball.vy);
        }
      }

      // ── 와이어-볼 충돌 ──
      if (s.wire) {
        for (let i = s.balls.length - 1; i >= 0; i--) {
          const ball = s.balls[i];
          const cfg = BALL_CONFIG[ball.size];
          const hit =
            Math.abs(s.wire.x - ball.x) <= cfg.radius &&
            s.wire.topY <= ball.y + cfg.radius &&
            s.wire.topY >= ball.y - cfg.radius - WIRE_SPEED; // 터널링 방지

          if (!hit) continue;

          s.score += cfg.score;
          s.balls.splice(i, 1);

          const nextSize = NEXT_BALL_SIZE[ball.size] as BallSize | undefined;
          if (nextSize) {
            s.balls.push(
              makeBall(ball.x, ball.y, nextSize,  1),
              makeBall(ball.x, ball.y, nextSize, -1),
            );
          }
          s.wire = null;
          break;
        }
      }

      // ── 스테이지 클리어 ──
      if (s.balls.length === 0) {
        s.status = 'stageClear';
        s.statusTimer = STAGE_CLEAR_FRAMES;
        return;
      }

      // ── 플레이어-볼 충돌 ──
      const playerTop = GROUND_Y - PLAYER_H;
      for (const ball of s.balls) {
        const cfg = BALL_CONFIG[ball.size];
        if (circleRect(ball.x, ball.y, cfg.radius, s.player.x, playerTop, PLAYER_W, PLAYER_H)) {
          s.lives--;
          s.wire = null;
          s.status = 'dying';
          s.statusTimer = DYING_FRAMES;
          break;
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

      ctx.fillStyle = '#6b7a8d';
      ctx.beginPath();
      ctx.moveTo(40, GROUND_Y);
      ctx.lineTo(240, 140);
      ctx.lineTo(440, GROUND_Y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.moveTo(192, 198);
      ctx.lineTo(240, 140);
      ctx.lineTo(288, 198);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#5d4037';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      ctx.fillStyle = '#66bb6a';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 6);
    }

    function drawBalls() {
      for (const ball of s.balls) {
        const cfg = BALL_CONFIG[ball.size];
        const grad = ctx.createRadialGradient(
          ball.x - cfg.radius * 0.3, ball.y - cfg.radius * 0.3, cfg.radius * 0.05,
          ball.x, ball.y, cfg.radius,
        );
        grad.addColorStop(0, 'rgba(255,255,255,0.7)');
        grad.addColorStop(0.35, cfg.color);
        grad.addColorStop(1, shadeColor(cfg.color, -50));

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, cfg.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    function drawWire() {
      if (!s.wire) return;
      ctx.strokeStyle = '#ffe000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.wire.x, GROUND_Y - PLAYER_H);
      ctx.lineTo(s.wire.x, s.wire.topY);
      ctx.stroke();
      ctx.fillStyle = '#ffe000';
      ctx.beginPath();
      ctx.arc(s.wire.x, s.wire.topY, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawPlayer() {
      const visible = s.status !== 'dying' || Math.floor(s.statusTimer / 5) % 2 === 0;
      if (!visible) return;

      const px = s.player.x;
      const py = GROUND_Y - PLAYER_H;

      ctx.fillStyle = '#2980b9';
      ctx.fillRect(px + 2, py + PLAYER_H * 0.35, PLAYER_W - 4, PLAYER_H * 0.65);

      ctx.fillStyle = '#f5cba7';
      ctx.beginPath();
      ctx.arc(px + PLAYER_W / 2, py + PLAYER_H * 0.2, PLAYER_W / 2 - 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#8b0000';
      ctx.fillRect(px + 3, py + 1, PLAYER_W - 6, 6);
    }

    function drawHUD() {
      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_H);

      ctx.font = 'bold 14px monospace';
      ctx.textBaseline = 'middle';
      const midY = HUD_H / 2;

      // 좌: 점수
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE  ${s.score}`, 10, midY);

      // 중앙: HI 스코어
      ctx.fillStyle = '#f1c40f';
      ctx.textAlign = 'center';
      ctx.fillText(`HI  ${s.hiScore}`, CANVAS_WIDTH / 2, midY);

      // 우측 1/4 지점: 스테이지
      ctx.fillStyle = '#aaaaaa';
      ctx.textAlign = 'center';
      ctx.fillText(`1-${s.stage + 1}`, CANVAS_WIDTH * 0.78, midY);

      // 우측 끝: 목숨 아이콘 + 숫자
      const lifeIconSize = 10;
      const lifeGap = 13;
      const lifeStartX = CANVAS_WIDTH - 10 - (s.lives - 1) * lifeGap - lifeIconSize;
      for (let i = 0; i < s.lives; i++) {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        const lx = lifeStartX + i * lifeGap + lifeIconSize / 2;
        const ly = midY;
        // 하트 모양 (간단히 원 2개 + 삼각형)
        ctx.arc(lx - 3, ly - 2, 4, Math.PI, 0);
        ctx.arc(lx + 3, ly - 2, 4, Math.PI, 0);
        ctx.lineTo(lx, ly + 6);
        ctx.closePath();
        ctx.fill();
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    function drawOverlay(message: string, sub?: string) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, HUD_H, CANVAS_WIDTH, CANVAS_HEIGHT - HUD_H);

      ctx.font = 'bold 40px monospace';
      ctx.fillStyle = '#f1c40f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

      if (sub) {
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(sub, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    function draw() {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawBackground();
      drawBalls();
      drawWire();
      drawPlayer();
      drawHUD();

      if (s.status === 'stageClear') drawOverlay('STAGE CLEAR!');
      if (s.status === 'missionClear') drawOverlay('MISSION CLEAR!', `SCORE  ${s.score}`);
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
