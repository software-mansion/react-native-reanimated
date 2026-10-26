import { ReduceMotion, withSpring } from '../src';
import type { SpringConfig } from '../src/animation/spring/springConfigs';
import {
  GentleSpringConfig,
  GentleSpringConfigWithDuration,
} from '../src/animation/spring/springConfigs';
import type {
  ResolvableSpringConfig,
  ResolvedSpring,
} from '../src/animation/spring/springUtils';
import {
  springSettleTime,
  springStartOf,
  springStateAt,
} from '../src/animation/spring/springUtils';

type SpringObject = {
  onStart: (
    animation: SpringObject,
    value: number,
    now: number,
    previousAnimation: undefined
  ) => void;
  onFrame: (animation: SpringObject, now: number) => boolean;
  current: number;
  velocity: number;
  zeta: number;
  omega0: number;
  omega1: number;
  initialEnergy: number;
};

type Row = {
  id: string;
  from: number;
  to: number;
  config: SpringConfig;
  afterStart: Omit<ResolvedSpring, 'clampRaisesZeta'> & {
    velocity: number;
    initialEnergy: number;
  };
};

const START_MS = 10000;
const FRAME_RATES_HZ = [60, 120];
const MAX_FRAMES = 120 * 60;
const LONGEST_SETTLE_TIME_MS = 120000;

