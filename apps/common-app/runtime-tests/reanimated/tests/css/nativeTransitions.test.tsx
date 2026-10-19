import type { ComponentRef } from 'react';
import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  findNodeHandle,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { CSSTransitionProperties } from 'react-native-reanimated';
import Animated, {
  createAnimatedComponent,
  linear,
  steps,
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
import type { TraceEvent } from '../nativeAnimationObservation';
import {
  CSS_HOST_TIMING_KINDS,
  hasNativeCSSTransitions,
  nativeAnimationHostExists,
  takeTrace,
} from '../nativeAnimationObservation';

const BOX_REF = 'CSSNativeTransitionBox';
const SECOND_SURFACE_BOX_REF = 'CSSNativeTransitionSecondSurfaceBox';
const DURATION = 400;
const FOCUSED_OPACITY = 0.4;

const AnimatedTextInput = createAnimatedComponent(TextInput);

async function takeTraceOf(tag: number) {
  return (await takeTrace()).filter((event) => event.tag === tag);
}

function summarize(events: TraceEvent[]) {
  return events
    .map(({ event, finished, outcome, reason }) =>
      [event, finished, outcome, reason]
        .filter((part) => part !== undefined)
        .join(':')
    )
    .join(' > ');
}

function Box({
  opacity,
  transition = { transitionProperty: 'opacity' },
}: {
  opacity: number;
  transition?: CSSTransitionProperties;
}) {
  const ref = useTestRef(BOX_REF);
  return (
    <View>
      <Animated.View
        ref={ref}
        style={[
          styles.box,
          {
            opacity,
            transitionDuration: DURATION,
            transitionTimingFunction: 'linear',
          },
          transition,
        ]}
      />
    </View>
  );
}

const scrollRef = React.createRef<ComponentRef<typeof ScrollView>>();

function ClippedBox({ opacity }: { opacity: number }) {
  const ref = useTestRef(BOX_REF);
  return (
    <ScrollView ref={scrollRef} removeClippedSubviews style={styles.scroll}>
      <Animated.View
        ref={ref}
        style={[
          styles.box,
          {
            opacity,
            transitionProperty: 'opacity',
            transitionDuration: DURATION,
            transitionTimingFunction: 'linear',
          },
        ]}
      />
      <View style={styles.scrollFiller} />
    </ScrollView>
  );
}

const nestedTextRef = React.createRef<ComponentRef<typeof Text>>();

// A nested text has a view tag and no native view.
function NestedText({ opacity }: { opacity: number }) {
  return (
    <Text>
      <Animated.Text
        ref={nestedTextRef}
        style={{
          opacity,
          transitionProperty: 'opacity',
          transitionDuration: DURATION,
          transitionTimingFunction: 'linear',
        }}>
        text
      </Animated.Text>
    </Text>
  );
}

const inputRef = React.createRef<ComponentRef<typeof TextInput>>();

function FocusableInput({ opacity }: { opacity: number }) {
  return (
    <AnimatedTextInput
      ref={inputRef}
      style={[
        styles.box,
        {
          opacity: { default: opacity, ':focus': FOCUSED_OPACITY },
          transitionProperty: 'opacity',
          transitionDuration: DURATION,
          transitionTimingFunction: 'linear',
        },
      ]}
    />
  );
}

/**
 * Resolves after React commits the new opacity, so CSS has given its start to
 * the host.
 */
let commitSecondSurfaceOpacity: (opacity: number) => Promise<void> = () =>
  Promise.resolve();

function SecondSurfaceBox() {
  const [opacity, setOpacity] = useState(1);
  const ref = useTestRef(SECOND_SURFACE_BOX_REF);
  const onCommit = useRef<() => void>(undefined);
  commitSecondSurfaceOpacity = (nextOpacity) =>
    new Promise((resolve) => {
      onCommit.current = resolve;
      setOpacity(nextOpacity);
    });
  useLayoutEffect(() => {
    onCommit.current?.();
    onCommit.current = undefined;
  }, [opacity]);
  return (
    <Animated.View
      ref={ref}
      style={[
        styles.box,
        {
          opacity,
          transitionProperty: 'opacity',
          transitionDuration: DURATION,
          transitionTimingFunction: 'linear',
        },
      ]}
    />
  );
}

async function renderBoxAndStart(transition?: CSSTransitionProperties) {
  await render(<Box opacity={1} transition={transition} />);
  await wait(50);
  await takeTrace();
  await render(<Box opacity={0.2} transition={transition} />);
  return getTestComponent(BOX_REF).getTag();
}

async function expectRunOnLoop(
  transitionTimingFunction: CSSTransitionProperties['transitionTimingFunction']
) {
  const hasHost = await nativeAnimationHostExists();
  const tag = await renderBoxAndStart({
    transitionProperty: 'opacity',
    transitionTimingFunction,
  });
  await wait(DURATION * 0.6);
  if (hasHost) {
    expect(summarize(await takeTraceOf(tag))).toBe('');
  }
  expect(
    Number(await getTestComponent(BOX_REF).getAnimatedStyle('opacity'))
  ).toBeWithinRange(0.21, 0.99);
}

async function expectRunOnHost(
  transitionTimingFunction: CSSTransitionProperties['transitionTimingFunction']
) {
  if (!(await nativeAnimationHostExists())) {
    return;
  }
  const tag = await renderBoxAndStart({
    transitionProperty: 'opacity',
    transitionTimingFunction,
  });
  await wait(DURATION * 0.6);
  expect(summarize(await takeTraceOf(tag))).toBe(
    'Received > TrackStarted > Admitted'
  );
  await wait(DURATION);
  expect(summarize(await takeTraceOf(tag))).toBe(
    'TrackEnded:true > Ended:Finished:None'
  );
}

/**
 * The route table of the platform plays the timing kind
 * (`CSS_HOST_TIMING_KINDS`).
 */
async function expectRouteOfTimingKind(
  kind: string,
  transitionTimingFunction: CSSTransitionProperties['transitionTimingFunction']
) {
  if (CSS_HOST_TIMING_KINDS.includes(kind)) {
    await expectRunOnHost(transitionTimingFunction);
  } else {
    await expectRunOnLoop(transitionTimingFunction);
  }
}

describe('CSS transitions on the shared native animation host', () => {
  if (!hasNativeCSSTransitions) {
    return;
  }

  test('a fresh start plays one track and commits its endpoint', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    const tag = await renderBoxAndStart();
    await wait(DURATION / 2);
    const startEvents = await takeTraceOf(tag);
    expect(summarize(startEvents)).toBe('Received > TrackStarted > Admitted');
    expect(startEvents[1].target).toBe('Opacity');
    expect(startEvents[1].endpointPolicy).toBe('ExecutorCommitsEndpoint');

    await wait(DURATION);
    expect(summarize(await takeTraceOf(tag))).toBe(
      'TrackEnded:true > Ended:Finished:None'
    );
  });

  test('an interrupting start replaces the active track once', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    const tag = await renderBoxAndStart();
    await wait(DURATION / 2);
    const firstGeneration = (await takeTraceOf(tag))[0].generation;

    await render(<Box opacity={0.6} />);
    await wait(DURATION / 4);
    const events = await takeTraceOf(tag);
    expect(summarize(events)).toBe(
      'Received > TrackEnded:false > Ended:Interrupted:None > TrackStarted > Admitted'
    );
    expect(events[1].generation).toBe(firstGeneration);
    expect(events[3].generation).not.toBe(firstGeneration);

    await wait(DURATION);
    expect(summarize(await takeTraceOf(tag))).toBe(
      'TrackEnded:true > Ended:Finished:None'
    );
  });

  test('a start time in the past plays only the remaining time', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    const tag = await renderBoxAndStart({
      transitionProperty: 'opacity',
      transitionDelay: -DURATION / 2,
    });
    await wait(DURATION);
    const events = await takeTraceOf(tag);
    expect(summarize(events)).toBe(
      'Received > TrackStarted > Admitted > TrackEnded:true > Ended:Finished:None'
    );
    const playedTime = events[3].monotonicTimeMs - events[2].monotonicTimeMs;
    expect(playedTime > DURATION * 0.25 && playedTime < DURATION * 0.75).toBe(
      true
    );
  });

  test('removal from transitionProperty cancels the exact track', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    const tag = await renderBoxAndStart();
    await wait(DURATION / 4);
    await takeTrace();

    await render(
      <Box opacity={0.2} transition={{ transitionProperty: 'none' }} />
    );
    await wait(DURATION);
    expect(summarize(await takeTraceOf(tag))).toBe(
      'TrackEnded:false > Ended:Cancelled:None'
    );
  });

  test('removal of the view ends the command once', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    const tag = await renderBoxAndStart();
    await wait(DURATION / 4);
    await takeTrace();

    await render(<View />);
    await wait(DURATION * 1.5);
    expect(summarize(await takeTraceOf(tag))).toBe(
      'TrackEnded:false > Ended:Cancelled:None'
    );
  });

  test('a held track ends at its timeline end and stays active until its release', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    // A pseudo-selector change plays on the platform only for a property that already played there.
    await render(<FocusableInput opacity={1} />);
    await wait(50);
    await render(<FocusableInput opacity={0.9} />);
    await wait(DURATION * 1.5);
    await takeTrace();
    const tag = findNodeHandle(inputRef.current) ?? -1;

    inputRef.current?.focus();
    await wait(DURATION / 2);
    const holdStart = await takeTraceOf(tag);
    expect(summarize(holdStart)).toBe('Received > TrackStarted > Admitted');
    expect(holdStart[1].endpointPolicy).toBe('HoldWithoutCommit');

    await wait(DURATION);
    expect(summarize(await takeTraceOf(tag))).toBe('TrackEnded:true');

    inputRef.current?.blur();
    await wait(DURATION / 4);
    const release = await takeTraceOf(tag);
    expect(summarize(release)).toBe(
      'Received > Ended:Interrupted:None > TrackStarted > Admitted'
    );
    expect(release[1].generation).toBe(holdStart[0].generation);
    expect(release[2].endpointPolicy).toBe('ExecutorCommitsEndpoint');

    await wait(DURATION);
    expect(summarize(await takeTraceOf(tag))).toBe(
      'TrackEnded:true > Ended:Finished:None'
    );
  });

  test('the host rejects a run on a tag with no native view', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    await render(<NestedText opacity={1} />);
    await wait(50);
    await takeTrace();
    const tag = findNodeHandle(nestedTextRef.current) ?? -1;

    await render(<NestedText opacity={0.2} />);
    await wait(DURATION * 1.5);
    expect(summarize(await takeTraceOf(tag))).toBe(
      'Received > Ended:Rejected:TargetUnavailable'
    );
  });

  // Android ends an animator only at its last frame or when the executor stops it.
  if (Platform.OS === 'android') {
    test('on Android, a run of a clipped view plays to its end and CSS keeps the committed value', async () => {
      const hasHost = await nativeAnimationHostExists();
      await render(<ClippedBox opacity={1} />);
      await wait(50);
      await takeTrace();
      await render(<ClippedBox opacity={0.2} />);
      const box = getTestComponent(BOX_REF);
      await wait(DURATION / 4);
      await takeTrace();

      scrollRef.current?.scrollTo({ y: 1500, animated: false });
      await wait(DURATION);
      if (hasHost) {
        expect(summarize(await takeTraceOf(box.getTag()))).toBe(
          'TrackEnded:true > Ended:Finished:None'
        );
      }
      expect(Number(await box.getAnimatedStyle('opacity'))).toBe(0.2);
    });
  } else {
    test('a run that the platform removes ends once and CSS keeps the committed value', async () => {
      const hasHost = await nativeAnimationHostExists();
      await render(<ClippedBox opacity={1} />);
      await wait(50);
      await takeTrace();
      await render(<ClippedBox opacity={0.2} />);
      const box = getTestComponent(BOX_REF);
      await wait(DURATION / 4);
      expect(Number(await box.getAnimatedStyle('opacity'))).toBe(0.2);
      await takeTrace();

      scrollRef.current?.scrollTo({ y: 1500, animated: false });
      await wait(DURATION / 4);
      if (hasHost) {
        expect(summarize(await takeTraceOf(box.getTag()))).toBe(
          'TrackEnded:false > Ended:Interrupted:PlatformRemoved'
        );
      }
      expect(Number(await box.getAnimatedStyle('opacity'))).toBe(0.2);

      await wait(DURATION);
      expect(Number(await box.getAnimatedStyle('opacity'))).toBe(0.2);
      if (hasHost) {
        expect(summarize(await takeTraceOf(box.getTag()))).toBe('');
      }
    });
  }

  test('a steps easing takes the route of the platform route table', async () => {
    await expectRouteOfTimingKind('steps', steps(4));
  });

  test('a linear() easing takes the route of the platform route table', async () => {
    await expectRouteOfTimingKind(
      'linear()',
      linear(0, [0.25, '50%', '50%'], 1)
    );
  });
});

