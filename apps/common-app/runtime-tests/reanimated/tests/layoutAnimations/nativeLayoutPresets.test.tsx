import React from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  BaseAnimationBuilder,
  EasingFunction,
  LayoutAnimation,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  BounceIn,
  BounceInDown,
  BounceInLeft,
  BounceInRight,
  BounceInUp,
  BounceOut,
  BounceOutDown,
  BounceOutLeft,
  BounceOutRight,
  BounceOutUp,
  CurvedTransition,
  EntryExitTransition,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutLeft,
  FadeOutRight,
  FadeOutUp,
  FadingTransition,
  FlipInEasyX,
  FlipInEasyY,
  FlipInXDown,
  FlipInXUp,
  FlipInYLeft,
  FlipInYRight,
  FlipOutEasyX,
  FlipOutEasyY,
  FlipOutXDown,
  FlipOutXUp,
  FlipOutYLeft,
  FlipOutYRight,
  JumpingTransition,
  LightSpeedInLeft,
  LightSpeedInRight,
  LightSpeedOutLeft,
  LightSpeedOutRight,
  LinearTransition,
  PinwheelIn,
  PinwheelOut,
  RollInLeft,
  RollInRight,
  RollOutLeft,
  RollOutRight,
  RotateInDownLeft,
  RotateInDownRight,
  RotateInUpLeft,
  RotateInUpRight,
  RotateOutDownLeft,
  RotateOutDownRight,
  RotateOutUpLeft,
  RotateOutUpRight,
  SequencedTransition,
  SlideInDown,
  SlideInLeft,
  SlideInRight,
  SlideInUp,
  SlideOutDown,
  SlideOutLeft,
  SlideOutRight,
  SlideOutUp,
  StretchInX,
  StretchInY,
  StretchOutX,
  StretchOutY,
  ZoomIn,
  ZoomInDown,
  ZoomInEasyDown,
  ZoomInEasyUp,
  ZoomInLeft,
  ZoomInRight,
  ZoomInRotate,
  ZoomInUp,
  ZoomOut,
  ZoomOutDown,
  ZoomOutEasyDown,
  ZoomOutEasyUp,
  ZoomOutLeft,
  ZoomOutRight,
  ZoomOutRotate,
  ZoomOutUp,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type {
  FrameDriverRow,
  TargetSample,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  blockUIThread,
  BOX_REF,
  callbackOf,
  callbacks,
  countedOf,
  FRAME_BOX_REF,
  FRAME_MS,
  frameDrivenOf,
  hasNativeLayoutStarts,
  isHostEvent,
  namedBuilderCalls,
  sample,
  summarize,
  takeAtFrameDriverFrame,
  takeTrace,
} from './nativeLayoutTestKit';

type Flow = 'entering' | 'exiting' | 'layout';
type Builder = BaseAnimationBuilder & {
  build: () => (values: never) => LayoutAnimation;
};
type Preset = new () => Builder;
type BoxAnimations = Pick<React.ComponentProps<typeof Animated.View>, Flow>;
type BoxFrame = { left: number; top: number; width: number; height: number };

const DURATION = 1200;
const FRACTIONS = [0.25, 0.5, 0.75];
const CELL_HEIGHT = 160;
const REST: BoxFrame = { left: 60, top: 20, width: 50, height: 50 };
const MOVED: BoxFrame = { left: 150, top: 60, width: 90, height: 70 };
const widerBy = (change: number): BoxFrame => ({
  ...REST,
  width: REST.width + change,
});

/** The largest speed of an easing, as a multiple of its mean speed. */
function largestSpeedOf(easing: EasingFunction) {
  const STEPS = 1000;
  let largestStep = 0;
  for (let step = 0; step < STEPS; step++) {
    largestStep = Math.max(
      largestStep,
      Math.abs(easing((step + 1) / STEPS) - easing(step / STEPS))
    );
  }
  return largestStep * STEPS;
}

/**
 * The part of its change that a target moves in two display frames at the
 * largest speed of its easing.
 */
