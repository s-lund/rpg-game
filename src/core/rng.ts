export interface Rng {
  d20(): number;
  integer(min: number, max: number): number;
}

export function createDefaultRng(): Rng {
  return {
    d20() {
      return Math.floor(Math.random() * 20) + 1;
    },
    integer(min: number, max: number) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
  };
}

/** Deterministic RNG for tests and scripted scenarios. */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    d20() {
      return Math.floor(next() * 20) + 1;
    },
    integer(min: number, max: number) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
  };
}