// The values that `onStart` wrote before the change (grid-v1 of Objective 13).
const ROWS: Row[] = [
  {
    id: 'default-0-100',
    from: 0,
    to: 100,
    config: {},
    afterStart: {
      zeta: 1,
      omega0: 15,
      omega1: 0,
      stiffness: 900,
      velocity: 0,
      initialEnergy: 4500000,
    },
  },
  {
    id: 'ud-z0.1-k400',
    from: 0,
    to: 100,
    config: { stiffness: 400, mass: 1, damping: 4 },
    afterStart: {
      zeta: 0.1,
      omega0: 20,
      omega1: 19.8997487421324,
      stiffness: 400,
      velocity: 0,
      initialEnergy: 2000000,
    },
  },
  {
    id: 'ud-z0.3-k1500',
    from: 0,
    to: 100,
    config: { stiffness: 1500, mass: 1, damping: 23.2379000772445 },
    afterStart: {
      zeta: 0.3,
      omega0: 38.72983346207417,
      omega1: 36.945906403822335,
      stiffness: 1500,
      velocity: 0,
      initialEnergy: 7500000,
    },
  },
  {
    id: 'cr-z1-k400',
    from: 0,
    to: 100,
    config: { stiffness: 400, mass: 1, damping: 40 },
    afterStart: {
      zeta: 1,
      omega0: 20,
      omega1: 0,
      stiffness: 400,
      velocity: 0,
      initialEnergy: 2000000,
    },
  },
  {
    id: 'od-z3-k100',
    from: 0,
    to: 100,
    config: { stiffness: 100, mass: 1, damping: 60 },
    afterStart: {
      zeta: 3,
      omega0: 10,
      omega1: 0,
      stiffness: 100,
      velocity: 0,
      initialEnergy: 500000,
    },
  },
  {
    id: 'od-stiffness200-only',
    from: 0,
    to: 100,
    config: { stiffness: 200 },
    afterStart: {
      zeta: 2.1213203435596424,
      omega0: 7.0710678118654755,
      omega1: 0,
      stiffness: 200,
      velocity: 0,
      initialEnergy: 1000000,
    },
  },
  {
    id: 'vel-U-rel+2',
    from: 0,
    to: 100,
    config: { stiffness: 400, mass: 1, damping: 12, velocity: 200 },
    afterStart: {
      zeta: 0.3,
      omega0: 20,
      omega1: 19.078784028338912,
      stiffness: 400,
      velocity: 200,
      initialEnergy: 2020000,
    },
  },
  {
    id: 'vel-U-abs-500',
    from: 0,
    to: 100,
    config: { stiffness: 400, mass: 1, damping: 12, velocity: -500 },
    afterStart: {
      zeta: 0.3,
      omega0: 20,
      omega1: 19.078784028338912,
      stiffness: 400,
      velocity: 0,
      initialEnergy: 2125000,
    },
  },
  {
    id: 'vel-U-down-abs-500',
    from: 100,
    to: 0,
    config: { stiffness: 400, mass: 1, damping: 12, velocity: -500 },
    afterStart: {
      zeta: 0.3,
      omega0: 20,
      omega1: 19.078784028338912,
      stiffness: 400,
      velocity: -500,
      initialEnergy: 2125000,
    },
  },
  {
    id: 'range-U-opacity-1-0.7',
    from: 1,
    to: 0.7,
    config: { stiffness: 400, mass: 1, damping: 12 },
    afterStart: {
      zeta: 0.3,
      omega0: 20,
      omega1: 19.078784028338912,
      stiffness: 400,
      velocity: 0,
      initialEnergy: 18.000000000000004,
    },
  },
  {
    id: 'range-D-pt-m50-50',
    from: -50,
    to: 50,
    config: {},
    afterStart: {
      zeta: 1,
      omega0: 15,
      omega1: 0,
      stiffness: 900,
      velocity: 0,
      initialEnergy: 4500000,
    },
  },
  {
    id: 'osc-z0.3-k400',
    from: 0,
    to: 100,
    config: { stiffness: 400, mass: 1, damping: 12, overshootClamping: true },
    afterStart: {
      zeta: 0.3,
      omega0: 20,
      omega1: 19.078784028338912,
      stiffness: 400,
      velocity: 0,
      initialEnergy: 2000000,
    },
  },
  {
    id: 'osc-snappy-preset',
    from: 0,
    to: 100,
    config: { damping: 110, mass: 4, stiffness: 900, overshootClamping: true },
    afterStart: {
      zeta: 0.9166666666666666,
      omega0: 15,
      omega1: 5.994789404140901,
      stiffness: 900,
      velocity: 0,
      initialEnergy: 4500000,
    },
  },
  {
    id: 'dur-300-dr0.3',
    from: 0,
    to: 100,
    config: { duration: 300, dampingRatio: 0.3 },
    afterStart: {
      zeta: 0.3,
      omega0: 44.721359549995796,
      omega1: 42.661458015403085,
      stiffness: 8000,
      velocity: 0,
      initialEnergy: 40000000,
    },
  },
  {
    id: 'dur-1200-dr0.7',
    from: 0,
    to: 100,
    config: { duration: 1200, dampingRatio: 0.7 },
    afterStart: {
      zeta: 0.7,
      omega0: 9.700564527306517,
      omega1: 6.9275887288221085,
      stiffness: 376.40380859375,
      velocity: 0,
      initialEnergy: 1882019.04296875,
    },
  },
  {
    id: 'dur-600-dr1',
    from: 0,
    to: 100,
    config: { duration: 600, dampingRatio: 1 },
    afterStart: {
      zeta: 1,
      omega0: 13.742007620340631,
      omega1: 0,
      stiffness: 755.37109375,
      velocity: 0,
      initialEnergy: 3776855.46875,
    },
  },
  {
    id: 'thr-U-0.01',
    from: 0,
    to: 100,
    config: { stiffness: 400, mass: 1, damping: 12, energyThreshold: 0.01 },
    afterStart: {
      zeta: 0.3,
      omega0: 20,
      omega1: 19.078784028338912,
      stiffness: 400,
      velocity: 0,
      initialEnergy: 2000000,
    },
  },
  {
    id: 'clamp-dur-min98-max110',
    from: 0,
    to: 100,
    config: { duration: 600, dampingRatio: 0.3, clamp: { min: 98, max: 110 } },
    afterStart: {
      zeta: 0.7329355988794277,
      omega0: 44.71590006641933,
      omega1: 42.65625,
      stiffness: 7998.046875,
      velocity: 0,
      initialEnergy: 39990234.375,
    },
  },
  {
    id: 'clamp-phys-min95',
    from: 0,
    to: 100,
    config: { stiffness: 400, mass: 1, damping: 12, clamp: { min: 95 } },
    afterStart: {
      zeta: 0.47678559951603966,
      omega0: 20,
      omega1: 19.078784028338912,
      stiffness: 400,
      velocity: 0,
      initialEnergy: 2000000,
    },
  },
  {
    id: 'zero-U-v200',
    from: 0,
    to: 0,
    config: { stiffness: 400, mass: 1, damping: 12, velocity: 200 },
    afterStart: {
      zeta: 0.3,
      omega0: 20,
      omega1: 19.078784028338912,
      stiffness: 400,
      velocity: 200,
      initialEnergy: 20000,
    },
  },
];

