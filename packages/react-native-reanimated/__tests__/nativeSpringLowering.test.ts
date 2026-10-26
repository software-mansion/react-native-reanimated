import type { WithSpringConfig } from '../src';
import { Easing, withDelay, withSpring, withTiming } from '../src';
import { logger } from '../src/common';
import type {
  AnimationObject,
  NativeLeafSegment,
  NativeLeafTrack,
  NativeSpringTiming,
} from '../src/commonTypes';
import {
  SPRING_GATE_MARGIN,
  SPRING_GATES,
  summarizeNativeLeaf,
} from '../src/layoutReanimation/nativeLeaves';

jest.mock('../src/featureFlags', () => ({
  ...jest.requireActual('../src/featureFlags'),
  getStaticFeatureFlag: (name: string) =>
    name === 'IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION',
}));

const FITTING = { fits: new WeakMap(), lever: 100 };
const FRAME_MS = 1000 / 60;

function onUIRuntime<T>(create: () => T): AnimationObject {
  const runtimeKind = globalThis.__RUNTIME_KIND;
  globalThis.__RUNTIME_KIND = 2;
  try {
    return create() as AnimationObject;
  } finally {
    globalThis.__RUNTIME_KIND = runtimeKind;
  }
}

/** The grid has `clamp` beside physics fields, which the public type refuses. */
type Config = Record<string, unknown>;

const springOf = (to: number | string, config: Config) =>
  onUIRuntime(() => withSpring(to, config as WithSpringConfig));

const trackOf = (from: number, to: number, config: Config) =>
  summarizeNativeLeaf('originX', from, springOf(to, config), FITTING).track;

const segmentsOf = (track: NativeLeafTrack | undefined) =>
  track?.kind === 'scalar' ? track.segments : undefined;

const springTimingOf = (track: NativeLeafTrack | undefined) =>
  segmentsOf(track)?.[0]?.spring;

function expectRelative(actual: number, expected: number, tolerance: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    tolerance * Math.abs(expected)
  );
}

/** A physics configuration with this damping ratio and natural frequency. */
const physics = (zeta: number, omega0: number, other: Config = {}) => ({
  stiffness: omega0 ** 2,
  mass: 1,
  damping: 2 * zeta * omega0,
  ...other,
});

