import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import type {
  EasingFunction,
  EasingFunctionFactory,
  LayoutAnimationFunction,
} from 'react-native-reanimated';
import Animated, {
  CurvedTransition,
  Easing,
  EntryExitTransition,
  FadingTransition,
  getStaticFeatureFlag,
  JumpingTransition,
  LinearTransition,
  ReduceMotion,
  SequencedTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import {
  isSecondSurfaceAvailable,
  startSecondSurface,
  stopSecondSurface,
} from '../../../ReJest/secondSurface';

type TraceEvent = {
  event: string;
  surfaceId: number;
  tag: number;
  owner: string;
  generation: number;
  monotonicTimeMs: number;
  target?: string;
  endpointPolicy?: string;
  finished?: boolean;
  outcome?: string;
  reason?: string;
  buildFailure?: string;
  transactionNumber?: number;
};

type TargetSample = {
  model: number[];
  presentation: number[];
  /**
   * The platform key of each physical playback on the view:
   * `reanimated.<owner>.<generation>.<target>`.
   */
  playbackKeys: string[];
  monotonicTimeMs: number;
};

type NativeAnimationDevTools = {
  takeNativeAnimationTrace?: (callback: (events: TraceEvent[]) => void) => void;
  sampleNativeAnimationTarget?: (
    tag: number,
    target: string,
    callback: (sample: TargetSample | undefined) => void
  ) => void;
};

const devTools = (
  globalThis as unknown as { __reanimatedModuleProxy: NativeAnimationDevTools }
).__reanimatedModuleProxy;

// The entries exist only in development builds of the native code, and the route only with the flag.
const hasNativeLayoutStarts =
  Platform.OS === 'ios' &&
  getStaticFeatureFlag('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION') &&
  devTools.takeNativeAnimationTrace !== undefined;

const BOX_REF = 'NativeLayoutStartBox';
const BOX_SIZE = 50;
const START_LEFT = 0;
const END_LEFT = 100;
const END_TOP = 40;
const DURATION = 400;
const POSITION_TOLERANCE = 0.5;
const REPEATED_STARTS = 30;
const PRESET_WAIT = 1500;
const FILTER_OPACITY = 0.5;
// The travel of two display frames at 60 fps.
const FIRST_FRAME_TRAVEL = ((END_LEFT - START_LEFT) / DURATION) * 34;
const FRAME_MS = 1000 / 60;

const centerOf = (origin: number) => origin + BOX_SIZE / 2;

function takeTrace(): Promise<TraceEvent[]> {
  return new Promise((resolve) => {
    devTools.takeNativeAnimationTrace?.(resolve);
  });
}

async function takeTraceOf(tag: number) {
  return (await takeTrace()).filter((event) => event.tag === tag);
}

const isHostEvent = ({ event }: TraceEvent) =>
  event !== 'ClientAdmitted' && event !== 'ClientEnded';

const isClientReport = ({ event }: TraceEvent) =>
  event === 'ClientAdmitted' || event === 'ClientEnded';

function sample(tag: number, target: string): Promise<TargetSample> {
  return new Promise((resolve, reject) => {
    devTools.sampleNativeAnimationTarget?.(tag, target, (targetSample) =>
      targetSample ? resolve(targetSample) : reject(new Error('no view'))
    );
  });
}

const playbackCountOf = ({ playbackKeys }: TargetSample, generation: number) =>
  playbackKeys.filter((key) => key.split('.')[2] === `${generation}`).length;

async function takeTraceUntilSurfaceClosed(surfaceId: number) {
  const events: TraceEvent[] = [];
  const isClosed = () =>
    events.some(
      (event) =>
        event.event === 'SurfaceClosed' && event.surfaceId === surfaceId
    );
  for (let attempt = 0; attempt < 40 && !isClosed(); attempt++) {
    await wait(25);
    events.push(...(await takeTrace()));
  }
  return events;
}

function summarize(events: TraceEvent[]) {
  return events
    .map(({ event, target, finished, outcome, reason, buildFailure }) =>
      [event, target, finished, outcome, reason, buildFailure]
        .filter((part) => part !== undefined)
        .join(':')
    )
    .join(' > ');
}

const callbacks: string[] = [];
const callbackTimes: Record<string, number> = {};
function recordCallback(name: string, finished: boolean) {
  callbacks.push(`${name}:${finished}`);
  callbackTimes[name] = performance.now();
}

let builderCalls = 0;
function recordBuilderCall() {
  builderCalls++;
}

type Key = 'originX' | 'originY' | 'opacity' | 'width' | 'height';

type Leaf = {
  duration?: number;
  /** Each entry is one `withDelay` wrapper, the outer one first. */
  delays?: number[];
  easing?: EasingFunction | EasingFunctionFactory | 'default';
  /**
   * The opacity before the commit, or an offset from the current value of a
   * layout key.
   */
  initial?: number | 'none';
  /**
   * The opacity after the commit, or an offset from the target value of a
   * layout key.
   */
  to?: number;
  isSpring?: boolean;
  hasCallback?: boolean;
  reduceMotion?: ReduceMotion;
  /** The leaf exists only when the layout value of its key changes. */
  onlyWhenChanged?: boolean;
  /** The builder sets reduced motion on the animation after its creation. */
  setsReduceMotion?: boolean;
};

type LayoutOptions = {
  name?: string;
  initialOnlyKey?: string;
  /**
   * The builder keeps the UI thread for this time, so the start is late on its
   * timeline.
   */
  blocksForMs?: number;
};

function layoutOf(
  leaves: Partial<Record<Key, Leaf>>,
  { name, initialOnlyKey, blocksForMs = 0 }: LayoutOptions = {}
): LayoutAnimationFunction {
  return (values) => {
    'worklet';
    scheduleOnRN(recordBuilderCall);
    const blockEnd = global._getAnimationTimestamp() + blocksForMs;
    while (global._getAnimationTimestamp() < blockEnd) {
      // The builder runs between the time origin and the admission.
    }
    const current: Record<string, number> = {
      originX: values.currentOriginX,
      originY: values.currentOriginY,
      width: values.currentWidth,
      height: values.currentHeight,
    };
    const target: Record<string, number> = {
      originX: values.targetOriginX,
      originY: values.targetOriginY,
      width: values.targetWidth,
      height: values.targetHeight,
    };
    const initialValues: Record<string, number> = {};
    const animations: Record<string, unknown> = {};
    for (const key of Object.keys(leaves)) {
      const leaf = leaves[key as Key]!;
      if (leaf.onlyWhenChanged && current[key] === target[key]) {
        continue;
      }
      const isLayoutKey = key in target;
      const toValue = isLayoutKey ? target[key] + (leaf.to ?? 0) : leaf.to!;
      if (leaf.initial !== 'none') {
        initialValues[key] = isLayoutKey
          ? current[key] + (leaf.initial ?? 0)
          : leaf.initial!;
      }
      const config: Record<string, unknown> = {
        duration: leaf.duration ?? DURATION,
        reduceMotion: leaf.reduceMotion,
      };
      if (leaf.easing !== 'default') {
        config.easing = leaf.easing ?? Easing.linear;
      }
      let animation = leaf.isSpring
        ? withSpring(toValue)
        : withTiming(
            toValue,
            config,
            leaf.hasCallback
              ? () => {
                  'worklet';
                }
              : undefined
          );
      for (const delay of [...(leaf.delays ?? [])].reverse()) {
        animation = withDelay(delay, animation);
      }
      if (leaf.setsReduceMotion) {
        (animation as { reduceMotion?: boolean }).reduceMotion = true;
      }
      animations[key] = animation;
    }
    if (initialOnlyKey) {
      initialValues[initialOnlyKey] = 1;
    }
    return {
      initialValues,
      animations,
      callback: name
        ? (finished: boolean) => {
            'worklet';
            scheduleOnRN(recordCallback, name, finished);
          }
        : undefined,
    };
  };
}

const MALFORMED_BEZIER = {
  bezier: 'ease',
  factory: () => {
    'worklet';
    return (t: number) => {
      'worklet';
      return t;
    };
  },
} as unknown as EasingFunctionFactory;

const MOVE = layoutOf({ originX: {}, originY: {} });

type BoxProps = {
  left: number;
  top?: number;
  width?: number;
  opacity?: number;
  hasOpacityFilter?: boolean;
  layout?: Parameters<typeof Animated.View>[0]['layout'];
  refName?: string;
};

function Box({
  left,
  top = 0,
  width = BOX_SIZE,
  opacity = 1,
  hasOpacityFilter = false,
  layout = MOVE,
  refName = BOX_REF,
}: BoxProps) {
  const ref = useTestRef(refName);
  return (
    <Animated.View
      ref={ref}
      layout={layout}
      style={[
        styles.box,
        { marginLeft: left, marginTop: top, width, opacity },
        hasOpacityFilter && { filter: [{ opacity: FILTER_OPACITY }] },
      ]}
    />
  );
}

function Scene({
  isMounted = true,
  ...box
}: BoxProps & { isMounted?: boolean }) {
  return <View style={styles.container}>{isMounted && <Box {...box} />}</View>;
}

const ROW_REFS = Array.from(
  { length: 150 },
  (_, index) => `NativeLayoutStartRowBox${index}`
);
const LONG_MOVE = layoutOf({ originX: { duration: 4 * DURATION } });

function Row({ left, count }: { left: number; count: number }) {
  return (
    <View style={styles.container}>
      {ROW_REFS.slice(0, count).map((refName) => (
        <View key={refName} style={styles.rowItem}>
          <Box left={left} refName={refName} layout={LONG_MOVE} />
        </View>
      ))}
    </View>
  );
}

function ModalScene({ left }: { left: number }) {
  return (
    <Modal visible transparent animationType="none">
      <View style={styles.container}>
        <Box left={left} />
      </View>
    </Modal>
  );
}

const SECOND_BOX_REF = 'NativeLayoutStartSecondSurfaceBox';
const SECOND_CSS_BOX_REF = 'NativeLayoutStartSecondSurfaceCSSBox';
let setSecondSurfaceLeft: (left: number) => void = () => {};
let setSecondSurfaceOpacity: (opacity: number) => void = () => {};

function SecondSurfaceScene() {
  const [left, setLeft] = useState(START_LEFT);
  const [opacity, setOpacity] = useState(1);
  const cssBoxRef = useTestRef(SECOND_CSS_BOX_REF);
  setSecondSurfaceLeft = setLeft;
  setSecondSurfaceOpacity = setOpacity;
  return (
    <View style={styles.container}>
      <Box left={left} refName={SECOND_BOX_REF} layout={LONG_MOVE} />
      <Animated.View
        ref={cssBoxRef}
        style={[
          styles.box,
          {
            opacity,
            transitionProperty: 'opacity',
            transitionDuration: 4 * DURATION,
            transitionTimingFunction: 'linear',
          },
        ]}
      />
    </View>
  );
}

async function renderBox(box: Partial<BoxProps> = {}) {
  await render(<Scene left={START_LEFT} {...box} />);
  await wait(50);
  await takeTrace();
  callbacks.length = 0;
  builderCalls = 0;
  return getTestComponent(BOX_REF).getTag();
}

const NATIVE_START =
  'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > TrackStarted:PositionY > Admitted';
const NATIVE_END =
  'TrackEnded:PositionX:true > TrackEnded:PositionY:true > Ended:Finished:None';

// `summarizeEnd` of a command that started and ended.
const SORTED_START_AND_END = `TrackEnded:PositionX:true > TrackEnded:PositionY:true > ${NATIVE_START} > Ended:Finished:None`;

// Tracks that end in one display frame report in no fixed order.
function summarizeEnd(events: TraceEvent[]) {
  const hostEvents = events.filter(isHostEvent);
  const isTrackEnd = ({ event }: TraceEvent) => event === 'TrackEnded';
  return summarize([
    ...hostEvents
      .filter(isTrackEnd)
      .sort((a, b) => a.target!.localeCompare(b.target!)),
    ...hostEvents.filter((event) => !isTrackEnd(event)),
  ]);
}

describe('native layout starts after the mount of the final state', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  test('the final state mounts before admission and the model holds the endpoint', async () => {
    const tag = await renderBox();
    await render(<Scene left={END_LEFT} />);
    await wait(DURATION / 2);

    const events = await takeTraceOf(tag);
    expect(summarize(events.filter(isHostEvent))).toBe(NATIVE_START);
    expect(events[0].owner).toBe('Layout');
    expect(events[1].transactionNumber).toBe(events[0].transactionNumber);
    expect(events[3].endpointPolicy).toBe('MountedModelMustMatchEndpoint');

    const playing = await sample(tag, 'PositionX');
    const { model, presentation, monotonicTimeMs } = playing;
    expect(playing.playbackKeys.length).toBe(2);
    expect(playbackCountOf(playing, events[0].generation)).toBe(2);
    expect(Math.abs(model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    const progress = (monotonicTimeMs - events[0].monotonicTimeMs) / DURATION;
    const expectedX = centerOf(START_LEFT) + progress * (END_LEFT - START_LEFT);
    expect(
      Math.abs(presentation[0] - expectedX) <
        FIRST_FRAME_TRAVEL + POSITION_TOLERANCE
    ).toBe(true);

    await wait(DURATION);
    expect(summarizeEnd(await takeTraceOf(tag))).toBe(NATIVE_END);
    const end = await sample(tag, 'PositionX');
    expect(end.playbackKeys.length).toBe(0);
    expect(Math.abs(end.presentation[0] - centerOf(END_LEFT)) < 0.01).toBe(
      true
    );
    await render(null);
  });

  test('the builder runs one time and its callback gets true one time', async () => {
    const layout = layoutOf({ originX: {}, originY: {} }, { name: 'native' });
    await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION / 2);
    expect(builderCalls).toBe(1);
    expect(callbacks.length).toBe(0);
    await wait(DURATION);
    expect(callbacks.join()).toBe('native:true');
    await render(null);
  });

  test('a config change during playback has an effect only on the next start', async () => {
    const slow = layoutOf(
      { originX: { duration: 2 * DURATION }, originY: {} },
      { name: 'slow' }
    );
    const fast = layoutOf(
      { originX: { duration: DURATION / 2 }, originY: {} },
      { name: 'fast' }
    );
    const tag = await renderBox({ layout: slow });
    await render(<Scene left={END_LEFT} layout={slow} />);
    await wait(DURATION / 2);
    await takeTraceOf(tag);

    await render(<Scene left={END_LEFT} layout={fast} />);
    await wait(DURATION);
    expect((await takeTraceOf(tag)).filter(isHostEvent).length).toBe(1);
    expect(callbacks.length).toBe(0);
    await wait(DURATION);
    expect(callbacks.join()).toBe('slow:true');

    await render(<Scene left={START_LEFT} layout={fast} />);
    await wait(DURATION * 1.5);
    expect(callbacks.join()).toBe('slow:true,fast:true');
    await render(null);
  });

  const supportedEasings: [string, Leaf['easing']][] = [
    ['Easing.ease', Easing.ease],
    ['Easing.in(Easing.ease)', Easing.in(Easing.ease)],
    ['Easing.bezier', Easing.bezier(0.25, 0.1, 0.25, 1)],
    // The value that this test reads stays in the range of the start value and the end value; the value on
    // screen does not.
    [
      'Easing.bezier that leaves the unit range',
      Easing.bezier(0.3, -0.4, 0.7, 1.6),
    ],
  ];
  for (const [easingName, easing] of supportedEasings) {
    test(`${easingName} plays natively`, async () => {
      const layout = layoutOf({ originX: { easing }, originY: { easing } });
      const tag = await renderBox({ layout });
      await render(<Scene left={END_LEFT} layout={layout} />);
      await wait(DURATION / 2);
      expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
        NATIVE_START
      );
      const { presentation } = await sample(tag, 'PositionX');
      expect(presentation[0] > centerOf(START_LEFT)).toBe(true);
      expect(presentation[0] < centerOf(END_LEFT)).toBe(true);
      await wait(DURATION);
      await render(null);
    });
  }

  const frameDrivenBuilds: [
    string,
    Partial<Record<Key, Leaf>>,
    string,
    LayoutOptions?,
    Partial<BoxProps>?,
  ][] = [
    [
      'the default easing',
      { originX: { easing: 'default' } },
      'UnsupportedTiming',
    ],
    [
      'Easing.out(Easing.ease)',
      { originX: { easing: Easing.out(Easing.ease) } },
      'UnsupportedTiming',
    ],
    ['Easing.quad', { originX: { easing: Easing.quad } }, 'UnsupportedTiming'],
    [
      'a spring beside a timing',
      { originX: {}, originY: { isSpring: true } },
      'UnsupportedTiming',
    ],
    [
      'a callback on a leaf',
      { originX: { hasCallback: true } },
      'UnsupportedTiming',
    ],
    [
      'a callback on a leaf inside a delay',
      { originX: { hasCallback: true, delays: [50] } },
      'UnsupportedTiming',
    ],
    [
      'reduced motion that the builder sets',
      { originX: { setsReduceMotion: true } },
      'UnsupportedTiming',
    ],
    [
      'a duration that is a string',
      { originX: { duration: '400' as unknown as number } },
      'InvalidValue',
    ],
    [
      'control points that are not an array',
      { originX: { easing: MALFORMED_BEZIER } },
      'InvalidValue',
    ],
    [
      'an initial value that is not finite',
      { originX: { initial: NaN } },
      'InvalidValue',
    ],
    ['a builder with no animation', {}, 'UnsupportedTrackForm'],
    [
      'reduced motion on a leaf',
      { originX: { reduceMotion: ReduceMotion.Always } },
      'UnsupportedTiming',
    ],
    [
      'a duration that is not a number',
      { originX: { duration: NaN } },
      'InvalidValue',
    ],
    [
      'a size leaf that does not change',
      { originX: {}, width: {} },
      'UnsupportedTarget',
    ],
    ['no initial value', { originX: { initial: 'none' } }, 'UnsupportedValue'],
    [
      'an initial value with no animation',
      { originX: {} },
      'UnsupportedTrackForm',
      { initialOnlyKey: 'opacity' },
    ],
    [
      'more leaves than native targets',
      { originX: {}, originY: {}, width: {}, height: {} },
      'ResourceLimit',
    ],
    [
      'an end value that the mount does not give',
      { originX: { to: 10 } },
      'EndpointMismatch',
    ],
    [
      'an opacity leaf on a view with an opacity filter',
      { originX: {}, opacity: { initial: 1, to: 1 } },
      'UnsupportedTarget',
      undefined,
      { hasOpacityFilter: true },
    ],
  ];
  for (const [caseName, leaves, failure, options, box] of frameDrivenBuilds) {
    test(`${caseName} keeps the whole animation frame-driven: ${failure}`, async () => {
      const layout = layoutOf(leaves, { ...options, name: 'frame' });
      const tag = await renderBox({ layout, ...box });
      await render(<Scene left={END_LEFT} layout={layout} {...box} />);
      await wait(DURATION * 1.5);

      const events = (await takeTraceOf(tag)).filter(
        (event) => event.event !== 'FrameUpdateMounted'
      );
      expect(summarize(events)).toBe(`LayoutBuildFailed:${failure}`);
      expect(builderCalls).toBe(1);
      const leaf = leaves.originX;
      const isFinite = !Number.isNaN(
        (leaf?.duration ?? 0) +
          (leaf?.initial === 'none' ? 0 : (leaf?.initial ?? 0))
      );
      if (leaf && isFinite && !leaf.to) {
        expect(callbacks.join()).toBe('frame:true');
        const { model } = await sample(tag, 'PositionX');
        expect(Math.abs(model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
      }
      await render(null);
    });
  }

  test('a size change in the commit keeps the animation frame-driven', async () => {
    const tag = await renderBox();
    await render(<Scene left={END_LEFT} width={2 * BOX_SIZE} />);
    await wait(DURATION * 1.5);
    expect(
      summarize(
        (await takeTraceOf(tag)).filter(
          (event) => event.event !== 'FrameUpdateMounted'
        )
      )
    ).toBe('LayoutBuildFailed:UnsupportedTarget');
    await render(null);
  });

  const presets = {
    'LinearTransition with a linear easing': LinearTransition.duration(
      DURATION
    ).easing(Easing.linear),
    LinearTransition,
    FadingTransition,
    SequencedTransition,
    CurvedTransition,
    JumpingTransition,
    EntryExitTransition,
  };
  for (const [presetName, preset] of Object.entries(presets)) {
    test(`${presetName} stays frame-driven`, async () => {
      const tag = await renderBox({ layout: preset });
      await render(<Scene left={END_LEFT} layout={preset} />);
      await wait(50);
      const events = (await takeTraceOf(tag)).filter(
        (event) => event.event !== 'FrameUpdateMounted'
      );
      expect(events.length).toBe(1);
      expect(events[0].event).toBe('LayoutBuildFailed');
      const moving = await sample(tag, 'PositionX');
      expect(moving.model[0] < centerOf(END_LEFT)).toBe(true);
      await wait(PRESET_WAIT);
      const end = await sample(tag, 'PositionX');
      expect(Math.abs(end.model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
      await render(null);
    });
  }

  test('each negative delay wrapper counts as zero before the sum', async () => {
    const layout = layoutOf({
      originX: { delays: [-DURATION, DURATION] },
      originY: {},
    });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION / 2);
    const { presentation } = await sample(tag, 'PositionX');
    expect(
      Math.abs(presentation[0] - centerOf(START_LEFT)) < POSITION_TOLERANCE
    ).toBe(true);

    await wait(DURATION);
    const moving = await sample(tag, 'PositionX');
    expect(moving.presentation[0] > centerOf(START_LEFT)).toBe(true);
    expect(moving.presentation[0] < centerOf(END_LEFT)).toBe(true);
    await wait(DURATION);
    await render(null);
  });

  test('the start value stays on screen through the delay', async () => {
    const layout = layoutOf({ originX: { delays: [DURATION] }, originY: {} });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION / 2);

    const { model, presentation } = await sample(tag, 'PositionX');
    expect(Math.abs(model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    expect(
      Math.abs(presentation[0] - centerOf(START_LEFT)) < POSITION_TOLERANCE
    ).toBe(true);
    await wait(DURATION * 2);
    await render(null);
  });

  test('an explicit initial value is the start value', async () => {
    const layout = layoutOf({
      originX: { initial: -30, duration: 4 * DURATION },
      originY: {},
    });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION / 2);
    const pending = (await takeTraceOf(tag))[0];
    const { presentation, monotonicTimeMs } = await sample(tag, 'PositionX');
    const progress =
      (monotonicTimeMs - pending.monotonicTimeMs) / (4 * DURATION);
    const startX = centerOf(START_LEFT - 30);
    const expectedX = startX + progress * (centerOf(END_LEFT) - startX);
    expect(Math.abs(presentation[0] - expectedX) < FIRST_FRAME_TRAVEL).toBe(
      true
    );
    await render(null);
  });

  test('one command plays position and opacity', async () => {
    const layout = layoutOf({
      originX: {},
      originY: {},
      opacity: { initial: 1, to: 0.2 },
    });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} opacity={0.2} layout={layout} />);
    await wait(DURATION / 2);

    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > TrackStarted:PositionY > TrackStarted:Opacity > Admitted'
    );
    const opacity = await sample(tag, 'Opacity');
    expect(Math.abs(opacity.model[0] - 0.2) < 0.01).toBe(true);
    expect(opacity.presentation[0] > 0.2).toBe(true);
    expect(opacity.presentation[0] < 1).toBe(true);

    await wait(DURATION);
    const endEvents = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(
      endEvents
        .filter((event) => event.event === 'TrackEnded' && event.finished)
        .map((event) => event.target)
        .sort()
        .join()
    ).toBe('Opacity,PositionX,PositionY');
    expect(summarize(endEvents.slice(3))).toBe('Ended:Finished:None');
    await render(null);
  });

  test('a long constant leaf holds the callback after a short moving leaf ends', async () => {
    const layout = layoutOf(
      {
        originX: { duration: DURATION / 2 },
        opacity: { initial: 1, to: 1, duration: 2 * DURATION },
      },
      { name: 'constant' }
    );
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION);
    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackStarted:PositionX > TrackStarted:Opacity > Admitted > TrackEnded:PositionX:true'
    );
    expect(callbacks.length).toBe(0);
    await wait(DURATION * 1.5);
    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      'TrackEnded:Opacity:true > Ended:Finished:None'
    );
    expect(callbacks.join()).toBe('constant:true');
    await render(null);
  });

  test('a second native start replaces the first one from the value on screen', async () => {
    const tag = await renderBox();
    await render(<Scene left={END_LEFT} />);
    await wait(DURATION / 2);
    const firstPending = (await takeTraceOf(tag))[0];
    const firstGeneration = firstPending.generation;

    await render(<Scene left={2 * END_LEFT} />);
    await wait(DURATION / 4);
    const events = await takeTraceOf(tag);
    expect(summarize(events.filter(isHostEvent))).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackEnded:PositionX:false > Ended:Interrupted:None > TrackEnded:PositionY:false > TrackStarted:PositionX > TrackStarted:PositionY > Admitted'
    );
    expect(events[4].generation).toBe(firstGeneration);
    expect(events[0].generation > firstGeneration).toBe(true);
    // The new track starts from the value that the first track showed at the second pull.
    const secondPending = events[0];
    const firstProgress = Math.min(
      1,
      (secondPending.monotonicTimeMs - firstPending.monotonicTimeMs) / DURATION
    );
    const startX =
      centerOf(START_LEFT) + firstProgress * (END_LEFT - START_LEFT);
    const replaced = await sample(tag, 'PositionX');
    const { presentation, monotonicTimeMs } = replaced;
    expect(replaced.playbackKeys.length).toBe(2);
    expect(playbackCountOf(replaced, secondPending.generation)).toBe(2);
    const progress =
      (monotonicTimeMs - secondPending.monotonicTimeMs) / DURATION;
    const expectedX = startX + progress * (centerOf(2 * END_LEFT) - startX);
    expect(Math.abs(presentation[0] - expectedX) < 2 * FIRST_FRAME_TRAVEL).toBe(
      true
    );

    await wait(DURATION);
    expect(summarizeEnd(await takeTraceOf(tag))).toBe(NATIVE_END);
    await render(null);
  });

  test('a short new Y keeps the long X: one false, then true after X ends', async () => {
    const layout = layoutOf(
      {
        originX: { duration: 3 * DURATION, onlyWhenChanged: true },
        originY: { onlyWhenChanged: true },
      },
      { name: 'group' }
    );
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} top={END_TOP} layout={layout} />);
    await wait(DURATION / 4);
    const firstGeneration = (await takeTraceOf(tag))[0].generation;

    await render(<Scene left={END_LEFT} top={0} layout={layout} />);
    await wait(DURATION * 1.5);
    const events = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarize(events)).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackEnded:PositionY:false > Ended:Interrupted:None > TrackStarted:PositionY > Admitted > TrackEnded:PositionY:true > Ended:Finished:None'
    );
    expect(events[3].generation).toBe(firstGeneration);
    expect(events[7].generation > firstGeneration).toBe(true);
    expect(callbacks.join()).toBe('group:false');
    const x = await sample(tag, 'PositionX');
    expect(x.playbackKeys.length).toBe(1);
    expect(playbackCountOf(x, firstGeneration)).toBe(1);
    expect(x.presentation[0] < centerOf(END_LEFT)).toBe(true);

    await wait(2 * DURATION);
    const lateEvents = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarize(lateEvents)).toBe('TrackEnded:PositionX:true');
    expect(lateEvents[0].generation).toBe(firstGeneration);
    expect(callbacks.join()).toBe('group:false,group:true');
    await render(null);
  });

  test('the long X stays through two replacements of Y and its first frame-driven update names its command', async () => {
    const layout = layoutOf(
      {
        originX: { duration: 4 * DURATION, onlyWhenChanged: true },
        originY: { onlyWhenChanged: true },
      },
      { name: 'twice' }
    );
    const spring = layoutOf({ originX: { isSpring: true } });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} top={END_TOP} layout={layout} />);
    await wait(DURATION / 4);
    const firstGeneration = (await takeTraceOf(tag))[0].generation;
    await render(<Scene left={END_LEFT} top={0} layout={layout} />);
    await wait(DURATION / 4);
    await render(<Scene left={END_LEFT} top={END_TOP} layout={layout} />);
    await wait(DURATION * 1.5);
    expect(callbacks.join()).toBe('twice:false,twice:false');
    const x = await sample(tag, 'PositionX');
    expect(x.presentation[0] < centerOf(END_LEFT)).toBe(true);
    await takeTraceOf(tag);

    await wait(3 * DURATION);
    const xEnd = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarize(xEnd)).toBe('TrackEnded:PositionX:true');
    expect(xEnd[0].generation).toBe(firstGeneration);
    expect(callbacks.join()).toBe('twice:false,twice:false,twice:true');

    await render(<Scene left={END_LEFT} top={END_TOP} layout={spring} />);
    await render(<Scene left={START_LEFT} top={END_TOP} layout={spring} />);
    await wait(DURATION);
    const frameUpdates = (await takeTraceOf(tag)).filter(
      (event) => event.event === 'FrameUpdateMounted'
    );
    expect(summarize(frameUpdates)).toBe('FrameUpdateMounted:PositionX');
    expect(frameUpdates[0].generation).toBe(firstGeneration);
    await render(null);
  });

  test('the client gets the reports of two starts with no wait between them in admission order', async () => {
    const tag = await renderBox();
    await render(<Scene left={END_LEFT} />);
    await render(<Scene left={2 * END_LEFT} />);
    await wait(DURATION * 1.5);

    const reports = (await takeTraceOf(tag)).filter(isClientReport);
    expect(summarize(reports)).toBe(
      'ClientAdmitted > ClientEnded:Interrupted:None > ClientAdmitted > ClientEnded:Finished:None'
    );
    expect(reports[1].generation).toBe(reports[0].generation);
    expect(reports[2].generation > reports[0].generation).toBe(true);
    expect(reports[3].generation).toBe(reports[2].generation);
    await render(null);
  });

  test('the removal of the view cancels each track and gives the callback false one time', async () => {
    const layout = layoutOf({ originX: {}, originY: {} }, { name: 'removed' });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION / 4);
    await takeTraceOf(tag);

    await render(<Scene left={END_LEFT} layout={layout} isMounted={false} />);
    await wait(DURATION);
    const ends = (await takeTraceOf(tag)).filter(
      (event) => event.event === 'Ended'
    );
    expect(ends.length).toBe(1);
    expect(callbacks.join()).toBe('removed:false');
    await render(null);
  });

  test('the removal of the view right after its start ends the command one time', async () => {
    const layout = layoutOf({ originX: {}, originY: {} }, { name: 'removed' });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await render(<Scene left={END_LEFT} layout={layout} isMounted={false} />);
    await wait(DURATION);
    const ends = (await takeTraceOf(tag)).filter(
      (event) => event.event === 'Ended'
    );
    expect(ends.length).toBe(1);
    expect(callbacks.join()).toBe('removed:false');
    await render(null);
  });

  test('a later commit with no layout change keeps the playback and the endpoint', async () => {
    const tag = await renderBox();
    await render(<Scene left={END_LEFT} />);
    await render(<Scene left={END_LEFT} opacity={0.5} />);
    await wait(DURATION / 2);
    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      NATIVE_START
    );
    const { model, presentation } = await sample(tag, 'PositionX');
    expect(Math.abs(model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    expect(presentation[0] < centerOf(END_LEFT)).toBe(true);

    await wait(DURATION);
    expect(summarizeEnd(await takeTraceOf(tag))).toBe(NATIVE_END);
    await render(null);
  });

  test('a frame-driven start during native playback cancels the group: false one time, then the frame-driven result', async () => {
    const layout = layoutOf(
      {
        originX: { duration: 3 * DURATION, onlyWhenChanged: true },
        originY: { isSpring: true, onlyWhenChanged: true },
      },
      { name: 'mixed' }
    );
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION);
    const nativeGeneration = (await takeTraceOf(tag))[0].generation;
    const before = await sample(tag, 'PositionX');
    expect(before.presentation[0] < centerOf(END_LEFT)).toBe(true);

    await render(<Scene left={END_LEFT} top={END_TOP} layout={layout} />);
    await wait(100);
    const events = await takeTraceOf(tag);
    expect(summarize(events)).toBe(
      'LayoutBuildFailed:UnsupportedTiming > TrackEnded:PositionX:false > Ended:Cancelled:None > ClientEnded:Cancelled:None'
    );
    expect(events[1].generation).toBe(nativeGeneration);
    expect(callbacks[0]).toBe('mixed:false');
    // The limit that Objective 09 removes: the X value on screen goes to the model value at the cancel.
    const after = await sample(tag, 'PositionX');
    expect(after.playbackKeys.length).toBe(0);
    expect(Math.abs(after.presentation[0] - centerOf(END_LEFT)) < 0.01).toBe(
      true
    );

    await wait(4 * DURATION);
    expect(callbacks.join()).toBe('mixed:false,mixed:true');
    expect((await takeTraceOf(tag)).filter(isHostEvent).length).toBe(0);
    await render(null);
  });

  test('the first frame-driven update after a native command is identified at its mount', async () => {
    const spring = layoutOf({ originX: { isSpring: true } });
    const tag = await renderBox();
    await render(<Scene left={END_LEFT} />);
    await wait(DURATION * 1.5);
    const nativeGeneration = (await takeTraceOf(tag))[0].generation;

    await render(<Scene left={END_LEFT} layout={spring} />);
    await render(<Scene left={START_LEFT} layout={spring} />);
    await wait(DURATION);
    const events = (await takeTraceOf(tag)).filter(
      (event) => event.event === 'FrameUpdateMounted'
    );
    expect(summarize(events)).toBe('FrameUpdateMounted:PositionX');
    expect(events[0].generation).toBe(nativeGeneration);
    expect(events[0].transactionNumber !== undefined).toBe(true);
    await render(null);
  });

  test('each of many starts plays from the start value on the timeline of its pull', async () => {
    const tag = await renderBox();
    let left = START_LEFT;
    for (let run = 0; run < REPEATED_STARTS; run++) {
      const startCenter = centerOf(left);
      left = left === START_LEFT ? END_LEFT : START_LEFT;
      await render(<Scene left={left} />);
      await wait(DURATION / 4);
      const pending = (await takeTraceOf(tag)).find(
        (event) => event.event === 'LayoutStartPending'
      );
      const { presentation, monotonicTimeMs } = await sample(tag, 'PositionX');
      const progress = (monotonicTimeMs - pending!.monotonicTimeMs) / DURATION;
      const expectedX = startCenter + progress * (centerOf(left) - startCenter);
      expect(Math.abs(presentation[0] - expectedX) < FIRST_FRAME_TRAVEL).toBe(
        true
      );
      await wait(DURATION);
    }
    await render(null);
  });

  test('all starts of one large mount use one time origin', async () => {
    const count = ROW_REFS.length;
    await render(<Row left={START_LEFT} count={count} />);
    await wait(50);
    const tags = ROW_REFS.map((refName) => getTestComponent(refName).getTag());
    await takeTrace();
    await render(<Row left={END_LEFT} count={count} />);
    await wait(DURATION);

    const events = await takeTrace();
    const mounted = events.filter(
      (event) => event.event === 'LayoutStartMounted'
    );
    expect(mounted.length).toBe(count);
    expect(new Set(mounted.map((event) => event.transactionNumber)).size).toBe(
      1
    );
    expect(events.filter((event) => event.event === 'Admitted').length).toBe(
      count
    );
    // Each sample has its own time, so compare the time at which each track was at its start value.
    const speed = (END_LEFT - START_LEFT) / (4 * DURATION);
    const origins: number[] = [];
    for (const tag of tags) {
      const { presentation, monotonicTimeMs } = await sample(tag, 'PositionX');
      origins.push(
        monotonicTimeMs - (presentation[0] - centerOf(START_LEFT)) / speed
      );
    }
    expect(Math.max(...origins) - Math.min(...origins) < FRAME_MS).toBe(true);
    await wait(4 * DURATION);
    await render(null);
  });

  test('three starts give false, false, and true', async () => {
    const layout = layoutOf({ originX: {}, originY: {} }, { name: 'chain' });
    await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION / 4);
    await render(<Scene left={2 * END_LEFT} layout={layout} />);
    await wait(DURATION / 4);
    await render(<Scene left={START_LEFT} layout={layout} />);
    await wait(DURATION * 1.5);
    expect(callbacks.join()).toBe('chain:false,chain:false,chain:true');
    expect(builderCalls).toBe(3);
    await render(null);
  });

  test('the removal of the view after a replacement stops the old and the new tracks', async () => {
    const layout = layoutOf(
      {
        originX: { duration: 3 * DURATION, onlyWhenChanged: true },
        originY: { duration: 3 * DURATION, onlyWhenChanged: true },
      },
      { name: 'adopted' }
    );
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} top={END_TOP} layout={layout} />);
    await wait(DURATION / 4);
    await render(<Scene left={END_LEFT} top={0} layout={layout} />);
    await wait(DURATION / 4);
    await takeTraceOf(tag);

    await render(<Scene left={END_LEFT} layout={layout} isMounted={false} />);
    await wait(DURATION / 2);
    const events = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(
      events
        .filter((event) => event.event === 'TrackEnded')
        .map((event) => event.target)
        .sort()
        .join()
    ).toBe('PositionX,PositionY');
    expect(new Set(events.map((event) => event.generation)).size).toBe(2);
    expect(callbacks.join()).toBe('adopted:false,adopted:false');
    await render(null);
  });

  test('a start during a frame-driven animation of the view stays frame-driven', async () => {
    const spring = layoutOf(
      { originX: { isSpring: true } },
      { name: 'spring' }
    );
    const move = layoutOf({ originX: {}, originY: {} }, { name: 'move' });
    const tag = await renderBox({ layout: spring });
    await render(<Scene left={END_LEFT} layout={spring} />);
    await wait(50);
    await takeTraceOf(tag);

    await render(<Scene left={END_LEFT} layout={move} />);
    await render(<Scene left={START_LEFT} layout={move} />);
    await wait(DURATION * 1.5);
    expect(
      (await takeTraceOf(tag)).filter(
        (event) => event.event !== 'FrameUpdateMounted'
      ).length
    ).toBe(0);
    expect(callbacks.join()).toBe('spring:false,move:true');
    expect(builderCalls).toBe(2);
    const { model } = await sample(tag, 'PositionX');
    expect(Math.abs(model[0] - centerOf(START_LEFT)) < 0.01).toBe(true);
    await render(null);
  });

  test('a view in a Modal starts after its mount', async () => {
    await render(<ModalScene left={START_LEFT} />);
    await wait(300);
    const tag = getTestComponent(BOX_REF).getTag();
    await takeTrace();
    await render(<ModalScene left={END_LEFT} />);
    await wait(DURATION / 2);

    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      NATIVE_START
    );
    const { model, presentation } = await sample(tag, 'PositionX');
    expect(Math.abs(model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    expect(presentation[0] < centerOf(END_LEFT)).toBe(true);

    await wait(DURATION);
    expect(summarizeEnd(await takeTraceOf(tag))).toBe(NATIVE_END);
    await render(null);
    await wait(300);
  });
});

