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
  presentationValue?: number[];
};

type TargetSample = {
  model: number[];
  presentation: number[];
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
  event !== 'FirstFrameSampled' &&
  event !== 'ClientAdmitted' &&
  event !== 'ClientEnded';

const isClientReport = ({ event }: TraceEvent) =>
  event === 'ClientAdmitted' || event === 'ClientEnded';

function sample(tag: number, target: string): Promise<TargetSample> {
  return new Promise((resolve, reject) => {
    devTools.sampleNativeAnimationTarget?.(tag, target, (targetSample) =>
      targetSample ? resolve(targetSample) : reject(new Error('no view'))
    );
  });
}

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
function recordCallback(name: string, finished: boolean) {
  callbacks.push(`${name}:${finished}`);
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
};

function layoutOf(
  leaves: Partial<Record<Key, Leaf>>,
  { name, initialOnlyKey }: LayoutOptions = {}
): LayoutAnimationFunction {
  return (values) => {
    'worklet';
    scheduleOnRN(recordBuilderCall);
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
  { length: 40 },
  (_, index) => `NativeLayoutStartRowBox${index}`
);
const LONG_MOVE = layoutOf({
  originX: { duration: 4 * DURATION },
  originY: {},
});

function Row({ left }: { left: number }) {
  return (
    <View style={styles.container}>
      {ROW_REFS.map((refName) => (
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

    const { model, presentation, monotonicTimeMs } = await sample(
      tag,
      'PositionX'
    );
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
      'a zero duration',
      { originX: { duration: 0, delays: [100] } },
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
    const { presentation, monotonicTimeMs } = await sample(tag, 'PositionX');
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

  test('all starts of one mount use one time origin', async () => {
    await render(<Row left={START_LEFT} />);
    await wait(50);
    const tags = ROW_REFS.map((refName) => getTestComponent(refName).getTag());
    await takeTrace();
    await render(<Row left={END_LEFT} />);
    await wait(DURATION);

    const mounted = (await takeTrace()).filter(
      (event) => event.event === 'LayoutStartMounted'
    );
    expect(mounted.length).toBe(tags.length);
    expect(new Set(mounted.map((event) => event.transactionNumber)).size).toBe(
      1
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
    expect(Math.max(...origins) - Math.min(...origins) < 17).toBe(true);
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
    const events = (await takeTrace()).filter(
      (event) => event.event !== 'FirstFrameSampled'
    );
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
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: 'teal',
  },
});
