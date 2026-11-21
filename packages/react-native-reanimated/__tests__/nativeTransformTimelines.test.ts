import {
  BounceIn,
  Easing,
  Keyframe,
  withDelay,
  withSequence,
  withTiming,
  ZoomInRotate,
} from '../src';
import type {
  AnimationObject,
  LayoutAnimation,
  NativeLeafSegment,
  NativeLeafTrack,
  NativeOperationTimeline,
} from '../src/commonTypes';
import type { TransformOperationLeaf } from '../src/layoutReanimation/nativeLeaves';
import {
  advanceNativeLeaf,
  currentOfNativeLeaf,
  phaseEndsOf,
  relateToLiveLeaf,
  summarizeNativeLeaf,
} from '../src/layoutReanimation/nativeLeaves';

jest.mock('../src/featureFlags', () => ({
  ...jest.requireActual('../src/featureFlags'),
  getStaticFeatureFlag: (name: string) =>
    name === 'IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION',
}));

type Operations = Record<string, unknown>[];
type Form = { initial: Operations; animations: () => Operations };
type TransformTrack = Extract<NativeLeafTrack, { kind: 'transform' }>;

const ORIGIN = 1000;
const DEGREE = Math.PI / 180;

function onUIRuntime<T>(create: () => T): T {
  const runtimeKind = globalThis.__RUNTIME_KIND;
  globalThis.__RUNTIME_KIND = 2;
  try {
    return create();
  } finally {
    globalThis.__RUNTIME_KIND = runtimeKind;
  }
}

const leafOf = ({ animations }: Form) =>
  onUIRuntime(animations) as TransformOperationLeaf[];

/** The forms are on a view of 100 x 60 pt. */
const LEVER = Math.hypot(100, 60) / 2;

function trackOf(form: Form): TransformTrack {
  const { track } = summarizeNativeLeaf(
    'transform',
    form.initial,
    leafOf(form),
    {
      fits: new WeakMap(),
      lever: LEVER,
    }
  );
  expect(track?.kind).toBe('transform');
  return track as TransformTrack;
}

/** The form of the `transform` leaf of an animation of a builder. */
function formOf(builder: { build: () => unknown }): Form {
  const VALUES = {
    targetOriginX: 30,
    targetOriginY: 60,
    targetWidth: 100,
    targetHeight: 60,
    targetGlobalOriginX: 30,
    targetGlobalOriginY: 60,
    currentOriginX: 30,
    currentOriginY: 60,
    currentWidth: 100,
    currentHeight: 60,
    currentGlobalOriginX: 30,
    currentGlobalOriginY: 60,
    windowWidth: 400,
    windowHeight: 800,
  };
  const build = builder.build() as (values: typeof VALUES) => LayoutAnimation;
  const transformOf = (values: unknown) =>
    (values as { transform: Operations }).transform;
  return {
    initial: transformOf(onUIRuntime(() => build(VALUES)).initialValues),
    animations: () => transformOf(build(VALUES).animations),
  };
}

const timing = (
  toValue: number | string,
  duration: number,
  easing: unknown = Easing.linear
) =>
  withTiming(
    toValue,
    easing === 'default' ? { duration } : { duration, easing: easing as never }
  );

/**
 * The end offset and the end value of a segment, then the second and the fourth
 * control point of a segment that has control points. The first and the third
 * are 1 / 3 and 2 / 3.
 */
type RecordedSegment =
  | [endOffset: number, endValue: number]
  | [endOffset: number, endValue: number, control1: number, control2: number];

const EASE_IN = [0, 1 / 3] as const;
const EASE_OUT = [2 / 3, 1] as const;

/**
 * The fit of `Easing.bounce` with the tolerance 0.001, recorded from the
 * lowering of the transform leaf with one phase list: the end offset, the end
 * progress, and the two control values of each piece.
 */
