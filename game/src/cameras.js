// The wall cameras: each one sweeps its arc back and forth, unblinking. A
// sabotaged camera stays dark for a while, then comes back on its own.

import { CAMERA } from './config.js';
import { CAMERA_MOUNTS } from './room.js';
import { inCone } from './sight.js';

export function createCameras(random) {
  const jitter = random || (() => 0);
  return CAMERA_MOUNTS.map((mount) => ({
    x: mount.x,
    y: mount.y,
    from: mount.from,
    to: mount.to,
    period: mount.period,
    angle: (mount.from + mount.to) / 2,
    phase: jitter() * mount.period,
    dark: 0,
  }));
}

/** Sweep each camera along its arc; count sabotage timers down. */
export function stepCameras(cameras, dt, elapsed) {
  for (let i = 0; i < cameras.length; i += 1) {
    const camera = cameras[i];
    if (camera.dark > 0) camera.dark = Math.max(0, camera.dark - dt);
    const mid = (camera.from + camera.to) / 2;
    const half = (camera.to - camera.from) / 2;
    camera.angle = mid + Math.sin(((elapsed + camera.phase) / camera.period) * Math.PI * 2) * half;
  }
}

/** Detection rate this camera contributes right now, per second. */
export function cameraSees(camera, thief, sneaking) {
  if (camera.dark > 0) return 0;
  if (!inCone(camera.x, camera.y, camera.angle, CAMERA.range, CAMERA.halfAngle, thief.x, thief.y)) return 0;
  return sneaking ? CAMERA.detectRate * CAMERA.sneakSeen : CAMERA.detectRate;
}

/** Switch every camera off for `seconds` (the fuse box). */
export function sabotageCameras(cameras, seconds) {
  for (let i = 0; i < cameras.length; i += 1) cameras[i].dark = seconds;
}
