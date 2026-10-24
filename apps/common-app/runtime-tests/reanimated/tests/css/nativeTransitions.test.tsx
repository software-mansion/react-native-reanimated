import type { ComponentRef } from 'react';
import React from 'react';
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
  getStaticFeatureFlag,
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

type TraceEvent = {
  event: string;
  tag: number;
  generation: number;
  monotonicTimeMs: number;
  target?: string;
  endpointPolicy?: string;
  finished?: boolean;
  outcome?: string;
  reason?: string;
};

type TraceSource = {
  takeNativeAnimationTrace?: (callback: (events: TraceEvent[]) => void) => void;
};

const traceSource = (
  globalThis as unknown as { __reanimatedModuleProxy: TraceSource }
).__reanimatedModuleProxy;

// The trace exists only in development builds of the native code, and the host only with the flag.
const hasNativeTransitions =
  Platform.OS === 'ios' &&
  getStaticFeatureFlag('IOS_CSS_CORE_ANIMATION') &&
  traceSource.takeNativeAnimationTrace !== undefined;

const BOX_REF = 'CSSNativeTransitionBox';
const DURATION = 400;
const FOCUSED_OPACITY = 0.4;

const AnimatedTextInput = createAnimatedComponent(TextInput);

function takeTrace(): Promise<TraceEvent[]> {
  return new Promise((resolve) => {
    traceSource.takeNativeAnimationTrace?.(resolve);
  });
}

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

async function renderBoxAndStart(transition?: CSSTransitionProperties) {
  await render(<Box opacity={1} transition={transition} />);
  await wait(50);
  await takeTrace();
  await render(<Box opacity={0.2} transition={transition} />);
  return getTestComponent(BOX_REF).getTag();
}

describe('CSS transitions on the shared native animation host', () => {
  if (!hasNativeTransitions) {
    return;
  }

  test('a fresh start plays one track and commits its endpoint', async () => {
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

  test('a run that the platform removes ends once and CSS keeps the committed value', async () => {
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
    expect(summarize(await takeTraceOf(box.getTag()))).toBe(
      'TrackEnded:false > Ended:Interrupted:PlatformRemoved'
    );
    expect(Number(await box.getAnimatedStyle('opacity'))).toBe(0.2);

    await wait(DURATION);
    expect(Number(await box.getAnimatedStyle('opacity'))).toBe(0.2);
    expect(summarize(await takeTraceOf(box.getTag()))).toBe('');
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
