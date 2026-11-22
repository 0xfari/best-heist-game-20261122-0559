// Seeing: vision cones and lines of sight. A watcher sees the thief only when
// the thief is inside the cone, inside the range, and no wall or case stands
// between them.

import { sightBlockers } from './room.js';

/** True when the segment (x1,y1)-(x2,y2) crosses the rect. */
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  // Slab test, one axis at a time; a zero-length axis is skipped.
  if (dx === 0) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let a = (rect.x - x1) / dx;
    let b = (rect.x + rect.w - x1) / dx;
    if (a > b) { const t = a; a = b; b = t; }
    tMin = Math.max(tMin, a);
    tMax = Math.min(tMax, b);
    if (tMin > tMax) return false;
  }
  if (dy === 0) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let a = (rect.y - y1) / dy;
    let b = (rect.y + rect.h - y1) / dy;
    if (a > b) { const t = a; a = b; b = t; }
    tMin = Math.max(tMin, a);
    tMax = Math.min(tMax, b);
    if (tMin > tMax) return false;
  }
  return true;
}

/** True when no wall or case stands between the two points. */
export function hasLineOfSight(x1, y1, x2, y2) {
  const blockers = sightBlockers();
  for (let i = 0; i < blockers.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, blockers[i])) return false;
  }
  return true;
}

/**
 * True when (tx, ty) lies inside a cone cast from (ox, oy) facing `angle`,
 * with the given range and half-angle, and the line of sight is clear.
 */
export function inCone(ox, oy, angle, range, halfAngle, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 4) return true;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > halfAngle) return false;
  return hasLineOfSight(ox, oy, tx, ty);
}
