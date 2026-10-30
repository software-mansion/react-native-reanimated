// Every letter of the hero label is its own spring following the word.

export type Vector = { x: number; y: number };

export interface FxFrame {
  /** Frame time step in seconds. */
  dt: number;
  /** Label velocity in px/ms. */
  velocity: Vector;
  /** Label center relative to its resting place, in px. */
  center: Vector;
  /** Current text scale, used to convert screen px into the text's space. */
  scale: Vector;
}

export interface LabelFx {
  /** Returns true while the effect still has something to animate. */
  frame(frame: FxFrame): boolean;
  grab(): void;
  bounce(axis: 'x' | 'y', velocity: Vector): void;
}

// Stiffness (1/s^2) of the leading and the trailing letter, blended across the
// word along the direction of travel.
const HEAD_STIFFNESS = 150;
const TAIL_STIFFNESS = 320;
const DAMPING_RATIO = 0.75;

type Letter = { x: number; y: number; vx: number; vy: number; r: number };

// Damped spring step (semi-implicit Euler).
const springStep = (
  value: number,
  velocity: number,
  target: number,
  stiffness: number,
  dt: number
) => {
  const damping = 2 * Math.sqrt(stiffness) * DAMPING_RATIO;
  const acceleration = -stiffness * (value - target) - damping * velocity;
  const nextVelocity = velocity + acceleration * dt;
  return { value: value + nextVelocity * dt, velocity: nextVelocity };
};

const clampTilt = (value: number, limit: number) =>
  Math.max(-limit, Math.min(limit, value));

export function createLetterFx(letters: HTMLElement[]): LabelFx {
  const state: Letter[] = letters.map(() => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 0,
  }));
  let lastCenter: Vector | null = null;
  let direction = 0;

  return {
    frame({ dt, velocity, center, scale }) {
      const delta = lastCenter
        ? {
            x: (center.x - lastCenter.x) / (scale.x || 1),
            y: (center.y - lastCenter.y) / (scale.y || 1),
          }
        : { x: 0, y: 0 };
      lastCenter = { ...center };

      const speed = Math.hypot(velocity.x, velocity.y);
      if (speed > 0.05) direction = velocity.x / speed;
      const count = state.length;

      let moving = false;
      state.forEach((letter, idx) => {
        // Letters stay where they are on screen while the word moves away.
        letter.x -= delta.x;
        letter.y -= delta.y;

        const progress = count > 1 ? idx / (count - 1) : 0.5;
        const lead = ((progress * 2 - 1) * direction + 1) / 2;
        const stiffness =
          TAIL_STIFFNESS + lead * lead * (HEAD_STIFFNESS - TAIL_STIFFNESS);
        const x = springStep(letter.x, letter.vx, 0, stiffness, dt);
        const y = springStep(letter.y, letter.vy, 0, stiffness, dt);
        letter.x = x.value;
        letter.vx = x.velocity;
        letter.y = y.value;
        letter.vy = y.velocity;
        letter.r = clampTilt(letter.vx * -0.03, 35);

        letters[idx].style.transform =
          `translate(${letter.x}px, ${letter.y}px) rotate(${letter.r}deg)`;
        if (
          Math.abs(letter.x) + Math.abs(letter.y) > 0.1 ||
          Math.abs(letter.vx) + Math.abs(letter.vy) > 1
        ) {
          moving = true;
        }
      });
      return moving;
    },
    grab() {
      // A small hop so the grab registers before the word moves.
      state.forEach((letter, idx) => {
        letter.vy -= 140 + (idx % 2) * 70;
      });
    },
    bounce(axis, velocity) {
      const away =
        axis === 'x' ? -Math.sign(velocity.x) : -Math.sign(velocity.y);
      state.forEach((letter, idx) => {
        const along = 250 + Math.random() * 450;
        const across = (Math.random() - 0.5) * 500 * (idx % 2 ? 1 : -1);
        if (axis === 'x') {
          letter.vx += away * along;
          letter.vy += across;
        } else {
          letter.vy += away * along;
          letter.vx += across;
        }
      });
    },
  };
}