function resolvableConfigOf(config: SpringConfig): ResolvableSpringConfig {
  const definedFields = Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined)
  );
  return {
    ...GentleSpringConfig,
    ...GentleSpringConfigWithDuration,
    overshootClamping: false,
    energyThreshold: 6e-9,
    velocity: 0,
    clamp: undefined,
    useDuration: !!(config.duration || config.dampingRatio),
    skipAnimation: false,
    ...definedFields,
  };
}

function resolve({ from, to, config }: Pick<Row, 'from' | 'to' | 'config'>) {
  const resolvable = resolvableConfigOf(config);
  return springStartOf(resolvable, to, from, resolvable.velocity);
}

function settleTimeOf(row: Pick<Row, 'from' | 'to' | 'config'>) {
  return springSettleTime(
    resolvableConfigOf(row.config),
    resolve(row),
    LONGEST_SETTLE_TIME_MS
  );
}

function startSpring({
  from,
  to,
  config,
}: Pick<Row, 'from' | 'to' | 'config'>): SpringObject {
  const spring = withSpring(to, {
    ...config,
    reduceMotion: ReduceMotion.Never,
  }) as unknown as SpringObject;
  spring.onStart(spring, from, START_MS, undefined);
  return spring;
}

function frameTimeMs(frame: number, frameRateHz: number) {
  return (frame * 1000) / frameRateHz;
}

function endFrameOf(
  row: Pick<Row, 'from' | 'to' | 'config'>,
  frameRateHz: number
) {
  const spring = startSpring(row);
  let frame = 0;
  while (
    frame < MAX_FRAMES &&
    !spring.onFrame(spring, START_MS + frameTimeMs(frame, frameRateHz))
  ) {
    frame++;
  }
  return frame;
}

function frameRunStateAt(row: Row, frameRateHz: number, timeMs: number) {
  const spring = startSpring(row);
  let frame = 0;
  for (; frameTimeMs(frame, frameRateHz) <= timeMs; frame++) {
    spring.onFrame(spring, START_MS + frameTimeMs(frame, frameRateHz));
  }
  if (frameTimeMs(frame - 1, frameRateHz) < timeMs) {
    spring.onFrame(spring, START_MS + timeMs);
  }
  return { position: spring.current, velocity: spring.velocity };
}

function expectRelativelyClose(
  actual: number,
  expected: number,
  tolerance: number
) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    tolerance * Math.abs(expected)
  );
}

// Measured: the energy goes above the threshold again from 82.654 ms to 89.204 ms.
const CLAMP_WITH_ENERGY_RISE = {
  from: 0,
  to: 100,
  config: {
    duration: 300,
    dampingRatio: 0.1,
    mass: 5,
    clamp: { max: 108.1 },
    energyThreshold: 0.00648,
  },
};

const ROWS_AT_FRAME_RATES = ROWS.filter(({ from, to }) => from !== to).flatMap(
  (row) => FRAME_RATES_HZ.map((frameRateHz) => ({ ...row, frameRateHz }))
);