const twoFramesOf = (easing: EasingFunction) =>
  (2 * largestSpeedOf(easing) * FRAME_MS) / DURATION;

const DEFAULT_TWO_FRAMES = twoFramesOf(Easing.inOut(Easing.quad));
const AT_REST = { opacity: 0.01, points: 0.5, cells: 0.005 };
const NATIVE_TIMING = 'UnsupportedTiming';

const SCALARS = ['Opacity', 'PositionX', 'PositionY', 'Width', 'Height'];
const TARGETS = [...SCALARS, 'Transform'];
type BoxSample = Record<string, TargetSample>;

/**
 * The route of each preset with its default easing: the targets of the native
 * tracks, or the failure that keeps the animation frame-driven.
 */
const ENTERING: [Preset, string][] = [
  [FadeIn, 'Opacity'],
  [FadeInRight, 'Opacity+Transform'],
  [FadeInLeft, 'Opacity+Transform'],
  [FadeInUp, 'Opacity+Transform'],
  [FadeInDown, 'Opacity+Transform'],
  [SlideInRight, 'PositionX'],
  [SlideInLeft, 'PositionX'],
  [SlideInUp, 'PositionY'],
  [SlideInDown, 'PositionY'],
  [StretchInX, 'Transform'],
  [StretchInY, 'Transform'],
  [ZoomIn, 'Transform'],
  [ZoomInRotate, 'Transform'],
  [ZoomInLeft, 'Transform'],
  [ZoomInRight, 'Transform'],
  [ZoomInUp, 'Transform'],
  [ZoomInDown, 'Transform'],
  [ZoomInEasyUp, 'Transform'],
  [ZoomInEasyDown, 'Transform'],
  [RotateInDownLeft, 'Opacity+Transform'],
  [RotateInDownRight, 'Opacity+Transform'],
  [RotateInUpLeft, 'Opacity+Transform'],
  [RotateInUpRight, 'Opacity+Transform'],
  [RollInLeft, 'Transform'],
  [RollInRight, 'Transform'],
  [PinwheelIn, 'Opacity+Transform'],
  [FlipInXUp, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInXDown, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInYLeft, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInYRight, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInEasyX, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInEasyY, 'LayoutBuildFailed:EndpointMismatch'],
  [LightSpeedInRight, 'LayoutBuildFailed:UnsupportedValue'],
  [LightSpeedInLeft, 'LayoutBuildFailed:UnsupportedValue'],
  [BounceIn, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceInDown, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceInUp, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceInLeft, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceInRight, 'LayoutBuildFailed:UnsupportedTiming'],
];

const EXITING: [Preset, string][] = [
  [FadeOut, 'Opacity'],
  [FadeOutRight, 'Opacity+Transform'],
  [FadeOutLeft, 'Opacity+Transform'],
  [FadeOutUp, 'Opacity+Transform'],
  [FadeOutDown, 'Opacity+Transform'],
  [SlideOutRight, 'PositionX'],
  [SlideOutLeft, 'PositionX'],
  [SlideOutUp, 'PositionY'],
  [SlideOutDown, 'PositionY'],
  [StretchOutX, 'Transform'],
  [StretchOutY, 'Transform'],
  [ZoomOut, 'Transform'],
  [ZoomOutRotate, 'LayoutBuildFailed:UnsupportedValue'],
  [ZoomOutLeft, 'Transform'],
  [ZoomOutRight, 'Transform'],
  [ZoomOutUp, 'Transform'],
  [ZoomOutDown, 'Transform'],
  [ZoomOutEasyUp, 'Transform'],
  [ZoomOutEasyDown, 'Transform'],
  [RotateOutDownLeft, 'Opacity+Transform'],
  [RotateOutDownRight, 'Opacity+Transform'],
  [RotateOutUpLeft, 'Opacity+Transform'],
  [RotateOutUpRight, 'Opacity+Transform'],
  [RollOutLeft, 'Transform'],
  [RollOutRight, 'Transform'],
  [PinwheelOut, 'Opacity+Transform'],
  [FlipOutXUp, 'Transform'],
  [FlipOutXDown, 'Transform'],
  [FlipOutYLeft, 'Transform'],
  [FlipOutYRight, 'Transform'],
  [FlipOutEasyX, 'Transform'],
  [FlipOutEasyY, 'Transform'],
  [LightSpeedOutRight, 'LayoutBuildFailed:UnsupportedValue'],
  [LightSpeedOutLeft, 'LayoutBuildFailed:UnsupportedValue'],
  [BounceOut, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceOutDown, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceOutUp, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceOutLeft, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceOutRight, 'LayoutBuildFailed:UnsupportedTiming'],
];

