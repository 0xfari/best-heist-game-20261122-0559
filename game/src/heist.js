// The heist itself: the rules and the state, with no drawing and no browser
// in it. step() advances one fixed step and returns what happened as bit
// flags, so the caller can react — sounds, announcements, screens — without
// the rules knowing about any of them.

import { ALARM, CAMERA, SCORE, THIEF, TIME_LIMIT } from './config.js';
import { DIAMOND, EXIT_ZONE, FUSE_BOX, STATUETTES } from './room.js';
import { createThief, stepThief } from './thief.js';
import { cameraSees, createCameras, sabotageCameras, stepCameras } from './cameras.js';
import { createAlarm, stepAlarm } from './alarm.js';
import { createGuards, guardSees, stepGuards } from './guards.js';

export const EVENT_PICKUP = 1;
export const EVENT_DIAMOND = 2;
export const EVENT_FUSE = 4;
export const EVENT_TOSS = 8;
export const EVENT_LAND = 16;
export const EVENT_TRIPPED = 32;
export const EVENT_STOOD_DOWN = 64;
export const EVENT_CAUGHT = 128;
export const EVENT_WIN = 256;
export const EVENT_DAWN = 512;

function inExit(thief) {
  return thief.x > EXIT_ZONE.x && thief.x < EXIT_ZONE.x + EXIT_ZONE.w
    && thief.y > EXIT_ZONE.y && thief.y < EXIT_ZONE.y + EXIT_ZONE.h;
}

export function createHeist(random) {
  const rng = random || (() => 0);
  const state = {
    thief: createThief(),
    guards: createGuards(rng),
    cameras: createCameras(rng),
    alarm: createAlarm(),
    statuettes: STATUETTES.map((s) => ({ ...s, taken: false })),
    diamondTaken: false,
    elapsed: 0,
    timeLeft: TIME_LIMIT,
    phase: 'play',
    seenRate: 0,
    fuseUses: 0,
    score: { diamond: 0, statuettes: 0, timeBonus: 0, ghostBonus: 0, total: 0 },
    objective: 'Steal the Sunburst Diamond',
  };

  function reset() {
    state.thief = createThief();
    state.guards = createGuards(rng);
    state.cameras = createCameras(rng);
    state.alarm = createAlarm();
    state.statuettes = STATUETTES.map((s) => ({ ...s, taken: false }));
    state.diamondTaken = false;
    state.elapsed = 0;
    state.timeLeft = TIME_LIMIT;
    state.phase = 'play';
    state.seenRate = 0;
    state.fuseUses = 0;
    state.score = { diamond: 0, statuettes: 0, timeBonus: 0, ghostBonus: 0, total: 0 };
    state.objective = 'Steal the Sunburst Diamond';
  }

  function finishScore() {
    const taken = state.statuettes.filter((s) => s.taken).length;
    const timeBonus = Math.max(0, SCORE.timeBonusMax - Math.max(0, state.elapsed - SCORE.timeBonusAfter));
    const ghostBonus = state.alarm.peaked ? 0 : SCORE.ghostBonus;
    state.score = {
      diamond: SCORE.diamond,
      statuettes: taken * SCORE.statuette,
      timeBonus: Math.round(timeBonus),
      ghostBonus,
      total: SCORE.diamond + taken * SCORE.statuette + Math.round(timeBonus) + ghostBonus,
    };
  }

  /**
   * One fixed step. `input` is {move, sneak, toss, interact}; with
   * `attract` set, only the guards walk — the title screen's backdrop.
   */
  function step(dt, input) {
    let events = 0;
    if (state.phase !== 'play') return events;
    if (input.attract) {
      stepGuards(state.guards, dt, state.thief, false, null);
      stepCameras(state.cameras, dt, state.elapsed);
      state.elapsed += dt;
      return events;
    }
    state.elapsed += dt;
    state.timeLeft = TIME_LIMIT - state.elapsed;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.phase = 'dawn';
      return EVENT_DAWN;
    }

    const coinsBefore = state.thief.coins;
    const landing = stepThief(state.thief, dt, input.move, input.sneak, input.toss);
    if (state.thief.coins < coinsBefore) events |= EVENT_TOSS;
    if (landing !== null) events |= EVENT_LAND;

    if (input.interact) {
      const thief = state.thief;
      if (!state.diamondTaken && Math.hypot(DIAMOND.x - thief.x, DIAMOND.y - thief.y) < THIEF.grabRange) {
        state.diamondTaken = true;
        state.objective = 'Get to the exit!';
        state.alarm.value = Math.min(ALARM.max, state.alarm.value + ALARM.diamondSpike);
        events |= EVENT_DIAMOND;
      } else {
        let took = false;
        for (let i = 0; i < state.statuettes.length; i += 1) {
          const s = state.statuettes[i];
          if (!s.taken && Math.hypot(s.x - thief.x, s.y - thief.y) < THIEF.grabRange) {
            s.taken = true;
            took = true;
            break;
          }
        }
        if (took) events |= EVENT_PICKUP;
        else if (Math.hypot(FUSE_BOX.x - thief.x, FUSE_BOX.y - thief.y) < THIEF.fuseRange) {
          sabotageCameras(state.cameras, CAMERA.darkSeconds);
          state.fuseUses += 1;
          events |= EVENT_FUSE;
        }
      }
    }

    let seenRate = 0;
    for (let i = 0; i < state.guards.length; i += 1) {
      seenRate += guardSees(state.guards[i], state.thief, state.thief.sneaking);
    }
    for (let i = 0; i < state.cameras.length; i += 1) {
      seenRate += cameraSees(state.cameras[i], state.thief, state.thief.sneaking);
    }
    state.seenRate = seenRate;
    const alarmEvent = stepAlarm(state.alarm, dt, seenRate);
    if (alarmEvent === 'tripped') events |= EVENT_TRIPPED;
    else if (alarmEvent === 'stood-down') events |= EVENT_STOOD_DOWN;

    stepCameras(state.cameras, dt, state.elapsed);
    const caught = stepGuards(state.guards, dt, state.thief, state.alarm.tripped, landing);
    if (caught) {
      state.phase = 'busted';
      return events | EVENT_CAUGHT;
    }
    if (state.diamondTaken && inExit(state.thief)) {
      state.phase = 'won';
      finishScore();
      return events | EVENT_WIN;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