describe('the gates of a native spring', () => {
  const PERTURBATION = 1e-6;
  const below = (bound: number) => bound * (1 - PERTURBATION);
  const above = (bound: number) => bound * (1 + PERTURBATION);

  /**
   * The duration of a spring is in inverse ratio to its natural frequency, so
   * the frequency that gives a duration comes from one reference.
   */
  const physicsWithDuration = (
    zeta: number,
    other: Config,
    durationMs: number
  ) => {
    const reference = trackOf(0, 100, physics(zeta, 20, other))!.durationMs;
    return physics(zeta, (20 * reference) / durationMs, other);
  };

  const { zeta, omega0, durationMs, velocityOfChange, energyThreshold } =
    SPRING_GATES;
  test.each<[string, () => Config, boolean]>([
    ['zeta just above its minimum', () => physics(above(zeta.min), 20), true],
    ['zeta just below its minimum', () => physics(below(zeta.min), 20), false],
    ['zeta just below its maximum', () => physics(below(zeta.max), 20), true],
    ['zeta just above its maximum', () => physics(above(zeta.max), 20), false],
    [
      'omega0 just above its minimum',
      () => physics(1, above(omega0.min)),
      true,
    ],
    [
      'omega0 just below its minimum',
      () => physics(1, below(omega0.min)),
      false,
    ],
    [
      'omega0 just below its maximum',
      () => physics(1, below(omega0.max)),
      true,
    ],
    [
      'omega0 just above its maximum',
      () => physics(1, above(omega0.max)),
      false,
    ],
    [
      'the duration just above its minimum',
      () =>
        physicsWithDuration(
          0.11,
          { overshootClamping: true },
          above(durationMs.min)
        ),
      true,
    ],
    [
      'the duration just below its minimum',
      () =>
        physicsWithDuration(
          0.11,
          { overshootClamping: true },
          below(durationMs.min)
        ),
      false,
    ],
    [
      'the duration just below its maximum',
      () => physicsWithDuration(0.11, {}, below(durationMs.max)),
      true,
    ],
    [
      'the duration just above its maximum',
      () => physicsWithDuration(0.11, {}, above(durationMs.max)),
      false,
    ],
    [
      'the velocity of the change at its maximum',
      () => physics(0.3, 20, { velocity: 100 * velocityOfChange.max }),
      true,
    ],
    [
      'the velocity of the change just above its maximum',
      () => physics(0.3, 20, { velocity: 100 * above(velocityOfChange.max) }),
      false,
    ],
    [
      'a velocity away from the target, which plays 0',
      () => physics(0.3, 20, { velocity: -500 }),
      true,
    ],
    [
      'the energy threshold at its minimum',
      () => physics(0.3, 20, { energyThreshold: energyThreshold.min }),
      true,
    ],
    [
      'the energy threshold just below its minimum',
      () => physics(0.3, 20, { energyThreshold: below(energyThreshold.min) }),
      false,
    ],
    [
      'the energy threshold at its maximum',
      () => physics(0.3, 20, { energyThreshold: energyThreshold.max }),
      true,
    ],
    [
      'the energy threshold just above its maximum',
      () => physics(0.3, 20, { energyThreshold: above(energyThreshold.max) }),
      false,
    ],
  ])('%s: has a track is %s', (_, config, hasTrack) => {
    const track = trackOf(0, 100, config());
    expect(track !== undefined).toBe(hasTrack);
    if (track) {
      expect(track.durationMs).toBeGreaterThanOrEqual(durationMs.min);
      expect(track.durationMs).toBeLessThanOrEqual(durationMs.max);
    }
  });

  const outsideInMargin = (bound: number, side: 'below' | 'above') =>
    bound *
    (side === 'below'
      ? 1 - SPRING_GATE_MARGIN / 2
      : 1 + SPRING_GATE_MARGIN / 2);

  test.each<[string, () => Config]>([
    [
      'zeta below its minimum',
      () => physics(outsideInMargin(zeta.min, 'below'), 20),
    ],
    [
      'zeta above its maximum',
      () => physics(outsideInMargin(zeta.max, 'above'), 20),
    ],
    [
      'omega0 below its minimum',
      () => physics(1, outsideInMargin(omega0.min, 'below')),
    ],
    [
      'omega0 above its maximum',
      () => physics(1, outsideInMargin(omega0.max, 'above')),
    ],
    [
      'the duration above its maximum',
      () =>
        physicsWithDuration(0.11, {}, outsideInMargin(durationMs.max, 'above')),
    ],
  ])('%s by half the margin has a track', (_, config) => {
    expect(trackOf(0, 100, config())).toBeDefined();
  });

  test('a duration just inside a bound is that bound', () => {
    const shortest = trackOf(
      0,
      100,
      physicsWithDuration(
        0.11,
        { overshootClamping: true },
        above(durationMs.min)
      )
    )!;
    const longest = trackOf(
      0,
      100,
      physicsWithDuration(0.11, {}, below(durationMs.max))
    )!;
    expectRelative(shortest.durationMs, durationMs.min, 2 * PERTURBATION);
    expectRelative(longest.durationMs, durationMs.max, 2 * PERTURBATION);
  });

  test('a velocity away from the target gives no initial velocity', () => {
    const track = trackOf(0, 100, physics(0.3, 20, { velocity: -500 }));
    expect(springTimingOf(track)?.initialVelocity).toBe(0);
  });

  test.each<[string, Config]>([
    ['a stiffness that is not a number', { stiffness: NaN }],
    ['a natural frequency above the gate', physics(0.3, 1000)],
    [
      'a damping ratio below the gate',
      { stiffness: 2000, mass: 1, damping: 0.1 },
    ],
  ])('%s has no track', (_, config) => {
    expect(trackOf(0, 100, config)).toBeUndefined();
  });
});

