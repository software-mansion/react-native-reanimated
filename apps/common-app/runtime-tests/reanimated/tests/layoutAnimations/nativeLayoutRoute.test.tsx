import React from 'react';
import { PixelRatio, View } from 'react-native';
import type {
  EntryAnimationsValues,
  LayoutAnimationsValues,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  LinearTransition,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

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
  Playback,
  TargetSample,
  TraceEvent,
} from '../nativeAnimationObservation';
import type { SizeBoxProps } from './nativeLayoutTestKit';
import {
  BOX_REF,
  BOX_SIZE,
  callbacks,
  centerOf,
  DURATION,
  END_LEFT,
  entryExitOf,
  FRAME_MS,
  frameRecordedOf,
  hasNativeLayoutRoute,
  isHostEvent,
  isNativeLayoutRouteConfigured,
  isNear,
  isNoView,
  layoutOf,
  middleOf,
  mountScene,
  narrowClockOffset,
  NATIVE_ANIMATION_TEST_HOOKS,
  ONE_PIXEL,
  PLAYS_SIZE_CHANGE,
  playsSizeChangeOf,
  POSITION_TOLERANCE,
  readFrameRecords,
  renderBox,
  resetCallbacks,
  resetFrameRecords,
  routeOf,
  sample,
  Scene,
  SizeBox,
  SizeScene,
  START_LEFT,
  styles,
  summarize,
  takeTrace,
  takeTraceOf,
  testHookOf,
  waitForCallbacks,
  movingGeometryTest,
} from './nativeLayoutTestKit';

describe('native layout route: the test hooks', () => {
  for (const name of NATIVE_ANIMATION_TEST_HOOKS) {
    test(`the native animation test hook ${name} exists`, () => {
      expect(typeof testHookOf(name)).toBe('function');
    });
  }
});

describe('native layout route: the start that the route function reads', () => {
  const TAG = 7;
  const eventOf = (
    sequence: number,
    event: string,
    generation: number,
    fields: Partial<TraceEvent> = {}
  ): TraceEvent => ({
    schemaVersion: 1,
    sequence,
    monotonicTimeMs: sequence,
    event,
    surfaceId: 1,
    tag: TAG,
    owner: 'Layout',
    generation,
    objective: 7,
    ...fields,
  });
  const sampleOf = (
    model: number[],
    monotonicTimeMs: number,
    playbacks: Playback[] = []
  ): TargetSample => ({
    model,
    presentation: model,
    playbacks,
    monotonicTimeMs,
  });
  const playbackOf = (generation: number, target: string): Playback => ({
    surfaceId: 1,
    tag: TAG,
    owner: 'Layout',
    generation,
    target,
  });

  test('a refusal after an immediate start of the target gives FRAME-DRIVEN', () => {
    const events = [
      eventOf(1, 'TrackStarted', 1, { target: 'Opacity' }),
      eventOf(2, 'Admitted', 1),
      eventOf(3, 'TrackEnded', 1, { target: 'Opacity', finished: true }),
      eventOf(10, 'LayoutBuildFailed', 2, {
        buildFailure: 'UnsupportedTarget',
      }),
    ];
    const samples = [sampleOf([0.2], 20), sampleOf([0.4], 30)];
    expect(routeOf(events, TAG, 'Opacity', samples, () => true).kind).toBe(
      'frame-driven'
    );
  });

  test('a live track of the target beside a later start of another target gives NATIVE PLAYING of its own command', () => {
    const events = [
      eventOf(1, 'TrackStarted', 1, { target: 'Width' }),
      eventOf(2, 'Admitted', 1),
      eventOf(5, 'TrackStarted', 2, { target: 'Transform' }),
      eventOf(6, 'Admitted', 2),
    ];
    const playing = sampleOf([60], 20, [
      playbackOf(1, 'Width'),
      playbackOf(2, 'Transform'),
    ]);
    const route = routeOf(events, TAG, 'Width', [playing]);
    if (route.kind !== 'native playing') {
      throw new Error(`The live Width track reports ${route.kind}.`);
    }
    expect(route.command.generation).toBe(1);
  });
});