/** The easing of each target of a preset that does not have the default easing. */
type TargetEasings = Record<string, EasingFunction>;

const CURVED_TRANSITION_EASINGS: TargetEasings = {
  PositionX: Easing.in(Easing.ease),
  PositionY: Easing.out(Easing.ease),
  Width: Easing.in(Easing.exp),
  Height: Easing.out(Easing.exp),
};

const LAYOUT: [Preset, string, TargetEasings?][] = [
  [LinearTransition, 'PositionX+PositionY+Width+Height'],
  [
    CurvedTransition,
    'PositionX+PositionY+Width+Height',
    CURVED_TRANSITION_EASINGS,
  ],
  [FadingTransition, 'LayoutBuildFailed:UnsupportedTiming'],
  [SequencedTransition, 'LayoutBuildFailed:UnsupportedTiming'],
  [JumpingTransition, 'LayoutBuildFailed:UnsupportedTiming'],
  [EntryExitTransition, 'LayoutBuildFailed:UnsupportedTiming'],
];

function PresetBox({
  refName,
  frame,
  animations,
}: {
  refName: string;
  frame: BoxFrame;
  animations: BoxAnimations;
}) {
  const ref = useTestRef(refName);
  return (
    <Animated.View
      ref={ref}
      {...animations}
      style={[
        localStyles.box,
        {
          marginLeft: frame.left,
          marginTop: frame.top,
          width: frame.width,
          height: frame.height,
        },
      ]}
    />
  );
}

type Scene = { isMounted: boolean; boxFrame: BoxFrame };
type Cell = { refName: string; animations: BoxAnimations };

function PresetCells({
  cells,
  isMounted,
  boxFrame,
}: Scene & { cells: Cell[] }) {
  return (
    <View>
      {cells.map(({ refName, animations }) => (
        <View key={refName} collapsable={false} style={localStyles.cell}>
          {isMounted && (
            <PresetBox
              refName={refName}
              frame={boxFrame}
              animations={animations}
            />
          )}
        </View>
      ))}
    </View>
  );
}

/** No sample when the view left. */
async function sampleBox(tag: number): Promise<BoxSample | undefined> {
  try {
    const samples = await Promise.all(
      TARGETS.map((target) => sample(tag, target))
    );
    return Object.fromEntries(
      TARGETS.map((target, index) => [target, samples[index]])
    );
  } catch {
    return undefined;
  }
}

const rangeOf = (values: number[]) =>
  values.length > 0 ? Math.max(...values) - Math.min(...values) : 0;

/** The change of the value of the track of a scalar target. */
const travelOf = ({ members }: TargetSample) =>
  rangeOf(members[0]?.values.map(([value]) => value) ?? []);

type Matrix = number[];

const IDENTITY: Matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function multiply(first: Matrix, second: Matrix): Matrix {
  const product = new Array<number>(16).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      for (let inner = 0; inner < 4; inner++) {
        product[4 * row + column] +=
          first[4 * row + inner] * second[4 * inner + column];
      }
    }
  }
  return product;
}

function withCells(cells: Record<number, number>): Matrix {
  const matrix = [...IDENTITY];
  for (const [index, value] of Object.entries(cells)) {
    matrix[Number(index)] = value;
  }
  return matrix;
}