const BOUNCE_PIECES: [number, number, number, number][] = [
  [0.25, 0.47265625, 3.914836009697521e-17, 0.3333333333333332],
  [0.3125, 0.738525390625, 0.29629629629629284, 0.6296296296296329],
  [0.34375, 0.89361572265625, 0.3174603174603201, 0.6507936507936469],
  [0.359375, 0.9766998291015625, 0.3259259259259148, 0.6592592592592695],
  [0.36328125, 0.9980478286743164, 0.3315315315314917, 0.6648648648649065],
  [0.365234375, 0.9956247806549071, -1.476335727639134, 0.6706353110955757],
  [0.3671875, 0.9903297424316405, 0.3351494139013621, 0.6684827472345067],
  [0.375, 0.9697265624999999, 0.34080108621862665, 0.6741344195519079],
  [0.5, 0.765625, 0.5263157894736834, 0.8596491228070173],
  [0.625, 0.7978515625, -0.8888888888888935, -0.5555555555555464],
  [0.6875, 0.9025878906250001, 0.23931623931624507, 0.5726495726495674],
  [0.71875, 0.9771118164062501, 0.3003003003002953, 0.6336336336336376],
  [0.7265625, 0.9980506896972657, 0.32598530394119635, 0.659318637274565],
  [0.73046875, 0.995682716369629, -1.5062424486507788, 0.6829104577796927],
  [0.734375, 0.9906158447265626, 0.34092477570745744, 0.6742581090406593],
  [0.75, 0.97265625, 0.3676012461059394, 0.7009345794392233],
  [0.875, 0.9619140625, 4, 4.3333333333333295],
  [0.90625, 0.9961547851562499, 0.2614379084967318, 0.5947712418300727],
  [0.9140625, 0.9967689514160156, 12.008281573496854, 1.608695652173803],
  [0.921875, 0.9924468994140625, 0.36893203883495146, 0.7022653721682762],
  [0.9375, 0.986572265625, 0.4380952380952318, 0.7714285714285715],
  [1, 1, -0.4, -0.0666666666666639],
];