describe('native layout route', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'a moving native form reports NATIVE PLAYING for each of its targets',
    async () => {
      const tag = await renderBox();
      await render(<Scene left={END_LEFT} />);
      await wait(DURATION / 2);
      const events = await takeTrace();
      for (const target of ['PositionX', 'PositionY']) {
        const route = routeOf(events, tag, target, [await sample(tag, target)]);
        expect(route.kind).toBe('native playing');
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'a form with no duration reports NATIVE IMMEDIATE for each of its targets',
    async () => {
      await render(null);
      await takeTrace();
      await render(<SizeScene entering={immediateEntering} />);
      await wait(200);
      const tag = getTestComponent(BOX_REF).getTag();
      const events = await takeTrace();
      for (const target of ['Opacity', 'PositionX']) {
        const route = routeOf(events, tag, target, [await sample(tag, target)]);
        expect(route.kind).toBe('native immediate');
      }
      await render(null);
    }
  );

  movingGeometryTest(
    'a native form read after the end of its timed tracks reports no route',
    async () => {
      const tag = await renderBox();
      await render(<Scene left={END_LEFT} />);
      await wait(DURATION * 1.5);
      const events = await takeTrace();
      const ended = await sample(tag, 'PositionX');
      await expect(() => routeOf(events, tag, 'PositionX', [ended])).toThrow(
        'no immediate end'
      );
      await render(null);
    }
  );

  test('a form that the route table refuses reports FRAME-DRIVEN', async () => {
    const layout = LinearTransition.duration(REFUSED_DURATION).easing(
      Easing.linear
    );
    const tag = await mountScene(
      <SizeScene style={REFUSED_STYLE} layout={layout} />
    );
    await render(
      <SizeScene style={REFUSED_STYLE} layout={layout} width={2 * BOX_SIZE} />
    );
    const samples = await samplesAtParts(tag, 'Size', REFUSED_DURATION);
    const events = await takeTrace();
    const route = routeOf(events, tag, 'Size', samples, isOnRefusedTimeline);
    if (route.kind !== 'frame-driven') {
      throw new Error(`The refused form reports ${route.kind}.`);
    }
    expect(refusalOf(route.refusal)).toBe(
      PLAYS_SIZE_CHANGE ? BUILD_REFUSAL : SIZE_REFUSAL_BEFORE_BUILD
    );
    await wait(REFUSED_DURATION);
    await render(null);
  });

  for (const pixels of [1, 2]) {
    const isNative = playsSizeChangeOf(pixels * ONE_PIXEL);
    const refusal = isNative ? undefined : SIZE_REFUSAL_BEFORE_BUILD;
    test(`a width change of ${pixels} px ${routeNameOf(refusal)} and ends at the end width`, async () => {
      const layout = LinearTransition.duration(PIXEL_DURATION).easing(
        Easing.linear
      );
      const startWidth = PixelRatio.roundToNearestPixel(BOX_SIZE);
      const endWidth = startWidth + pixels * ONE_PIXEL;
      const tag = await mountScene(
        <SizeScene layout={layout} width={startWidth} />
      );
      await render(<SizeScene layout={layout} width={endWidth} />);
      await wait(PIXEL_DURATION / 2);
      const middle = await sample(tag, 'Width');
      await wait(PIXEL_DURATION);
      expectSizeRoute((await takeTraceOf(tag)).filter(isHostEvent), refusal);
      if (isNative && !PLAYS_SIZE_CHANGE) {
        expect(isNear(middle.presentation[0], endWidth)).toBe(true);
      }
      const end = await sample(tag, 'Width');
      expect(isNear(end.model[0], endWidth)).toBe(true);
      expect(isNear(end.presentation[0], endWidth)).toBe(true);
      await render(null);
    });
  }

  test(`a width sequence within 1 px of the end at each segment end, with a Bezier segment that passes 1.5 px, ${routeNameOf(buildRefusalUnless(PLAYS_SIZE_CHANGE))} and ends at the end width`, async () => {
    const endWidth = PixelRatio.roundToNearestPixel(BOX_SIZE) + ONE_PIXEL;
    const layout = layoutOf({
      width: {
        initial: 2 * ONE_PIXEL,
        via: [
          {
            to: -ONE_PIXEL,
            easing: Easing.bezier(1 / 3, 0, 2 / 3, 3),
            duration: PIXEL_DURATION / 2,
          },
        ],
        duration: PIXEL_DURATION / 2,
      },
    });
    const tag = await mountScene(
      <SizeScene layout={layout} width={endWidth - ONE_PIXEL} />
    );
    await render(<SizeScene layout={layout} width={endWidth} />);
    await wait(PIXEL_DURATION * 1.5);
    expectSizeRoute(
      (await takeTraceOf(tag)).filter(isHostEvent),
      buildRefusalUnless(PLAYS_SIZE_CHANGE)
    );
    const end = await sample(tag, 'Width');
    expect(isNear(end.model[0], endWidth)).toBe(true);
    expect(isNear(end.presentation[0], endWidth)).toBe(true);
    await render(null);
  });

  test(`an entering width track from 1 pt to 1.005 pt with a Bezier that takes it below 0 ${routeNameOf(BUILD_REFUSAL)}`, async () => {
    const width = PixelRatio.roundToNearestPixel(1);
    const entering = entryExitOf({
      width: {
        initial: 0,
        to: 0.005,
        easing: Easing.bezier(1 / 3, -1000, 2 / 3, -1000),
        duration: PIXEL_DURATION,
      },
    });
    await render(null);
    await takeTrace();
    await render(<EnteringScene isMounted width={width} entering={entering} />);
    const tag = getTestComponent(BOX_REF).getTag();
    await wait(PIXEL_DURATION * 1.5);
    expectSizeRoute(
      (await takeTraceOf(tag)).filter(isHostEvent),
      BUILD_REFUSAL
    );
    await render(null);
  });

  test(`an exiting width track that ends 79 px from the mounted width ${routeNameOf(buildRefusalUnless(PLAYS_SIZE_CHANGE))}`, async () => {
    const width = PixelRatio.roundToNearestPixel(BOX_SIZE);
    const exiting = entryExitOf({
      width: {
        initial: -80 * ONE_PIXEL,
        to: -79 * ONE_PIXEL,
        duration: PIXEL_DURATION,
      },
      opacity: { initial: 1, to: 0.2, duration: 2 * PIXEL_DURATION },
    });
    const tag = await mountScene(
      <EnteringScene isMounted width={width} exiting={exiting} />
    );
    await render(
      <EnteringScene isMounted={false} width={width} exiting={exiting} />
    );
    await wait(2 * PIXEL_DURATION + 300);
    expectSizeRoute(
      (await takeTraceOf(tag)).filter(isHostEvent),
      buildRefusalUnless(PLAYS_SIZE_CHANGE)
    );
    expect(await hasView(tag)).toBe(false);
    await render(null);
  });
});

