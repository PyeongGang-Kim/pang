import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { Ball, BallSize, GameState, Item, ItemType, Wire } from '../game/types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, HUD_H, GROUND_Y, CEILING_Y,
  PLAYER_W, PLAYER_H, PLAYER_SPEED,
  WIRE_SPEED, GRAVITY,
  BALL_CONFIG, NEXT_BALL_SIZE,
  ITEM_CONFIG, ITEM_WEIGHTS, ITEM_DROP_CHANCE, ITEM_SIZE, ITEM_FALL_SPEED, ITEM_LIFE_FRAMES,
  POWER_WIRE_STUCK_FRAMES, VULCAN_COOLDOWN_FRAMES, CLOCK_FRAMES,
  INITIAL_LIVES, DYING_FRAMES, STAGE_CLEAR_FRAMES, MISSION_CLEAR_FRAMES,
  SCORE_PER_LIFE,
} from '../game/constants';
import { MISSION1_STAGES } from '../game/stages';

// ── 팩토리 ────────────────────────────────────────────────
let _ballId = 0;
let _wireId = 0;
let _itemId = 0;

function makeBall(x: number, y: number, size: BallSize, vxDir: 1 | -1): Ball {
  const cfg = BALL_CONFIG[size];
  return { id: _ballId++, x, y, vx: cfg.speedX * vxDir, vy: cfg.bounceVY, size };
}

function makeWire(x: number, topY: number): Wire {
  return { id: _wireId++, x, topY, stuck: false, stuckTimer: 0 };
}

function makeItem(x: number, y: number, type: ItemType): Item {
  return { id: _itemId++, x, y, vy: ITEM_FALL_SPEED, type, lifeTimer: ITEM_LIFE_FRAMES };
}

function randomItemType(): ItemType {
  const total = ITEM_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, w] of ITEM_WEIGHTS) {
    r -= w;
    if (r <= 0) return type;
  }
  return 'food';
}