describe('the timelines of forms with equal phase lists', () => {
  const rounded = (value: number) => Math.round(value * 1e9) / 1e9 + 0;
  const expectTimeline = (
    { start, segments }: NativeOperationTimeline,
    recordedStart: number,
    recorded: RecordedSegment[]
  ) => {
    expect(start).toBeCloseTo(recordedStart, 12);
    expect(segments).toHaveLength(recorded.length);
    segments.forEach(({ endOffset, endValue, cubicBezier }, index) => {
      const [offset, value, control1, control2] = recorded[index];
      expect(endOffset).toBeCloseTo(offset, 12);
      expect(endValue).toBeCloseTo(value, 12);
      expect(cubicBezier?.map(rounded)).toEqual(
        control1 === undefined
          ? undefined
          : [1 / 3, control1, 2 / 3, control2!].map(rounded)
      );
    });
  };

  test('BounceIn: one operation with the two pieces of the default easing for each of its 4 parts', () => {
    const track = trackOf(formOf(new BounceIn()));
    expect(track).toMatchObject({ delayMs: 0, durationMs: 600 });
    expect(track.operations.map(({ kind }) => kind)).toEqual(['scale']);
    expectTimeline(track.operations[0], 0, [
      [0.275, 0.6, ...EASE_IN],
      [0.55, 1.2, ...EASE_OUT],
      [0.625, 1.05, ...EASE_IN],
      [0.7, 0.9, ...EASE_OUT],
      [0.775, 1, ...EASE_IN],
      [0.85, 1.1, ...EASE_OUT],
      [0.925, 1.05, ...EASE_IN],
      [1, 1, ...EASE_OUT],
    ]);
  });

  test('ZoomInRotate: each operation has the two pieces of the default easing', () => {
    const { operations } = trackOf(formOf(new ZoomInRotate()));
    expect(operations.map(({ kind }) => kind)).toEqual(['scale', 'rotate']);
    expectTimeline(operations[0], 0, [
      [0.5, 0.5, ...EASE_IN],
      [1, 1, ...EASE_OUT],
    ]);
    expectTimeline(operations[1], 0.3, [
      [0.5, 0.15, ...EASE_IN],
      [1, 0, ...EASE_OUT],
    ]);
  });

  test('a rotation and a translation with Easing.bounce: each has the 22 recorded pieces of the function', () => {
    const { operations } = trackOf({
      initial: [{ rotate: '0deg' }, { translateX: 0 }],
      animations: () => [
        { rotate: timing('90deg', 400, Easing.bounce) },
        { translateX: timing(100, 400, Easing.bounce) },
      ],
    });
    const recordedOver = (change: number) =>
      BOUNCE_PIECES.map(
        ([endOffset, endProgress, control1, control2]): RecordedSegment => [
          endOffset,
          change * endProgress,
          control1,
          control2,
        ]
      );
    expect(operations.map(({ kind }) => kind)).toEqual([
      'rotate',
      'translateX',
    ]);
    expectTimeline(operations[0], 0, recordedOver(Math.PI / 2));
    expectTimeline(operations[1], 0, recordedOver(100));
  });

  test('a sequence with a hold on two operations: each has the hold as a segment that keeps its value', () => {
    const sequence = (first: number, last: number) =>
      withSequence(
        timing(first, 200, 'default'),
        withDelay(140, timing(last, 300, 'default'))
      );
    const { operations, durationMs } = trackOf({
      initial: [{ translateY: 0 }, { scale: 1 }],
      animations: () => [
        { translateY: sequence(-40, 0) },
        { scale: sequence(1.3, 1) },
      ],
    });
    expect(durationMs).toBe(640);
    expectTimeline(operations[0], 0, [
      [0.15625, -20, ...EASE_IN],
      [0.3125, -40, ...EASE_OUT],
      [0.53125, -40],
      [0.765625, -20, ...EASE_IN],
      [1, 0, ...EASE_OUT],
    ]);
    expectTimeline(operations[1], 1, [
      [0.15625, 1.15, ...EASE_IN],
      [0.3125, 1.3, ...EASE_OUT],
      [0.53125, 1.3],
      [0.765625, 1.15, ...EASE_IN],
      [1, 1, ...EASE_OUT],
    ]);
  });

  test('a keyframe with the same points for its operations: one linear segment for each point', () => {
    const { operations, durationMs } = trackOf(
      formOf(
        new Keyframe({
          0: { transform: [{ scale: 0 }, { rotate: '0deg' }] },
          50: { transform: [{ scale: 1.2 }, { rotate: '45deg' }] },
          100: { transform: [{ scale: 1 }, { rotate: '90deg' }] },
        } as ConstructorParameters<typeof Keyframe>[0])
      )
    );
    expect(durationMs).toBe(500);
    expectTimeline(operations[0], 0, [
      [0.5, 1.2],
      [1, 1],
    ]);
    expectTimeline(operations[1], 0, [
      [0.5, Math.PI / 4],
      [1, Math.PI / 2],
    ]);
  });
});

type Matrix = number[];

const IDENTITY: Matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const TRANSLATION_CELLS = [12, 13, 14];

/** The matrix of one operation, as React Native makes it. */
function matrixOf(kind: string, value: number): Matrix {
  const matrix = [...IDENTITY];
  const cos = Math.cos(value);
  const sin = Math.sin(value);
  switch (kind) {
    case 'translateX':
      matrix[12] = value;
      break;
    case 'translateY':
      matrix[13] = value;
      break;
    case 'scale':
      matrix[0] = matrix[5] = value;
      break;
    case 'scaleX':
      matrix[0] = value;
      break;
    case 'scaleY':
      matrix[5] = value;
      break;
    case 'rotate':
    case 'rotateZ':
      [matrix[0], matrix[1], matrix[4], matrix[5]] = [cos, sin, -sin, cos];
      break;
    case 'rotateX':
      [matrix[5], matrix[6], matrix[9], matrix[10]] = [cos, sin, -sin, cos];
      break;
    case 'rotateY':
      [matrix[0], matrix[2], matrix[8], matrix[10]] = [cos, -sin, sin, cos];
      break;
    case 'perspective':
      matrix[11] = -1 / value;
      break;
  }
  return matrix;
}