describe('native layout route: request rate and delayed jumps', () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  movingGeometryTest(
    'a layout change in each frame plays natively up to the request rate and then frame-driven',
    async () => {
      const tag = await mountScene(
        <RateBox left={START_LEFT} cssDuration={RATE_LOOP_MS} />
      );
      const offset = await offsetOf(tag);
      await render(<RateBox left={END_LEFT} cssDuration={RATE_LOOP_MS} />);
      await wait(RATE_LOOP_MS + DURATION + 200);
      const starts = (await takeTraceOf(tag)).filter(isLayoutStartOutcome);
      const firstRateRefusal = starts.findIndex(isRateRefusal);
      expect(starts.length >= REQUESTS_PER_SECOND).toBe(true);
      expect(firstRateRefusal).toBe(REQUESTS_PER_SECOND - 1);
      expect(
        starts
          .slice(0, firstRateRefusal)
          .every(({ event }) => event === 'Admitted')
      ).toBe(true);
      expect(
        starts.slice(firstRateRefusal).some(({ event }) => event === 'Admitted')
      ).toBe(false);
      await expectShownAt(tag, END_LEFT + offset);
      await render(null);
    }
  );

  movingGeometryTest('ten layout changes per second stay native', async () => {
    const tag = await mountScene(<RateBox left={START_LEFT} />);
    for (let step = 1; step <= 2 * REQUESTS_PER_SECOND; step++) {
      await render(<RateBox left={step % 2 === 0 ? START_LEFT : END_LEFT} />);
      await wait(100);
    }
    await wait(DURATION + 200);
    const starts = (await takeTraceOf(tag)).filter(isLayoutStartOutcome);
    expect(starts.filter(({ event }) => event === 'Admitted').length).toBe(
      2 * REQUESTS_PER_SECOND
    );
    expect(starts.filter(isRateRefusal).length).toBe(0);
    await render(null);
  });

  movingGeometryTest(
    'the native route takes a view again after a second with no layout change',
    async () => {
      const tag = await mountScene(
        <RateBox left={START_LEFT} cssDuration={RATE_LOOP_MS} />
      );
      await render(<RateBox left={END_LEFT} cssDuration={RATE_LOOP_MS} />);
      await wait(RATE_LOOP_MS + DURATION + 1200);
      const loop = (await takeTraceOf(tag)).filter(isLayoutStartOutcome);
      expect(loop.some(isRateRefusal)).toBe(true);
      await render(<RateBox left={START_LEFT} cssDuration={RATE_LOOP_MS} />);
      await wait(DURATION + 200);
      const starts = (await takeTraceOf(tag)).filter(isLayoutStartOutcome);
      expect(starts[0]?.event).toBe('Admitted');
      await render(null);
    }
  );

  movingGeometryTest(
    'a delayed jump on each leaf plays frame-driven and ends at the end frame',
    async () => {
      const tag = await mountScene(
        <Scene left={START_LEFT} layout={delayedMoveOf(0)} />
      );
      const offset = await offsetOf(tag);
      await render(<Scene left={END_LEFT} layout={delayedMoveOf(0)} />);
      await wait(JUMP_DELAY_MS + 200);
      const events = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(events.filter(isStartRefusal).map(refusalOf).join(' > ')).toBe(
        'LayoutBuildFailed:UnsupportedTrackForm'
      );
      expect(events.filter(({ event }) => event === 'Admitted').length).toBe(0);
      await expectShownAt(tag, END_LEFT + offset);
      await render(null);
    }
  );

  movingGeometryTest('a delayed timing of 300 ms starts natively', async () => {
    const tag = await mountScene(
      <Scene left={START_LEFT} layout={delayedMoveOf(JUMP_DELAY_MS)} />
    );
    await render(
      <Scene left={END_LEFT} layout={delayedMoveOf(JUMP_DELAY_MS)} />
    );
    await wait(2 * JUMP_DELAY_MS + 4 * FRAME_MS);
    const events = (await takeTraceOf(tag)).filter(isHostEvent);
    expect(events.filter(isStartRefusal).length).toBe(0);
    expect(events.filter(({ event }) => event === 'Admitted').length).toBe(1);
    await render(null);
  });
});

