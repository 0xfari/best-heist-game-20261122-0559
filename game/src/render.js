// Drawing only: the heist's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin
// filled with the backdrop colour. Vision cones are painted before the cases
// and walls, so cover reads as cover: a cone that stops at a case is a cone
// that cannot see past it.

import { ALARM, CAMERA, FIELD, FONT, GUARD, PALETTE, THIEF } from './config.js';
import { CASES, DIAMOND, EXIT_ZONE, FUSE_BOX, STATUETTES, VAULT, WALLS } from './room.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WON = 'won';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_DAWN = 'dawn';

const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = baseline || 'alphabetic';
    context.fillText(value, x, y);
  }

  /** Client pixels (a mouse click) into field pixels. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const px = (clientX - rect.left) * ratio;
    const py = (clientY - rect.top) * ratio;
    return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
  }

  function wedge(x, y, angle, range, half, fill, edge) {
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, range, angle - half, angle + half);
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = edge;
    context.lineWidth = 1.5;
    context.stroke();
  }

  function drawFloor() {
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.strokeStyle = PALETTE.floorLine;
    context.lineWidth = 1;
    for (let x = 24; x < FIELD.width; x += 80) {
      context.beginPath();
      context.moveTo(x, 24);
      context.lineTo(x, FIELD.height - 24);
      context.stroke();
    }
    for (let y = 24; y < FIELD.height; y += 80) {
      context.beginPath();
      context.moveTo(24, y);
      context.lineTo(FIELD.width - 24, y);
      context.stroke();
    }
    // The deep-red carpet runner down the middle of the hall.
    context.fillStyle = PALETTE.carpet;
    context.fillRect(580, 24, 120, FIELD.height - 48);
    context.strokeStyle = PALETTE.carpetEdge;
    context.lineWidth = 3;
    context.strokeRect(580, 24, 120, FIELD.height - 48);
  }

  function drawWalls() {
    for (let i = 0; i < WALLS.length; i += 1) {
      const w = WALLS[i];
      context.fillStyle = PALETTE.wall;
      context.fillRect(w.x, w.y, w.w, w.h);
    }
    context.strokeStyle = PALETTE.wallTrim;
    context.lineWidth = 2;
    context.strokeRect(2, 2, FIELD.width - 4, FIELD.height - 4);
    // The door the thief must get back out of.
    context.fillStyle = PALETTE.exitGlow;
    context.fillRect(EXIT_ZONE.x - 6, FIELD.height - 24, EXIT_ZONE.w + 12, 24);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(EXIT_ZONE.x, FIELD.height - 24, EXIT_ZONE.w, 24);
    text('EXIT', EXIT_ZONE.x + EXIT_ZONE.w / 2, FIELD.height - 6, 13, PALETTE.exitGlow, 'center', 'alphabetic');
  }

  function drawCases(state) {
    for (let i = 0; i < CASES.length; i += 1) {
      const c = CASES[i];
      context.fillStyle = PALETTE.caseBase;
      context.fillRect(c.x, c.y, c.w, c.h);
      context.fillStyle = PALETTE.caseGlass;
      context.fillRect(c.x + 5, c.y + 5, c.w - 10, c.h - 10);
      context.strokeStyle = PALETTE.caseGlint;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(c.x + 10, c.y + c.h - 8);
      context.lineTo(c.x + c.w - 10, c.y + 8);
      context.stroke();
    }
    // The vault case, and the diamond inside it.
    context.fillStyle = PALETTE.caseBase;
    context.fillRect(VAULT.x, VAULT.y, VAULT.w, VAULT.h);
    context.fillStyle = PALETTE.caseGlass;
    context.fillRect(VAULT.x + 5, VAULT.y + 5, VAULT.w - 10, VAULT.h - 10);
    if (!state.diamondTaken) {
      const pulse = 0.7 + 0.3 * Math.sin(state.elapsed * 3);
      context.fillStyle = `rgba(143, 232, 255, ${0.25 * pulse})`;
      context.beginPath();
      context.arc(DIAMOND.x, DIAMOND.y, 34 * pulse, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.diamond;
      context.beginPath();
      context.moveTo(DIAMOND.x, DIAMOND.y - 14);
      context.lineTo(DIAMOND.x + 11, DIAMOND.y);
      context.lineTo(DIAMOND.x, DIAMOND.y + 14);
      context.lineTo(DIAMOND.x - 11, DIAMOND.y);
      context.closePath();
      context.fill();
      context.fillStyle = PALETTE.diamondCore;
      context.beginPath();
      context.moveTo(DIAMOND.x, DIAMOND.y - 6);
      context.lineTo(DIAMOND.x + 5, DIAMOND.y);
      context.lineTo(DIAMOND.x, DIAMOND.y + 6);
      context.lineTo(DIAMOND.x - 5, DIAMOND.y);
      context.closePath();
      context.fill();
    }
    // Small loot still on its plinth.
    for (let i = 0; i < state.statuettes.length; i += 1) {
      const s = state.statuettes[i];
      if (s.taken) continue;
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.arc(s.x, s.y, 9, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.goldDark;
      context.fillRect(s.x - 3, s.y - 3, 6, 6);
    }
    // The fuse box on the right wall.
    context.fillStyle = PALETTE.caseBase;
    context.fillRect(FUSE_BOX.x - 14, FUSE_BOX.y - 18, 14, 36);
    context.fillStyle = PALETTE.gold;
    context.font = `16px ${FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('⚡', FUSE_BOX.x - 7, FUSE_BOX.y + 1);
  }

  function drawCones(state) {
    for (let i = 0; i < state.guards.length; i += 1) {
      const g = state.guards[i];
      wedge(g.x, g.y, g.angle, GUARD.viewRange, GUARD.viewHalfAngle, PALETTE.cone, PALETTE.coneEdge);
    }
    for (let i = 0; i < state.cameras.length; i += 1) {
      const c = state.cameras[i];
      if (c.dark > 0) continue;
      wedge(c.x, c.y, c.angle, CAMERA.range, CAMERA.halfAngle, PALETTE.cameraCone, PALETTE.cameraConeEdge);
    }
  }

  function drawGuards(state) {
    for (let i = 0; i < state.guards.length; i += 1) {
      const g = state.guards[i];
      context.fillStyle = PALETTE.shadow;
      context.beginPath();
      context.arc(g.x + 3, g.y + 4, GUARD.radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.guardDark;
      context.beginPath();
      context.arc(g.x, g.y, GUARD.radius - 6, 0, Math.PI * 2);
      context.fill();
      // The direction the guard is looking.
      context.strokeStyle = PALETTE.guard;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(g.x, g.y);
      context.lineTo(g.x + Math.cos(g.angle) * (GUARD.radius + 8), g.y + Math.sin(g.angle) * (GUARD.radius + 8));
      context.stroke();
    }
    for (let i = 0; i < state.cameras.length; i += 1) {
      const c = state.cameras[i];
      context.fillStyle = c.dark > 0 ? PALETTE.cameraDark : PALETTE.cameraBody;
      context.beginPath();
      context.arc(c.x, c.y, 11, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(c.x + Math.cos(c.angle) * 5, c.y + Math.sin(c.angle) * 5, 3.5, 0, Math.PI * 2);
      context.fill();
      if (c.dark > 0) {
        text(`${Math.ceil(c.dark)}s`, c.x, c.y - 20, 13, PALETTE.muted, 'center', 'alphabetic');
      }
    }
  }

  function drawThief(state) {
    const t = state.thief;
    context.fillStyle = PALETTE.shadow;
    context.beginPath();
    context.arc(t.x + 3, t.y + 4, THIEF.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.thief;
    context.beginPath();
    context.arc(t.x, t.y, THIEF.radius, 0, Math.PI * 2);
    context.fill();
    // Hood and mask: the thief's facing.
    context.fillStyle = PALETTE.thiefDark;
    context.beginPath();
    context.arc(t.x + Math.cos(t.angle) * 5, t.y + Math.sin(t.angle) * 5, 7, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.thiefDark;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(t.x, t.y);
    context.lineTo(t.x + Math.cos(t.angle) * (THIEF.radius + 7), t.y + Math.sin(t.angle) * (THIEF.radius + 7));
    context.stroke();
    if (t.sneaking) {
      text('…', t.x, t.y - THIEF.radius - 8, 14, PALETTE.muted, 'center', 'alphabetic');
    }
    // A thrown coin, mid-flight or ringing where it landed.
    const coin = t.coin;
    if (coin.active) {
      if (!coin.landed) {
        context.fillStyle = PALETTE.gold;
        context.beginPath();
        context.arc(coin.x, coin.y - 6, 5, 0, Math.PI * 2);
        context.fill();
      } else {
        context.strokeStyle = `rgba(242, 201, 76, ${Math.max(0, 1 - coin.ring)})`;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(coin.x, coin.y, 8 + coin.ring * 26, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = PALETTE.gold;
        context.beginPath();
        context.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
        context.fill();
      }
    }
    // The "seen" ring: a guard or a camera has eyes on the thief right now.
    if (state.seenRate > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 10);
      context.strokeStyle = `rgba(229, 83, 75, ${0.4 + 0.5 * pulse})`;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(t.x, t.y, THIEF.radius + 9 + pulse * 4, 0, Math.PI * 2);
      context.stroke();
      text('SPOTTED', t.x, t.y - THIEF.radius - 22, 15, PALETTE.alarmHigh, 'center', 'alphabetic');
    }
  }

  function drawHud(state) {
    // A dark strip so the meter, loot and timer read over any floor.
    context.fillStyle = 'rgba(11, 14, 26, 0.72)';
    context.fillRect(24, 26, FIELD.width - 48, 40);
    // Alarm meter.
    const meter = { x: 40, y: 38, w: 300, h: 16 };
    const frac = state.alarm.value / ALARM.max;
    const color = state.alarm.tripped ? PALETTE.alarmHigh : frac > 0.6 ? PALETTE.alarmMid : PALETTE.alarmLow;
    text('ALARM', meter.x, meter.y - 4, 13, PALETTE.muted, 'left', 'alphabetic');
    context.fillStyle = '#0b0e1a';
    context.fillRect(meter.x + 62, meter.y - 12, meter.w, meter.h);
    context.fillStyle = color;
    context.fillRect(meter.x + 62, meter.y - 12, meter.w * frac, meter.h);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.strokeRect(meter.x + 62, meter.y - 12, meter.w, meter.h);
    if (state.alarm.tripped) {
      text('!! ALARM !!', meter.x + 62 + meter.w + 12, meter.y + 2, 15, PALETTE.alarmHigh, 'left', 'alphabetic');
    }
    // Loot: the diamond and the statuettes, then the coins — kept right of
    // centre so they never collide with the objective line.
    const lootX = 1000;
    text(state.diamondTaken ? '◆' : '◇', lootX, 48, 22, state.diamondTaken ? PALETTE.diamond : PALETTE.muted, 'left', 'alphabetic');
    for (let i = 0; i < state.statuettes.length; i += 1) {
      text(state.statuettes[i].taken ? '●' : '○', lootX + 34 + i * 24, 48, 18, state.statuettes[i].taken ? PALETTE.gold : PALETTE.muted, 'left', 'alphabetic');
    }
    // Coins left to toss.
    text(`Coins ${state.thief.coins}`, lootX + 116, 48, 16, PALETTE.text, 'left', 'alphabetic');
    // Objective, centred.
    text(state.objective, FIELD.width / 2, 48, 17, PALETTE.text, 'center', 'alphabetic');
    // Clock.
    const left = Math.max(0, Math.ceil(state.timeLeft));
    const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    text(clock, FIELD.width - 40, 48, 18, left < 30 ? PALETTE.alarmHigh : PALETTE.text, 'right', 'alphabetic');
    // A contextual hint near the thief.
    const thief = state.thief;
    const nearDiamond = !state.diamondTaken && Math.hypot(DIAMOND.x - thief.x, DIAMOND.y - thief.y) < 56;
    const nearFuse = Math.hypot(FUSE_BOX.x - thief.x, FUSE_BOX.y - thief.y) < 64;
    const nearStatue = state.statuettes.some((s) => !s.taken && Math.hypot(s.x - thief.x, s.y - thief.y) < 56);
    if (nearDiamond) text('Press E — take the Sunburst Diamond', thief.x, thief.y - 34, 15, PALETTE.diamond, 'center', 'alphabetic');
    else if (nearStatue) text('Press E — pocket it', thief.x, thief.y - 34, 15, PALETTE.gold, 'center', 'alphabetic');
    else if (nearFuse) text('Press E — cut the cameras', thief.x, thief.y - 34, 15, PALETTE.gold, 'center', 'alphabetic');
    // The alarm's red edge while it is up.
    if (state.alarm.tripped) {
      const pulse = 0.12 + 0.1 * Math.sin(state.elapsed * 6);
      context.fillStyle = `rgba(229, 83, 75, ${pulse})`;
      context.fillRect(0, 0, FIELD.width, 10);
      context.fillRect(0, FIELD.height - 10, FIELD.width, 10);
      context.fillRect(0, 0, 10, FIELD.height);
      context.fillRect(FIELD.width - 10, 0, 10, FIELD.height);
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.shadow;
    context.fillRect(x + 6, y + 8, PANEL.width, height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = accent || PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'One gallery. Three guards. Two cameras. One diamond.',
    'Sneak with Shift. Toss a coin with a click to pull a guard away.',
    'Cut the cameras at the fuse box. Grab the diamond — then run for the exit.',
    'Move with WASD or arrows. Grab with E. Pause with P.',
    '',
  ];
  const PAUSED_LINES = ['The guards keep walking. The diamond keeps waiting.'];
  const DAWN_LINES = ['The sun came up over the gallery.', 'The crew went home empty-handed.'];

  /** Paint one frame: the room, then the HUD or a panel for the screen. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor();
    drawCones(state);
    drawWalls();
    drawCases(state);
    drawGuards(state);
    drawThief(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = best > 0 ? `Best getaway ${best}` : 'No getaway yet — tonight is the night.';
      drawPanel('THE VELVET VAULT', TITLE_LINES, 'Press Space or click to begin', PALETTE.wallTrim);
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to slip back in');
    } else if (screen === SCREEN_WON) {
      const s = state.score;
      drawPanel('CLEAN GETAWAY', [
        `Diamond ${s.diamond}  ·  Side loot ${s.statuettes}`,
        `Time bonus ${s.timeBonus}  ·  Ghost bonus ${s.ghostBonus}`,
        `Total ${s.total}   ·   Best ${Math.max(best, s.total)}`,
        '',
      ], 'Press Space or click to run it again', PALETTE.exitGlow);
    } else if (screen === SCREEN_BUSTED) {
      drawPanel('BUSTED', [
        'A guard got a hand on you under the alarm.',
        'The diamond stays in its case. Tonight, anyway.',
        '',
      ], 'Press Space or click to try again', PALETTE.alarmHigh);
    } else if (screen === SCREEN_DAWN) {
      drawPanel('DAWN BREAKS', DAWN_LINES, 'Press Space or click to try again', PALETTE.alarmHigh);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