/** Cells are in the order of columns. */
function multiply(first: Matrix, second: Matrix): Matrix {
  const product = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      for (let index = 0; index < 4; index++) {
        product[column * 4 + row] +=
          first[index * 4 + row] * second[column * 4 + index];
      }
    }
  }
  return product;
}

/** The product of the operations in the order of the style array. */
const productOf = (operations: { kind: string; value: number }[]) =>
  operations.reduce(
    (matrix, { kind, value }) => multiply(matrix, matrixOf(kind, value)),
    IDENTITY
  );

const bezierAt = (parameter: number, first: number, second: number) =>
  3 * (1 - parameter) ** 2 * parameter * first +
  3 * (1 - parameter) * parameter ** 2 * second +
  parameter ** 3;

/** The progress of a segment at a part of its time: the exact cubic Bezier. */
function progressOf({ cubicBezier }: NativeLeafSegment, time: number) {
  if (!cubicBezier) {
    return time;
  }
  const [x1, y1, x2, y2] = cubicBezier;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 80; step++) {
    const middle = (low + high) / 2;
    if (bezierAt(middle, x1, x2) < time) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return bezierAt((low + high) / 2, y1, y2);
}

/** The scalar of a timeline at a part of the duration of its track. */
function scalarAt({ start, segments }: NativeOperationTimeline, time: number) {
  let offset = 0;
  let value = start;
  for (const segment of segments) {
    if (time <= segment.endOffset) {
      const part = (time - offset) / (segment.endOffset - offset);
      return value + (segment.endValue - value) * progressOf(segment, part);
    }
    offset = segment.endOffset;
    value = segment.endValue;
  }
  return value;
}

const radiansOf = (value: unknown) =>
  typeof value === 'string'
    ? parseFloat(value) * (value.endsWith('deg') ? DEGREE : 1)
    : (value as number);

/**
 * The scalars of the operations as the frame driver gives them at a time: a
 * frame at each phase end before the time, then a frame at the time.
 */
function frameDrivenScalars(form: Form, phaseEnds: number[], elapsed: number) {
  return leafOf(form).map((operation, index) => {
    const [kind] = Object.keys(operation);
    const animation = operation[kind] as unknown;
    if (typeof animation !== 'object') {
      return { kind, value: radiansOf(animation) };
    }
    const leaf = animation as AnimationObject;
    leaf.onStart(leaf, form.initial[index][kind] as number, ORIGIN, null);
    [...phaseEnds.filter((phaseEnd) => phaseEnd < elapsed), elapsed].some(
      (frame) => leaf.onFrame(leaf, ORIGIN + frame)
    );
    return { kind, value: radiansOf(leaf.current) };
  });
}

function largestDifferences(form: Form, phaseEnds: number[]) {
  const { delayMs, durationMs, operations } = trackOf(form);
  const largest = { cells: 0, translation: 0 };
  for (let index = 0; index <= 100; index++) {
    const elapsed = ((delayMs + durationMs) * index) / 100;
    const time = Math.min(1, Math.max(0, (elapsed - delayMs) / durationMs));
    const lowered = productOf(
      operations.map((timeline) => ({
        kind: timeline.kind,
        value: scalarAt(timeline, time),
      }))
    );
    const frameDriven = productOf(frameDrivenScalars(form, phaseEnds, elapsed));
    lowered.forEach((cell, cellIndex) => {
      const key = TRANSLATION_CELLS.includes(cellIndex)
        ? 'translation'
        : 'cells';
      largest[key] = Math.max(
        largest[key],
        Math.abs(cell - frameDriven[cellIndex])
      );
    });
  }
  return largest;
}