function buildBalls(stage: number): Ball[] {
  return MISSION1_STAGES[stage].balls.map(b => {
    const cfg = BALL_CONFIG[b.size];
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
    wires: [],
    items: [],
    weapon: 'wire',
    hasForceField: false,
    invincibleTimer: 0,
    clockTimer: 0,
    vulcanCooldown: 0,
    sizeCombo: 1,
    hitStreak: 1,
    lastHitSize: null,
    prevLifeMilestone: 0,
    lives: INITIAL_LIVES,
    score: 0,
    hiScore,
    stage: 0,
    status: 'playing',
    statusTimer: 0,
  };
}

// ── 유틸리티 ──────────────────────────────────────────────
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

// ── 훅 ───────────────────────────────────────────────────
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

    // ── 헬퍼 ──────────────────────────────────────────────
    function endGame() {
      running = false;
      if (s.score > s.hiScore) {
        s.hiScore = s.score;
        localStorage.setItem('hiScore', String(s.score));
      }
      onGameEndRef.current(s.score, s.hiScore);
    }

    function tryFire() {
      if (s.status !== 'playing') return;
      const cx = s.player.x + PLAYER_W / 2;
      const startY = GROUND_Y - PLAYER_H;

      if (s.weapon === 'wire' && s.wires.length === 0) {
        s.wires.push(makeWire(cx, startY));
      } else if (s.weapon === 'doubleWire' && s.wires.length === 0) {
        s.wires.push(makeWire(cx - 10, startY));
        s.wires.push(makeWire(cx + 10, startY));
      } else if (s.weapon === 'powerWire' && s.wires.length === 0) {
        s.wires.push(makeWire(cx, startY));
      }
      // vulcan은 update()에서 홀드 처리
    }

    function applyItem(type: ItemType) {
      switch (type) {
        case 'doubleWire': s.weapon = 'doubleWire'; s.wires = []; break;
        case 'powerWire':  s.weapon = 'powerWire';  s.wires = []; break;
        case 'vulcan':     s.weapon = 'vulcan';      s.wires = []; break;
        case 'forceField': s.hasForceField = true; break;
        case 'clock':      s.clockTimer = CLOCK_FRAMES; break;
        case 'dynamite':
          s.balls = s.balls.map(b => {
            if (b.size === 'tiny') return b;
            const t = makeBall(b.x, b.y, 'tiny', b.vx > 0 ? 1 : -1);
            t.vy = b.vy;
            return t;
          });
          break;
        case 'food': s.score += 500; break;
      }
    }

    function respawn() {
      s.player.x = CANVAS_WIDTH / 2 - PLAYER_W / 2;
      s.balls = buildBalls(s.stage);
      s.wires = [];
      s.items = [];
      s.weapon = 'wire';
      s.hasForceField = false;
      s.invincibleTimer = 0;
      s.clockTimer = 0;
      s.vulcanCooldown = 0;
      s.sizeCombo = 1;
      s.hitStreak = 1;
      s.lastHitSize = null;
      s.status = 'playing';
    }

    function nextStage(stage: number) {
      s.stage = stage;
      s.player.x = CANVAS_WIDTH / 2 - PLAYER_W / 2;
      s.balls = buildBalls(stage);
      s.wires = [];
      s.items = [];
      s.invincibleTimer = 0;
      s.clockTimer = 0;
      s.sizeCombo = 1;
      s.hitStreak = 1;
      s.lastHitSize = null;
      s.status = 'playing';
    }

    // ── 이벤트 ─────────────────────────────────────────────
    function onKeyDown(e: KeyboardEvent) {
      keys.add(e.code);
      if (e.code === 'Space') e.preventDefault();
      if (e.code === 'Space' || e.code === 'KeyZ') tryFire();
    }
    function onKeyUp(e: KeyboardEvent) { keys.delete(e.code); }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ── update ────────────────────────────────────────────
    function update() {
      if (s.status !== 'playing') {
        s.statusTimer--;
        if (s.statusTimer > 0) return;

        if (s.status === 'dying') {
          if (s.lives <= 0) { endGame(); return; }
          respawn();
        } else if (s.status === 'stageClear') {
          const next = s.stage + 1;
          if (next >= MISSION1_STAGES.length) {
            s.status = 'missionClear';
            s.statusTimer = MISSION_CLEAR_FRAMES;
          } else {
            nextStage(next);
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

      // ── Vulcan 홀드 발사 ──
      if (s.weapon === 'vulcan') {
        if (s.vulcanCooldown > 0) s.vulcanCooldown--;
        if ((keys.has('Space') || keys.has('KeyZ')) && s.vulcanCooldown === 0) {
          s.wires.push(makeWire(s.player.x + PLAYER_W / 2, GROUND_Y - PLAYER_H));
          s.vulcanCooldown = VULCAN_COOLDOWN_FRAMES;
        }
      }

      // ── 와이어 이동 ──
      for (let i = s.wires.length - 1; i >= 0; i--) {
        const wire = s.wires[i];
        if (wire.stuck) {
          wire.stuckTimer--;
          if (wire.stuckTimer <= 0) s.wires.splice(i, 1);
          continue;
        }
        wire.topY -= WIRE_SPEED;
        if (wire.topY <= CEILING_Y) {
          if (s.weapon === 'powerWire') {
            wire.stuck = true;
            wire.stuckTimer = POWER_WIRE_STUCK_FRAMES;
          } else {
            // 빗나감 → Hit Streak 초기화
            s.hitStreak = 1;
            s.wires.splice(i, 1);
          }
        }
      }

      // ── 볼 물리 (Clock 발동 중엔 정지) ──
      if (s.clockTimer > 0) {
        s.clockTimer--;
      } else {
        for (const ball of s.balls) {
          const cfg = BALL_CONFIG[ball.size];
          ball.vy += GRAVITY;
          ball.x += ball.vx;
          ball.y += ball.vy;

          if (ball.x - cfg.radius < 0) { ball.x = cfg.radius; ball.vx = Math.abs(ball.vx); }
          else if (ball.x + cfg.radius > CANVAS_WIDTH) { ball.x = CANVAS_WIDTH - cfg.radius; ball.vx = -Math.abs(ball.vx); }

          if (ball.y + cfg.radius >= GROUND_Y) { ball.y = GROUND_Y - cfg.radius; ball.vy = cfg.bounceVY; }
          if (ball.y - cfg.radius < CEILING_Y) { ball.y = CEILING_Y + cfg.radius; ball.vy = Math.abs(ball.vy); }
        }
      }

      // ── 아이템 낙하 ──
      for (let i = s.items.length - 1; i >= 0; i--) {
        const item = s.items[i];
        item.lifeTimer--;
        if (item.lifeTimer <= 0) { s.items.splice(i, 1); continue; }

        const groundStop = GROUND_Y - ITEM_SIZE / 2;
        if (item.y < groundStop) {
          item.y = Math.min(groundStop, item.y + item.vy);
        }
      }

      // ── 와이어-볼 충돌 ──
      for (let wi = s.wires.length - 1; wi >= 0; wi--) {
        const wire = s.wires[wi];
        let hitAny = false;

        for (let bi = s.balls.length - 1; bi >= 0; bi--) {
          const ball = s.balls[bi];
          const cfg = BALL_CONFIG[ball.size];

          let hit = false;
          if (wire.stuck) {
            // Power Wire: 전체 높이 수직 장벽
            const wireBottom = GROUND_Y - PLAYER_H;
            hit =
              Math.abs(wire.x - ball.x) <= cfg.radius &&
              ball.y + cfg.radius >= CEILING_Y &&
              ball.y - cfg.radius <= wireBottom;
          } else {
            // 일반 와이어
            hit =
              Math.abs(wire.x - ball.x) <= cfg.radius &&
              wire.topY <= ball.y + cfg.radius &&
              wire.topY >= ball.y - cfg.radius - WIRE_SPEED;
          }

          if (!hit) continue;

          // 같은 크기 배수 (Size Combo)
          if (s.lastHitSize === ball.size) {
            s.sizeCombo = Math.min(8, s.sizeCombo + 1);
          } else {
            s.sizeCombo = 1;
          }
          s.lastHitSize = ball.size;

          // 연속 적중 배수 (Hit Streak)
          s.hitStreak = Math.min(8, s.hitStreak + 1);

          s.score += cfg.score * s.sizeCombo * s.hitStreak;

          // 1UP 체크
          const milestone = Math.floor(s.score / SCORE_PER_LIFE);
          if (milestone > s.prevLifeMilestone) {
            s.prevLifeMilestone = milestone;
            s.lives++;
          }

          // 아이템 드롭
          if (Math.random() < ITEM_DROP_CHANCE) {
            s.items.push(makeItem(ball.x, ball.y, randomItemType()));
          }

          // 볼 제거 & 분열
          s.balls.splice(bi, 1);
          const nextSize = NEXT_BALL_SIZE[ball.size] as BallSize | undefined;
          if (nextSize) {
            const splitCfg = BALL_CONFIG[nextSize];
            const xOff = wire.stuck ? (cfg.radius + splitCfg.radius + 2) : 0;
            s.balls.push(
              makeBall(ball.x + xOff, ball.y, nextSize,  1),
              makeBall(ball.x - xOff, ball.y, nextSize, -1),
            );
          }

          hitAny = true;
          break;
        }

        if (hitAny && s.weapon !== 'vulcan' && !wire.stuck) {
          s.wires.splice(wi, 1);
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
      if (s.invincibleTimer > 0) {
        s.invincibleTimer--;
      } else {
        for (const ball of s.balls) {
          const cfg = BALL_CONFIG[ball.size];
          if (!circleRect(ball.x, ball.y, cfg.radius, s.player.x, playerTop, PLAYER_W, PLAYER_H)) continue;

          if (s.hasForceField) {
            s.hasForceField = false;
            s.invincibleTimer = 60;
          } else {
            s.lives--;
            s.status = 'dying';
            s.statusTimer = DYING_FRAMES;
          }
          break;
        }
      }

      // ── 플레이어-아이템 충돌 ──
      const half = ITEM_SIZE / 2;
      for (let i = s.items.length - 1; i >= 0; i--) {
        const item = s.items[i];
        if (
          item.x + half >= s.player.x && item.x - half <= s.player.x + PLAYER_W &&
          item.y + half >= playerTop && item.y - half <= GROUND_Y
        ) {
          applyItem(item.type);
          s.items.splice(i, 1);
        }
      }
    }

    // ── draw ──────────────────────────────────────────────
    function drawBackground() {
      const sky = ctx.createLinearGradient(0, HUD_H, 0, GROUND_Y);
      sky.addColorStop(0, '#87ceeb');
      sky.addColorStop(1, '#c8e8f8');
      ctx.fillStyle = sky;
      ctx.fillRect(0, HUD_H, CANVAS_WIDTH, GROUND_Y - HUD_H);

      ctx.fillStyle = '#6b7a8d';
      ctx.beginPath();
      ctx.moveTo(40, GROUND_Y); ctx.lineTo(240, 140); ctx.lineTo(440, GROUND_Y);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.moveTo(192, 198); ctx.lineTo(240, 140); ctx.lineTo(288, 198);
      ctx.closePath(); ctx.fill();

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
        ctx.fillStyle = s.clockTimer > 0 ? '#aaaadd' : grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    function drawWires() {
      for (const wire of s.wires) {
        if (wire.stuck) {
          // Power Wire: 전체 높이 수직 장벽 (타이머 기반 페이드)
          const wireBottom = GROUND_Y - PLAYER_H;
          ctx.globalAlpha = Math.max(0.3, wire.stuckTimer / POWER_WIRE_STUCK_FRAMES);
          ctx.strokeStyle = '#9b59b6';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(wire.x, CEILING_Y);
          ctx.lineTo(wire.x, wireBottom);
          ctx.stroke();
          ctx.fillStyle = '#9b59b6';
          ctx.beginPath();
          ctx.arc(wire.x, CEILING_Y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(wire.x, wireBottom, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          const isVulcan = s.weapon === 'vulcan';
          ctx.strokeStyle = isVulcan ? '#ff6b6b' : '#ffe000';
          ctx.lineWidth = isVulcan ? 2 : 3;
          ctx.beginPath();
          ctx.moveTo(wire.x, GROUND_Y - PLAYER_H);
          ctx.lineTo(wire.x, wire.topY);
          ctx.stroke();
          ctx.fillStyle = isVulcan ? '#ff6b6b' : '#ffe000';
          ctx.beginPath();
          ctx.arc(wire.x, wire.topY, isVulcan ? 3 : 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawItems() {
      for (const item of s.items) {
        const cfg = ITEM_CONFIG[item.type];
        const half = ITEM_SIZE / 2;

        // 깜빡임 (소멸 60프레임 전부터)
        if (item.lifeTimer < 60 && Math.floor(item.lifeTimer / 6) % 2 === 0) continue;

        ctx.fillStyle = cfg.color;
        ctx.fillRect(item.x - half, item.y - half, ITEM_SIZE, ITEM_SIZE);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(item.x - half, item.y - half, ITEM_SIZE, ITEM_SIZE);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cfg.label, item.x, item.y);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    }

    function drawPlayer() {
      const visible = s.status !== 'dying' || Math.floor(s.statusTimer / 5) % 2 === 0;
      if (!visible) return;

      const px = s.player.x;
      const py = GROUND_Y - PLAYER_H;

      // Force Field 링
      if (s.hasForceField) {
        ctx.strokeStyle = '#1abc9c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + PLAYER_W / 2, py + PLAYER_H / 2, PLAYER_W, 0, Math.PI * 2);
        ctx.stroke();
      }

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

      ctx.font = 'bold 13px monospace';
      ctx.textBaseline = 'middle';
      const midY = HUD_H / 2;

      // 점수
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE ${s.score}`, 10, midY);

      // 배율 표시 (1 초과일 때만)
      if (s.sizeCombo > 1 || s.hitStreak > 1) {
        ctx.font = 'bold 11px monospace';
        const parts: string[] = [];
        if (s.sizeCombo > 1) parts.push(`SIZE ×${s.sizeCombo}`);
        if (s.hitStreak > 1) parts.push(`STREAK ×${s.hitStreak}`);
        ctx.fillStyle = '#f39c12';
        ctx.fillText(parts.join('  '), 10, HUD_H - 4);
        ctx.font = 'bold 13px monospace';
      }

      // HI 스코어
      ctx.fillStyle = '#f1c40f';
      ctx.textAlign = 'center';
      ctx.fillText(`HI ${s.hiScore}`, CANVAS_WIDTH / 2, midY);

      // 무기 표시
      const weaponColor: Record<string, string> = {
        doubleWire: '#3498db', powerWire: '#9b59b6', vulcan: '#e74c3c',
      };
      const weaponLabel: Record<string, string> = {
        doubleWire: '2W', powerWire: 'PW', vulcan: 'VM',
      };
      if (s.weapon !== 'wire') {
        ctx.fillStyle = weaponColor[s.weapon];
        ctx.textAlign = 'center';
        ctx.fillText(weaponLabel[s.weapon], CANVAS_WIDTH * 0.68, midY);
      }

      // 스테이지
      ctx.fillStyle = '#aaaaaa';
      ctx.textAlign = 'center';
      ctx.fillText(`1-${s.stage + 1}`, CANVAS_WIDTH * 0.79, midY);

      // 목숨 하트
      const lifeGap = 14;
      const lifeStartX = CANVAS_WIDTH - 10 - (s.lives - 1) * lifeGap - 10;
      for (let i = 0; i < s.lives; i++) {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        const lx = lifeStartX + i * lifeGap + 5;
        const ly = midY;
        ctx.arc(lx - 3, ly - 2, 4, Math.PI, 0);
        ctx.arc(lx + 3, ly - 2, 4, Math.PI, 0);
        ctx.lineTo(lx, ly + 6);
        ctx.closePath();
        ctx.fill();
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // Clock 잔여 바
      if (s.clockTimer > 0) {
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(0, HUD_H - 3, CANVAS_WIDTH * (s.clockTimer / CLOCK_FRAMES), 3);
      }
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
      drawItems();
      drawBalls();
      drawWires();
      drawPlayer();
      drawHUD();

      if (s.status === 'stageClear') drawOverlay('STAGE CLEAR!');
      if (s.status === 'missionClear') drawOverlay('MISSION CLEAR!', `SCORE  ${s.score}`);
    }

    // ── loop ──────────────────────────────────────────────
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