describe('the corpus routes', () => {
  // [case, from, to, configuration, duration in ms of a native route]
  const NATIVE: [string, number, number, Config, number][] = [
    ['default-0-100', 0, 100, {}, 824.5206643846669],
    [
      'ud-z0.1-k100',
      0,
      100,
      { stiffness: 100, mass: 1, damping: 2 },
      9426.533638229077,
    ],
    [
      'ud-z0.1-k1500',
      0,
      100,
      { stiffness: 1500, mass: 1, damping: 7.745966692414834 },
      2433.920519555013,
    ],
    [
      'od-z3-k1500',
      0,
      100,
      { stiffness: 1500, mass: 1, damping: 232.379000772445 },
      319.33548017656864,
    ],
    ['od-stiffness200-only', 0, 100, { stiffness: 200 }, 1749.0724590445031],
    [
      'vel-U-abs+500',
      0,
      100,
      { stiffness: 400, mass: 1, damping: 12, velocity: 500 },
      1565.9985909071074,
    ],
    [
      'vel-U-down-abs-500',
      100,
      0,
      { stiffness: 400, mass: 1, damping: 12, velocity: -500 },
      1565.9985909071074,
    ],
    ['vel-D-rel-2', 0, 100, { velocity: -200 }, 823.8838446200444],
    [
      'dist-U-0.1',
      0,
      0.1,
      { stiffness: 400, mass: 1, damping: 12 },
      1578.9525105086761,
    ],
    ['dist-D-1000', 0, 1000, {}, 824.5206643846669],
    [
      'range-U-opacity-1-0.7',
      1,
      0.7,
      { stiffness: 400, mass: 1, damping: 12 },
      1578.9525105086761,
    ],
    [
      'osc-z0.3-k400',
      0,
      100,
      { stiffness: 400, mass: 1, damping: 12, overshootClamping: true },
      98.30233300162942,
    ],
    [
      'osc-snappy-preset',
      0,
      100,
      { damping: 110, mass: 4, stiffness: 900, overshootClamping: true },
      455.4713447287213,
    ],
    [
      'dur-300-dr0.3',
      0,
      100,
      { duration: 300, dampingRatio: 0.3 },
      706.1290293485994,
    ],
    [
      'dur-1200-dr1',
      0,
      100,
      { duration: 1200, dampingRatio: 1 },
      1800.00045225756,
    ],
    [
      'thr-U-0.01',
      0,
      100,
      { stiffness: 400, mass: 1, damping: 12, energyThreshold: 0.01 },
      404.3637073067659,
    ],
    [
      'thr-U-0.0001',
      0,
      100,
      { stiffness: 400, mass: 1, damping: 12, energyThreshold: 0.0001 },
      762.2645817558799,
    ],
  ];
  // [case, from, to, configuration, reason]
  const REFUSED: [string, number, number, Config, string][] = [
    [
      'osc-z1.0-k400-v+5000',
      0,
      100,
      {
        stiffness: 400,
        mass: 1,
        damping: 40,
        overshootClamping: true,
        velocity: 5000,
      },
      'a velocity of 50 changes in 1 s',
    ],
    [
      'osc-z1.0-k400-v+4500',
      0,
      100,
      {
        stiffness: 400,
        mass: 1,
        damping: 40,
        overshootClamping: true,
        velocity: 4500,
      },
      'a velocity of 45 changes in 1 s',
    ],
    [
      'clamp-dur-min95',
      0,
      100,
      { duration: 600, dampingRatio: 0.3, clamp: { min: 95 } },
      'a clamp that raises zeta',
    ],
    [
      'clamp-phys-min98-max110',
      0,
      100,
      { stiffness: 400, mass: 1, damping: 12, clamp: { min: 98, max: 110 } },
      'a clamp that raises zeta',
    ],
    [
      'clamp-dur-min99-max100.5',
      0,
      100,
      { duration: 600, dampingRatio: 0.3, clamp: { min: 99, max: 100.5 } },
      'a clamp that raises zeta to more than 1',
    ],
    [
      'zero-U-v200',
      0,
      0,
      { stiffness: 400, mass: 1, damping: 12, velocity: 200 },
      'no change and a start energy',
    ],
    ['zero-D-v200', 0, 0, { velocity: 200 }, 'no change and a start energy'],
  ];

  test.each(NATIVE)(
    '%s has one spring segment over its settle time',
    (_, from, to, config, durationMs) => {
      const track = trackOf(from, to, config);
      expect(track).toMatchObject({ kind: 'scalar', delayMs: 0 });
      expectRelative(track!.durationMs, durationMs, 1e-9);
      expect(segmentsOf(track)).toEqual([
        { endOffset: 1, endValue: to, spring: expect.any(Object) },
      ]);
    }
  );

  test.each(REFUSED)('%s has no track: %s', (_, from, to, config) => {
    expect(trackOf(from, to, config)).toBeUndefined();
  });

  test('energy thresholds of 1e-4 and 1e-2 at 100 points have a track', () => {
    for (const threshold of [1e-4, 1e-2]) {
      expect(
        trackOf(0, 100, physics(0.3, 20, { energyThreshold: threshold }))
      ).toBeDefined();
    }
  });
});