describe('the ordered product of the timelines against the frame driver', () => {
  const DEFAULT = 'default';
  const turn = (from: string, to: string, duration = 400, easing?: unknown) =>
    [
      { rotate: from },
      () => ({ rotate: timing(to, duration, easing) }),
    ] as const;
  const move = (
    kind: string,
    from: number,
    to: number,
    duration = 400,
    easing?: unknown
  ) =>
    [
      { [kind]: from },
      () => ({ [kind]: timing(to, duration, easing) }),
    ] as const;
  const formWith = (
    ...operations: (readonly [
      Record<string, unknown>,
      () => Record<string, unknown>,
    ])[]
  ): Form => ({
    initial: operations.map(([initial]) => initial),
    animations: () => operations.map(([, animation]) => animation()),
  });

  /** Easings with an exact form in cubic pieces. */
  const exact: [string, Form, number[]][] = [
    [
      'a rotation, then a translation',
      formWith(turn('0deg', '90deg'), move('translateX', 0, 100)),
      [],
    ],
    [
      'a translation, then a rotation',
      formWith(move('translateX', 0, 100), turn('0deg', '90deg')),
      [],
    ],
    [
      'a scale, then a translation',
      formWith(move('scale', 0.5, 1.5), move('translateX', 0, 100)),
      [],
    ],
    [
      'a translation, then a scale',
      formWith(move('translateX', 0, 100), move('scale', 0.5, 1.5)),
      [],
    ],
    [
      'a perspective, a rotation about X, and a translation with the default easing',
      formWith(
        move('perspective', 500, 500, 300, DEFAULT),
        [
          { rotateX: '90deg' },
          () => ({ rotateX: timing('0deg', 300, DEFAULT) }),
        ],
        move('translateY', -60, 0, 300, DEFAULT)
      ),
      [],
    ],
    [
      'two rotations with two durations',
      formWith(turn('0deg', '90deg'), turn('10deg', '-30deg', 250, DEFAULT)),
      [],
    ],
    [
      'two translations around a rotation',
      formWith(
        move('translateX', 0, 50),
        [{ rotate: 0 }, () => ({ rotate: timing(1, 400) })],
        move('translateX', 0, -80, 200)
      ),
      [],
    ],
    [
      'a rotation of 720 degrees with the default easing and a shorter translation',
      formWith(
        turn('0deg', '720deg', 1000, DEFAULT),
        move('translateX', 0, 200, 600)
      ),
      [],
    ],
    [
      'a rotation with a delay beside a translation',
      formWith(move('translateX', 0, 100, 1000), [
        { rotate: '0deg' },
        () => ({ rotate: withDelay(300, timing('90deg', 500)) }),
      ]),
      [300],
    ],
    [
      'a hold between two moves of one operation while another operation moves',
      formWith(
        [
          { translateY: 0 },
          () => ({
            translateY: withSequence(
              timing(-40, 300),
              withDelay(200, timing(0, 300))
            ),
          }),
        ],
        turn('0deg', '90deg', 1000)
      ),
      [300, 500],
    ],
    [
      'three operations with three durations',
      formWith(
        move('translateX', 0, 80, 1000, DEFAULT),
        move('scale', 0.5, 1.2, 600),
        turn('0deg', '60deg', 350)
      ),
      [],
    ],
    [
      'control points on one operation and the default easing on another',
      formWith(
        move('translateX', 0, 100, 1000, Easing.bezier(0.3, 0, 0.7, 1)),
        turn('0deg', '90deg', 700, DEFAULT)
      ),
      [],
    ],
  ];
  test.each(exact)(
    '%s: the product is the product of the frame driver at 101 times',
    (_, form, phaseEnds) => {
      const { cells, translation } = largestDifferences(form, phaseEnds);
      expect(cells).toBeLessThan(1e-6);
      expect(translation).toBeLessThan(1e-4);
    }
  );

  /** The fit of an easing function has the tolerance of its operation. */
  const fitted: [string, Form][] = [
    [
      'Easing.bounce on a rotation and on a translation',
      formWith(
        turn('0deg', '90deg', 400, Easing.bounce),
        move('translateX', 0, 100, 400, Easing.bounce)
      ),
    ],
    [
      'Easing.bounce on four operations',
      formWith(
        move('translateX', 0, 100, 400, Easing.bounce),
        move('translateY', 0, 40, 400, Easing.bounce),
        move('scale', 0.5, 1, 400, Easing.bounce),
        turn('0deg', '90deg', 400, Easing.bounce)
      ),
    ],
    [
      'Easing.bounce on a rotation and the default easing on a shorter translation',
      formWith(
        turn('0deg', '90deg', 1000, Easing.bounce),
        move('translateX', 0, 100, 600, DEFAULT)
      ),
    ],
    [
      'Easing.bounce on a translation of 393 pt beside a short rotation',
      formWith(
        move('translateX', 393, 0, 1000, Easing.bounce),
        turn('0deg', '30deg', 200)
      ),
    ],
    [
      'Easing.sin on a rotation beside control points on a translation',
      formWith(
        move('translateX', 0, 100, 1000, Easing.bezier(0.3, 0, 0.7, 1)),
        turn('0deg', '90deg', 700, Easing.sin)
      ),
    ],
  ];
  test.each(fitted)(
    '%s: the product is no more than 0.001 in a cell and 0.25 pt in a translation from the product of the frame driver at 101 times',
    (_, form) => {
      const { cells, translation } = largestDifferences(form, []);
      expect(cells).toBeLessThan(0.001);
      expect(translation).toBeLessThan(0.25);
    }
  );
});