/** The matrix of the value of a member, in the cell order of a sample. */
const MEMBER_MATRICES: Record<string, (value: number) => Matrix> = {
  'transform.translateX': (value) => withCells({ 12: value }),
  'transform.translateY': (value) => withCells({ 13: value }),
  'transform.scale': (value) => withCells({ 0: value, 5: value, 10: value }),
  'transform.scaleX': (value) => withCells({ 0: value }),
  'transform.scaleY': (value) => withCells({ 5: value }),
  'transform.rotateZ': (angle) =>
    withCells({
      0: Math.cos(angle),
      1: Math.sin(angle),
      4: -Math.sin(angle),
      5: Math.cos(angle),
    }),
  'transform.rotateX': (angle) =>
    withCells({
      5: Math.cos(angle),
      6: Math.sin(angle),
      9: -Math.sin(angle),
      10: Math.cos(angle),
    }),
  'transform.rotateY': (angle) =>
    withCells({
      0: Math.cos(angle),
      2: -Math.sin(angle),
      8: Math.sin(angle),
      10: Math.cos(angle),
    }),
};

type Member = TargetSample['members'][number];

/** A member with no value function has a matrix that does not change. */
function memberMatrixAt({ property, values }: Member, progress: number) {
  const matrixOf = MEMBER_MATRICES[property];
  if (!matrixOf) {
    return values[0];
  }
  const start = values[0][0];
  const end = values[values.length - 1][0];
  return matrixOf(start + (end - start) * progress);
}

/**
 * The matrix of the members of a transform track at a progress of their values.
 * The screen applies the members to a point in their order. The presentation
 * layer gives the product in the other order.
 */
function trackMatrixAt(
  members: Member[],
  progress: number,
  order: 'screen' | 'presentation'
) {
  const matrices = members.map((member) => memberMatrixAt(member, progress));
  return (order === 'screen' ? matrices : [...matrices].reverse()).reduce(
    multiply,
    IDENTITY
  );
}

const TRANSLATION_CELLS = [12, 13, 14];

/** A translation of 100 pt counts as much as 1 in each other cell. */
const matrixDistance = (first: Matrix, second: Matrix) =>
  Math.max(
    ...first.map(
      (cell, index) =>
        Math.abs(cell - second[index]) /
        (TRANSLATION_CELLS.includes(index) ? 100 : 1)
    )
  );

/** The progress at which the members give the matrix that is nearest to `shown`. */
function closestProgress(
  members: Member[],
  shown: Matrix,
  order: 'screen' | 'presentation'
) {
  const distanceAt = (progress: number) =>
    matrixDistance(trackMatrixAt(members, progress, order), shown);
  const STEPS = 200;
  let best = 0;
  for (let step = 1; step <= STEPS; step++) {
    if (distanceAt(step / STEPS) < distanceAt(best)) {
      best = step / STEPS;
    }
  }
  let low = Math.max(0, best - 1 / STEPS);
  let high = Math.min(1, best + 1 / STEPS);
  for (let iteration = 0; iteration < 40; iteration++) {
    const lowThird = low + (high - low) / 3;
    const highThird = high - (high - low) / 3;
    if (distanceAt(lowThird) < distanceAt(highThird)) {
      high = highThird;
    } else {
      low = lowThird;
    }
  }
  const progress = (low + high) / 2;
  return { progress, residual: distanceAt(progress) };
}

/** The origin of the box. A size track moves the center and not the origin. */
function scalarsOf(box: BoxSample, layer: 'model' | 'presentation') {
  const valueOf = (target: string) => box[target][layer][0];
  return {
    Opacity: valueOf('Opacity'),
    PositionX: valueOf('PositionX') - valueOf('Width') / 2,
    PositionY: valueOf('PositionY') - valueOf('Height') / 2,
    Width: valueOf('Width'),
    Height: valueOf('Height'),
  } as Record<string, number>;
}

const restToleranceOf = (target: string) =>
  target === 'Opacity' ? AT_REST.opacity : AT_REST.points;

/**
 * What the two boxes show for one target. For a target with a native track,
 * `difference` is a part of the change of the target, and a transform has the
 * progress of its members in place of a value. A target with no native track
 * must be equal in the two boxes: `difference` is then in the unit of the
 * target.
 */