describe('the native layout route with no mount-thread pull', () => {
  if (!isNativeLayoutRouteConfigured || hasNativeLayoutRoute) {
    return;
  }

  test('a layout change that the pull model routes natively has no host event and is on the frame-driven timeline', async () => {
    const layout = frameRecordedOf(
      'push',
      layoutOf({ originX: { duration: PUSH_DURATION } }, { name: 'push' })
    );
    const tag = await renderBox({ layout });
    const clockOffset = await narrowClockOffset(tag);
    resetFrameRecords();
    await render(<Scene left={END_LEFT} layout={layout} />);
    const samples = await samplesAtParts(tag, 'PositionX', PUSH_DURATION);
    expect(await waitForCallbacks(['push:true'])).toBe('');
    const events = (await takeTraceOf(tag)).filter(isHostEvent);
    const start = readFrameRecords().find(
      ({ key }) => key === 'originX'
    )?.start;
    console.log(
      `PUSH-MODEL | events ${summarize(events)} | frame-driver start ${start?.timeMs} | samples ${samples.map(({ model, monotonicTimeMs }) => `${model[0]} at ${monotonicTimeMs}`).join(', ')}`
    );
    expect(summarize(events)).toBe('');
    expect(start !== undefined).toBe(true);
    const startMs = start!.timeMs + middleOf(clockOffset);
    for (const { model, playbacks, monotonicTimeMs } of samples) {
      const sinceStartMs = monotonicTimeMs - startMs;
      expect(playbacks.length).toBe(0);
      expect(
        isOnPushTimeline(model[0], sinceStartMs)
          ? ''
          : `the centre ${model[0]} ${sinceStartMs.toFixed(2)} ms after the start of the frame driver is not on its timeline`
      ).toBe('');
    }
    expect(samples[0].model[0] < samples[1].model[0]).toBe(true);
    const end = await sample(tag, 'PositionX');
    expect(
      Math.abs(end.model[0] - centerOf(END_LEFT)) <= POSITION_TOLERANCE
        ? ''
        : `the centre ${end.model[0]} after the end is not ${centerOf(END_LEFT)}`
    ).toBe('');
    await render(null);
  });

  test('frame-driven entering and the completed-exit cleanup run', async () => {
    const animations = {
      entering: entryExitOf(
        { opacity: { duration: PUSH_DURATION, initial: 0.2, to: 1 } },
        { name: 'entering' }
      ),
      exiting: entryExitOf(
        { opacity: { duration: PUSH_DURATION, initial: 1, to: 0.2 } },
        { name: 'exiting' }
      ),
    };
    await render(<EnteringScene isMounted={false} {...animations} />);
    await takeTrace();
    resetCallbacks();
    await render(<EnteringScene isMounted {...animations} />);
    const tag = getTestComponent(BOX_REF).getTag();
    const [first, second] = (
      await samplesAtParts(tag, 'Opacity', PUSH_DURATION)
    ).map(({ model }) => model[0]);
    expect(await waitForCallbacks(['entering:true'])).toBe('');
    expect(first > 0.2 && first < second && second < 1).toBe(true);

    await render(<EnteringScene isMounted={false} {...animations} />);
    expect(await waitForCallbacks(['exiting:true'])).toBe('');
    await wait(200);
    expect(await hasView(tag)).toBe(false);
    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe('');
    expect(callbacks.slice().sort().join()).toBe('entering:true,exiting:true');
    await render(null);
  });
});

