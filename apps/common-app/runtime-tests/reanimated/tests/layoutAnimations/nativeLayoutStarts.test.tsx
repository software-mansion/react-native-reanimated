/*
 * Each test that plays a case (`playCase`) has the method of the suite `native layout reference`, each box
 * on its own clock: each sample of the native box is on the declared timeline of its key at the time of the
 * sample from the origin of its command (statement A), each frame of the frame-driven twin and of the
 * frame driver on the native box is on a replay of the declared timeline at its frame time (statement B),
 * and at the end the native box shows its model and the twin has the same model. A check of a playback key
 * count or of a held size in such a test is for each row, by the time of the row against the times of the
 * trace. Each other test has state checks and trace checks at planned times.
 *
 * The method does not prove: the distance of the two boxes at one instant, the lag of the frame driver,
 * that the two starts are in one display frame, when a callback comes or the gap of two callbacks, that a
 * row comes in each part of a timeline, a native value in the first display frame after its origin to
 * better than one display frame. For a frame with fractional values, statement B is to the pixel grid of
 * the layout: the layout rounds a declared size, so the frame driver gets another number. The pixels on
 * screen, a device, and 120 Hz are not tested.
 *
 * The suite `native layout live clock` has the wall-clock statements for the cases of this suite in
 * `nativeLayoutLiveClockCases.ts`: the pair of the two boxes at one instant, the gap of the two end
 * callbacks, and a row of the native box in each phase.
 */