describe('spring resolution', () => {
  test.each(ROWS)('$id: springStartOf equals the values of onStart', (row) => {
    const { resolved, v0, initialEnergy: startEnergy } = resolve(row);
    const spring = startSpring(row);
    const { velocity, initialEnergy, ...expectedResolved } = row.afterStart;

    expect(resolved).toMatchObject(expectedResolved);
    expect(v0).toBe(velocity);
    expect(startEnergy).toBe(initialEnergy);
    expect({
      zeta: spring.zeta,
      omega0: spring.omega0,
      omega1: spring.omega1,
      velocity: spring.velocity,
      initialEnergy: spring.initialEnergy,
    }).toStrictEqual({
      zeta: resolved.zeta,
      omega0: resolved.omega0,
      omega1: resolved.omega1,
      velocity,
      initialEnergy,
    });
  });

  test.each(ROWS_AT_FRAME_RATES)(
    '$id at $frameRateHz Hz: the end frame is the first frame at or after the settle time',
    ({ frameRateHz, ...row }) => {
      const settleTimeMs = settleTimeOf(row);
      const endFrame = endFrameOf(row, frameRateHz);

      expect(frameTimeMs(endFrame, frameRateHz)).toBeGreaterThanOrEqual(
        settleTimeMs
      );
      expect(frameTimeMs(endFrame - 1, frameRateHz)).toBeLessThan(settleTimeMs);
    }
  );

  test.each(ROWS_AT_FRAME_RATES)(
    '$id at $frameRateHz Hz: springStateAt equals the frame run at 40 % of the settle time',
    ({ frameRateHz, ...row }) => {
      const { resolved, x0, v0 } = resolve(row);
      const timeMs = 0.4 * settleTimeOf(row);
      const { displacement, velocity } = springStateAt(
        resolved,
        x0,
        v0,
        timeMs / 1000
      );
      const frameRun = frameRunStateAt(row, frameRateHz, timeMs);

      expectRelativelyClose(frameRun.position, row.to + displacement, 1e-9);
      expectRelativelyClose(frameRun.velocity, velocity, 1e-6);
    }
  );

  test.each([
    { id: 'no clamp', config: { stiffness: 400, mass: 1, damping: 12 } },
    {
      id: 'a clamp that the motion does not reach',
      config: {
        stiffness: 400,
        mass: 1,
        damping: 12,
        clamp: { min: 50, max: 150 },
      },
    },
  ])('$id: clampRaisesZeta is false', ({ config }) => {
    const { resolved } = resolve({ from: 0, to: 100, config });

    expect(resolved.zeta).toBe(0.3);
    expect(resolved.clampRaisesZeta).toBe(false);
  });

  test('a clamp that raises zeta sets clampRaisesZeta', () => {
    const row = ROWS.find(({ id }) => id === 'clamp-phys-min95')!;

    expect(resolve(row).resolved.clampRaisesZeta).toBe(true);
  });

  test.each([
    { frameRateHz: 60, firstFrameAfterSettleTime: 5, endFrame: 6 },
    { frameRateHz: 120, firstFrameAfterSettleTime: 10, endFrame: 11 },
  ])(
    'a clamp with an energy rise at $frameRateHz Hz ends after the first frame at or after the settle time',
    ({ frameRateHz, firstFrameAfterSettleTime, endFrame }) => {
      const { resolved } = resolve(CLAMP_WITH_ENERGY_RISE);
      const settleTimeMs = settleTimeOf(CLAMP_WITH_ENERGY_RISE);

      expect(resolved.clampRaisesZeta).toBe(true);
      expect(Math.ceil((settleTimeMs * frameRateHz) / 1000)).toBe(
        firstFrameAfterSettleTime
      );
      expect(endFrameOf(CLAMP_WITH_ENERGY_RISE, frameRateHz)).toBe(endFrame);
    }
  );
});
