import { Easing, withDelay, withSequence, withTiming } from '../src';
import type { AnimationObject } from '../src/commonTypes';
import {
  advanceNativeLeaf,
  relateToLiveLeaf,
} from '../src/layoutReanimation/nativeLeaves';

jest.mock('../src/featureFlags', () => ({
  ...jest.requireActual('../src/featureFlags'),
  getStaticFeatureFlag: (name: string) =>
    name === 'IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION',
}));

function onUIRuntime<T>(create: () => T): AnimationObject {
  const runtimeKind = globalThis.__RUNTIME_KIND;
  globalThis.__RUNTIME_KIND = 2;
  try {
    return create() as AnimationObject;
  } finally {
    globalThis.__RUNTIME_KIND = runtimeKind;
  }
}

const ORIGIN = 1000;
const START = 20;
const END = 120;
const DURATION = 400;
const timing = (toValue = END, duration = DURATION) =>
  withTiming(toValue, { duration, easing: Easing.linear });

/** The value of the native track: the delays, then a linear move. */
function trackValue(delaysMs: number[], now: number) {
  const delay = delaysMs.reduce((sum, each) => sum + Math.max(0, each), 0);
  const progress = Math.min(1, Math.max(0, (now - ORIGIN - delay) / DURATION));
  return START + progress * (END - START);
}

function wrapped(delaysMs: number[]) {
  return onUIRuntime(() =>
    [...delaysMs]
      .reverse()
      .reduce<unknown>(
        (animation, delay) => withDelay(delay, animation as number),
        timing()
      )
  );
}

describe('advanceNativeLeaf', () => {
  test.each([
    ['no delay', []],
    ['one delay', [100]],
    ['two delays', [100, 60]],
    ['a negative delay between two delays', [100, -500, 60]],
    ['a delay of zero', [0]],
  ])('%s: the leaf has the value of its track at each time', (_, delaysMs) => {
    for (const elapsed of [0, 50, 100, 130, 160, 200, 400, 559, 560, 900]) {
      const leaf = wrapped(delaysMs);
      advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + elapsed);
      expect(leaf.current).toBeCloseTo(
        trackValue(delaysMs, ORIGIN + elapsed),
        6
      );
    }
  });

  test('a second advance of one leaf gives the value of the later time', () => {
    const leaf = wrapped([100]);
    advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + 150);
    advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + 300);
    expect(leaf.current).toBeCloseTo(trackValue([100], ORIGIN + 300), 6);
  });

  test('a leaf whose timeline is over is finished and keeps its end value', () => {
    const leaf = wrapped([100]);
    advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + 600);
    expect(leaf.finished).toBe(true);
    advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + 700);
    expect(leaf.current).toBe(END);
  });

  test('a timing leaf keeps the start time and the start value of its track', () => {
    const leaf = onUIRuntime(() => timing());
    advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + 100);
    expect(leaf.startTime).toBe(ORIGIN);
    expect(leaf.startValue).toBe(START);
  });
});

describe('advanceNativeLeaf against a run of frames', () => {
  const delayed = (delayMs: number) =>
    onUIRuntime(() =>
      withDelay(delayMs, withTiming(END, { duration: DURATION }))
    );

  /** The leaf as the frame driver leaves it: one step for each frame. */
  function runFrames(leaf: AnimationObject, frameMs: number, elapsed: number) {
    leaf.onStart(leaf, START, ORIGIN, undefined);
    for (let now = ORIGIN + frameMs; now <= ORIGIN + elapsed; now += frameMs) {
      if (leaf.onFrame(leaf, now)) {
        break;
      }
    }
    return leaf.current as number;
  }

  test.each([40, 100, 140, 300, 500, 600])(
    'at %i ms a delayed leaf with the default easing has the value of frames that meet the end of the delay',
    (elapsed) => {
      const leaf = delayed(100);
      advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + elapsed);
      expect(leaf.current).toBeCloseTo(runFrames(delayed(100), 10, elapsed), 6);
    }
  );

  test('with frames that do not meet the end of the delay, the frame-driven leaf is late by less than one frame', () => {
    const FRAME = 1000 / 60;
    const curve = Easing.inOut(Easing.quad);
    for (let frame = 1; frame * FRAME < 600; frame++) {
      const elapsed = frame * FRAME;
      const leaf = delayed(100);
      advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + elapsed);
      const expected =
        START +
        (END - START) *
          curve(Math.min(1, Math.max(0, (elapsed - 100) / DURATION)));
      expect(leaf.current).toBeCloseTo(expected, 6);

      const lateBy =
        START +
        (END - START) *
          curve(Math.min(1, Math.max(0, (elapsed - 100 - FRAME) / DURATION)));
      const frameDriven = runFrames(delayed(100), FRAME, elapsed + 0.001);
      expect(frameDriven).toBeGreaterThanOrEqual(lateBy - 1e-6);
      expect(frameDriven).toBeLessThanOrEqual(expected + 1e-6);
    }
  });
});