describe('native layout starts with no duration', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  const NATIVE_START_AND_END = `${NATIVE_START} > TrackEnded:PositionX:true > TrackEnded:PositionY:true > Ended:Finished:None`;

  test('a delay holds the start value, then the endpoint shows and the callback gets true', async () => {
    // The Y track has the timeline end of the hold, so its end report is the time reference.
    const layout = layoutOf(
      { originX: { duration: 0, delays: [DURATION] }, originY: {} },
      { name: 'hold' }
    );
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION / 2);

    const startEvents = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarize(startEvents)).toBe(NATIVE_START);
    const held = await sample(tag, 'PositionX');
    expect(playbackCountOf(held, startEvents[0].generation)).toBe(2);
    expect(Math.abs(held.model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    expect(Math.abs(held.presentation[0] - centerOf(START_LEFT)) < 0.01).toBe(
      true
    );
    expect(callbacks.length).toBe(0);

    await wait(DURATION);
    const endEvents = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarizeEnd(endEvents)).toBe(NATIVE_END);
    const endTimeOf = (target: string) =>
      endEvents.find((event) => event.target === target)!.monotonicTimeMs;
    const holdEnd = endTimeOf('PositionX');
    expect(holdEnd - startEvents[0].monotonicTimeMs > DURATION - FRAME_MS).toBe(
      true
    );
    expect(Math.abs(holdEnd - endTimeOf('PositionY')) < FRAME_MS).toBe(true);
    const end = await sample(tag, 'PositionX');
    expect(end.playbackKeys.length).toBe(0);
    expect(Math.abs(end.presentation[0] - centerOf(END_LEFT)) < 0.01).toBe(
      true
    );
    expect(callbacks.join()).toBe('hold:true');
    await render(null);
  });

  test('each negative delay wrapper counts as zero before the hold', async () => {
    const leaf = { duration: 0, delays: [-DURATION, DURATION] };
    const layout = layoutOf({ originX: leaf, originY: leaf });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION / 2);
    const held = await sample(tag, 'PositionX');
    expect(Math.abs(held.presentation[0] - centerOf(START_LEFT)) < 0.01).toBe(
      true
    );
    await wait(DURATION);
    expect(summarizeEnd(await takeTraceOf(tag))).toBe(SORTED_START_AND_END);
    await render(null);
  });

  test('no delay ends each track with the admission and starts no playback', async () => {
    const leaf = { duration: 0 };
    const layout = layoutOf({ originX: leaf, originY: leaf }, { name: 'now' });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(50);

    const events = await takeTraceOf(tag);
    expect(summarize(events.filter(isHostEvent))).toBe(NATIVE_START_AND_END);
    expect(summarize(events.filter(isClientReport))).toBe(
      'ClientAdmitted > ClientEnded:Finished:None'
    );
    const { model, presentation, playbackKeys } = await sample(
      tag,
      'PositionX'
    );
    expect(playbackKeys.length).toBe(0);
    expect(Math.abs(model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    expect(Math.abs(presentation[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    expect(callbacks.join()).toBe('now:true');
    expect(builderCalls).toBe(1);
    await render(null);
  });

  test('a track with no duration ends with the admission and the other track of its command plays', async () => {
    const layout = layoutOf(
      { originX: { duration: 0 }, originY: {} },
      { name: 'mixed' }
    );
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} top={END_TOP} layout={layout} />);
    await wait(DURATION / 2);

    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      `${NATIVE_START} > TrackEnded:PositionX:true`
    );
    const x = await sample(tag, 'PositionX');
    expect(x.playbackKeys.length).toBe(1);
    expect(Math.abs(x.presentation[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    const y = await sample(tag, 'PositionY');
    expect(y.presentation[0] > y.model[0] - END_TOP).toBe(true);
    expect(y.presentation[0] < y.model[0]).toBe(true);
    expect(callbacks.length).toBe(0);

    await wait(DURATION);
    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      'TrackEnded:PositionY:true > Ended:Finished:None'
    );
    expect(callbacks.join()).toBe('mixed:true');
    await render(null);
  });

  test('a start with no duration replaces a playing command: false, then true, and the endpoint shows', async () => {
    const first = layoutOf(
      { originX: { duration: 4 * DURATION }, originY: {} },
      { name: 'first' }
    );
    const second = layoutOf(
      { originX: { duration: 0 }, originY: { duration: 0 } },
      { name: 'second' }
    );
    const tag = await renderBox({ layout: first });
    await render(<Scene left={END_LEFT} layout={first} />);
    await wait(DURATION / 2);
    await takeTrace();

    await render(<Scene left={2 * END_LEFT} layout={second} />);
    await wait(50);
    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      `LayoutStartPending > LayoutStartMounted > Received > TrackEnded:PositionX:false > Ended:Interrupted:None > TrackEnded:PositionY:false > ${NATIVE_START_AND_END.replace('LayoutStartPending > LayoutStartMounted > Received > ', '')}`
    );
    const { presentation, playbackKeys } = await sample(tag, 'PositionX');
    expect(playbackKeys.length).toBe(0);
    expect(Math.abs(presentation[0] - centerOf(2 * END_LEFT)) < 0.01).toBe(
      true
    );
    expect(callbacks.join()).toBe('first:false,second:true');
    await render(null);
  });

  // The value that the replaced track showed stays for the delay. Objective 09 gives the transfer rule.
  test('a hold that replaces a playing track keeps the value on screen through its delay', async () => {
    const first = layoutOf({
      originX: { duration: 4 * DURATION },
      originY: {},
    });
    const leaf = { duration: 0, delays: [DURATION] };
    const second = layoutOf({ originX: leaf, originY: leaf }, { name: 'hold' });
    const tag = await renderBox({ layout: first });
    await render(<Scene left={END_LEFT} layout={first} />);
    await wait(DURATION);

    await render(<Scene left={2 * END_LEFT} layout={second} />);
    await wait(DURATION / 4);
    const early = await sample(tag, 'PositionX');
    await wait(DURATION / 2);
    const late = await sample(tag, 'PositionX');
    expect(early.presentation[0] > centerOf(START_LEFT)).toBe(true);
    expect(early.presentation[0] < centerOf(END_LEFT)).toBe(true);
    expect(Math.abs(late.presentation[0] - early.presentation[0]) < 0.01).toBe(
      true
    );
    expect(callbacks.length).toBe(0);

    await wait(DURATION / 2);
    const end = await sample(tag, 'PositionX');
    expect(Math.abs(end.presentation[0] - centerOf(2 * END_LEFT)) < 0.01).toBe(
      true
    );
    expect(callbacks.join()).toBe('hold:true');
    await render(null);
  });

  test('a new Y with no duration replaces the playing Y and keeps the long X: one false, then true after X ends', async () => {
    const long = { duration: 3 * DURATION, onlyWhenChanged: true };
    const first = layoutOf({ originX: long, originY: long }, { name: 'first' });
    const second = layoutOf(
      { originX: long, originY: { duration: 0, onlyWhenChanged: true } },
      { name: 'second' }
    );
    const tag = await renderBox({ layout: first });
    await render(<Scene left={END_LEFT} top={END_TOP} layout={first} />);
    await wait(DURATION / 4);
    const firstGeneration = (await takeTraceOf(tag))[0].generation;

    await render(<Scene left={END_LEFT} top={0} layout={second} />);
    await wait(DURATION / 2);
    const events = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarize(events)).toBe(
      'LayoutStartPending > LayoutStartMounted > Received > TrackEnded:PositionY:false > Ended:Interrupted:None > TrackStarted:PositionY > Admitted > TrackEnded:PositionY:true > Ended:Finished:None'
    );
    expect(events[3].generation).toBe(firstGeneration);
    expect(callbacks.join()).toBe('first:false');
    const x = await sample(tag, 'PositionX');
    expect(x.playbackKeys.length).toBe(1);
    expect(playbackCountOf(x, firstGeneration)).toBe(1);
    expect(x.presentation[0] < centerOf(END_LEFT)).toBe(true);

    await wait(3 * DURATION);
    const lateEvents = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarize(lateEvents)).toBe('TrackEnded:PositionX:true');
    expect(lateEvents[0].generation).toBe(firstGeneration);
    expect(callbacks.join()).toBe('first:false,second:true');
    expect((await sample(tag, 'PositionX')).playbackKeys.length).toBe(0);
    await render(null);
  });
});