describe('the segment of a native spring', () => {
  /** The progress of a spring segment at its time `tau`. */
  function progressOf(
    { decay, frequency, initialVelocity }: NativeSpringTiming,
    tau: number
  ) {
    if (tau >= 1) {
      return 1;
    }
    const lift = decay - initialVelocity;
    const rest =
      frequency > 0
        ? Math.cos(frequency * tau) +
          (lift / frequency) * Math.sin(frequency * tau)
        : 1 + lift * tau;
    return 1 - Math.exp(-decay * tau) * rest;
  }

  // [case, from, to, configuration, decay, frequency, initial velocity]
  const CASES: [string, number, number, Config, NativeSpringTiming][] = [
    [
      'ud-z0.3-k400',
      0,
      100,
      { stiffness: 400, mass: 1, damping: 12 },
      {
        decay: 9.473715063052056,
        frequency: 30.124493938998558,
        initialVelocity: 0,
      },
    ],
    [
      'vel-U-abs+500',
      0,
      100,
      { stiffness: 400, mass: 1, damping: 12, velocity: 500 },
      {
        decay: 9.395991545442644,
        frequency: 29.877348904599764,
        initialVelocity: 7.829992954535538,
      },
    ],
    [
      'vel-U-down-abs-500',
      100,
      0,
      { stiffness: 400, mass: 1, damping: 12, velocity: -500 },
      {
        decay: 9.395991545442644,
        frequency: 29.877348904599764,
        initialVelocity: 7.829992954535538,
      },
    ],
    [
      'dur-600-dr0.7',
      0,
      100,
      { duration: 600, dampingRatio: 0.7 },
      {
        decay: 10.00368747199101,
        frequency: 10.205802586104934,
        initialVelocity: 0,
      },
    ],
    [
      'osc-z0.3-k400',
      0,
      100,
      { stiffness: 400, mass: 1, damping: 12, overshootClamping: true },
      {
        decay: 0.5898139980097765,
        frequency: 1.8754889808199406,
        initialVelocity: 0,
      },
    ],
  ];

  test.each(CASES)(
    '%s has the fields of its closed form',
    (_, from, to, config, expected) => {
      const spring = springTimingOf(trackOf(from, to, config))!;
      expectRelative(spring.decay, expected.decay, 1e-9);
      expectRelative(spring.frequency, expected.frequency, 1e-9);
      expect(
        Math.abs(spring.initialVelocity - expected.initialVelocity)
      ).toBeLessThanOrEqual(1e-9 * Math.max(1, expected.initialVelocity));
    }
  );

  test.each(CASES)(
    '%s: the curve of its segment has the values of a 60 Hz frame run',
    (_, from, to, config) => {
      const track = trackOf(from, to, config)!;
      const spring = springOf(to, config);
      spring.onStart(spring, from, 0, undefined);
      for (let frame = 1; frame * FRAME_MS < track.durationMs; frame++) {
        const time = (frame * 1000) / 60;
        spring.onFrame(spring, time);
        const value =
          from +
          (to - from) *
            progressOf(springTimingOf(track)!, time / track.durationMs);
        expect(Math.abs((spring.current as number) - value)).toBeLessThan(
          1e-9 * Math.abs(to - from)
        );
      }
    }
  );
});