describe('advanceNativeLeaf of a sequence against a run of frames', () => {
  type Phase = { delay?: number; duration: number; toValue: number };
  const part = ({ delay, duration, toValue }: Phase) => {
    const animation = timing(toValue, duration);
    return delay === undefined ? animation : withDelay(delay, animation);
  };
  const sequenceOf = (phases: Phase[], delay?: number) => () => {
    const sequence = withSequence(...phases.map(part));
    return delay === undefined ? sequence : withDelay(delay, sequence);
  };
  /** The end of each hold and of each timing, from the start of the leaf. */
  const boundariesOf = (phases: Phase[], delay = 0) => {
    const boundaries = delay > 0 ? [delay] : [];
    let time = delay;
    for (const phase of phases) {
      if (phase.delay !== undefined) {
        boundaries.push((time += phase.delay));
      }
      boundaries.push((time += phase.duration));
    }
    return boundaries;
  };
  /**
   * The declared value: each part is a straight line from the end of the part
   * before it.
   */
  const declaredValue = (phases: Phase[], delay: number, elapsed: number) => {
    let time = delay;
    let value = START;
    for (const phase of phases) {
      const start = time + (phase.delay ?? 0);
      if (elapsed < start + phase.duration) {
        const progress = Math.max(0, elapsed - start) / phase.duration;
        return value + (phase.toValue - value) * progress;
      }
      time = start + phase.duration;
      value = phase.toValue;
    }
    return value;
  };
  /**
   * The leaf as the frame driver leaves it, with a frame at each boundary and
   * at `elapsed`.
   */
  const runFrames = (
    leaf: AnimationObject,
    boundaries: number[],
    elapsed: number
  ) => {
    const frames = [
      ...boundaries.filter((boundary) => boundary < elapsed),
      elapsed,
    ];
    leaf.onStart(leaf, START, ORIGIN, undefined);
    const finished = frames.some((frame) => leaf.onFrame(leaf, ORIGIN + frame));
    return { value: leaf.current as number, finished };
  };
  const two = [
    { duration: 200, toValue: 120 },
    { duration: 310, toValue: 60 },
  ];
  const three = [...two, { duration: 130, toValue: 90 }];
  const five = [
    ...three,
    { duration: 225, toValue: 10 },
    { duration: 55, toValue: END },
  ];
  const withDelayedPart = [
    two[0],
    { delay: 70, duration: 310, toValue: 60 },
    { duration: 130, toValue: 90 },
  ];

  test.each<[string, Phase[], number | undefined]>([
    ['two parts', two, undefined],
    ['three parts', three, undefined],
    ['five parts', five, undefined],
    ['a delayed part', withDelayedPart, undefined],
    ['three parts in a delay', three, 90],
    ['a delayed part in a delay', withDelayedPart, 90],
  ])(
    '%s: the leaf has the declared value and the state of the frame driver in each phase and around each boundary',
    (_, phases, delay) => {
      const boundaries = boundariesOf(phases, delay);
      const middles = boundaries.map(
        (boundary, index) => (boundary + (boundaries[index - 1] ?? 0)) / 2
      );
      const around = boundaries.flatMap((boundary) => [
        boundary - 1,
        boundary,
        boundary + 1,
      ]);
      for (const elapsed of [0, ...middles, ...around]) {
        const leaf = onUIRuntime(sequenceOf(phases, delay));
        advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + elapsed);
        const frameDriven = runFrames(
          onUIRuntime(sequenceOf(phases, delay)),
          boundaries,
          elapsed
        );
        expect(leaf.current).toBe(frameDriven.value);
        expect(!!leaf.finished).toBe(frameDriven.finished);
        expect(leaf.current).toBeCloseTo(
          declaredValue(phases, delay ?? 0, elapsed),
          9
        );
      }
    }
  );

  test('the frame driver continues a leaf after its advance as it continues its own run', () => {
    const boundaries = boundariesOf(five);
    for (const handOver of [100, 199, 200, 201, 400, 640, 700, 866]) {
      const leaf = onUIRuntime(sequenceOf(five));
      advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + handOver);
      const twin = onUIRuntime(sequenceOf(five));
      runFrames(twin, boundaries, handOver);
      for (let elapsed = handOver + 16; elapsed < 1000; elapsed += 16) {
        const finished = leaf.onFrame(leaf, ORIGIN + elapsed);
        expect(twin.onFrame(twin, ORIGIN + elapsed)).toBe(finished);
        expect(leaf.current).toBe(twin.current);
        if (finished) {
          break;
        }
      }
      expect(leaf.current).toBe(END);
    }
  });

  test.each<[string, Phase[]]>([
    ['other end values', three],
    [
      'the end value of the first part',
      [...two, { duration: 130, toValue: 120 }],
    ],
  ])(
    'a second advance of a sequence whose last part has %s gives the value of the later time',
    (_, phases) => {
      for (const [first, second] of [
        [100, 300],
        [300, 600],
        [600, 620],
        [600, 700],
      ]) {
        const leaf = onUIRuntime(sequenceOf(phases));
        advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + first);
        advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + second);
        expect(leaf.current).toBeCloseTo(declaredValue(phases, 0, second), 9);
      }
    }
  );
});