describe('a native layout start that is late on its timeline', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  const TRAVEL = END_LEFT - START_LEFT;
  const LATE_DURATION = 4 * DURATION;
  const FRAME_TRAVEL = (FRAME_MS * TRAVEL) / LATE_DURATION;

  // The builder ends when the pull records the pending start, so the origin is `blocksForMs` before that
  // event, and earlier by the time from the frame timestamp to the builder call.
  async function sampleLateStart(tag: number, blocksForMs: number) {
    const pending = (await takeTraceOf(tag)).find(
      (event) => event.event === 'LayoutStartPending'
    );
    const { presentation, monotonicTimeMs } = await sample(tag, 'PositionX');
    return {
      x: presentation[0],
      leastElapsedMs: monotonicTimeMs - pending!.monotonicTimeMs + blocksForMs,
    };
  }

  test('a start that is late by less than its duration continues at the elapsed time', async () => {
    const blocksForMs = DURATION;
    const duration = LATE_DURATION;
    const layout = layoutOf(
      { originX: { duration }, originY: { duration } },
      { blocksForMs }
    );
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    const { x, leastElapsedMs } = await sampleLateStart(tag, blocksForMs);
    const leastX = centerOf(START_LEFT) + (leastElapsedMs / duration) * TRAVEL;
    expect(x > leastX - POSITION_TOLERANCE).toBe(true);
    expect(x < leastX + FRAME_TRAVEL + POSITION_TOLERANCE).toBe(true);
    await wait(duration);
    await render(null);
  });

  test('a delay that is over at admission does not run again', async () => {
    const blocksForMs = DURATION;
    const duration = LATE_DURATION;
    const leaf = { duration, delays: [DURATION / 2] };
    const layout = layoutOf({ originX: leaf, originY: leaf }, { blocksForMs });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    const { x, leastElapsedMs } = await sampleLateStart(tag, blocksForMs);
    const leastX =
      centerOf(START_LEFT) +
      ((leastElapsedMs - DURATION / 2) / duration) * TRAVEL;
    expect(x > leastX - POSITION_TOLERANCE).toBe(true);
    expect(x < leastX + FRAME_TRAVEL + POSITION_TOLERANCE).toBe(true);
    await wait(duration);
    await render(null);
  });

  test('a timeline that is over at admission ends with true and shows the endpoint', async () => {
    const layout = layoutOf(
      { originX: { delays: [DURATION / 4] }, originY: {} },
      { name: 'late', blocksForMs: 2 * DURATION }
    );
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    const { presentation } = await sample(tag, 'PositionX');
    expect(Math.abs(presentation[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    await wait(100);
    expect((await sample(tag, 'PositionX')).playbackKeys.length).toBe(0);
    const events = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarizeEnd(events)).toBe(SORTED_START_AND_END);
    expect(callbacks.join()).toBe('late:true');
    await render(null);
  });

  test('a hold that is over at admission ends with true and shows the endpoint', async () => {
    const leaf = { duration: 0, delays: [DURATION / 4] };
    const layout = layoutOf(
      { originX: leaf, originY: leaf },
      { name: 'late', blocksForMs: DURATION }
    );
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    const { presentation } = await sample(tag, 'PositionX');
    expect(Math.abs(presentation[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
    await wait(100);
    expect((await sample(tag, 'PositionX')).playbackKeys.length).toBe(0);
    const events = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(summarizeEnd(events)).toBe(SORTED_START_AND_END);
    expect(callbacks.join()).toBe('late:true');
    await render(null);
  });
});

const FRAME_BOX_REF = 'NativeLayoutStartFrameDrivenBox';
const PAIR_DURATION = 3000;
const PAIR_LEFT = 200;
const PAIR_TOP = 60;
const START_OPACITY = 1;
const END_OPACITY = 0.2;
const OPACITY_TOLERANCE = 0.01;

type PairProps = {
  left: number;
  top: number;
  opacity: number;
  nativeLayout: LayoutAnimationFunction;
  frameLayout: LayoutAnimationFunction;
};

function Pair({ nativeLayout, frameLayout, ...box }: PairProps) {
  return (
    <View>
      <View style={styles.pairCell}>
        <Box {...box} layout={nativeLayout} />
      </View>
      <View style={styles.pairCell}>
        <Box {...box} layout={frameLayout} refName={FRAME_BOX_REF} />
      </View>
    </View>
  );
}

const curveOf = (easing: EasingFunction | EasingFunctionFactory) =>
  typeof easing === 'function' ? easing : easing.factory();

describe('native layout timing against the curve and the frame driver', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  // X and the opacity have the curve. Y is linear in the same command, so it gives the progress of the
  // timeline at the instant of each sample.
  function pairLayouts(
    easing: EasingFunction | EasingFunctionFactory,
    hasOpacity: boolean
  ) {
    const leavesOf = (hasCallback: boolean): Partial<Record<Key, Leaf>> => ({
      originX: { duration: PAIR_DURATION, easing },
      originY: { duration: PAIR_DURATION, hasCallback },
      ...(hasOpacity && {
        opacity: {
          duration: PAIR_DURATION,
          easing,
          initial: START_OPACITY,
          to: END_OPACITY,
        },
      }),
    });
    return {
      nativeLayout: layoutOf(leavesOf(false), { name: 'native' }),
      frameLayout: layoutOf(leavesOf(true), { name: 'frame' }),
    };
  }

  // The four samples are next to each other in the host queue.
  async function samplePair() {
    const nativeTag = getTestComponent(BOX_REF).getTag();
    const frameTag = getTestComponent(FRAME_BOX_REF).getTag();
    const [position, opacity, framePosition, frameOpacity] = await Promise.all([
      sample(nativeTag, 'Position'),
      sample(nativeTag, 'Opacity'),
      sample(frameTag, 'Position'),
      sample(frameTag, 'Opacity'),
    ]);
    return {
      x: position.presentation[0],
      y: position.presentation[1],
      opacity: opacity.presentation[0],
      frameX: framePosition.model[0],
      frameOpacity: frameOpacity.model[0],
      endX: position.model[0],
      endY: position.model[1],
    };
  }

  async function renderPair(layouts: ReturnType<typeof pairLayouts>) {
    await render(
      <Pair left={START_LEFT} top={0} opacity={START_OPACITY} {...layouts} />
    );
    await wait(50);
    await takeTrace();
    callbacks.length = 0;
    return samplePair();
  }

  const isBetween = (
    value: number,
    first: number,
    second: number,
    tolerance: number
  ) =>
    value > Math.min(first, second) - tolerance &&
    value < Math.max(first, second) + tolerance;

  const curves: [string, EasingFunction | EasingFunctionFactory, boolean][] = [
    ['Easing.linear', Easing.linear, true],
    ['Easing.ease', Easing.ease, true],
    [
      'Easing.bezier(0.25, 0.1, 0.25, 1)',
      Easing.bezier(0.25, 0.1, 0.25, 1),
      true,
    ],
    ['Easing.bezier(0.7, 0, 0.3, 1)', Easing.bezier(0.7, 0, 0.3, 1), false],
  ];
  for (const [curveName, easing, hasOpacity] of curves) {
    test(`${curveName}: the native values are on the curve and the frame driver is one frame or less from it`, async () => {
      const layouts = pairLayouts(easing, hasOpacity);
      const start = await renderPair(layouts);
      const endOpacity = hasOpacity ? END_OPACITY : START_OPACITY;
      await render(
        <Pair
          left={PAIR_LEFT}
          top={PAIR_TOP}
          opacity={endOpacity}
          {...layouts}
        />
      );

      const curve = curveOf(easing);
      const xAt = (progress: number) =>
        start.x + curve(progress) * (PAIR_LEFT - START_LEFT);
      const opacityAt = (progress: number) =>
        START_OPACITY + curve(progress) * (endOpacity - START_OPACITY);
      const frameProgress = FRAME_MS / PAIR_DURATION;

      for (let checkpoint = 0; checkpoint < 8; checkpoint++) {
        const { x, y, opacity, frameX, frameOpacity, endX, endY } =
          await samplePair();
        expect(Math.abs(endX - start.x - (PAIR_LEFT - START_LEFT)) < 0.01).toBe(
          true
        );
        const progress = (y - start.y) / (endY - start.y);
        expect(progress >= 0 && progress < 1).toBe(true);
        expect(Math.abs(x - xAt(progress)) < POSITION_TOLERANCE).toBe(true);
        expect(
          Math.abs(opacity - opacityAt(progress)) < OPACITY_TOLERANCE
        ).toBe(true);
        const frameBefore = Math.max(0, progress - frameProgress);
        const frameAfter = Math.min(1, progress + frameProgress);
        expect(
          isBetween(
            frameX,
            xAt(frameBefore),
            xAt(frameAfter),
            POSITION_TOLERANCE
          )
        ).toBe(true);
        expect(
          isBetween(
            frameOpacity,
            opacityAt(frameBefore),
            opacityAt(frameAfter),
            OPACITY_TOLERANCE
          )
        ).toBe(true);
        await wait(PAIR_DURATION / 9);
      }

      await wait(PAIR_DURATION / 4);
      const end = await samplePair();
      expect(Math.abs(end.x - end.endX) < 0.01).toBe(true);
      expect(Math.abs(end.frameX - end.endX) < 0.01).toBe(true);
      expect(Math.abs(end.opacity - endOpacity) < 0.01).toBe(true);
      expect([...callbacks].sort().join()).toBe('frame:true,native:true');
      expect(
        Math.abs(callbackTimes.native - callbackTimes.frame) < FRAME_MS
      ).toBe(true);
      await render(null);
    });
  }

  test('a replacement during playback continues both drivers from one value within the travel of one frame', async () => {
    const layouts = pairLayouts(Easing.linear, false);
    await renderPair(layouts);
    await render(
      <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...layouts} />
    );
    await wait(PAIR_DURATION / 3);
    await render(
      <Pair left={PAIR_LEFT / 4} top={0} opacity={1} {...layouts} />
    );

    // The native start reads the value on screen at its admission. The frame driver has the value of its
    // last frame before the pull.
    const startTolerance =
      POSITION_TOLERANCE + (FRAME_MS * PAIR_LEFT) / PAIR_DURATION;
    for (let checkpoint = 0; checkpoint < 4; checkpoint++) {
      const { x, frameX } = await samplePair();
      expect(Math.abs(x - frameX) < startTolerance).toBe(true);
      await wait(PAIR_DURATION / 5);
    }
    await wait(PAIR_DURATION / 2);
    const end = await samplePair();
    expect(Math.abs(end.x - end.endX) < 0.01).toBe(true);
    expect(Math.abs(end.frameX - end.endX) < 0.01).toBe(true);
    expect([...callbacks].sort().join()).toBe(
      'frame:false,frame:true,native:false,native:true'
    );
    await render(null);
  });

  test('the removal of the views during playback gives both drivers false one time', async () => {
    const layouts = pairLayouts(Easing.linear, false);
    await renderPair(layouts);
    await render(
      <Pair left={PAIR_LEFT} top={PAIR_TOP} opacity={1} {...layouts} />
    );
    await wait(PAIR_DURATION / 3);
    await render(null);
    await wait(100);
    expect([...callbacks].sort().join()).toBe('frame:false,native:false');
  });
});

describe('layout animations with the native route off', () => {
  if (
    Platform.OS !== 'ios' ||
    getStaticFeatureFlag('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION') ||
    devTools.takeNativeAnimationTrace === undefined
  ) {
    return;
  }

  test('a builder of the native subset runs one time and stays frame-driven', async () => {
    const layout = layoutOf({ originX: {}, originY: {} }, { name: 'off' });
    const tag = await renderBox({ layout });
    await render(<Scene left={END_LEFT} layout={layout} />);
    await wait(DURATION * 1.5);
    expect((await takeTraceOf(tag)).length).toBe(0);
    expect(builderCalls).toBe(1);
    expect(callbacks.join()).toBe('off:true');
    await render(null);
  });
});

const FOLLOWER_REF = 'NativeLayoutStartFollower';
const FOLLOWER_LAYOUT = layoutOf({
  originX: { duration: 3 * DURATION },
  originY: {},
});
const FOLLOWER_SPRING = layoutOf({ originX: { isSpring: true } });

type UIRuntimeGlobal = {
  __mapperRun?: () => void;
  _maybeFlushUIUpdatesQueue: () => void;
};

// The callback of the leader moves the follower with an animated style and commits it in the same turn.
function ReentryScene({
  left,
  followerLayout,
}: {
  left: number;
  followerLayout: LayoutAnimationFunction;
}) {
  const followerLeft = useSharedValue(START_LEFT);
  const followerRef = useTestRef(FOLLOWER_REF);
  const followerStyle = useAnimatedStyle(() => ({
    marginLeft: followerLeft.value,
  }));
  const leaderLayout = React.useMemo<LayoutAnimationFunction>(
    () => (values) => {
      'worklet';
      return {
        initialValues: { originX: values.currentOriginX },
        animations: {
          originX: withTiming(values.targetOriginX, {
            duration: DURATION,
            easing: Easing.linear,
          }),
        },
        callback: () => {
          'worklet';
          followerLeft.value = followerLeft.value + END_LEFT;
          const uiGlobal = globalThis as unknown as UIRuntimeGlobal;
          uiGlobal.__mapperRun?.();
          uiGlobal._maybeFlushUIUpdatesQueue();
        },
      };
    },
    [followerLeft]
  );
  return (
    <View style={styles.container}>
      <Box left={left} layout={leaderLayout} />
      <Animated.View
        ref={followerRef}
        layout={followerLayout}
        style={[styles.box, followerStyle]}
      />
    </View>
  );
}

describe('native layout starts from a client callback', () => {
  if (!hasNativeLayoutStarts || getStaticFeatureFlag('USE_ANIMATION_BACKEND')) {
    return;
  }

  test('a commit inside a callback starts the next command inside the host report', async () => {
    await render(
      <ReentryScene left={START_LEFT} followerLayout={FOLLOWER_LAYOUT} />
    );
    await wait(50);
    const leaderTag = getTestComponent(BOX_REF).getTag();
    const followerTag = getTestComponent(FOLLOWER_REF).getTag();
    await takeTrace();

    await render(
      <ReentryScene left={END_LEFT} followerLayout={FOLLOWER_LAYOUT} />
    );
    await wait(DURATION * 1.5);
    const events = await takeTrace();
    const indexOf = (tag: number, name: string) =>
      events.findIndex((event) => event.tag === tag && event.event === name);
    const leaderResult = indexOf(leaderTag, 'ClientEnded');
    const followerStart = indexOf(followerTag, 'Admitted');
    expect(followerStart > indexOf(leaderTag, 'Ended')).toBe(true);
    expect(followerStart < leaderResult).toBe(true);
    expect(indexOf(followerTag, 'ClientAdmitted') > leaderResult).toBe(true);
    expect(events[leaderResult].outcome).toBe('Finished');

    // The second callback run cancels the playing follower from inside a host report.
    await render(
      <ReentryScene left={START_LEFT} followerLayout={FOLLOWER_SPRING} />
    );
    await wait(DURATION * 1.5);
    const nestedEvents = await takeTrace();
    const followerEvents = nestedEvents.filter(
      (event) => event.tag === followerTag
    );
    expect(
      summarize(
        followerEvents.filter(
          (event) =>
            event.event === 'LayoutBuildFailed' || event.event === 'Ended'
        )
      )
    ).toBe('LayoutBuildFailed:UnsupportedTiming > Ended:Cancelled:None');
    await wait(3 * DURATION);
    await render(null);
  });
});

describe('native layout starts on two surfaces', () => {
  if (!hasNativeLayoutStarts || !isSecondSurfaceAvailable()) {
    return;
  }

  test('each surface starts its own command', async () => {
    const tag = await renderBox();
    const secondSurfaceId = await startSecondSurface(SecondSurfaceScene);
    const secondTag = getTestComponent(SECOND_BOX_REF).getTag();

    await render(<Scene left={END_LEFT} />);
    setSecondSurfaceLeft(END_LEFT);
    await wait(DURATION * 5);

    const events = (await takeTrace()).filter(
      (event) => event.owner === 'Layout' && event.event === 'Ended'
    );
    const first = events.find((event) => event.tag === tag);
    const second = events.find((event) => event.tag === secondTag);
    expect(first!.outcome).toBe('Finished');
    expect(second!.outcome).toBe('Finished');
    expect(second!.surfaceId).toBe(secondSurfaceId);
    expect(first!.surfaceId).not.toBe(secondSurfaceId);

    await stopSecondSurface(secondSurfaceId);
    await render(null);
  });

  test('the stop of a surface ends its active command one time and no other command', async () => {
    const tag = await renderBox({ layout: LONG_MOVE });
    const secondSurfaceId = await startSecondSurface(SecondSurfaceScene);
    const secondTag = getTestComponent(SECOND_BOX_REF).getTag();
    const cssTag = getTestComponent(SECOND_CSS_BOX_REF).getTag();

    await render(<Scene left={END_LEFT} layout={LONG_MOVE} />);
    setSecondSurfaceLeft(END_LEFT);
    setSecondSurfaceOpacity(0.2);
    await wait(DURATION * 1.5);
    await takeTrace();

    await stopSecondSurface(secondSurfaceId);
    const events = (await takeTraceUntilSurfaceClosed(secondSurfaceId)).filter(
      isHostEvent
    );
    expect(
      summarize(events.filter((event) => event.event === 'SurfaceClosed'))
    ).toBe('SurfaceClosed');
    expect(
      events.filter(
        (event) => event.tag === secondTag && event.event === 'Ended'
      ).length
    ).toBe(1);
    if (getStaticFeatureFlag('IOS_CSS_CORE_ANIMATION')) {
      expect(summarize(events.filter((event) => event.tag === cssTag))).toBe(
        'TrackEnded:Opacity:false > Ended:SurfaceDestroyed:None'
      );
    }
    expect(events.filter((event) => event.tag === tag).length).toBe(0);

    await wait(4 * DURATION);
    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      'TrackEnded:PositionX:true > Ended:Finished:None'
    );
    expect((await takeTraceOf(secondTag)).length).toBe(0);
    await render(null);
  });
});

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 120,
  },
  rowItem: {
    height: 2,
  },
  pairCell: {
    height: BOX_SIZE + PAIR_TOP,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: 'teal',
  },
});