describe('a spring that ends in its first frame', () => {
  const jump = (from: number, to: number) =>
    summarizeNativeLeaf(
      'originX',
      from,
      onUIRuntime(() => withTiming(to, { duration: 0, easing: Easing.linear })),
      FITTING
    );

  test.each<[string, number, number, Config]>([
    ['no change and no velocity', 100, 100, {}],
    ['no change and no velocity in duration mode', 100, 100, { duration: 300 }],
    ['a duration of 0', 0, 100, { duration: 0 }],
  ])('%s has the track of a timing of 0 ms', (_, from, to, config) => {
    expect(
      summarizeNativeLeaf('originX', from, springOf(to, config), FITTING)
    ).toEqual(jump(from, to));
    expect(segmentsOf(jump(from, to).track)).toEqual([
      { endOffset: 1, endValue: to },
    ]);
  });

  test('an invalid configuration has the track of a timing of 0 ms', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation();
    try {
      expect(
        summarizeNativeLeaf('originX', 0, springOf(100, { mass: 0 }), FITTING)
      ).toEqual(jump(0, 100));
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test('a delayed spring with no change is a delayed jump', () => {
    const delayed = (create: () => unknown) =>
      summarizeNativeLeaf(
        'originX',
        100,
        onUIRuntime(() => withDelay(80, create() as number)),
        FITTING
      );
    expect(delayed(() => withSpring(100))).toEqual(
      delayed(() => withTiming(100, { duration: 0, easing: Easing.linear }))
    );
    expect(delayed(() => withSpring(100)).track).toMatchObject({
      delayMs: 80,
      durationMs: 0,
    });
  });
});

describe('a clamp of a native spring', () => {
  const UNDERDAMPED = { stiffness: 400, mass: 1, damping: 12 };

  test('a clamp that raises zeta has no track', () => {
    expect(
      trackOf(0, 100, { ...UNDERDAMPED, clamp: { min: 95 } })
    ).toBeUndefined();
  });

  test('a clamp that the motion does not reach has the track of the spring with no clamp', () => {
    const track = trackOf(0, 100, {
      ...UNDERDAMPED,
      clamp: { min: 50, max: 150 },
    });
    expect(track).toBeDefined();
    expect(track).toEqual(trackOf(0, 100, UNDERDAMPED));
  });
});

describe('a delayed native spring', () => {
  test('a delay of a spring is the delay of its track, then one segment', () => {
    const config = { stiffness: 400, mass: 1, damping: 12 };
    const delayed = summarizeNativeLeaf(
      'originX',
      0,
      onUIRuntime(() => withDelay(120, withSpring(100, config))),
      FITTING
    ).track;
    expect(delayed).toEqual({ ...trackOf(0, 100, config), delayMs: 120 });
    expect(segmentsOf(delayed)).toHaveLength(1);
  });
});

describe('springs of a transform leaf', () => {
  const INITIAL = [{ translateX: 0 }, { translateY: 0 }];
  const transformTrackOf = (configs: [Config, Config]) =>
    summarizeNativeLeaf(
      'transform',
      INITIAL,
      [
        { translateX: springOf(10, configs[0]) },
        { translateY: springOf(300, configs[1]) },
      ],
      FITTING
    ).track;
  const segmentsOfOperations = (track: NativeLeafTrack | undefined) =>
    track?.kind === 'transform'
      ? track.operations.map(({ segments }) => segments)
      : undefined;

  test.each<[string, Config]>([
    ['physics mode', { stiffness: 400, mass: 1, damping: 12 }],
    ['duration mode', { duration: 600, dampingRatio: 0.3 }],
  ])(
    'two springs of one configuration in %s with no velocity and no clamp have one duration and one segment each',
    (_, config) => {
      const track = transformTrackOf([config, config]);
      const [translateX, translateY] = segmentsOfOperations(track)!;
      expect(translateX).toHaveLength(1);
      expect(translateY).toHaveLength(1);
      expect(translateX[0].spring).toEqual(translateY[0].spring);
      expect(track?.durationMs).toBe(trackOf(0, 10, config)!.durationMs);
      expect(track?.durationMs).toBe(trackOf(0, 300, config)!.durationMs);
    }
  );

  test('a velocity gives each distance its own duration, so the shorter spring has a hold after it', () => {
    const config = { stiffness: 400, mass: 1, damping: 12, velocity: 40 };
    const [translateX, translateY] = segmentsOfOperations(
      transformTrackOf([config, config])
    )!;
    expect(trackOf(0, 10, config)!.durationMs).not.toBe(
      trackOf(0, 300, config)!.durationMs
    );
    const segmentCounts = [translateX.length, translateY.length].sort();
    expect(segmentCounts).toEqual([1, 2]);
  });

  test('a clamp gives each distance its own resolution: here one spring has no native form, so the leaf has no track', () => {
    const config = {
      stiffness: 400,
      mass: 1,
      damping: 12,
      clamp: { max: 12 },
    };
    expect(trackOf(0, 10, config)).toBeUndefined();
    expect(trackOf(0, 300, config)).toBeDefined();
    expect(transformTrackOf([config, config])).toBeUndefined();
  });

  test('an angle settles in the unit of the frame driver, and only its end value is in radians', () => {
    const config = { velocity: 90 };
    const summary = summarizeNativeLeaf(
      'transform',
      [{ rotate: '0deg' }],
      [{ rotate: springOf('90deg', config) }],
      FITTING
    );
    const scalar = trackOf(0, 90, config)!;
    const segment: NativeLeafSegment = segmentsOf(scalar)![0];
    expect(summary.track).toEqual({
      kind: 'transform',
      delayMs: 0,
      durationMs: scalar.durationMs,
      operations: [
        {
          kind: 'rotate',
          start: 0,
          segments: [{ ...segment, endValue: 90 * (Math.PI / 180) }],
        },
      ],
    });
    expect(segment.spring?.initialVelocity).toBeGreaterThan(0);
  });
});
