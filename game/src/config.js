// The Velvet Vault — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Seconds on the clock before dawn breaks the job. */
export const TIME_LIMIT = 240;

export const THIEF = {
  radius: 14,
  walkSpeed: 210,
  sneakSpeed: 128,
  /** How much slower a guard's eyes fill while the thief sneaks. */
  sneakSeen: 0.45,
  grabRange: 48,
  fuseRange: 56,
};

export const COIN = {
  count: 3,
  /** How far a tossed coin flies in the air. */
  flightTime: 0.45,
  /** Guards inside this radius of the landing spot come to look. */
  hearRadius: 250,
  investigateSeconds: 4,
};

export const GUARD = {
  count: 3,
  radius: 15,
  patrolSpeed: 72,
  investigateSpeed: 110,
  chaseSpeed: 158,
  /** How far a guard can see, in pixels. */
  viewRange: 235,
  /** Half-angle of a guard's vision cone, in radians. */
  viewHalfAngle: 0.55,
  /** Detection fills per second at point-blank range; falls off with distance. */
  detectNear: 95,
  detectFar: 26,
  /** A guard that gets this close while the alarm is up has caught the thief. */
  catchRadius: 30,
};

export const CAMERA = {
  count: 2,
  range: 285,
  halfAngle: 0.3,
  /** Detection fills per second while the thief stands in a camera cone. */
  detectRate: 46,
  sneakSeen: 0.7,
  /** Seconds a sabotaged camera stays dark. */
  darkSeconds: 12,
};

export const ALARM = {
  max: 100,
  /** Alarm points added the moment the diamond leaves its case. */
  diamondSpike: 40,
  /** Alarm points a grabbed statuette adds (they are quiet). */
  statuetteSpike: 0,
  /** Alarm decay per second while nobody sees the thief. */
  decay: 12,
  /** Alarm decay per second during a full alarm while the thief is unseen. */
  alarmDecay: 7,
  /** The alarm trips at max and stands down below this. */
  standDown: 50,
};

export const SCORE = {
  diamond: 1000,
  statuette: 200,
  timeBonusMax: 300,
  timeBonusAfter: 60,
  ghostBonus: 150,
};

export const PALETTE = {
  backdrop: '#0b0e1a',
  floor: '#171b2e',
  floorLine: '#20263f',
  carpet: '#4a1c26',
  carpetEdge: '#6e2a35',
  wall: '#2c3247',
  wallTrim: '#c9a227',
  caseBase: '#232842',
  caseGlass: '#3d4a6b',
  caseGlint: '#7d8fc4',
  exitGlow: '#35d0ba',
  thief: '#35d0ba',
  thiefDark: '#1e7a6e',
  guard: '#c7ccd8',
  guardDark: '#5d6577',
  cone: 'rgba(242, 180, 60, 0.22)',
  coneEdge: 'rgba(242, 180, 60, 0.55)',
  cameraCone: 'rgba(229, 83, 75, 0.20)',
  cameraConeEdge: 'rgba(229, 83, 75, 0.55)',
  cameraBody: '#e5534b',
  cameraDark: '#5d1a16',
  diamond: '#8fe8ff',
  diamondCore: '#ffffff',
  gold: '#f2c94c',
  goldDark: '#a8842a',
  alarmLow: '#35d0ba',
  alarmMid: '#f2b43c',
  alarmHigh: '#e5534b',
  panel: '#1d2236',
  panelEdge: '#3a4260',
  text: '#eef1f5',
  muted: '#9aa2b5',
  shadow: 'rgba(0, 0, 0, 0.45)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'velvet-vault.best';