type Comparison = {
  target: string;
  native: number;
  twin: number;
  difference: number;
  hasTrack: boolean;
  isInBound: boolean;
};

function compare(
  native: BoxSample,
  frame: BoxSample,
  easings: TargetEasings = {}
): Comparison[] {
  const twoFrames = (target: string) =>
    target in easings ? twoFramesOf(easings[target]) : DEFAULT_TWO_FRAMES;
  const shown = scalarsOf(native, 'presentation');
  const twin = scalarsOf(frame, 'model');
  const comparisons = SCALARS.map((target) => {
    const distance = Math.abs(shown[target] - twin[target]);
    const travel = travelOf(native[target]);
    const hasTrack = travel > 0;
    const difference = hasTrack ? distance / travel : distance;
    return {
      target,
      native: shown[target],
      twin: twin[target],
      difference,
      hasTrack,
      isInBound:
        difference < (hasTrack ? twoFrames(target) : restToleranceOf(target)),
    };
  });

  // The first member hides the model.
  const members = native.Transform.members.slice(1);
  if (members.length === 0) {
    const difference = matrixDistance(
      native.Transform.presentation,
      frame.Transform.model
    );
    return [
      ...comparisons,
      {
        target: 'Transform',
        native: 0,
        twin: 0,
        difference,
        hasTrack: false,
        isInBound: difference < AT_REST.cells,
      },
    ];
  }
  const ofNative = closestProgress(
    members,
    native.Transform.presentation,
    'presentation'
  );
  const ofTwin = closestProgress(members, frame.Transform.model, 'screen');
  const difference = Math.abs(ofNative.progress - ofTwin.progress);
  return [
    ...comparisons,
    {
      target: 'Transform',
      native: ofNative.progress,
      twin: ofTwin.progress,
      difference,
      hasTrack: true,
      isInBound:
        difference < twoFrames('Transform') &&
        ofNative.residual < AT_REST.cells &&
        ofTwin.residual < AT_REST.cells,
    },
  ];
}

type Row = FrameDriverRow<{ native: BoxSample; frame: BoxSample }>;

/** The first and the last sample time of a box, from `originMs`. */
function sampleTimesOf(box: BoxSample, originMs: number) {
  const times = TARGETS.map((target) => box[target].monotonicTimeMs);
  return [Math.min(...times), Math.max(...times)]
    .map((time) => (time - originMs).toFixed(1))
    .join('..');
}

/** Each value of a row and its times, in ms from the start of the native box. */
function describeRow(
  { native, frame, lateMs, lateFramesMs }: Row,
  comparisons: Comparison[],
  starts: { native: number; frame: number }
) {
  const model = scalarsOf(native, 'model');
  const values = comparisons.map(
    ({ target, native: shown, twin, difference, isInBound }) =>
      [
        `${target} native ${shown.toFixed(3)}`,
        ...(target in model ? [`model ${model[target].toFixed(3)}`] : []),
        `twin ${twin.toFixed(3)} difference ${difference.toFixed(4)}`,
        ...(isInBound ? [] : ['OUT']),
      ].join(' ')
  );
  return [
    `twin start ${(starts.frame - starts.native).toFixed(1)}`,
    `frame of the twin late ${lateMs.toFixed(1)}, rows taken again ${lateFramesMs.map((late) => late.toFixed(1)).join(' ') || 'none'}`,
    `native samples ${sampleTimesOf(native, starts.native)}`,
    `twin samples ${sampleTimesOf(frame, starts.native)}`,
    ...values,
  ].join(' | ');
}

/** True when each target of the box shows the value of its model. */
function isAtRest(box: BoxSample) {
  const shown = scalarsOf(box, 'presentation');
  const model = scalarsOf(box, 'model');
  return (
    SCALARS.every(
      (target) =>
        Math.abs(shown[target] - model[target]) < restToleranceOf(target)
    ) &&
    matrixDistance(box.Transform.presentation, box.Transform.model) <
      AT_REST.cells
  );
}

