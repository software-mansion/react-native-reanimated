import { Platform, StyleSheet, View } from 'react-native';
import type {
  EasingFunction,
  EasingFunctionFactory,
  LayoutAnimationFunction,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  getStaticFeatureFlag,
  ReduceMotion,
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
const DURATION = 400;
const POSITION_TOLERANCE = 0.5;
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
  event !== 'ClientAdmitted' && event !== 'ClientEnded';

function sample(tag: number, target: string): Promise<TargetSample> {
  return new Promise((resolve, reject) => {
    devTools.sampleNativeAnimationTarget?.(tag, target, (targetSample) =>
      targetSample ? resolve(targetSample) : reject(new Error('no view'))
    );
  });
}

const playbackCountOf = ({ playbackKeys }: TargetSample, generation: number) =>
  playbackKeys.filter((key) => key.split('.')[2] === `${generation}`).length;

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
});

const PAIR_TOP = 60;

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 120,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: 'teal',
  },
});
