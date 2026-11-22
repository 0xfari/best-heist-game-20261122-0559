// The alarm meter: it fills while anyone sees the thief, drains while nobody
// does, trips at the top, and stands down once it has drained far enough.

import { ALARM } from './config.js';

export function createAlarm() {
  return { value: 0, tripped: false, peaked: false };
}

/**
 * One step. `seenRate` is the detection pouring in per second (0 when the
 * thief is unseen). Returns 'tripped' the moment the alarm goes off, or
 * 'stood-down' the moment it stands down, else null.
 */
export function stepAlarm(alarm, dt, seenRate) {
  if (seenRate > 0) {
    alarm.value = Math.min(ALARM.max, alarm.value + seenRate * dt);
  } else {
    const drain = alarm.tripped ? ALARM.alarmDecay : ALARM.decay;
    alarm.value = Math.max(0, alarm.value - drain * dt);
  }
  if (!alarm.tripped && alarm.value >= ALARM.max) {
    alarm.tripped = true;
    alarm.peaked = true;
    return 'tripped';
  }
  if (alarm.tripped && alarm.value <= ALARM.standDown) {
    alarm.tripped = false;
    return 'stood-down';
  }
  return null;
}
