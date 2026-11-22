// The thief: eight-way movement with a sneak, and a coin to toss. A tossed
// coin flies to where the mouse pointed, lands with a clink, and every guard
// close enough comes to look at it.

import { COIN, THIEF } from './config.js';
import { SPAWN, moveCircle } from './room.js';

export function createThief() {
  return {
    x: SPAWN.x,
    y: SPAWN.y,
    angle: -Math.PI / 2,
    moving: false,
    sneaking: false,
    coins: COIN.count,
    coin: { active: false, x: 0, y: 0, fromX: 0, fromY: 0, toX: 0, toY: 0, t: 0, landed: false, ring: 0 },
  };
}

/**
 * One step. `move` is {x, y} in -1..1, `sneak` is held, `toss` is a field
 * point the mouse just asked for, or null. Returns the coin's landing point
 * the moment it rings, else null.
 */
export function stepThief(thief, dt, move, sneak, toss) {
  thief.sneaking = sneak;
  const length = Math.hypot(move.x, move.y);
  thief.moving = length > 0.01;
  if (thief.moving) {
    const speed = sneak ? THIEF.sneakSpeed : THIEF.walkSpeed;
    const nx = (move.x / length) * speed * dt;
    const ny = (move.y / length) * speed * dt;
    const next = moveCircle(thief.x, thief.y, THIEF.radius, nx, ny);
    thief.x = next.x;
    thief.y = next.y;
    thief.angle = Math.atan2(move.y, move.x);
  }
  if (toss !== null && thief.coins > 0 && !thief.coin.active) {
    thief.coins -= 1;
    thief.coin.active = true;
    thief.coin.landed = false;
    thief.coin.fromX = thief.x;
    thief.coin.fromY = thief.y;
    thief.coin.toX = toss.x;
    thief.coin.toY = toss.y;
    thief.coin.t = 0;
    thief.coin.ring = 0;
    thief.angle = Math.atan2(toss.y - thief.y, toss.x - thief.x);
  }
  const coin = thief.coin;
  if (coin.active) {
    if (!coin.landed) {
      coin.t += dt / COIN.flightTime;
      if (coin.t >= 1) {
        coin.t = 1;
        coin.landed = true;
        coin.ring = 0;
        coin.x = coin.toX;
        coin.y = coin.toY;
        return { x: coin.toX, y: coin.toY };
      }
      const eased = coin.t * coin.t * (3 - 2 * coin.t);
      coin.x = coin.fromX + (coin.toX - coin.fromX) * eased;
      coin.y = coin.fromY + (coin.toY - coin.fromY) * eased;
    } else {
      coin.ring += dt;
      if (coin.ring > 1.2) coin.active = false;
    }
  }
  return null;
}