describe('CSS transitions of a second surface on the shared native animation host', () => {
  if (!hasNativeCSSTransitions || !isSecondSurfaceAvailable()) {
    return;
  }

  const SURFACE_END_OUTCOMES = ['SurfaceDestroyed', 'Cancelled'];

  test('a stop of the surface ends its running command once', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    const surfaceId = await startSecondSurface(SecondSurfaceBox);
    await wait(50);
    await takeTrace();
    const tag = getTestComponent(SECOND_SURFACE_BOX_REF).getTag();

    await commitSecondSurfaceOpacity(0.2);
    await wait(DURATION / 4);
    await stopSecondSurface(surfaceId);
    await wait(DURATION * 1.5);
    const ended = (await takeTraceOf(tag)).filter(
      ({ event }) => event === 'Ended'
    );
    console.log(`CSSNativeTransition surface stop: ${summarize(ended)}`);
    expect(ended.length).toBe(1);
    expect(SURFACE_END_OUTCOMES.includes(ended[0]?.outcome ?? '')).toBe(true);
  });

  test('a start at the stop of the surface gets one result', async () => {
    if (!(await nativeAnimationHostExists())) {
      return;
    }
    const surfaceId = await startSecondSurface(SecondSurfaceBox);
    await wait(50);
    await takeTrace();
    const tag = getTestComponent(SECOND_SURFACE_BOX_REF).getTag();

    await commitSecondSurfaceOpacity(0.2);
    await stopSecondSurface(surfaceId);
    await wait(DURATION * 1.5);
    const events = await takeTraceOf(tag);
    const ended = events.filter(({ event }) => event === 'Ended');
    console.log(
      `CSSNativeTransition start at a surface stop: ${summarize(events)}`
    );
    expect(events.filter(({ event }) => event === 'Received').length).toBe(1);
    expect(ended.length).toBe(1);
    const isAllowed = ({ outcome, reason }: TraceEvent) =>
      SURFACE_END_OUTCOMES.includes(outcome ?? '') ||
      (outcome === 'Rejected' && reason === 'TargetUnavailable');
    expect(ended.every(isAllowed)).toBe(true);
  });
});

const styles = StyleSheet.create({
  box: {
    width: 80,
    height: 80,
    backgroundColor: 'navy',
  },
  scroll: {
    height: 200,
  },
  scrollFiller: {
    height: 3000,
  },
});