function isSameModel(first: BoxSample, second: BoxSample) {
  const firstModel = scalarsOf(first, 'model');
  const secondModel = scalarsOf(second, 'model');
  return (
    SCALARS.every(
      (target) =>
        Math.abs(firstModel[target] - secondModel[target]) <
        restToleranceOf(target)
    ) &&
    matrixDistance(first.Transform.model, second.Transform.model) <
      AT_REST.cells
  );
}

/** The targets of the native tracks, or the events of a start with no command. */
function routeOf(events: TraceEvent[]) {
  const hostEvents = events.filter(isHostEvent);
  const targets = hostEvents
    .filter(({ event }) => event === 'TrackStarted')
    .map(({ target }) => target);
  const isAdmitted = hostEvents.some(({ event }) => event === 'Admitted');
  return isAdmitted ? targets.join('+') : summarize(hostEvents);
}

const SCENES: Record<Flow, { before: Scene; after: Scene }> = {
  entering: {
    before: { isMounted: false, boxFrame: REST },
    after: { isMounted: true, boxFrame: REST },
  },
  exiting: {
    before: { isMounted: true, boxFrame: REST },
    after: { isMounted: false, boxFrame: REST },
  },
  layout: {
    before: { isMounted: true, boxFrame: REST },
    after: { isMounted: true, boxFrame: MOVED },
  },
};

const PLAIN_BOX_REF = 'NativeLayoutPresetPlainBox';
const CALLBACKS_TIMEOUT = 3000;

async function waitForCallbacks(count: number) {
  const timeoutMs = performance.now() + CALLBACKS_TIMEOUT;
  while (callbacks.length < count && performance.now() < timeoutMs) {
    await wait(50);
  }
}

type Play = {
  flow: Flow;
  /** The animation of the native box and of its twin, before its callback. */
  makeAnimation: () => Builder;
  /** The animation of one more box, which has no callback. */
  plain?: BoxAnimations[Flow];
  /** The time of the animation for the rows. No value: no rows. */
  durationMs?: number;
  /** The frame of the box after a layout change. */
  movedTo?: BoxFrame;
  /** The main thread is busy for this time before each row. */
  busyMs?: number;
  /** Each call of the function of the native box and of its twin has a record. */
  countsBuilderCalls?: boolean;
};

const builderOf = (animation: Builder) =>
  animation as unknown as Parameters<typeof countedOf>[1];

async function play({
  flow,
  makeAnimation,
  plain,
  durationMs,
  movedTo,
  busyMs,
  countsBuilderCalls = false,
}: Play) {
  const animationOf = (name: string) => {
    const animation = makeAnimation().withCallback(callbackOf(name)) as Builder;
    return countsBuilderCalls
      ? countedOf(name, builderOf(animation))
      : animation;
  };
  const cells: Cell[] = [
    { refName: BOX_REF, animations: { [flow]: animationOf('native') } },
    {
      refName: FRAME_BOX_REF,
      animations: { [flow]: frameDrivenOf(animationOf('frame')) },
    },
    ...(plain
      ? [{ refName: PLAIN_BOX_REF, animations: { [flow]: plain } }]
      : []),
  ];
  const { before } = SCENES[flow];
  const after = {
    ...SCENES[flow].after,
    ...(movedTo && { boxFrame: movedTo }),
  };
  const tagsOf = () =>
    cells.map(({ refName }) => getTestComponent(refName).getTag());

  await render(<PresetCells cells={cells} {...before} />);
  await wait(200);
  const tagsBefore = flow === 'entering' ? undefined : tagsOf();
  await takeTrace();
  callbacks.length = 0;
  namedBuilderCalls.length = 0;
  const startMs = performance.now();
  await render(<PresetCells cells={cells} {...after} />);
  const [nativeTag, frameTag, plainTag] = tagsBefore ?? tagsOf();

  const rows: Row[] = [];
  const rowTimes =
    durationMs === undefined
      ? []
      : FRACTIONS.map((fraction) => fraction * durationMs);
  for (const rowTime of rowTimes) {
    await wait(Math.max(0, startMs + rowTime - performance.now()));
    if (busyMs !== undefined) {
      scheduleOnUI(blockUIThread, busyMs);
      // The block is on the main thread after the microtasks.
      await Promise.resolve();
    }
    rows.push(
      await takeAtFrameDriverFrame(async () => {
        const [native, frame] = await Promise.all([
          sampleBox(nativeTag),
          sampleBox(frameTag),
        ]);
        return { native: native!, frame: frame! };
      })
    );
  }
  await waitForCallbacks(2);
  await wait(300);
  const [native, frame, plainBox] = await Promise.all([
    sampleBox(nativeTag),
    sampleBox(frameTag),
    plainTag === undefined ? Promise.resolve(undefined) : sampleBox(plainTag),
  ]);
  const events = await takeTrace();
  const routeOfTag = (tag: number) =>
    routeOf(
      events.filter(
        (event) => event.tag === tag && event.event !== 'FrameUpdateMounted'
      )
    );
  const startOf = (tag: number) =>
    events.find((event) => event.tag === tag)?.monotonicTimeMs ?? NaN;
  return {
    rows,
    end: { native, frame, plain: plainBox },
    route: routeOfTag(nativeTag),
    twinRoute: routeOfTag(frameTag),
    plainRoute: plainTag === undefined ? undefined : routeOfTag(plainTag),
    starts: { native: startOf(nativeTag), frame: startOf(frameTag) },
    builderCalls: [...namedBuilderCalls].sort().join(),
  };
}

