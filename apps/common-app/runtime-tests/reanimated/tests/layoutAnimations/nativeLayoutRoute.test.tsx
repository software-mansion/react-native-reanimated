import React from 'react';
import { Platform } from 'react-native';
import type { EntryAnimationsValues } from 'react-native-reanimated';
import { Easing, LinearTransition, withTiming } from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type {
  Playback,
  TargetSample,
  TraceEvent,
} from '../nativeAnimationObservation';
import {
  BOX_REF,
  BOX_SIZE,
  DURATION,
  END_LEFT,
  FRAME_MS,
  hasNativeLayoutRoute,
  mountScene,
  NATIVE_ANIMATION_TEST_HOOKS,
  renderBox,
  routeOf,
  sample,
  Scene,
  SizeScene,
  takeTrace,
  testHookOf,
} from './nativeLayoutTestKit';

describe('native layout route: the test hooks', () => {
  if (Platform.OS !== 'ios') {
    return;
  }

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

  test('a moving native form reports NATIVE PLAYING for each of its targets', async () => {
    const tag = await renderBox();
    await render(<Scene left={END_LEFT} />);
    await wait(DURATION / 2);
    const events = await takeTrace();
    for (const target of ['PositionX', 'PositionY']) {
      const route = routeOf(events, tag, target, [await sample(tag, target)]);
      expect(route.kind).toBe('native playing');
    }
    await render(null);
  });

  test('a form with no duration reports NATIVE IMMEDIATE for each of its targets', async () => {
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
  });

  test('a native form read after the end of its timed tracks reports no route', async () => {
    const tag = await renderBox();
    await render(<Scene left={END_LEFT} />);
    await wait(DURATION * 1.5);
    const events = await takeTrace();
    const ended = await sample(tag, 'PositionX');
    await expect(() => routeOf(events, tag, 'PositionX', [ended])).toThrow(
      'no immediate end'
    );
    await render(null);
  });

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
    const startMs = performance.now();
    const samples = [];
    for (const part of [1 / 3, 2 / 3]) {
      await wait(
        Math.max(0, startMs + part * REFUSED_DURATION - performance.now())
      );
      samples.push(await sample(tag, 'Size'));
    }
    const events = await takeTrace();
    const route = routeOf(events, tag, 'Size', samples, isOnRefusedTimeline);
    if (route.kind !== 'frame-driven') {
      throw new Error(`The refused form reports ${route.kind}.`);
    }
    expect(route.refusal.buildFailure).toBe('UnsupportedTarget');
    await wait(REFUSED_DURATION);
    await render(null);
  });
});

const REFUSED_DURATION = 1200;
// The route table keeps a size change of a view with an elliptical radius on the frame driver.
const REFUSED_STYLE = { borderRadius: '30%' } as const;
// The extremes of the measured and inferred lag of the frame driver from the refusal, in whole display
// frames (`.tmp/native-la-run/12C/trace/route/RESULTS.md`).
const FRAME_DRIVER_EARLY_MS = 2 * FRAME_MS;
const FRAME_DRIVER_LATE_MS = 5 * FRAME_MS;

function isOnRefusedTimeline([width]: number[], sinceRefusalMs: number) {
  const widthAt = (timeMs: number) =>
    BOX_SIZE + BOX_SIZE * Math.min(1, Math.max(0, timeMs / REFUSED_DURATION));
  return (
    width >= widthAt(sinceRefusalMs - FRAME_DRIVER_LATE_MS) &&
    width <= widthAt(sinceRefusalMs + FRAME_DRIVER_EARLY_MS)
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
