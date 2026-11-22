// The night watch: three guards walking their loops, turning to look, coming
// to investigate a noise, and running the thief down once the alarm is up.
// A guard never knows where the thief is unless it sees or hears something.

import { GUARD } from './config.js';
import { GUARD_PATROLS } from './room.js';
import { inCone } from './sight.js';

export const MODE_PATROL = 'patrol';
export const MODE_INVESTIGATE = 'investigate';
export const MODE_CHASE = 'chase';

/** A guard pauses this long at each waypoint and sweeps its gaze. */
const WAYPOINT_PAUSE = 1.4;
/** How fast a guard turns to face where it is going, radians a second. */
const TURN_SPEED = 5.5;

function turnToward(angle, target, dt) {
  let diff = target - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const step = TURN_SPEED * dt;
  if (Math.abs(diff) <= step) return target;
  return angle + Math.sign(diff) * step;
}

function moveToward(guard, x, y, speed, dt) {
  const dx = x - guard.x;
  const dy = y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const go = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * go;
  guard.y += (dy / dist) * go;
  guard.angle = turnToward(guard.angle, Math.atan2(dy, dx), dt);
  return dist - go < 2;
}

export function createGuards(random) {
  const jitter = random || (() => 0);
  return GUARD_PATROLS.map((patrol, index) => {
    const first = patrol.points[0];
    const second = patrol.points[1];
    // Each guard starts part-way along its first leg, so the same seed always
    // gives the same opening frame and different seeds shuffle the room.
    const along = jitter() * 0.4;
    return {
      name: patrol.name,
      x: first.x + (second.x - first.x) * along,
      y: first.y + (second.y - first.y) * along,
      angle: Math.atan2(second.y - first.y, second.x - first.x),
      points: patrol.points,
      next: 1,
      mode: MODE_PATROL,
      pause: 0,
      look: 0,
      investigate: { x: 0, y: 0 },
      investigateLeft: 0,
      index,
    };
  });
}

/**
 * Detection rate this guard contributes right now, per second: 0 when the thief
 * is out of the cone, behind cover, or the guard is looking elsewhere.
 */
export function guardSees(guard, thief, sneaking) {
  const dx = thief.x - guard.x;
  const dy = thief.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.viewRange) return 0;
  if (!inCone(guard.x, guard.y, guard.angle, GUARD.viewRange, GUARD.viewHalfAngle, thief.x, thief.y)) return 0;
  const closeness = 1 - dist / GUARD.viewRange;
  let rate = GUARD.detectFar + (GUARD.detectNear - GUARD.detectFar) * closeness;
  if (sneaking) rate *= 0.45;
  return rate;
}

/**
 * One step for every guard. `alarmUp` sends them after the thief; `noise`
 * is a fresh coin landing {x, y} or null. Returns true when a guard has
 * caught the thief.
 */
export function stepGuards(guards, dt, thief, alarmUp, noise) {
  let caught = false;
  for (let i = 0; i < guards.length; i += 1) {
    const guard = guards[i];
    if (noise !== null && guard.mode !== MODE_CHASE) {
      const d = Math.hypot(noise.x - guard.x, noise.y - guard.y);
      if (d < 250) {
        guard.mode = MODE_INVESTIGATE;
        guard.investigate = { x: noise.x, y: noise.y };
        guard.investigateLeft = 4;
      }
    }
    if (alarmUp) {
      guard.mode = MODE_CHASE;
      moveToward(guard, thief.x, thief.y, GUARD.chaseSpeed, dt);
      if (Math.hypot(thief.x - guard.x, thief.y - guard.y) < GUARD.catchRadius) caught = true;
      continue;
    }
    if (guard.mode === MODE_CHASE) guard.mode = MODE_PATROL;
    if (guard.mode === MODE_INVESTIGATE) {
      const arrived = moveToward(guard, guard.investigate.x, guard.investigate.y, GUARD.investigateSpeed, dt);
      if (arrived) {
        guard.investigateLeft -= dt;
        guard.angle += Math.sin(guard.investigateLeft * 3) * 1.4 * dt;
        if (guard.investigateLeft <= 0) guard.mode = MODE_PATROL;
      }
      continue;
    }
    // Patrol: walk the loop, pausing at each waypoint to sweep the room.
    if (guard.pause > 0) {
      guard.pause -= dt;
      guard.angle += Math.sin((WAYPOINT_PAUSE - guard.pause) * 2.2) * 0.9 * dt;
      continue;
    }
    const target = guard.points[guard.next];
    if (moveToward(guard, target.x, target.y, GUARD.patrolSpeed, dt)) {
      guard.next = (guard.next + 1) % guard.points.length;
      guard.pause = WAYPOINT_PAUSE;
    }
  }
  return caught;
}