/** The end of a box that played natively or not, against its frame-driven twin. */
function expectEndAsTwin(
  flow: Flow,
  box: BoxSample | undefined,
  twin: BoxSample | undefined
) {
  if (flow === 'exiting') {
    expect(box).toBeUndefined();
    expect(twin).toBeUndefined();
    return;
  }
  expect(box!.Opacity.playbackKeys.length).toBe(0);
  expect(isAtRest(box!)).toBe(true);
  expect(isSameModel(box!, twin!)).toBe(true);
}

const TWIN_ROUTE = `LayoutBuildFailed:${NATIVE_TIMING}`;
const isNativeRoute = (route: string) => !route.startsWith('Layout');
const routeNameOf = (route: string) =>
  isNativeRoute(route)
    ? `plays natively (${route})`
    : `stays frame-driven (${route})`;

const FLOWS: [Flow, [Preset, string, TargetEasings?][]][] = [
  ['entering', ENTERING],
  ['exiting', EXITING],
  ['layout', LAYOUT],
];

describe('native layout presets with their default easing', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  for (const [flow, presets] of FLOWS) {
    for (const [PresetClass, route, easings] of presets) {
      test(`${PresetClass.name} ${routeNameOf(route)} and agrees with its frame-driven twin`, async () => {
        const played = await play({
          flow,
          makeAnimation: () => new PresetClass().duration(DURATION),
          durationMs: DURATION,
        });

        expect(played.route).toBe(route);
        expect(played.twinRoute).toBe(TWIN_ROUTE);
        const comparisons = played.rows.map(({ native, frame }) => {
          expect(native.Opacity.playbackKeys.length > 0).toBe(
            isNativeRoute(route)
          );
          return compare(native, frame, easings);
        });
        const differences = comparisons.map((row) =>
          Math.max(
            0,
            ...row
              .filter(({ hasTrack }) => hasTrack)
              .map(({ difference }) => difference)
          )
        );
        console.log(
          [
            'PRESET',
            flow,
            PresetClass.name,
            played.route,
            differences.map((difference) => difference.toFixed(4)).join(' '),
            `frame of the twin late ${played.rows.map(({ lateMs }) => lateMs.toFixed(1)).join(' ')}`,
          ].join(' | ')
        );
        const isInBound = comparisons.flat().every((row) => row.isInBound);
        played.rows.forEach((row, index) => {
          if (!isInBound || row.lateFramesMs.length > 0) {
            console.log(
              `PRESET-ROW | ${PresetClass.name} | ${FRACTIONS[index]} | ${describeRow(row, comparisons[index], played.starts)}`
            );
          }
        });
        expect(isInBound).toBe(true);

        expectEndAsTwin(flow, played.end.native, played.end.frame);
        expect([...callbacks].sort().join()).toBe('frame:true,native:true');
        await render(null);
      });
    }
  }

  test('rows after a busy main thread are taken again and agree with the frame-driven twin', async () => {
    const BUSY_MS = 150;
    const played = await play({
      flow: 'entering',
      makeAnimation: () => new FadeIn().duration(DURATION),
      durationMs: DURATION,
      busyMs: BUSY_MS,
    });

    played.rows.forEach((row, index) => {
      const comparisons = compare(row.native, row.frame);
      console.log(
        `PRESET-BUSY | ${FRACTIONS[index]} | ${describeRow(row, comparisons, played.starts)}`
      );
      expect(row.lateFramesMs[0] > BUSY_MS - FRAME_MS).toBe(true);
      expect(row.lateMs < FRAME_MS).toBe(true);
      expect(comparisons.every(({ isInBound }) => isInBound)).toBe(true);
    });
    expect([...callbacks].sort().join()).toBe('frame:true,native:true');
    await render(null);
  });
});