describe('the frame driver and a phase with no duration', () => {
  const FRAMES = [0, 16, 32, 100, 116, 132, 200, 216];
  const valuesOf = (create: () => unknown) => {
    const leaf = onUIRuntime(create);
    leaf.onStart(leaf, START, ORIGIN, undefined);
    const values: Record<number, number> = {};
    for (const frame of FRAMES) {
      const finished = leaf.onFrame(leaf, ORIGIN + frame);
      values[frame] = leaf.current as number;
      if (finished) {
        break;
      }
    }
    return values;
  };

  test('a first phase with no duration shows its value in the first frame, and the next part starts at the origin', () => {
    expect(
      valuesOf(() => withSequence(timing(50, 0), timing(100, 100)))
    ).toEqual({ 0: 50, 16: 58, 32: 66, 100: 100 });
  });

  test('a first phase with no duration before a delayed part shows its value during the hold, and the part starts in the frame that ends the hold', () => {
    const create = () =>
      withSequence(timing(50, 0), withDelay(100, timing(100, 100)));
    expect(valuesOf(create)).toEqual({
      0: 50,
      16: 50,
      32: 50,
      100: 50,
      116: 58,
      132: 66,
      200: 100,
    });
    for (const elapsed of [0, 50, 99, 100, 101, 150, 200]) {
      const leaf = onUIRuntime(create);
      advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + elapsed);
      expect(leaf.current).toBeCloseTo(
        50 + Math.max(0, Math.min(100, elapsed - 100)) / 2,
        9
      );
    }
  });

  test('a timing with no duration after a delay shows its value in the frame that ends the delay', () => {
    expect(valuesOf(() => withDelay(100, timing(50, 0)))).toEqual({
      0: START,
      16: START,
      32: START,
      100: 50,
    });
  });

  test('a later phase with no duration shows its value one frame after the end of the part before it, and the next part starts in that frame', () => {
    const values = valuesOf(() =>
      withSequence(timing(120, 100), timing(50, 0), timing(90, 100))
    );
    expect(values).toMatchObject({ 100: 120, 116: 50, 200: 83.6, 216: 90 });
    expect(
      valuesOf(() => withSequence(timing(120, 100), timing(50, 0)))
    ).toMatchObject({ 100: 120, 116: 50 });
  });

  test('a delay of zero as a later part starts its animation one frame after the end of the part before it', () => {
    expect(
      valuesOf(() =>
        withSequence(timing(120, 100), withDelay(0, timing(20, 100)))
      )
    ).toMatchObject({ 100: 120, 116: 120, 132: 104, 216: 20 });
  });
});

