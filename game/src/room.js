// The gallery: walls, display cases, the vault, the loot, the fuse box, the
// door, and where the night watch walks. Every rect is {x, y, w, h} in field
// pixels; walls and cases block both movement and sight.

import { FIELD } from './config.js';

const T = 24; // outer wall thickness

export const WALLS = [
  { x: 0, y: 0, w: FIELD.width, h: T },
  { x: 0, y: 0, w: T, h: FIELD.height },
  { x: FIELD.width - T, y: 0, w: T, h: FIELD.height },
  { x: 0, y: FIELD.height - T, w: 600, h: T },
  { x: 680, y: FIELD.height - T, w: 600, h: T },
];

/** Display cases: cover to hide behind, and they block a guard's sight. */
export const CASES = [
  { x: 150, y: 150, w: 140, h: 80 },
  { x: 150, y: 430, w: 140, h: 80 },
  { x: 990, y: 150, w: 140, h: 80 },
  { x: 990, y: 430, w: 140, h: 80 },
  { x: 470, y: 280, w: 150, h: 60 },
  { x: 660, y: 280, w: 150, h: 60 },
  { x: 560, y: 470, w: 160, h: 60 },
];

/** The glass case holding the Sunburst Diamond. */
export const VAULT = { x: 580, y: 56, w: 120, h: 60 };
export const DIAMOND = { x: 640, y: 86 };

/** The door the thief comes in through — and must get back out of. */
export const EXIT_ZONE = { x: 600, y: 686, w: 80, h: 34 };
export const SPAWN = { x: 640, y: 656 };

/** Small loot, quiet to take, worth points. */
export const STATUETTES = [
  { x: 220, y: 592, name: 'Golden Ibis' },
  { x: 1060, y: 592, name: 'Golden Ibis' },
  { x: 640, y: 402, name: 'Jade Scarab' },
];

/** The fuse box that kills the cameras for a while. */
export const FUSE_BOX = { x: 1240, y: 360 };

/** Patrol loops: pairs of waypoints each guard walks between. */
export const GUARD_PATROLS = [
  { name: 'Prowl', points: [{ x: 300, y: 140 }, { x: 980, y: 140 }] },
  { name: 'Rook', points: [{ x: 400, y: 220 }, { x: 400, y: 560 }] },
  { name: 'Bishop', points: [{ x: 880, y: 220 }, { x: 880, y: 560 }] },
];

/** Wall cameras: position, and the arc (in radians) each one sweeps through. */
export const CAMERA_MOUNTS = [
  { x: 62, y: 62, from: 0.35, to: 1.22, period: 9 },
  { x: 1218, y: 62, from: Math.PI - 1.22, to: Math.PI - 0.35, period: 9 },
];

/** Everything sight cannot pass through. */
export function sightBlockers() {
  return WALLS.concat(CASES);
}

/** Everything a body cannot walk through. */
export function solidBlockers() {
  return WALLS.concat(CASES);
}

function circleHitsRect(x, y, r, rect) {
  const nearX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const nearY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - nearX;
  const dy = y - nearY;
  return dx * dx + dy * dy < r * r;
}

/**
 * Move a circle by (dx, dy), sliding along walls and cases: each axis is
 * resolved on its own, so the thief slides around corners instead of sticking.
 */
export function moveCircle(x, y, r, dx, dy) {
  const solids = solidBlockers();
  let nx = x + dx;
  for (let i = 0; i < solids.length; i += 1) {
    if (circleHitsRect(nx, y, r, solids[i])) { nx = x; break; }
  }
  let ny = y + dy;
  for (let i = 0; i < solids.length; i += 1) {
    if (circleHitsRect(nx, ny, r, solids[i])) { ny = y; break; }
  }
  return { x: nx, y: ny };
}