describe('native layout presets with no method call', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  // The native box and its twin have a callback and no other method call. The third box has the preset itself.
  for (const [flow, presets] of FLOWS) {
    for (const [PresetClass, route] of presets) {
      test(`${PresetClass.name} with no method call ${routeNameOf(route)} and ends as its frame-driven twin`, async () => {
        const played = await play({
          flow,
          makeAnimation: () => new PresetClass(),
          plain: PresetClass as unknown as BoxAnimations[Flow],
        });

        console.log(
          `PRESET-NO-CALL | ${flow} | ${PresetClass.name} | ${played.plainRoute} | ${played.route}`
        );
        expect(played.plainRoute).toBe(route);
        expect(played.route).toBe(route);
        expect(played.twinRoute).toBe(TWIN_ROUTE);
        expectEndAsTwin(flow, played.end.plain, played.end.frame);
        expectEndAsTwin(flow, played.end.native, played.end.frame);
        expect([...callbacks].sort().join()).toBe('frame:true,native:true');
        await render(null);
      });
    }
  }
});

describe('native layout transitions and a width change near 250 pt', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  // The fit of an easing has a smaller tolerance for a change over 250 pt. `Easing.exp` starts at 2^-10 and has no
  // fit then. CurvedTransition has it on the width and on the height.
  const NATIVE_ROUTE = 'PositionX+PositionY+Width+Height';
  const transitions: [string, () => Builder, number, string][] = [
    ['LinearTransition', () => new LinearTransition(), 280, NATIVE_ROUTE],
    [
      'LinearTransition with Easing.exp',
      () => new LinearTransition().easing(Easing.exp),
      240,
      NATIVE_ROUTE,
    ],
    [
      'LinearTransition with Easing.exp',
      () => new LinearTransition().easing(Easing.exp),
      280,
      TWIN_ROUTE,
    ],
    ['CurvedTransition', () => new CurvedTransition(), 240, NATIVE_ROUTE],
    ['CurvedTransition', () => new CurvedTransition(), 280, TWIN_ROUTE],
  ];
  for (const [transitionName, makeAnimation, change, route] of transitions) {
    test(`${transitionName} over a width change of ${change} pt ${routeNameOf(route)} and ends as its frame-driven twin`, async () => {
      const played = await play({
        flow: 'layout',
        makeAnimation,
        movedTo: widerBy(change),
        countsBuilderCalls: true,
      });

      console.log(
        `PRESET-WIDE | ${transitionName} | ${change} pt | ${played.route} | builder calls ${played.builderCalls}`
      );
      expect(played.route).toBe(route);
      expect(played.twinRoute).toBe(TWIN_ROUTE);
      expect(played.builderCalls).toBe('frame,native');
      expectEndAsTwin('layout', played.end.native, played.end.frame);
      expect([...callbacks].sort().join()).toBe('frame:true,native:true');
      await render(null);
    });
  }
});

const localStyles = StyleSheet.create({
  cell: {
    height: CELL_HEIGHT,
  },
  box: {
    backgroundColor: 'teal',
  },
});
