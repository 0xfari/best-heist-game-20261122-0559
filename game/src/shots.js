// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh heist for a fixed time, steered by a simple
// autopilot (walk the waypoints, sneak when a guard is close, toss a coin
// when one blocks the way, step aside when the next step walks into a cone),
// so the frame is what a short game really looks like and the same seed
// always gives the same frame.

import { STEP } from './config.js';
import { DIAMOND } from './room.js';
import { guardSees } from './guards.js';
import { EVENT_CAUGHT, EVENT_DAWN, EVENT_WIN } from './heist.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 40;
const END_LIMIT_SECONDS = 120;
const SAMPLE = STEP;

/** Waypoints the play scene's pilot walks: up the left side, into the hall. */
const PLAY_WAYPOINTS = [
  { x: 640, y: 560 },
  { x: 500, y: 520 },
  { x: 430, y: 430 },
  { x: 460, y: 340 },
  { x: 560, y: 380 },
];

/** Waypoints the end scene's pilot walks: fuse box, diamond, door. The route
 * stays in open floor: down the right corridor, across the hall below the
 * top patrol's line (y 260), and up the middle to the vault. */
const END_WAYPOINTS = [
  { x: 1000, y: 600 },
  { x: 1160, y: 560 },
  { x: 1210, y: 360 },
  { x: 1160, y: 200 },
  { x: 1160, y: 260 },
  { x: 980, y: 260 },
  { x: 760, y: 260 },
  { x: 640, y: 260 },
  { x: 640, y: 200 },
  { x: 640, y: 120 },
  { x: 640, y: 320 },
  { x: 480, y: 400 },
  { x: 480, y: 560 },
  { x: 640, y: 600 },
  { x: 640, y: 702 },
];

function nearestGuardDistance(state) {
  let best = Infinity;
  for (let i = 0; i < state.guards.length; i += 1) {
    const g = state.guards[i];
    best = Math.min(best, Math.hypot(g.x - state.thief.x, g.y - state.thief.y));
  }
  return best;
}

function wouldBeSeen(state, x, y, sneaking) {
  const probe = { x, y };
  for (let i = 0; i < state.guards.length; i += 1) {
    if (guardSees(state.guards[i], probe, sneaking) > 0) return true;
  }
  return false;
}

/**
 * One autopilot decision for the thief: where to walk, whether to sneak,
 * whether to toss a coin, whether to press E. `waypoints` is the route and
 * `index` the next waypoint; returns the new index with the input.
 */
function pilotInput(state, waypoints, index, bold = false) {
  const target = waypoints[Math.min(index, waypoints.length - 1)];
  const dx = target.x - state.thief.x;
  const dy = target.y - state.thief.y;
  const dist = Math.hypot(dx, dy);
  let nextIndex = index;
  // The diamond's waypoint is only a staging point: do not walk on until
  // the diamond is actually in hand — the grab needs the thief close.
  const atDiamond = !state.diamondTaken && Math.hypot(target.x - DIAMOND.x, target.y - DIAMOND.y) < 70;
  if (dist < (atDiamond ? 4 : 20) && index < waypoints.length - 1) nextIndex = index + 1;
  const near = nearestGuardDistance(state);
  // Once the alarm is up, stealth is over: run for the waypoint at full
  // speed. Otherwise sneak when a guard is close or the meter is warm.
  // A bold pilot walks straight at the waypoint and only sneaks when a
  // guard is right on top of it — the play scene uses it so the alarm
  // actually climbs and the frame shows the tension.
  const fleeing = state.alarm.tripped;
  const sneak = !fleeing && (near < (bold ? 120 : 300) || state.alarm.value > 20);
  let move = { x: 0, y: 0 };
  if (dist > 1) {
    const step = sneak ? 128 : 210;
    if (fleeing || bold) {
      move = { x: dx / dist, y: dy / dist };
    } else {
      const px = state.thief.x + (dx / dist) * step * SAMPLE;
      const py = state.thief.y + (dy / dist) * step * SAMPLE;
      if (!wouldBeSeen(state, px, py, sneak)) {
        move = { x: dx / dist, y: dy / dist };
      } else {
        // Step aside: try both perpendiculars, take one the guards cannot see.
        const side = { x: -dy / dist, y: dx / dist };
        const left = { x: state.thief.x + side.x * 40, y: state.thief.y + side.y * 40 };
        const right = { x: state.thief.x - side.x * 40, y: state.thief.y - side.y * 40 };
        if (!wouldBeSeen(state, left.x, left.y, sneak)) move = side;
        else if (!wouldBeSeen(state, right.x, right.y, sneak)) move = { x: -side.x, y: -side.y };
        // Else hold still and wait for the cone to sweep past.
      }
    }
  }
  // A guard right on the path gets a coin tossed behind it — but only while
  // the job is still quiet.
  let toss = null;
  if (!fleeing && near < 170 && state.thief.coins > 0 && !state.thief.coin.active) {
    const g = state.guards.reduce((a, b) => (
      Math.hypot(a.x - state.thief.x, a.y - state.thief.y) < Math.hypot(b.x - state.thief.x, b.y - state.thief.y) ? a : b
    ));
    toss = { x: g.x - Math.cos(g.angle) * 120, y: g.y - Math.sin(g.angle) * 120 };
  }
  const interact = true;
  return { input: { move, sneak, toss, interact, attract: false }, nextIndex };
}

/**
 * Set the heist to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, heist) {
  heist.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      heist.step(STEP, { move: { x: 0, y: 0 }, sneak: false, toss: null, interact: false, attract: true });
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const waypoints = name === 'end' ? END_WAYPOINTS : PLAY_WAYPOINTS;
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  let index = 0;
  let events = 0;
  for (let i = 0; i < limit / STEP; i += 1) {
    const decided = pilotInput(heist.state, waypoints, index, name === 'play');
    index = decided.nextIndex;
    events = heist.step(STEP, decided.input);
    if (events & (EVENT_WIN | EVENT_CAUGHT | EVENT_DAWN)) break;
    // The play scene wants a tense frame: stop once the alarm is warm
    // (the meter half full, the thief just spotted) or the time is up.
    if (name === 'play' && heist.state.elapsed > 15 && heist.state.alarm.value >= 45) break;
  }
  const won = heist.state.phase === 'won';
  return { screen: won ? SCREEN_WON : SCREEN_PLAY, best: won ? heist.state.score.total : 0 };
}