const PUSH_DURATION = 1200;
const REFUSED_DURATION = 1200;
const PIXEL_DURATION = 600;
// The route table keeps a size change of a view with an elliptical radius on the frame driver.
const REFUSED_STYLE = { borderRadius: '30%' } as const;
// The extremes of the measured and inferred lag of the frame driver from the refusal, in whole display
// frames.
const FRAME_DRIVER_EARLY_MS = 2 * FRAME_MS;
const FRAME_DRIVER_LATE_MS = 5 * FRAME_MS;

function isOnRefusedTimeline(
  { model: [width] }: { model: number[] },
  sinceRefusalMs: number
) {
  const widthAt = (timeMs: number) =>
    BOX_SIZE + BOX_SIZE * Math.min(1, Math.max(0, timeMs / REFUSED_DURATION));
  return (
    width >= widthAt(sinceRefusalMs - FRAME_DRIVER_LATE_MS) &&
    width <= widthAt(sinceRefusalMs + FRAME_DRIVER_EARLY_MS)
  );
}

function isOnPushTimeline(centerX: number, sinceStartMs: number) {
  const centerAt = (timeMs: number) =>
    centerOf(
      START_LEFT +
        (END_LEFT - START_LEFT) *
          Math.min(1, Math.max(0, timeMs / PUSH_DURATION))
    );
  return (
    centerX >=
      centerAt(sinceStartMs - FRAME_DRIVER_LATE_MS) - POSITION_TOLERANCE &&
    centerX <=
      centerAt(sinceStartMs + FRAME_DRIVER_EARLY_MS) + POSITION_TOLERANCE
  );
}

const BUILD_REFUSAL = 'LayoutBuildFailed:UnsupportedTarget';
/**
 * Android refuses a layout change of the frame size by more than one pixel
 * before the build.
 */
const SIZE_REFUSAL_BEFORE_BUILD = 'LayoutStartRefused:SizeBeyondOnePixel';
type SizeRefusal = typeof BUILD_REFUSAL | typeof SIZE_REFUSAL_BEFORE_BUILD;

const buildRefusalUnless = (isNative: boolean) =>
  isNative ? undefined : BUILD_REFUSAL;

const isStartRefusal = ({ event }: TraceEvent) =>
  event === 'LayoutBuildFailed' || event === 'LayoutStartRefused';

const refusalOf = ({ event, buildFailure, startRefusal }: TraceEvent) =>
  `${event}:${startRefusal ?? buildFailure}`;

