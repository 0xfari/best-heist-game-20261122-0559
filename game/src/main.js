// Boot and the one loop: input is read every frame, the heist advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between six screens: title,
// play, paused, won, busted and dawn.
//
// ?seed=N fixes the gallery's shuffle. ?shot=start|play|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './rng.js';
import { createHeist, EVENT_CAUGHT, EVENT_DAWN, EVENT_DIAMOND, EVENT_FUSE, EVENT_LAND, EVENT_PICKUP, EVENT_STOOD_DOWN, EVENT_TOSS, EVENT_TRIPPED, EVENT_WIN } from './heist.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_DAWN, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

// Any uncaught error is collected where a screenshot run can read it back.
window.__errors = [];
window.addEventListener('error', (event) => {
  window.__errors.push(String(event.message || event.error || 'error'));
});
const heist = createHeist(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, heist);
  let painted = 0;
  function paint() {
    renderer.draw(heist.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let tickTimer = 0;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each event.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    heist.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Steal the Sunburst Diamond, then get to the exit.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WON : heist.state.phase === 'dawn' ? SCREEN_DAWN : SCREEN_BUSTED;
    if (won && heist.state.score.total > best) {
      best = heist.state.score.total;
      saveBest(best);
    }
    announce(won ? `Clean getaway. Score ${heist.state.score.total}.` : 'Caught. The diamond stays in its case.');
  }

  function handleEvents(events) {
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_DIAMOND) {
      audio.diamond();
      announce('The diamond is yours. Get to the exit!');
    }
    if (events & EVENT_FUSE) {
      audio.fuse();
      announce('Cameras dark for twelve seconds.');
    }
    if (events & EVENT_TOSS) announce('Coin tossed.');
    if (events & EVENT_LAND) audio.clink();
    if (events & EVENT_TRIPPED) {
      audio.startSiren();
      announce('Alarm! The guards are coming for you.');
    }
    if (events & EVENT_STOOD_DOWN) {
      audio.stopSiren();
      announce('The alarm stands down. The guards go back to their rounds.');
    }
    if (events & EVENT_WIN) {
      audio.stopSiren();
      audio.win();
      endGame(true);
    } else if (events & (EVENT_CAUGHT | EVENT_DAWN)) {
      audio.stopSiren();
      audio.caught();
      endGame(false);
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      heist.step(STEP, { move: { x: 0, y: 0 }, sneak: false, toss: null, interact: false, attract: true });
      return;
    }
    const pointer = input.takePointer();
    let toss = null;
    if (pointer !== null && screen === SCREEN_PLAY) {
      toss = renderer.toField(pointer.x, pointer.y);
    }
    const events = heist.step(STEP, {
      move: input.move(),
      sneak: input.sneak(),
      toss,
      interact: input.takeInteract(),
      attract: false,
    });
    if (heist.state.seenRate > 0) {
      tickTimer -= STEP;
      if (tickTimer <= 0) {
        audio.tick(Math.min(1, heist.state.seenRate / 60));
        tickTimer = 0.35;
      }
    }
    handleEvents(events);
  }

  function handleActions() {
    const actions = input.takeActions();
    const pointer = input.takePointer();
    const confirm = (actions & ACTION_CONFIRM) !== 0 || pointer !== null;
    if (confirm && (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_BUSTED || screen === SCREEN_DAWN)) {
      audio.unlock();
      startGame();
    } else if ((actions & ACTION_PAUSE) !== 0 && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if ((actions & (ACTION_PAUSE | ACTION_CONFIRM)) !== 0 && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // A click during play is a coin toss, not a start: handleActions takes
    // the pointer only when a panel is showing.
    if (screen !== SCREEN_PLAY) handleActions();
    else {
      const actions = input.takeActions();
      if ((actions & ACTION_PAUSE) !== 0) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(heist.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Velvet Vault. Press Space or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
