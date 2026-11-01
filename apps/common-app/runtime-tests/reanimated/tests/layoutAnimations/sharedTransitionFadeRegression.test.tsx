import type { ComponentRef } from 'react';
import { findNodeHandle, Platform, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  FadeOut,
  getDynamicFeatureFlag,
  getStaticFeatureFlag,
  LinearTransition,
  makeMutable,
  setDynamicFeatureFlag,
  SharedTransition,
  SharedTransitionBoundary,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { runOnUISync, scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  afterEach,
  beforeEach,
  describe,
  expect as baseExpect,
  notify,
  mockAnimationTimer,
  render as renderRuntime,
  test,
  useTestRef,
  unmockAnimationTimer,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';
import {
  createFadeTrace,
  type FadeFrame,
  type FadeTrace,
} from './sharedTransitionFadeTrace';

let trace: FadeTrace;
let assertionIndex = 0;

async function render(component: Parameters<typeof renderRuntime>[0]) {
  const request = await trace.mark('render:requested');
  await renderRuntime(component);
  trace.registerRefs([
    'source',
    'target',
    'child',
    'reference',
    'targetChild',
    'inserted',
    'commitMarker',
  ]);
  await trace.mark('render:returned');
  return request;
}

function expect(value: boolean) {
  console.log(
    '[11033 assertion]',
    JSON.stringify({ id: `regression:direct:${++assertionIndex}`, value })
  );
  return baseExpect(value);
}

const fade = SharedTransition.duration(3000)
  .easing(Easing.linear)
  .fadeContent();
const noFade = SharedTransition.duration(3000).easing(Easing.linear);
const spring = SharedTransition.duration(1800)
  .springify()
  .dampingRatio(0.3)
  .fadeContent();
const childLayout = LinearTransition.duration(6000);
const childExit = FadeOut.duration(6000);

function Pair({
  active,
  sourceConfig = fade,
  targetConfig = fade,
  tagged = false,
  insert = false,
  remove = false,
  targetWide = false,
  ownOpacity,
  actionCommitted = false,
}: {
  active: boolean;
  actionCommitted?: boolean;
  sourceConfig?: SharedTransition;
  targetConfig?: SharedTransition;
  tagged?: boolean;
  insert?: boolean;
  remove?: boolean;
  targetWide?: boolean;
  ownOpacity?: SharedValue<number>;
}) {
  const source = useTestRef('source');
  const target = useTestRef('target');
  const commitMarker = useTestRef('commitMarker');
  return (
    <View style={styles.container}>
      <View
        ref={commitMarker}
        collapsable={false}
        style={{
          position: 'absolute',
          width: actionCommitted ? 2 : 1,
          height: 1,
        }}
      />
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          ref={source}
          sharedTransitionTag="regression"
          sharedTransitionStyle={sourceConfig}
          style={styles.source}>
          {!remove && (
            <Child name="child" tagged={tagged} ownOpacity={ownOpacity} />
          )}
          <Child name="reference" />
          {insert && <Child name="inserted" />}
        </Animated.View>
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active}>
        <Animated.View
          ref={target}
          sharedTransitionTag="regression"
          sharedTransitionStyle={targetConfig}
          style={styles.target}>
          <Child name="targetChild" wide={targetWide} />
        </Animated.View>
      </SharedTransitionBoundary>
    </View>
  );
}

function Child({
  name,
  tagged,
  wide,
  ownOpacity,
}: {
  name: string;
  tagged?: boolean;
  wide?: boolean;
  ownOpacity?: SharedValue<number>;
}) {
  const ref = useTestRef(name);
  const style = useAnimatedStyle(() => ({ opacity: ownOpacity?.value ?? 0.8 }));
  return (
    <Animated.View
      ref={(node: ComponentRef<typeof Animated.View> | null) => {
        ref.current = node;
        if (node) trace.register(name, findNodeHandle(node) ?? -1);
      }}
      collapsable={false}
      sharedTransitionTag={tagged ? 'unmatched-child' : undefined}
      layout={childLayout}
      exiting={childExit}
      style={[styles.child, wide && styles.wide, style]}
    />
  );
}

function sample(names: string[]) {
  const saved = trace.tags();
  const tags = names.map((name) => saved[name]);
  return runOnUIBlocking(() => {
    'worklet';
    return tags.map((tag) => global._obtainMountedViewProps(tag, false));
  });
}

function inFlight(views: FadeFrame['views']) {
  'worklet';
  const source = views.source;
  const target = views.target;
  return (
    !!source &&
    !!target &&
    source.width > 60 &&
    source.width < 145 &&
    source.opacity > 0.99 &&
    target.opacity < 0.01
  );
}

async function moving() {
  await trace.assertion(`regression:eventual:${++assertionIndex}`, async () => {
    const [source, reference] = await sample(['source', 'reference']);
    return (
      !!source &&
      !!reference &&
      source.width > 75 &&
      source.width < 125 &&
      reference.opacity > 0.15 &&
      reference.opacity < 0.7
    );
  });
}

async function opacity(name: string, value: number) {
  await trace.assertion(`regression:eventual:${++assertionIndex}`, async () => {
    const [view] = await sample([name]);
    return !!view && Math.abs(view.opacity - value) < 0.02;
  });
}

function createPhaseAction(
  id: string,
  mode: 'moving' | 'reversal',
  component: Parameters<typeof renderRuntime>[0],
  rawOpacity?: SharedValue<number>
) {
  const running = makeMutable(true);
  const tags = trace.tags();
  const traceState = trace.state;
  const notification = `fade-phase-action:${id}`;
  let stopped = false;
  let pending: Promise<void> | undefined;
  let failure: Error | undefined;
  let matched: FadeFrame | undefined;

  function dispatch(frame: FadeFrame) {
    if (stopped) return;
    matched = frame;
    const requestTimestamp = performance.now();
    const rendered = renderRuntime(component);
    console.log(
      '[11033 phase action]',
      JSON.stringify({ id, requestTimestamp, frame })
    );
    pending = (async () => {
      try {
        await rendered;
        trace.registerRefs(['inserted']);
        await trace.mark(`${id}:native-after-render`);
      } catch (error) {
        failure = error instanceof Error ? error : new Error(String(error));
      } finally {
        notify(notification);
      }
    })();
  }

  async function start() {
    await runOnUIBlocking(() => {
      'worklet';
      const record = (timestamp: number) => {
        if (!running.value) return;
        const views: FadeFrame['views'] = {};
        for (const name in tags) {
          views[name] = global._obtainMountedViewProps(tags[name], true);
        }
        const source = views.source;
        const reference = views.reference;
        if (
          inFlight(views) &&
          source &&
          reference &&
          views.child &&
          (mode === 'moving'
            ? source.width > 75 &&
              source.width < 125 &&
              reference.opacity > 0.15 &&
              reference.opacity < 0.7
            : source.width > 85 && source.width < 125)
        ) {
          running.value = false;
          const frame: FadeFrame = {
            timestamp,
            realTimestamp: performance.now(),
            animationTimestamp: global._getAnimationTimestamp(),
            tags,
            views,
            rawOpacity: rawOpacity?.value ?? 0.8,
            rawWriteIndex: 0,
            referenceFade: reference.opacity / 0.8,
          };
          traceState.value = {
            ...traceState.value,
            events: [
              ...traceState.value.events,
              {
                id: `${id}:matched`,
                realTimestamp: frame.realTimestamp,
                animationTimestamp: frame.animationTimestamp,
                views,
              },
            ],
          };
          scheduleOnRN(dispatch, frame);
          return;
        }
        requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    });
  }

  async function wait() {
    await waitForNotification(notification);
    if (failure) throw failure;
    if (!matched) throw new Error(`No native phase sample for ${id}`);
    return matched;
  }

  async function stop() {
    stopped = true;
    runOnUISync(() => {
      'worklet';
      running.value = false;
    });
    await pending;
  }

  return { start, wait, stop };
}

function committed(frame: FadeFrame) {
  const marker = frame.views.commitMarker;
  return !!marker && Math.abs(marker.width - 2) < 0.1;
}

function createOpacityWriteSequence(own: SharedValue<number>) {
  const running = makeMutable(true);
  const started = makeMutable<OpacityWriteFrame | null>(null);
  const samples = makeMutable<OpacityWriteFrame[]>([]);
  const captures = makeMutable<OpacityWriteFrame[]>([]);
  const tags = trace.tags();
  const traceState = trace.state;
  const values = [0.3, 0.6, 0.3, 0.6];
  const notification = 'fade-sync-four-writes';

  async function start() {
    await runOnUIBlocking(() => {
      'worklet';
      let writeIndex = -1;
      let framesAfterWrite = 0;
      const record = (timestamp: number) => {
        if (!running.value) return;
        const views: FadeFrame['views'] = {};
        for (const name in tags) {
          views[name] = global._obtainMountedViewProps(tags[name], true);
        }
        const source = views.source;
        const reference = views.reference;
        if (writeIndex < 0) {
          if (
            inFlight(views) &&
            source &&
            reference &&
            source.width > 75 &&
            source.width < 125 &&
            reference.opacity > 0.15 &&
            reference.opacity < 0.7
          ) {
            started.value = {
              timestamp,
              realTimestamp: performance.now(),
              animationTimestamp: global._getAnimationTimestamp(),
              tags,
              views,
              rawOpacity: own.value,
              rawWriteIndex: 0,
              referenceFade: reference.opacity / 0.8,
              framesAfterWrite: 0,
            };
            writeIndex = 0;
            own.value = values[writeIndex];
            traceState.value = {
              ...traceState.value,
              rawWriteIndex: writeIndex + 1,
            };
          }
        } else {
          framesAfterWrite += 1;
          const frame: OpacityWriteFrame = {
            timestamp,
            realTimestamp: performance.now(),
            animationTimestamp: global._getAnimationTimestamp(),
            tags,
            views,
            rawOpacity: own.value,
            rawWriteIndex: writeIndex + 1,
            referenceFade: reference ? reference.opacity / 0.8 : null,
            framesAfterWrite,
          };
          captures.value = [...captures.value, frame];
          if (framesAfterWrite === 3) {
            samples.value = [...samples.value, frame];
            writeIndex += 1;
            if (writeIndex === values.length) {
              running.value = false;
              notify(notification);
              return;
            }
            own.value = values[writeIndex];
            traceState.value = {
              ...traceState.value,
              rawWriteIndex: writeIndex + 1,
            };
            framesAfterWrite = 0;
          }
        }
        requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    });
  }

  function read() {
    return runOnUISync(() => {
      'worklet';
      return {
        started: started.value,
        samples: samples.value,
        captures: captures.value,
      };
    });
  }

  function stop() {
    runOnUISync(() => {
      'worklet';
      running.value = false;
    });
  }

  return { start, read, stop, notification };
}

type OpacityWriteFrame = FadeFrame & { framesAfterWrite: number };

const FAST_FRAME_GUARD_MS = 500;
const FAST_MOVE_FRAMES = Math.ceil(3000 / 16) + 2;
const FAST_FADE_FRAMES = Math.ceil(1500 / 16) + 2;
const FAST_SEQUENCE_TIMEOUT_MS = 64 * FAST_FRAME_GUARD_MS;

type FastFlags = {
  androidSync: boolean;
  animationBackend: boolean;
  tracking: boolean;
};

type FastMovementEvent = {
  phase: string;
  finished: boolean | null;
  realTimestamp: number;
  animationTimestamp: number;
  tags: FadeFrame['tags'];
  views: FadeFrame['views'];
};

function createFastMovementObserver() {
  const events = makeMutable<FastMovementEvent[]>([]);
  const traceState = trace.state;

  function config(phase: string) {
    return SharedTransition.duration(3000)
      .easing(Easing.linear)
      .fadeContent()
      .withCallback((finished) => {
        'worklet';
        const tags = traceState.value.tags;
        const views: FadeFrame['views'] = {};
        for (const name in tags) {
          views[name] = global._obtainMountedViewProps(tags[name], true);
        }
        events.value = [
          ...events.value,
          {
            phase,
            finished: finished ?? null,
            realTimestamp: performance.now(),
            animationTimestamp: global._getAnimationTimestamp(),
            tags,
            views,
          },
        ];
        notify(`fade-fast:movement:${phase}:${String(finished)}`);
      });
  }

  function read() {
    return runOnUISync(() => {
      'worklet';
      return events.value;
    });
  }

  return { config, read };
}

function fastAssertion(
  id: string,
  value: boolean,
  actual: unknown,
  flags: FastFlags
) {
  console.log(
    '[11033 fast assertion]',
    JSON.stringify({ id, value, flags, actual })
  );
  baseExpect(value).toBe(true);
}

function exportFastSequence(
  written: ReturnType<ReturnType<typeof createOpacityWriteSequence>['read']>,
  flags: FastFlags
) {
  console.log(
    '[11033 fast sequence]',
    JSON.stringify({
      flags,
      started: written.started,
      sampleCount: written.samples.length,
      captureCount: written.captures.length,
    })
  );
  for (const [index, frame] of written.captures.entries()) {
    console.log(
      '[11033 fast capture]',
      JSON.stringify({ index: index + 1, flags, frame })
    );
  }
}

function fastClock() {
  return runOnUISync(() => {
    'worklet';
    return {
      realTimestamp: performance.now(),
      animationTimestamp: global._getAnimationTimestamp(),
      framesCount: global.framesCount ?? null,
    };
  });
}

function logFastStage(
  id: string,
  start: ReturnType<typeof fastClock>,
  flags: FastFlags,
  end = fastClock()
) {
  console.log(
    '[11033 fast stage]',
    JSON.stringify({
      id,
      flags,
      start,
      end,
      realElapsed: end.realTimestamp - start.realTimestamp,
      animationElapsed: end.animationTimestamp - start.animationTimestamp,
      framesElapsed:
        start.framesCount !== null && end.framesCount !== null
          ? end.framesCount - start.framesCount
          : null,
    })
  );
}

async function fastRestorationFrame(phase: string, flags: FastFlags) {
  const start = fastClock();
  try {
    await waitForFrames(
      FAST_MOVE_FRAMES,
      FAST_MOVE_FRAMES * FAST_FRAME_GUARD_MS
    );
    await waitForNotification(`fade-fast:movement:${phase}:true`, 5000);
    await waitForFrames(
      FAST_FADE_FRAMES,
      FAST_FADE_FRAMES * FAST_FRAME_GUARD_MS
    );
    return await trace.mark(`sync:${phase}:restoration`);
  } catch (error) {
    const actual = await trace.mark(`sync:${phase}:wait-failed`);
    console.log(
      '[11033 fast wait]',
      JSON.stringify({
        id: `sync:${phase}:completion-wait`,
        value: false,
        actual,
        error: String(error),
      })
    );
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    logFastStage(`sync:${phase}:restoration-stage`, start, flags);
  }
}

describe('Shared transition fade regressions', () => {
  beforeEach(async () => {
    assertionIndex = 0;
    trace = await createFadeTrace();
  });
  afterEach(() => trace.stop());
  test('accepts the shared transition builder class from JavaScript', async () => {
    const sourceConfig = SharedTransition as unknown as SharedTransition;
    await render(<Pair active={false} sourceConfig={sourceConfig} />);
    await waitForFrames();
    await render(<Pair active sourceConfig={sourceConfig} />);
    await opacity('target', 1);
  });

  test('fades an unmatched tagged direct child', async () => {
    await render(<Pair active={false} tagged />);
    await waitForFrames();
    await render(<Pair active tagged />);
    await moving();
    const [parent, child, reference] = await sample([
      'source',
      'child',
      'reference',
    ]);
    expect(parent!.width > 60 && parent!.width < 150).toBe(true);
    expect(child!.opacity > 0.05 && child!.opacity < 0.75).toBe(true);
    expect(Math.abs(child!.opacity - reference!.opacity) < 0.02).toBe(true);
    await opacity('target', 1);
    await opacity('child', 0.8);
  });

  test('fades a child inserted into the moving carrier', async () => {
    await render(<Pair active={false} />);
    await waitForFrames();
    const action = createPhaseAction(
      'insert',
      'moving',
      <Pair active insert actionCommitted />
    );
    let insertion: FadeFrame;
    try {
      await action.start();
      await renderRuntime(<Pair active />);
      insertion = await action.wait();
    } finally {
      await action.stop();
    }
    const { source, reference } = insertion.views;
    expect(
      !!source &&
        !!reference &&
        source.width > 75 &&
        source.width < 125 &&
        reference.opacity > 0.15 &&
        reference.opacity < 0.7
    ).toBe(true);
    expect(inFlight(insertion.views)).toBe(true);
    await trace.assertion(
      `regression:eventual:${++assertionIndex}`,
      async () => {
        const [source, child, reference] = await sample([
          'source',
          'inserted',
          'reference',
        ]);
        return (
          !!source &&
          source.width < 145 &&
          !!child &&
          !!reference &&
          child.opacity > 0.02 &&
          child.opacity < 0.75 &&
          Math.abs(child.opacity - reference.opacity) < 0.02
        );
      }
    );
    await opacity('target', 1);
    await opacity('inserted', 0.8);
    trace.requireFrame('insert:mounted-during-motion', (frame) => {
      const child = frame.views.inserted;
      const reference = frame.views.reference;
      return (
        frame.realTimestamp >= insertion.realTimestamp &&
        committed(frame) &&
        inFlight(frame.views) &&
        !!child &&
        !!reference &&
        child.opacity > 0.02 &&
        child.opacity < 0.75 &&
        Math.abs(child.opacity - reference.opacity) < 0.02
      );
    });
  });

  test('keeps an exiting child in the carrier fade', async () => {
    await render(<Pair active={false} />);
    await waitForFrames();
    const action = createPhaseAction(
      'exit',
      'moving',
      <Pair active remove actionCommitted />
    );
    let removal: FadeFrame;
    try {
      await action.start();
      await renderRuntime(<Pair active />);
      removal = await action.wait();
    } finally {
      await action.stop();
    }
    const before = removal.views.child;
    const { source, reference } = removal.views;
    expect(
      !!source &&
        !!reference &&
        source.width > 75 &&
        source.width < 125 &&
        reference.opacity > 0.15 &&
        reference.opacity < 0.7
    ).toBe(true);
    expect(inFlight(removal.views)).toBe(true);
    await trace.assertion(
      `regression:eventual:${++assertionIndex}`,
      async () => {
        const [source, child] = await sample(['source', 'child']);
        return (
          !!source &&
          source.width < 145 &&
          !!child &&
          child.opacity > 0 &&
          child.opacity <= before!.opacity + 0.02
        );
      }
    );
    await opacity('target', 1);
    trace.requireFrame('exit:saved-tag-during-motion', (frame) => {
      const child = frame.views.child;
      return (
        frame.realTimestamp >= removal.realTimestamp &&
        committed(frame) &&
        inFlight(frame.views) &&
        !!child &&
        child.opacity > 0 &&
        child.opacity <= before!.opacity + 0.02
      );
    });
  });

  test('keeps a target child layout animation instead of replacing it with a fade-in', async () => {
    await render(<Pair active={false} />);
    await waitForFrames();
    await render(<Pair active targetWide />);
    await moving();
    await trace.assertion(
      `regression:eventual:${++assertionIndex}`,
      async () => {
        const [target, child] = await sample(['target', 'targetChild']);
        return (
          !!target &&
          target.opacity > 0.99 &&
          !!child &&
          child.width > 25 &&
          child.width < 65 &&
          Math.abs(child.opacity - 0.8) < 0.02
        );
      }
    );
    await trace.assertion(
      `regression:eventual:${++assertionIndex}`,
      async () => {
        const [child] = await sample(['targetChild']);
        return !!child && Math.abs(child.width - 70) < 0.5;
      }
    );
  });

  test.each([true, false])(
    'keeps the first carrier fade policy when reversing (source fade: %p)',
    async (enabled) => {
      const sourceConfig = enabled ? fade : noFade;
      const targetConfig = enabled ? noFade : fade;
      await render(
        <Pair
          active={false}
          sourceConfig={sourceConfig}
          targetConfig={targetConfig}
        />
      );
      await waitForFrames();
      const action = createPhaseAction(
        'reverse',
        'reversal',
        <Pair
          active={false}
          sourceConfig={sourceConfig}
          targetConfig={targetConfig}
          actionCommitted
        />
      );
      let reversal: FadeFrame;
      try {
        await action.start();
        await renderRuntime(
          <Pair
            active
            sourceConfig={sourceConfig}
            targetConfig={targetConfig}
          />
        );
        reversal = await action.wait();
      } finally {
        await action.stop();
      }
      const forward = reversal.views.source;
      expect(!!forward && forward.width > 85 && forward.width < 125).toBe(true);
      const before = reversal.views.child;
      expect(
        !!before &&
          (enabled
            ? before.opacity < 0.7
            : Math.abs(before.opacity - 0.8) < 0.02)
      ).toBe(true);
      expect(inFlight(reversal.views)).toBe(true);
      await trace.assertion(
        `regression:eventual:${++assertionIndex}`,
        async () => {
          const [source, child] = await sample(['source', 'child']);
          return (
            !!source &&
            source.width > 65 &&
            source.width < 125 &&
            !!child &&
            (enabled
              ? !!before &&
                child.opacity > before.opacity + 0.02 &&
                child.opacity < 0.79
              : Math.abs(child.opacity - 0.8) < 0.02)
          );
        }
      );
      await opacity('source', 1);
      await opacity('child', 0.8);
      await opacity('target', 0);
      const sourceTag = trace.tags().source;
      const id = 'reverse:same-native-carrier-in-motion';
      let matchedFrame: FadeFrame | undefined;
      let lastFrames: FadeFrame[] = [];
      try {
        await trace.assertion(id, () => {
          const recordedFrames = trace.frames();
          lastFrames = recordedFrames.slice(-3);
          matchedFrame = recordedFrames.find((frame) => {
            const source = frame.views.source;
            const start = reversal.views.source;
            return (
              frame.realTimestamp > reversal.realTimestamp &&
              committed(frame) &&
              frame.tags.source === sourceTag &&
              inFlight(frame.views) &&
              !!source &&
              !!start &&
              source.width < start.width - 0.5 &&
              source.width > 65 &&
              source.width < 125
            );
          });
          return !!matchedFrame;
        });
      } finally {
        console.log(
          '[11033 assertion]',
          JSON.stringify({
            id,
            value: !!matchedFrame,
            frame: matchedFrame ?? null,
          })
        );
        if (!matchedFrame) {
          for (const [index, frame] of lastFrames.entries()) {
            console.log(
              '[11033 reversal timeout frame]',
              JSON.stringify({
                id,
                index: index + 1,
                frame,
              })
            );
          }
        }
      }
    }
  );

  test('does not rebound child opacity when the moving spring overshoots', async () => {
    const observedSpring = spring.withCallback(trace.onFinish);
    await render(<Pair active={false} sourceConfig={observedSpring} />);
    await waitForFrames();
    const parentTag = trace.tags().source;
    const childTag = trace.tags().child;
    const running = makeMutable(true);
    const values = makeMutable<{ opacity: number; width: number }[]>([]);
    scheduleOnUI(() => {
      'worklet';
      const record = () => {
        if (!running.value) return;
        const parent = global._obtainMountedViewProps(parentTag, false);
        const child = global._obtainMountedViewProps(childTag, false);
        if (parent && parent.opacity > 0.99 && child) {
          values.value = [
            ...values.value,
            { opacity: child.opacity, width: parent.width },
          ];
        }
        requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    });
    try {
      await render(<Pair active sourceConfig={observedSpring} />);
      await opacity('target', 1);
      const samples = await runOnUIBlocking(() => {
        'worklet';
        return values.value;
      });
      const zero = samples.findIndex((value) => value.opacity < 0.001);
      expect(samples.some((value) => value.opacity > 0.1)).toBe(true);
      expect(samples.some((value) => value.width > 151)).toBe(true);
      expect(zero >= 0 && samples.length - zero > 3).toBe(true);
      expect(samples.slice(zero).every((value) => value.opacity < 0.01)).toBe(
        true
      );
      await opacity('child', 0.8);
    } finally {
      await runOnUIBlocking(() => {
        'worklet';
        running.value = false;
      });
    }
  });

  const fastTest =
    Platform.OS === 'android' &&
    getStaticFeatureFlag('ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS') &&
    !getStaticFeatureFlag('USE_ANIMATION_BACKEND')
      ? test
      : test.skip;
  fastTest(
    'composes repeated synchronous child opacity writes with tracking off and restores on reversal',
    async () => {
      const flag = 'TRACK_SYNCHRONOUS_PROPS_IN_LAYOUT_ANIMATIONS';
      const old = getDynamicFeatureFlag(flag);
      const own = makeMutable(0.6);
      const movement = createFastMovementObserver();
      const forwardConfig = movement.config('forward');
      const returnConfig = movement.config('return');
      const finishConfig = movement.config('finish');
      trace.bindRawOpacity(own);
      setDynamicFeatureFlag(flag, false);
      const flags = {
        androidSync: getStaticFeatureFlag(
          'ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS'
        ),
        animationBackend: getStaticFeatureFlag('USE_ANIMATION_BACKEND'),
        tracking: getDynamicFeatureFlag(flag),
      };
      try {
        await mockAnimationTimer();
        await render(
          <Pair
            active={false}
            ownOpacity={own}
            sourceConfig={forwardConfig}
            targetConfig={returnConfig}
          />
        );
        await waitForFrames();
        const sequence = createOpacityWriteSequence(own);
        const sequenceStart = fastClock();
        let sequenceEnd: ReturnType<typeof fastClock> | undefined;
        try {
          await sequence.start();
          await render(
            <Pair
              active
              ownOpacity={own}
              sourceConfig={forwardConfig}
              targetConfig={returnConfig}
            />
          );
          await waitForNotification(
            sequence.notification,
            FAST_SEQUENCE_TIMEOUT_MS
          );
          sequenceEnd = fastClock();
          const written = sequence.read();
          const start = written.started;
          const source = start?.views.source;
          const reference = start?.views.reference;
          const validStart =
            !!start &&
            inFlight(start.views) &&
            !!source &&
            !!reference &&
            source.width > 75 &&
            source.width < 125 &&
            reference.opacity > 0.15 &&
            reference.opacity < 0.7;
          fastAssertion('sync:motion-start', validStart, start, flags);
          if (!validStart) throw new Error('No saved moving start frame');
          fastAssertion(
            'sync:sample-count',
            written.samples.length === 4,
            { count: written.samples.length },
            flags
          );
          fastAssertion(
            'sync:capture-count',
            written.captures.length === 12,
            { count: written.captures.length },
            flags
          );
          if (written.samples.length !== 4 || written.captures.length !== 12) {
            throw new Error('Incomplete four-write capture');
          }
          for (const [writeIndex, value] of [0.3, 0.6, 0.3, 0.6].entries()) {
            const frame = written.samples[writeIndex];
            const { source, child, reference } = frame.views;
            fastAssertion(
              `sync:write-${writeIndex + 1}:source-range`,
              !!source && source.width > 60 && source.width < 145,
              frame,
              flags
            );
            fastAssertion(
              `sync:write-${writeIndex + 1}:composition`,
              !!child &&
                !!reference &&
                Math.abs(child.opacity - (value * reference.opacity) / 0.8) <
                  0.025,
              frame,
              flags
            );
            const factor = frame.referenceFade;
            fastAssertion(
              `sync:write-${writeIndex + 1}:raw-${value}:during-motion`,
              inFlight(frame.views) &&
                frame.rawWriteIndex === writeIndex + 1 &&
                frame.rawOpacity === value &&
                !!child &&
                factor !== null &&
                factor > 0 &&
                factor < 0.99 &&
                Math.abs(child.opacity - value * factor) < 0.025,
              frame,
              flags
            );
          }
        } finally {
          sequence.stop();
          logFastStage(
            'sync:sequence-through-notification',
            sequenceStart,
            flags,
            sequenceEnd
          );
          exportFastSequence(sequence.read(), flags);
        }
        const action = createPhaseAction(
          'fast-return',
          'moving',
          <Pair
            active={false}
            ownOpacity={own}
            sourceConfig={finishConfig}
            targetConfig={returnConfig}
            actionCommitted
          />,
          own
        );
        let request: FadeFrame;
        try {
          await action.start();
          request = await action.wait();
        } finally {
          await action.stop();
        }
        fastAssertion(
          'sync:return:active-request',
          inFlight(request.views),
          request,
          flags
        );
        const returned = await fastRestorationFrame('return', flags);
        const returnFrames = trace.frames();
        const returnFrame = returnFrames.find((frame) => {
          const source = frame.views.source;
          const start = request.views.source;
          return (
            frame.realTimestamp > request.realTimestamp &&
            committed(frame) &&
            frame.tags.source === request.tags.source &&
            inFlight(frame.views) &&
            !!source &&
            !!start &&
            source.width < start.width - 0.5 &&
            source.width > 65 &&
            source.width < 125
          );
        });
        fastAssertion(
          'sync:return:same-native-carrier',
          !!returnFrame,
          { request, frame: returnFrame ?? null },
          flags
        );
        const callbacks = movement.read();
        const callbackStates = callbacks.map(
          ({ phase, finished, realTimestamp, animationTimestamp }) => ({
            phase,
            finished,
            realTimestamp,
            animationTimestamp,
          })
        );
        fastAssertion(
          'sync:return:forward-not-finished-before-request',
          !callbacks.some(
            (event) =>
              event.phase === 'forward' &&
              event.finished === true &&
              event.animationTimestamp <= request.animationTimestamp
          ),
          callbackStates,
          flags
        );
        fastAssertion(
          'sync:forward:cancelled',
          callbacks.some(
            (event) => event.phase === 'forward' && event.finished === false
          ),
          callbackStates,
          flags
        );
        fastAssertion(
          'sync:return:finished',
          callbacks.some(
            (event) => event.phase === 'return' && event.finished === true
          ),
          callbackStates,
          flags
        );
        fastAssertion(
          'sync:return:source-restored',
          !!returned.views.source &&
            Math.abs(returned.views.source.opacity - 1) < 0.02,
          returned,
          flags
        );
        fastAssertion(
          'sync:return:child-restored',
          !!returned.views.child &&
            Math.abs(returned.views.child.opacity - 0.6) < 0.02,
          returned,
          flags
        );
        await render(
          <Pair
            active
            ownOpacity={own}
            sourceConfig={finishConfig}
            targetConfig={returnConfig}
          />
        );
        const finished = await fastRestorationFrame('finish', flags);
        fastAssertion(
          'sync:finish:target-restored',
          !!finished.views.target &&
            Math.abs(finished.views.target.opacity - 1) < 0.02,
          finished,
          flags
        );
        fastAssertion(
          'sync:finish:child-restored',
          !!finished.views.child &&
            Math.abs(finished.views.child.opacity - 0.6) < 0.02,
          finished,
          flags
        );
      } finally {
        try {
          for (const [index, event] of movement.read().entries()) {
            console.log(
              '[11033 movement callback]',
              JSON.stringify({ index: index + 1, flags, event })
            );
          }
        } finally {
          try {
            await unmockAnimationTimer();
          } finally {
            setDynamicFeatureFlag(flag, old);
          }
        }
      }
    }
  );
});

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
  source: { width: 60, height: 60, backgroundColor: 'red' },
  target: {
    position: 'absolute',
    top: 100,
    left: 60,
    width: 150,
    height: 150,
    backgroundColor: 'blue',
  },
  child: { width: 20, height: 15, backgroundColor: 'white' },
  wide: { width: 70 },
});