describe('relateToLiveLeaf', () => {
  const live = (leaf: AnimationObject, elapsed = 100) => {
    advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + elapsed);
    return leaf;
  };
  const bare = () => onUIRuntime(() => timing());

  test('an absent leaf continues a timing and needs the frame driver for a delay', () => {
    expect(relateToLiveLeaf(live(bare()), undefined)).toBe('continues');
    expect(relateToLiveLeaf(live(wrapped([50])), undefined)).toBe(
      'frameDriver'
    );
  });

  test('a timing with another end value replaces the live leaf', () => {
    expect(
      relateToLiveLeaf(
        live(bare()),
        onUIRuntime(() => timing(END + 1))
      )
    ).toBe('replaces');
    expect(relateToLiveLeaf(live(wrapped([50])), bare())).toBe('replaces');
  });

  test('a timing with the same end value continues only with the same duration and easing', () => {
    expect(relateToLiveLeaf(live(bare()), bare())).toBe('continues');
    expect(
      relateToLiveLeaf(
        live(bare()),
        onUIRuntime(() => timing(END, DURATION / 2))
      )
    ).toBe('frameDriver');
    expect(
      relateToLiveLeaf(
        live(bare()),
        onUIRuntime(() =>
          withTiming(END, { duration: DURATION, easing: Easing.ease })
        )
      )
    ).toBe('frameDriver');
    expect(
      relateToLiveLeaf(
        live(
          onUIRuntime(() =>
            withTiming(END, {
              duration: DURATION,
              easing: Easing.bezier(0.1, 0.2, 0.3, 0.4),
            })
          )
        ),
        onUIRuntime(() =>
          withTiming(END, {
            duration: DURATION,
            easing: Easing.bezier(0.1, 0.2, 0.3, 0.4),
          })
        )
      )
    ).toBe('continues');
  });

  test('a timing with the same end value and an easing function continues only with the same function', () => {
    const withEasing = (easing?: (time: number) => number) =>
      onUIRuntime(() =>
        withTiming(END, { duration: DURATION, ...(easing && { easing }) })
      );
    const shared = Easing.out(Easing.quad);
    expect(relateToLiveLeaf(live(withEasing()), withEasing())).toBe(
      'continues'
    );
    expect(relateToLiveLeaf(live(withEasing(shared)), withEasing(shared))).toBe(
      'continues'
    );
    expect(
      relateToLiveLeaf(
        live(withEasing(shared)),
        withEasing(Easing.out(Easing.quad))
      )
    ).toBe('frameDriver');
    expect(relateToLiveLeaf(live(withEasing(shared)), bare())).toBe(
      'frameDriver'
    );
  });

  test('a timing with the same end value replaces a live leaf whose timeline is over', () => {
    expect(relateToLiveLeaf(live(bare(), 2 * DURATION), bare())).toBe(
      'replaces'
    );
  });

  test('a constant leaf over a live constant leaf continues it before its end and replaces it after its end', () => {
    const constantLive = (elapsed: number) => {
      const leaf = onUIRuntime(() => timing());
      advanceNativeLeaf(leaf, END, ORIGIN, ORIGIN + elapsed);
      return leaf;
    };
    const started = constantLive(100);
    expect(started.current).toBe(END);
    expect(relateToLiveLeaf(started, bare())).toBe('continues');

    const finished = constantLive(2 * DURATION);
    expect(finished.finished).toBe(true);
    expect(relateToLiveLeaf(finished, bare())).toBe('replaces');
  });

  test('a delayed leaf needs the frame driver', () => {
    expect(relateToLiveLeaf(live(bare()), wrapped([50]))).toBe('frameDriver');
  });

  describe('a leaf with more than one timing phase', () => {
    const sequence = (end = END) =>
      onUIRuntime(() => withSequence(timing(60, 200), timing(end, 200)));

    test.each<
      [string, () => AnimationObject, () => AnimationObject | undefined]
    >([
      ['a live sequence and no new leaf', sequence, () => undefined],
      ['a live sequence and a timing with the same end value', sequence, bare],
      [
        'a live sequence and a timing with another end value',
        sequence,
        () => onUIRuntime(() => timing(END + 1)),
      ],
      ['a live sequence and the same sequence', sequence, sequence],
      ['a live sequence and a delayed timing', sequence, () => wrapped([50])],
      ['a live timing and a sequence', bare, sequence],
      [
        'a live timing and a delayed sequence',
        bare,
        () =>
          onUIRuntime(() =>
            withDelay(50, withSequence(timing(60, 200), timing(END, 200)))
          ),
      ],
      ['a live delayed timing and a sequence', () => wrapped([50]), sequence],
      ['a live sequence whose timeline is over and a timing', sequence, bare],
    ])('%s need the frame driver', (name, liveLeaf, next) => {
      const elapsed = name.includes('is over') ? 1000 : 100;
      expect(relateToLiveLeaf(live(liveLeaf(), elapsed), next())).toBe(
        'frameDriver'
      );
    });

    test('a sequence of one timing has the relations of that timing', () => {
      const single = () => onUIRuntime(() => withSequence(timing()));
      expect(relateToLiveLeaf(live(bare()), single())).toBe('frameDriver');
      expect(relateToLiveLeaf(live(single()), undefined)).toBe('frameDriver');
      expect(relateToLiveLeaf(live(single()), bare())).toBe('replaces');
    });
  });
});