describe('a live leaf whose operations have two timelines', () => {
  const form = (rotateEnd = 2, translateEnd = 100): Form => ({
    initial: [{ rotate: 0 }, { translateX: 0 }],
    animations: () => [
      { rotate: timing(rotateEnd, 400) },
      { translateX: timing(translateEnd, 200) },
    ],
  });
  const liveAt = (elapsed: number) => {
    const leaf = leafOf(form());
    advanceNativeLeaf(leaf, form().initial, ORIGIN, ORIGIN + elapsed);
    return leaf;
  };

  test('the capture has each operation on its own timeline', () => {
    expect(currentOfNativeLeaf(liveAt(100))).toEqual([
      { rotate: 0.5 },
      { translateX: 50 },
    ]);
    expect(currentOfNativeLeaf(liveAt(300))).toEqual([
      { rotate: 1.5 },
      { translateX: 100 },
    ]);
  });

  test('the same end values and timings continue the leaf while each operation moves', () => {
    expect(relateToLiveLeaf(liveAt(100), leafOf(form()))).toBe('continues');
    expect(relateToLiveLeaf(liveAt(100), undefined)).toBe('continues');
  });

  test('the same end values after the end of the shorter operation need the frame driver', () => {
    expect(relateToLiveLeaf(liveAt(300), leafOf(form()))).toBe('frameDriver');
  });

  test('other end values replace the leaf, also after the end of the shorter operation', () => {
    expect(relateToLiveLeaf(liveAt(100), leafOf(form(1, 50)))).toBe('replaces');
    expect(relateToLiveLeaf(liveAt(300), leafOf(form(1, 50)))).toBe('replaces');
  });

  test('one other end value needs the frame driver while each operation moves', () => {
    expect(relateToLiveLeaf(liveAt(100), leafOf(form(2, 50)))).toBe(
      'frameDriver'
    );
  });

  test('the phase ends of a leaf are the phase ends of each operation', () => {
    const leaf = onUIRuntime(() => [
      { rotate: withDelay(300, timing(1, 500)) },
      { translateY: withSequence(timing(-40, 200), timing(0, 300)) },
    ]) as unknown as TransformOperationLeaf[];
    expect(phaseEndsOf([leaf])).toEqual([200, 300]);
  });
});