import React from 'react';
import { PixelRatio, Platform, View } from 'react-native';
import type { LayoutAnimationFunction } from 'react-native-reanimated';
import Animated, {
  Easing,
  getStaticFeatureFlag,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
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
import {
  isSecondSurfaceAvailable,
  startSecondSurface,
  stopSecondSurface,
} from '../../../ReJest/secondSurface';
import {
  CURVE_CASES,
  curveLeavesOf,
  HELD_SIZE_CASES,
  HOLD_AFTER_TRACK_CASES,
  MOVED_AND_RESIZED,
  PAIR_END,
  PAIR_START,
  SIZE_DURATION,
  SIZE_START,
  TALL,
  WIDE,
} from './nativeLayoutLiveClockCases';
import type {
  CallbackBuilder,
  Place,
  Played,
  ReferenceCase,
} from './nativeLayoutReferencePlay';
import { expectReference, play } from './nativeLayoutReferencePlay';
import type {
  Key,
  Leaf,
  LayoutOptions,
  Operation,
  BoxProps,
  PairLayouts,
  SizeBoxProps,
  TraceEvent,
} from './nativeLayoutTestKit';
import {
  devTools,
  hasNativeLayoutStarts,
  BOX_REF,
  BOX_SIZE,
  START_LEFT,
  END_LEFT,
  END_TOP,
  DURATION,
  POSITION_TOLERANCE,
  FILTER_OPACITY,
  REPEATED_STARTS,
  FIRST_FRAME_TRAVEL,
  FRAME_MS,
  UNSEEN_START_MS,
  centerOf,
  declaredBandOf,
  framePairDistances,
  middleOf,
  PAIR_IN_ROW,
  sampleFramePairAt,
  SizePair,
  takeTrace,
  takeTraceOf,
  takeTraceUntil,
  isHostEvent,
  isClientReport,
  sample,
  playbackCountOf,
  takeTraceUntilSurfaceClosed,
  summarize,
  callbacks,
  builderCalls,
  waitForBuilderCalls,
  waitForCallbacks,
  layoutOf,
  endTransformOf,
  MALFORMED_BEZIER,
  Box,
  Scene,
  ROW_REFS,
  LONG_MOVE,
  Row,
  ModalScene,
  SECOND_BOX_REF,
  SECOND_CSS_BOX_REF,
  setSecondSurfaceBox,
  setSecondSurfaceOpacity,
  SecondSurfaceScene,
  renderBox,
  mountScene,
  pairLayoutsOf,
  NATIVE_START,
  NATIVE_END,
  SORTED_START_AND_END,
  summarizeEnd,
  PAIR_DURATION,
  PAIR_LEFT,
  PAIR_TOP,
  Pair,
  styles,
  SizeScene,
  sampleFrame,
} from './nativeLayoutTestKit';

const AT_START: Place = { left: START_LEFT, top: 0 };
const AT_END: Place = { left: END_LEFT, top: 0 };
const REST_TOLERANCE = 0.01;

/**
 * Plays a case on the native box and on its frame-driven twin, with statements
 * A and B of `native layout reference` and the end of the two boxes.
 */
async function playCase(caseName: string, referenceCase: ReferenceCase) {
  const played = await play(referenceCase);
  const reads = expectReference(caseName, referenceCase, played);
  expectAtRest(played);
  return { ...played, reads };
}

/**
 * At the end the native box shows its model, and the twin has the model of the
 * native box.
 */
function expectAtRest({ end }: Played) {
  for (const [target, { presentation, model }] of Object.entries(
    end?.native ?? {}
  )) {
    model.forEach((value, index) => {
      expect(Math.abs(presentation[index] - value) < REST_TOLERANCE).toBe(true);
      expect(
        Math.abs(end!.frame[target].model[index] - value) < REST_TOLERANCE
      ).toBe(true);
    });
  }
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
      const { events } = await playCase(easingName, {
        flow: 'layout',
        leaves: { originX: { easing }, originY: { easing } },
        places: [AT_START, AT_END],
        totalMs: DURATION,
      });
      expect(summarizeEnd(events)).toBe(SORTED_START_AND_END);
      await render(null);
    });
  }

  const transformCase = (
    operations: Operation[],
    transform = endTransformOf(operations),
    box: Partial<BoxProps> = {}
  ): [LayoutOptions, Partial<BoxProps>] => [
    { transform: { operations } },
    { transform, ...box },
  ];
  const TURN: Operation = ['rotate', 0, 1];
  const MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1];
  const transformFailures: [
    string,
    Partial<Record<Key, Leaf>>,
    string,
    LayoutOptions,
    Partial<BoxProps>,
  ][] = [
    [
      'a skewX operation',
      {},
      'UnsupportedValue',
      ...transformCase([['skewX', '0deg', '30deg']]),
    ],
    [
      'a skewY operation',
      {},
      'UnsupportedValue',
      ...transformCase([['skewY', '0deg', '30deg']]),
    ],
    [
      'a translate operation',
      {},
      'UnsupportedValue',
      ...transformCase([['translate', [0, 0], [10, 20]]]),
    ],
    [
      'an operation of an unknown kind',
      {},
      'UnsupportedValue',
      ...transformCase([['translateZ', 0, 10]], [{ translateX: 0 }]),
    ],
    [
      'a matrix operation',
      {},
      'UnsupportedValue',
      ...transformCase([['matrix', MATRIX, MATRIX]]),
    ],
    [
      'a perspective that changes',
      {},
      'UnsupportedValue',
      ...transformCase([['perspective', 300, 500], TURN]),
    ],
    [
      'a translation in percent',
      {},
      'UnsupportedValue',
      ...transformCase([['translateX', '0%', '50%']]),
    ],
    [
      'an angle that changes its unit',
      {},
      'UnsupportedValue',
      ...transformCase([['rotate', '0rad', '90deg']]),
    ],
    [
      'a transform leaf with no initial value',
      {},
      'UnsupportedValue',
      { transform: { operations: [TURN], hasNoInitialValue: true } },
      { transform: endTransformOf([TURN]) },
    ],
    [
      'an operation with no duration after a delay beside an operation with a duration',
      {},
      'UnsupportedTrackForm',
      ...transformCase([
        TURN,
        ['translateX', 0, 10, { duration: 0, delays: [50] }],
      ]),
    ],
    [
      'an operation with a spring',
      {},
      'UnsupportedTiming',
      ...transformCase([TURN, ['translateX', 0, 10, { isSpring: true }]]),
    ],
    [
      'a transform leaf on a view with a transform origin',
      {},
      'UnsupportedTarget',
      ...transformCase([TURN], undefined, { transformOrigin: 'top left' }),
    ],
    [
      'a transform leaf on a view with a translation in percent',
      {},
      'UnsupportedTarget',
      ...transformCase(
        [['translateX', 25, 25], TURN],
        [{ translateX: '50%' }, { rotate: '1rad' }]
      ),
    ],
    [
      'an end transform that the style does not have',
      {},
      'EndpointMismatch',
      ...transformCase([TURN], [{ rotate: '0.5rad' }]),
    ],
    [
      'a perspective that the style does not have',
      {},
      'EndpointMismatch',
      ...transformCase(
        [
          ['perspective', 500, 500],
          ['rotateX', '90deg', '0deg'],
        ],
        [{ rotateX: '0deg' }]
      ),
    ],
    [
      'more segments than the native route takes in one operation timeline and two scalar leaves',
      {
        originX: { easing: Easing.bounce },
        opacity: { easing: Easing.bounce, initial: 0.5, to: 1 },
      },
      'ResourceLimit',
      ...transformCase([['rotate', 0, 1, { easing: Easing.bounce }]]),
    ],
    [
      'more segments than the native route takes in the sum of four operation timelines with the 22 segments of Easing.bounce',
      {},
      'ResourceLimit',
      ...transformCase([
        ['translateX', 0, 10, { easing: Easing.bounce }],
        ['translateY', 0, 10, { easing: Easing.bounce }],
        ['scale', 1, 1.2, { easing: Easing.bounce }],
        ['rotate', 0, 1, { easing: Easing.bounce }],
      ]),
    ],
    [
      'more operations than the limit',
      {},
      'ResourceLimit',
      ...transformCase([
        TURN,
        ['translateX', 0, 10],
        ['translateY', 0, 10],
        ['scaleX', 1, 2],
        ['scaleY', 1, 2],
      ]),
    ],
  ];

  const frameDrivenBuilds: [
    string,
    Partial<Record<Key, Leaf>>,
    string,
    LayoutOptions?,
    Partial<BoxProps>?,
  ][] = [
    [
      'an easing with a step',
      { originX: { easing: Easing.steps(4) } },
      'UnsupportedTiming',
    ],
    [
      'an easing with no fit',
      { originX: { easing: Easing.circle } },
      'UnsupportedTiming',
    ],
    [
      'more segments than the native route takes',
      {
        originX: { easing: Easing.bounce },
        width: { easing: Easing.bounce, initial: 10 },
        opacity: { easing: Easing.bounce, initial: 0.5, to: 1 },
      },
      'ResourceLimit',
    ],
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
    ['no initial value', { originX: { initial: 'none' } }, 'UnsupportedValue'],
    [
      'an initial value with no animation',
      { originX: {} },
      'UnsupportedTrackForm',
      { initialOnlyKey: 'opacity' },
    ],
    [
      'more leaves than native targets',
      {
        originX: {},
        originY: {},
        width: {},
        height: {},
        opacity: { initial: 1, to: 1 },
        borderRadius: { initial: 0, to: 0 },
      },
      'ResourceLimit',
      { transform: { operations: [['rotate', 0, 0]] } },
    ],
    ...transformFailures,
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

  const nativeBuilds: [
    string,
    Partial<Record<Key, Leaf>>,
    string[],
    LayoutOptions?,
    Partial<BoxProps>?,
  ][] = [
    ['the default easing', { originX: { easing: 'default' } }, ['PositionX']],
    [
      'Easing.out(Easing.ease)',
      { originX: { easing: Easing.out(Easing.ease) } },
      ['PositionX'],
    ],
    ['Easing.quad', { originX: { easing: Easing.quad } }, ['PositionX']],
    [
      'the 22 segments of Easing.bounce on each of two leaves',
      {
        originX: { easing: Easing.bounce },
        opacity: { easing: Easing.bounce, initial: 0.5, to: 1 },
      },
      ['PositionX', 'Opacity'],
    ],
    [
      'a size leaf that does not change',
      { originX: {}, width: {} },
      ['PositionX', 'Width'],
    ],
    [
      'one leaf for each layout key',
      { originX: {}, originY: {}, width: {}, height: {} },
      ['PositionX', 'PositionY', 'Width', 'Height'],
    ],
    [
      'one leaf for each native target',
      {
        originX: {},
        originY: {},
        width: {},
        height: {},
        opacity: { initial: 1, to: 1 },
      },
      ['PositionX', 'PositionY', 'Width', 'Height', 'Opacity'],
    ],
    [
      'a transform leaf with the largest number of operations',
      {},
      ['Transform'],
      ...transformCase([
        ['perspective', 500, 500],
        ['rotateY', '0deg', '40deg'],
        ['translateX', 0, 10, { isPlain: true }],
        ['scale', 1, 1.2],
      ]),
    ],
    [
      'two operations with the 22 segments of Easing.bounce beside a position leaf',
      { originX: {} },
      ['PositionX', 'Transform'],
      ...transformCase([
        ['scale', 1, 1.2, { easing: Easing.bounce }],
        ['rotate', 0, 1, { easing: Easing.bounce }],
      ]),
    ],
    [
      'a transform leaf with no operation beside a position leaf',
      { originX: {} },
      ['PositionX', 'Transform'],
      { transform: { operations: [] } },
      {},
    ],
    [
      'the largest number of leaves',
      {
        originX: {},
        originY: {},
        width: {},
        height: {},
        opacity: { initial: 1, to: 1 },
      },
      ['PositionX', 'PositionY', 'Width', 'Height', 'Opacity', 'Transform'],
      ...transformCase([TURN]),
    ],
  ];
  for (const [caseName, leaves, targets, options, box] of nativeBuilds) {
    test(`${caseName} plays natively: ${targets.join(', ')}`, async () => {
      const layout = layoutOf(leaves, { ...options, name: 'native' });
      const tag = await renderBox({ layout, ...box });
      await render(<Scene left={END_LEFT} layout={layout} {...box} />);
      await wait(DURATION * 1.5);

      const events = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(summarize(events.slice(0, 4 + targets.length))).toBe(
        `LayoutStartPending > LayoutStartMounted > Received > ${targets
          .map((target) => `TrackStarted:${target}`)
          .join(' > ')} > Admitted`
      );
      expect(summarize(events.slice(-1))).toBe('Ended:Finished:None');
      expect(callbacks.join()).toBe('native:true');
      await render(null);
    });
  }

  test('position leaves play natively on a view whose size changes in the commit', async () => {
    const tag = await renderBox();
    await render(<Scene left={END_LEFT} width={2 * BOX_SIZE} />);
    await wait(DURATION / 2);
    expect(summarize((await takeTraceOf(tag)).filter(isHostEvent))).toBe(
      NATIVE_START
    );
    const { model, presentation } = await sampleFrame(tag);
    expect(model.width).toBe(2 * BOX_SIZE);
    expect(presentation.width).toBe(2 * BOX_SIZE);
    expect(presentation.x > START_LEFT).toBe(true);
    expect(presentation.x < END_LEFT).toBe(true);
    await wait(DURATION);
    expect(summarizeEnd(await takeTraceOf(tag))).toBe(NATIVE_END);
    await render(null);
  });

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

  test('a second native start replaces the X track from its value at the pull and keeps the Y track', async () => {
    const { events, tracks, rows } = await playCase('a second native start', {
      flow: 'layout',
      leaves: { originX: {}, originY: {} },
      places: [AT_START, AT_END, { ...AT_END, left: 2 * END_LEFT }],
      commitTimesMs: [DURATION / 2],
      totalMs: DURATION,
    });
    const hostEvents = events.filter(isHostEvent);
    expect(summarize(hostEvents)).toBe(
      `${NATIVE_START} > LayoutStartPending > LayoutStartMounted > Received > TrackEnded:PositionX:false > Ended:Interrupted:None > TrackStarted:PositionX > Admitted > TrackEnded:PositionY:true > TrackEnded:PositionX:true > Ended:Finished:None`
    );
    const [, firstY, secondX] = tracks;
    expect(hostEvents[10].generation).toBe(firstY.generation);
    expect(secondX.generation > firstY.generation).toBe(true);
    // The Y leaf has the same end value and timing, so its track stays.
    const beforeTheEndOfY = rows
      .map(({ row }) => row.native.PositionX)
      .filter(
        ({ monotonicTimeMs }) =>
          monotonicTimeMs >= secondX.played.from + UNSEEN_START_MS &&
          monotonicTimeMs < middleOf(firstY.origin) + DURATION - FRAME_MS
      );
    expect(beforeTheEndOfY.length > 0).toBe(true);
    for (const read of beforeTheEndOfY) {
      expect(read.playbackKeys.length).toBe(2);
      expect(playbackCountOf(read, secondX.generation)).toBe(1);
      expect(playbackCountOf(read, firstY.generation)).toBe(1);
    }
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

  test('a frame-driven start during native playback takes the X track at the mount of its first update', async () => {
    const xDuration = 3 * DURATION;
    const { events, tracks, rows, captures } = await playCase(
      'a frame-driven start during native playback',
      {
        flow: 'layout',
        leaves: {
          originX: { duration: xDuration, onlyWhenChanged: true },
          originY: { isSpring: true, onlyWhenChanged: true },
        },
        places: [AT_START, AT_END, { ...AT_END, top: END_TOP }],
        commitTimesMs: [DURATION],
        totalMs: xDuration,
      }
    );
    const takeOver = events.slice(
      events.findIndex(({ event }) => event === 'LayoutLeafCaptured')
    );
    expect(summarize(takeOver)).toBe(
      'LayoutLeafCaptured:PositionX > LayoutBuildFailed:UnsupportedTiming > FrameUpdateMounted:PositionX > TrackEnded:PositionX:false > Ended:Cancelled:None > ClientEnded:Cancelled:None'
    );
    // The capture, the build, and the first frame-driven X value are in one transaction.
    const [captured, failed, frameUpdate, trackEnd] = takeOver;
    expect(failed.transactionNumber).toBe(captured.transactionNumber);
    expect(frameUpdate.transactionNumber).toBe(captured.transactionNumber);
    for (const event of [captured, frameUpdate, trackEnd]) {
      expect(event.generation).toBe(tracks[0].generation);
    }
    expect(captures.length).toBe(1);

    for (const { row } of rows) {
      const { model, playbackKeys, monotonicTimeMs } = row.native.PositionX;
      if (monotonicTimeMs < captured.monotonicTimeMs) {
        expect(Math.abs(model[0] - centerOf(END_LEFT)) < 0.01).toBe(true);
      }
      if (monotonicTimeMs >= trackEnd.monotonicTimeMs + FRAME_MS) {
        expect(playbackKeys.length).toBe(0);
      }
    }
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
    const tag = await renderBox({ layout });
    const isAdmitted = ({ event, tag: eventTag }: TraceEvent) =>
      event === 'Admitted' && eventTag === tag;
    let starts = 0;
    for (const left of [END_LEFT, 2 * END_LEFT, START_LEFT]) {
      await render(<Scene left={left} layout={layout} />);
      starts++;
      expect(await waitForBuilderCalls(starts)).toBe('');
      const events = await takeTraceUntil((taken) => taken.some(isAdmitted));
      expect(events.filter(isAdmitted).length).toBe(1);
    }
    const expected = ['chain:false', 'chain:false', 'chain:true'];
    expect(await waitForCallbacks(expected)).toBe('');
    expect(callbacks.join()).toBe(expected.join());
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

    await render(<Scene left={2 * END_LEFT} top={END_TOP} layout={second} />);
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

  for (const [caseName, referenceCase] of Object.entries(
    HOLD_AFTER_TRACK_CASES
  )) {
    test(`${caseName} goes to the frame driver, and the old value continues through its delay`, async () => {
      const { events, rows } = await playCase(caseName, referenceCase);
      const trackEnd = events.find(
        ({ event, target }) => event === 'TrackEnded' && target === 'PositionX'
      );
      expect(trackEnd?.finished).toBe(false);
      for (const { row } of rows) {
        const { playbackKeys, monotonicTimeMs } = row.native.PositionX;
        if (monotonicTimeMs >= trackEnd!.monotonicTimeMs + FRAME_MS) {
          expect(playbackKeys.length).toBe(0);
        }
      }
      await render(null);
    });
  }

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

describe('native layout timing against the curve and the frame driver', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  for (const [curveName, referenceCase] of Object.entries(CURVE_CASES)) {
    test(`${curveName}: the native values and the frames of the frame driver are on the curve`, async () => {
      await playCase(curveName, referenceCase);
      await render(null);
    });
  }

  type Replaced = {
    trackName: string;
    easing: Leaf['easing'];
    segments: number;
    /** The part of the duration at which the replacement comes. */
    replacedAt: number;
  };
  const replaced: Replaced[] = [
    {
      trackName: 'a linear track',
      easing: Easing.linear,
      segments: 1,
      replacedAt: 1 / 3,
    },
    {
      trackName: 'a track of the default easing',
      easing: 'default',
      segments: 2,
      replacedAt: 1 / 3,
    },
    {
      trackName: 'a track of the 22 segments of Easing.bounce',
      easing: Easing.bounce,
      segments: 22,
      replacedAt: 0.4,
    },
  ];
  for (const { trackName, easing, segments, replacedAt } of replaced) {
    test(`a replacement during playback of ${trackName} continues each driver from its own value`, async () => {
      const { rows, tracks } = await playCase(`a replacement of ${trackName}`, {
        flow: 'layout',
        leaves: curveLeavesOf(easing),
        places: [PAIR_START, PAIR_END, { left: PAIR_LEFT / 4, top: 0 }],
        commitTimesMs: [replacedAt * PAIR_DURATION],
        totalMs: PAIR_DURATION,
      });
      const [firstX, , secondX] = tracks;
      expect(secondX.replaced === firstX).toBe(true);
      expect(secondX.captured !== undefined).toBe(true);
      const beforeTheReplacement = rows
        .map(({ row }) => row.native.PositionX)
        .filter(
          ({ monotonicTimeMs }) =>
            monotonicTimeMs >= firstX.played.from + UNSEEN_START_MS &&
            monotonicTimeMs < firstX.played.to
        );
      expect(beforeTheReplacement.length > 0).toBe(true);
      for (const { members } of beforeTheReplacement) {
        expect(members[0].values.length - 1).toBe(segments);
      }
      await render(null);
    });
  }

  test('the removal of the views during playback gives both drivers false one time', async () => {
    const layouts = pairLayoutsOf((hasCallback) => ({
      originX: { duration: PAIR_DURATION },
      originY: { duration: PAIR_DURATION, hasCallback },
    }));
    await mountScene(<Pair left={START_LEFT} top={0} {...layouts} />);
    await render(<Pair left={PAIR_LEFT} top={PAIR_TOP} {...layouts} />);
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
    setSecondSurfaceBox({ left: END_LEFT });
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
    setSecondSurfaceBox({ left: END_LEFT });
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

describe('native layout size', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  const ROUTE_DURATION = DURATION;
  const START = SIZE_START;
  const MOVED: Place = { left: 120, top: 40, width: 50, height: 50 };
  const RESIZED: Place = { left: 0, top: 0, width: 150, height: 90 };

  // 0.5 pt and the travel of one display frame at the mean speed of `travel` in `durationMs`.
  const toleranceOf = (travel: number, durationMs: number) =>
    POSITION_TOLERANCE + (FRAME_MS * travel) / durationMs;
  const LINEAR_TOLERANCE = toleranceOf(120, SIZE_DURATION);

  const startOf = (...targets: string[]) =>
    `LayoutStartPending > LayoutStartMounted > Received > ${targets
      .map((target) => `TrackStarted:${target}`)
      .join(' > ')} > Admitted`;
  const FOUR_TRACKS = startOf('PositionX', 'PositionY', 'Width', 'Height');

  const isStartEvent = ({ event }: TraceEvent) =>
    event !== 'TrackEnded' && event !== 'Ended';
  const summarizeStart = (events: TraceEvent[]) =>
    summarize(events.filter(isHostEvent).filter(isStartEvent));
  const summarizeResults = (events: TraceEvent[]) =>
    summarize(events.filter(({ event }) => event === 'Ended'));

  const linearLayout = (durationMs: number) =>
    LinearTransition.duration(durationMs).easing(Easing.linear);
  const LINEAR_LEAF: Leaf = { duration: SIZE_DURATION };
  const LINEAR: Pick<ReferenceCase, 'leaves' | 'builder'> = {
    leaves: {
      originX: LINEAR_LEAF,
      originY: LINEAR_LEAF,
      width: LINEAR_LEAF,
      height: LINEAR_LEAF,
    },
    builder: () => linearLayout(SIZE_DURATION) as unknown as CallbackBuilder,
  };

  const sizeCaseOf = (
    declaration: Pick<ReferenceCase, 'leaves' | 'builder'>,
    start: Place,
    end: Place,
    options: Pick<ReferenceCase, 'box' | 'alsoSampled' | 'frameTolerance'> = {}
  ): ReferenceCase => ({
    flow: 'layout',
    ...declaration,
    places: [start, end],
    totalMs: SIZE_DURATION,
    ...options,
  });

  /** The samples of a target of the native box from a time of the sample clock. */
  const shownFrom = ({ rows }: Played, target: string, fromMs: number) =>
    rows
      .map(({ row }) => row.native[target])
      .filter(({ monotonicTimeMs }) => monotonicTimeMs >= fromMs);

  const trackOf = ({ tracks }: Played, target: string) =>
    tracks.find((track) => track.target === target)!;

  async function playPair(
    layouts: PairLayouts,
    start: SizeBoxProps,
    end: SizeBoxProps,
    fractions?: number[]
  ) {
    const tag = await mountScene(<SizePair {...start} {...layouts} inRow />);
    await render(<SizePair {...end} {...layouts} inRow />);
    const rows = await sampleFramePairAt(SIZE_DURATION, fractions, PAIR_IN_ROW);
    const events = await takeTraceOf(tag);
    return { rows, events, distances: framePairDistances(rows) };
  }

  const linearCases: [string, Place][] = [
    ['a position change', MOVED],
    ['a position change and a size change', MOVED_AND_RESIZED],
    ['a size change', RESIZED],
  ];
  for (const [caseName, end] of linearCases) {
    test(`LinearTransition with a linear easing plays ${caseName} on four native tracks, and the native values and the frames of the frame driver are on its timeline`, async () => {
      const { events } = await playCase(
        caseName,
        sizeCaseOf(LINEAR, START, end)
      );
      expect(summarizeStart(events)).toBe(FOUR_TRACKS);
      expect(summarizeResults(events)).toBe('Ended:Finished:None');
      await render(null);
    });
  }

  test('four leaves with different durations, delays, and easings are on their timelines on the native box and on the frame driver', async () => {
    const caseName =
      'four leaves with different durations, delays, and easings';
    const { events, reads } = await playCase(
      caseName,
      HELD_SIZE_CASES[caseName]
    );
    expect(summarizeStart(events)).toBe(FOUR_TRACKS);
    expect(summarizeResults(events)).toBe('Ended:Finished:None');
    // A read whose display frame has one declared value shows that value.
    for (const { checked, values, timeMs } of reads) {
      checked.forEach((track, index) => {
        const { from, to } = declaredBandOf(track, timeMs);
        if (from === to) {
          expect(Math.abs(values[index] - from) < 0.01).toBe(true);
        }
      });
    }
    await render(null);
  });

  test('position leaves on a view whose size changes in the commit play natively, and the native values and the frames of the frame driver are on their timelines', async () => {
    const played = await playCase(
      'position leaves on a view whose size changes',
      sizeCaseOf(
        { leaves: { originX: LINEAR_LEAF, originY: LINEAR_LEAF } },
        START,
        MOVED_AND_RESIZED,
        { alsoSampled: ['Width'] }
      )
    );
    expect(summarizeStart(played.events)).toBe(
      startOf('PositionX', 'PositionY')
    );
    expect(summarizeResults(played.events)).toBe('Ended:Finished:None');
    const { from } = trackOf(played, 'PositionX').played;
    for (const { presentation } of shownFrom(
      played,
      'Width',
      from + UNSEEN_START_MS
    )) {
      expect(presentation[0]).toBe(MOVED_AND_RESIZED.width);
    }
    await render(null);
  });

  test('fractional values of the frame play on four native tracks, and the frames of the frame driver are on the timeline to the pixel grid of the layout', async () => {
    const { events } = await playCase(
      'fractional values of the frame',
      sizeCaseOf(
        LINEAR,
        { left: 10.4, top: 10.4, width: 50.3, height: 50.3 },
        { left: 110.4, top: 60.4, width: 100.3, height: 100.3 },
        { frameTolerance: 0.5 / PixelRatio.get() }
      )
    );
    expect(summarizeStart(events)).toBe(FOUR_TRACKS);
    expect(summarizeResults(events)).toBe('Ended:Finished:None');
    await render(null);
  });

  const constantSizeLeaves: [string, Leaf][] = [
    ['delayed', { duration: SIZE_DURATION / 2, delays: [SIZE_DURATION / 4] }],
    ['immediate', { duration: 0 }],
  ];
  const hostsWithNoNativeSizeChange: [string, SizeBoxProps['host']][] = [
    ['a Text', 'Text'],
    ['an Image', 'Image'],
  ];
  for (const [hostName, host] of hostsWithNoNativeSizeChange) {
    for (const [leafName, sizeLeaf] of constantSizeLeaves) {
      test(`a position change of ${hostName} with ${leafName} size leaves that do not change plays on four native tracks, and the native values and the frames of the frame driver are on their timelines`, async () => {
        const played = await playCase(
          `a position change of ${hostName} with ${leafName} size leaves`,
          sizeCaseOf(
            {
              leaves: {
                originX: LINEAR_LEAF,
                originY: LINEAR_LEAF,
                width: sizeLeaf,
                height: sizeLeaf,
              },
            },
            START,
            MOVED,
            { box: { host } }
          )
        );
        expect(summarizeStart(played.events)).toBe(FOUR_TRACKS);
        expect(summarizeResults(played.events)).toBe('Ended:Finished:None');
        for (const [target, size] of [
          ['Width', START.width],
          ['Height', START.height],
        ] as const) {
          for (const { presentation } of shownFrom(played, target, 0)) {
            expect(presentation[0]).toBe(size);
          }
        }
        await render(null);
      });
    }
  }

  // A size leaf with a start value at most 0.01 pt from its end value does not change the size.
  const sizeLeafOffsets: [number, boolean][] = [
    [0.009, true],
    [0.011, false],
  ];
  for (const [offset, isNative] of sizeLeafOffsets) {
    test(`a size leaf of a Text that starts ${offset} pt from its end value ${isNative ? 'plays natively' : 'keeps the whole animation frame-driven: UnsupportedTarget'}`, async () => {
      const layout = layoutOf({
        originX: { duration: ROUTE_DURATION },
        width: { duration: ROUTE_DURATION, initial: offset },
      });
      const tag = await mountScene(<SizeScene host="Text" layout={layout} />);
      await render(<SizeScene host="Text" left={END_LEFT} layout={layout} />);
      await wait(ROUTE_DURATION * 1.5);
      const events = (await takeTraceOf(tag)).filter(
        (event) => event.event !== 'FrameUpdateMounted'
      );
      expect(summarizeStart(events)).toBe(
        isNative
          ? startOf('PositionX', 'Width')
          : 'LayoutBuildFailed:UnsupportedTarget'
      );
      expect(summarizeResults(events)).toBe(
        isNative ? 'Ended:Finished:None' : ''
      );
      await render(null);
    });
  }

  test('a delayed width with no duration holds the start width during a native X, then shows the end width', async () => {
    const layouts = pairLayoutsOf((hasCallback) => ({
      originX: { duration: SIZE_DURATION, hasCallback },
      width: { duration: 0, delays: [SIZE_DURATION / 2] },
    }));
    const { rows, events, distances } = await playPair(
      layouts,
      START,
      WIDE,
      [0.2, 0.4, 0.6, 0.8]
    );
    expect(summarizeStart(events)).toBe(startOf('PositionX', 'Width'));
    expect(summarizeResults(events)).toBe('Ended:Finished:None');
    expect(distances.during < LINEAR_TOLERANCE).toBe(true);
    expect(distances.atEnd < 0.01).toBe(true);
    expect(rows[1].native.width).toBe(START.width);
    expect(rows[2].native.width).toBe(WIDE.width);
    await render(null);
  });

  test('a delayed height with no duration holds the start height during a native Y, then shows the end height', async () => {
    const layouts = pairLayoutsOf((hasCallback) => ({
      originY: { duration: SIZE_DURATION, hasCallback },
      height: { duration: 0, delays: [SIZE_DURATION / 2] },
    }));
    const { rows, events, distances } = await playPair(
      layouts,
      START,
      TALL,
      [0.2, 0.4, 0.6, 0.8]
    );
    expect(summarizeStart(events)).toBe(startOf('PositionY', 'Height'));
    expect(summarizeResults(events)).toBe('Ended:Finished:None');
    expect(distances.during < LINEAR_TOLERANCE).toBe(true);
    expect(distances.atEnd < 0.01).toBe(true);
    expect(rows[1].native.height).toBe(START.height);
    expect(rows[2].native.height).toBe(TALL.height);
    await render(null);
  });

  test('a width with no duration shows the end width at once during a native X', async () => {
    const played = await playCase(
      'a width with no duration during a native X',
      sizeCaseOf(
        { leaves: { originX: LINEAR_LEAF, width: { duration: 0 } } },
        START,
        WIDE
      )
    );
    expect(
      summarize(played.events.filter(isHostEvent)).startsWith(
        `${startOf('PositionX', 'Width')} > TrackEnded:Width:true`
      )
    ).toBe(true);
    expect(summarizeResults(played.events)).toBe('Ended:Finished:None');
    const { from } = trackOf(played, 'Width').played;
    for (const { presentation } of shownFrom(
      played,
      'Width',
      from + UNSEEN_START_MS
    )) {
      expect(presentation[0]).toBe(WIDE.width);
    }
    await render(null);
  });

  test('a delayed width is on its timeline during a native X on the native box and on the frame driver', async () => {
    const caseName = 'a delayed width during a native X';
    const played = await playCase(caseName, HELD_SIZE_CASES[caseName]);
    expect(summarizeStart(played.events)).toBe(startOf('PositionX', 'Width'));
    expect(summarizeResults(played.events)).toBe('Ended:Finished:None');
    const { timeline, origin, played: band } = trackOf(played, 'Width');
    for (const { presentation, monotonicTimeMs } of shownFrom(
      played,
      'Width',
      band.from
    )) {
      if (monotonicTimeMs < origin.from + timeline.phases[0].durationMs) {
        expect(presentation[0]).toBe(START.width);
      }
    }
    await render(null);
  });

  const WIDTH_AXIS = {
    size: 'width',
    origin: 'originX',
    edge: 'left',
    tracks: ['PositionX', 'Width'],
  } as const;
  const HEIGHT_AXIS = {
    size: 'height',
    origin: 'originY',
    edge: 'top',
    tracks: ['PositionY', 'Height'],
  } as const;
  type SizeAxis = typeof WIDTH_AXIS | typeof HEIGHT_AXIS;
  const zeroSizeCases: [string, SizeAxis, number, number][] = [
    ['width from 0 to 100', WIDTH_AXIS, 0, 100],
    ['width from 100 to 0', WIDTH_AXIS, 100, 0],
    ['width from 0 to 0', WIDTH_AXIS, 0, 0],
    ['height from 0 to 100', HEIGHT_AXIS, 0, 100],
  ];
  for (const [caseName, axis, startSize, endSize] of zeroSizeCases) {
    test(`a ${caseName} gives finite values on its timeline on the native box and on the frame driver`, async () => {
      const { events, rows } = await playCase(
        `a ${caseName}`,
        sizeCaseOf(
          { leaves: { [axis.origin]: LINEAR_LEAF, [axis.size]: LINEAR_LEAF } },
          { ...START, [axis.size]: startSize },
          { ...START, [axis.edge]: 60, [axis.size]: endSize }
        )
      );
      expect(summarizeStart(events)).toBe(startOf(...axis.tracks));
      expect(summarizeResults(events)).toBe('Ended:Finished:None');
      const values = rows.flatMap(({ row: { native, frame } }) =>
        axis.tracks.flatMap((target) => [
          ...native[target].presentation,
          ...frame[target].model,
        ])
      );
      expect(values.every(Number.isFinite)).toBe(true);
      await render(null);
    });
  }

  const WIDER = { width: 2 * BOX_SIZE, height: BOX_SIZE };
  const TALLER = { width: BOX_SIZE, height: 2 * BOX_SIZE };
  const BORDER = { style: { borderWidth: 2, borderColor: 'black' } };
  const sizeChangesOnTheFrameDriver: [
    string,
    Partial<SizeBoxProps>,
    typeof WIDER,
  ][] = [
    ['a size change of a View with a border', BORDER, WIDER],
    ['a height change of a View with a border', BORDER, TALLER],
    [
      'a size change of a View with a radius that is not uniform',
      { style: { borderTopLeftRadius: 12 } },
      WIDER,
    ],
    [
      'a size change of a View with a box shadow',
      { style: { boxShadow: '4px 4px 6px 0px rgba(0, 0, 0, 0.8)' } },
      WIDER,
    ],
    [
      'a size change of a View with an outline',
      { style: { outlineWidth: 3, outlineColor: 'red' } },
      WIDER,
    ],
    [
      'a size change of a View with a filter',
      { style: { filter: [{ brightness: 0.5 }] } },
      WIDER,
    ],
    [
      'a size change of a View with a background image',
      {
        style: {
          experimental_backgroundImage: 'linear-gradient(to right, red, blue)',
        },
      },
      WIDER,
    ],
    [
      'a size change of a View with a legacy shadow',
      {
        style: {
          shadowColor: 'black',
          shadowOpacity: 0.8,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 4 },
        },
      },
      WIDER,
    ],
    [
      'a size change of a View with a transform origin',
      {
        style: {
          transformOrigin: 'top left',
          transform: [{ rotate: '20deg' }],
        },
      },
      WIDER,
    ],
    [
      'a size change of a View with a percent translation',
      { style: { transform: [{ translateX: '50%' }] } },
      WIDER,
    ],
    [
      'a size change of a View with a dashed border of zero width',
      { style: { borderWidth: 0, borderStyle: 'dashed' } },
      WIDER,
    ],
    [
      'a size change of a View with a border of zero width and a colour for each side',
      {
        style: {
          borderWidth: 0,
          borderLeftColor: 'red',
          borderRightColor: 'blue',
          borderTopColor: 'green',
          borderBottomColor: 'black',
        },
      },
      WIDER,
    ],
    [
      'a size change of a View with an elliptical radius',
      { style: { borderRadius: '30%' } },
      WIDER,
    ],
    [
      'a height change of a View with a percent translation',
      { style: { transform: [{ translateY: '50%' }] } },
      TALLER,
    ],
    ['a size change of a Text', { host: 'Text' }, WIDER],
    ['a size change of an Image', { host: 'Image' }, WIDER],
    ['a size change of a ScrollView', { host: 'ScrollView' }, WIDER],
  ];
  for (const [caseName, box, end] of sizeChangesOnTheFrameDriver) {
    test(`${caseName} keeps the whole animation frame-driven: UnsupportedTarget`, async () => {
      const layout = linearLayout(ROUTE_DURATION);
      const tag = await mountScene(<SizeScene {...box} layout={layout} />);
      await render(<SizeScene {...box} {...end} layout={layout} />);
      await wait(ROUTE_DURATION * 1.5);
      const events = (await takeTraceOf(tag)).filter(
        (event) => event.event !== 'FrameUpdateMounted'
      );
      expect(summarize(events)).toBe('LayoutBuildFailed:UnsupportedTarget');
      const { model } = await sampleFrame(tag);
      const changed = end === TALLER ? 'height' : 'width';
      expect(Math.abs(model[changed] - end[changed]) < 0.01).toBe(true);
      await render(null);
    });
  }

  const sizeChangesOnNativeTracks: [
    string,
    Pick<SizeBoxProps, 'style'>,
    Place,
    Place,
  ][] = [
    [
      'a size change of a View with a static rotation',
      { style: { transform: [{ rotate: '20deg' }] } },
      START,
      RESIZED,
    ],
    [
      'a size change of a View with a static scale',
      { style: { transform: [{ scale: 1.5 }] } },
      START,
      RESIZED,
    ],
    [
      'a size change of a View with a continuous border curve and a radius',
      { style: { borderCurve: 'continuous', borderRadius: 12 } },
      START,
      RESIZED,
    ],
    [
      'a size change of a View with an opacity filter',
      { style: { filter: [{ opacity: FILTER_OPACITY }] } },
      START,
      RESIZED,
    ],
    [
      'a size change of a View with a blend mode',
      { style: { mixBlendMode: 'multiply' } },
      START,
      RESIZED,
    ],
    [
      'a size change of a View with its own stacking context',
      { style: { isolation: 'isolate' } },
      START,
      RESIZED,
    ],
    [
      'a change to a smaller size of a View with a clip and a radius',
      { style: { overflow: 'hidden', borderRadius: 12 } },
      RESIZED,
      START,
    ],
  ];
  for (const [caseName, box, start, end] of sizeChangesOnNativeTracks) {
    test(`${caseName} plays on four native tracks, and the native values and the frames of the frame driver are on its timeline`, async () => {
      const played = await playCase(
        caseName,
        sizeCaseOf(LINEAR, start, end, { box })
      );
      expect(summarizeStart(played.events)).toBe(FOUR_TRACKS);
      expect(summarizeResults(played.events)).toBe('Ended:Finished:None');
      const { origin, played: band } = trackOf(played, 'Width');
      const playing = shownFrom(
        played,
        'Width',
        band.from + UNSEEN_START_MS
      ).filter(
        ({ monotonicTimeMs }) =>
          monotonicTimeMs < middleOf(origin) + SIZE_DURATION - FRAME_MS
      );
      expect(playing.length > 0).toBe(true);
      for (const { playbackKeys } of playing) {
        expect(playbackKeys.length).toBe(4);
      }
      await render(null);
    });
  }

  const positionChangesOnNativeTracks: [string, Partial<SizeBoxProps>][] = [
    ['a Text', { host: 'Text' }],
    ['an Image', { host: 'Image' }],
  ];
  for (const [caseName, box] of positionChangesOnNativeTracks) {
    test(`LinearTransition with a linear easing plays a position change of ${caseName} on four native tracks`, async () => {
      const layout = linearLayout(ROUTE_DURATION);
      const tag = await mountScene(<SizeScene {...box} layout={layout} />);
      await render(<SizeScene {...box} left={END_LEFT} layout={layout} />);
      await wait(ROUTE_DURATION / 2);
      const playing = await sampleFrame(tag);
      await wait(ROUTE_DURATION);
      const events = await takeTraceOf(tag);
      expect(summarizeStart(events)).toBe(FOUR_TRACKS);
      expect(summarizeResults(events)).toBe('Ended:Finished:None');
      expect(playing.playbackKeys.length).toBe(4);
      expect(playing.presentation.x > START_LEFT).toBe(true);
      expect(playing.presentation.x < END_LEFT).toBe(true);
      expect(playing.presentation.width).toBe(BOX_SIZE);
      await render(null);
    });
  }
});