function routeNameOf(refusal: SizeRefusal | undefined) {
  if (refusal === undefined) {
    return 'starts natively';
  }
  return `stays frame-driven with ${refusal === BUILD_REFUSAL ? 'UnsupportedTarget' : 'SizeBeyondOnePixel'}`;
}

function expectSizeRoute(
  events: TraceEvent[],
  refusal: SizeRefusal | undefined
) {
  const admitted = events.filter(({ event }) => event === 'Admitted');
  expect(admitted.length).toBe(refusal === undefined ? 1 : 0);
  expect(events.filter(isStartRefusal).map(refusalOf).join(' > ')).toBe(
    refusal ?? ''
  );
}

/** One sample of a target at one third and at two thirds of a time from now. */
async function samplesAtParts(tag: number, target: string, durationMs: number) {
  const startMs = performance.now();
  const samples: TargetSample[] = [];
  for (const part of [1 / 3, 2 / 3]) {
    await wait(Math.max(0, startMs + part * durationMs - performance.now()));
    samples.push(await sample(tag, target));
  }
  return samples;
}

const hasView = (tag: number) =>
  sample(tag, 'Opacity').then(
    () => true,
    (error: unknown) => {
      if (isNoView(error)) {
        return false;
      }
      throw error;
    }
  );

function EnteringScene({
  isMounted,
  ...box
}: Pick<SizeBoxProps, 'entering' | 'exiting' | 'width'> & {
  isMounted: boolean;
}) {
  return (
    <View style={styles.container}>{isMounted && <SizeBox {...box} />}</View>
  );
}

function immediateEntering(values: EntryAnimationsValues) {
  'worklet';
  return {
    initialValues: { opacity: 0.2, originX: values.targetOriginX - 80 },
    animations: {
      opacity: withTiming(1, { duration: 0 }),
      originX: withTiming(values.targetOriginX, { duration: 0 }),
    },
  };
}

const REQUESTS_PER_SECOND = 20;
/** A CSS transition of `marginLeft` that asks for a layout change in each frame. */
const RATE_LOOP_MS = 1000;
const JUMP_DELAY_MS = 300;
const RATE_LAYOUT = LinearTransition.duration(DURATION).easing(Easing.linear);

const isLayoutStartOutcome = (event: TraceEvent) =>
  event.event === 'Admitted' || isStartRefusal(event);

const isRateRefusal = ({ event, startRefusal }: TraceEvent) =>
  event === 'LayoutStartRefused' && startRefusal === 'RequestRate';

/**
 * Each leaf of the move is a timing of `durationMs` after a delay of
 * `JUMP_DELAY_MS`; 0 ms is a jump.
 */
function delayedMoveOf(durationMs: number) {
  return (values: LayoutAnimationsValues) => {
    'worklet';
    return {
      initialValues: {
        originX: values.currentOriginX,
        originY: values.currentOriginY,
      },
      animations: {
        originX: withDelay(
          JUMP_DELAY_MS,
          withTiming(values.targetOriginX, { duration: durationMs })
        ),
        originY: withDelay(
          JUMP_DELAY_MS,
          withTiming(values.targetOriginY, { duration: durationMs })
        ),
      },
    };
  };
}

/** The model x of the view minus its `marginLeft`. */
async function offsetOf(tag: number) {
  return (await sample(tag, 'PositionX')).model[0] - START_LEFT;
}

async function expectShownAt(tag: number, x: number) {
  const end = await sample(tag, 'PositionX');
  expect(Math.abs(end.model[0] - x) <= POSITION_TOLERANCE).toBe(true);
  expect(Math.abs(end.presentation[0] - x) <= POSITION_TOLERANCE).toBe(true);
}

function RateBox({
  left,
  cssDuration,
}: {
  left: number;
  cssDuration?: number;
}) {
  const ref = useTestRef(BOX_REF);
  return (
    <View style={styles.container}>
      <Animated.View
        ref={ref}
        layout={RATE_LAYOUT}
        style={[
          styles.box,
          { marginLeft: left },
          cssDuration !== undefined && {
            transitionProperty: 'marginLeft',
            transitionDuration: cssDuration,
            transitionTimingFunction: 'linear',
          },
        ]}
      />
    </View>
  );
}
