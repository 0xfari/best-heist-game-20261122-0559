// A small seeded random number generator (sfc32): the same seed gives the same
// gallery, which is what makes the screenshot scenes repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  let b = (seed ^ 0x9e3779b9) | 0;
  let c = (seed * 2654435761) | 0;
  let counter = 1;
  return function random() {
    const t = (a + b + counter) | 0;
    counter = (counter + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return ((t >>> 0) / 4294967296);
  };
}
