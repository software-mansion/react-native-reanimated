import {
  createNavigationContainerRef,
  NavigationContainer,
  useIsFocused,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ComponentRef, RefObject } from 'react';
import { createContext, useContext, useLayoutEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Dimensions,
  findNodeHandle,
  Modal,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  makeMutable,
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';

import type { PresentedFrame } from '../../../ReJest/native/NativeRuntimeTestObserver';
import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  describe,
  expect,
  expectEventually,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const iosTest = Platform.OS === 'ios' ? test : test.skip;

const STACK_READY = 'screenSlideStackReady';
const SHORT_DURATION = 150;
// In points per second. The shortest run changes the frame of the bar by less than two heights of the window.
const MAX_SPEED =
  (2 * Dimensions.get('window').height) / (SHORT_DURATION / 1000);

type Bar = 'home' | 'player' | 'queue';
// A view without a shared tag, which shows how the screen around a bar moves.
type Marker = 'homeMarker' | 'playerMarker';
type Tracked = Bar | Marker;
type Presentation = 'card' | 'modal' | 'fullScreenModal';
type Samples = ReadonlyArray<ReadonlyArray<PresentedFrame | null>>;
type Callbacks = { landings: number; cancellations: number };

const landings = makeMutable(0);
const cancellations = makeMutable(0);

// Shorter than the native push and pop, so the run ends while the screens slide.
const shortTransition = countedTransition(SHORT_DURATION);
// It still runs when a pop reverses it during the push.
const longTransition = countedTransition(400);

const TransitionContext = createContext(shortTransition);
const PlayerBarContext = createContext(true);

// React clears the ref of a view on a popped screen before its view leaves the screen.
let mountedTags: Partial<Record<Tracked, { tag: number; parentTag: number }>> =
  {};
// A view that mounts during a recording joins it.
let recordedViews: Tracked[] = [];

type BarRun = {
  bars: Bar[];
  carrier: Bar;
  destination: Bar;
  navigate: () => void | Promise<void>;
  interrupt?: () => Promise<void>;
  markers?: Marker[];
  // UIKit puts the views of the presenting screen back into the window at the end of a full-screen dismissal.
  dismissesFullScreen?: boolean;
};

type Routes = { Home: undefined; Player: undefined; Queue: undefined };
const Stack = createNativeStackNavigator<Routes>();
const navigation = createNavigationContainerRef<Routes>();

describe('Shared transition while a native stack slides its screens', () => {
  iosTest(
    'keeps a view at its X when the run ends before the push and the pop',
    async () => {
      const x = await renderPlayer();
      await expectBarStaysAt(x, {
        bars: ['home', 'player'],
        carrier: 'home',
        destination: 'player',
        navigate: () => navigation.navigate('Player'),
      });
      await expectBarStaysAt(x, {
        bars: ['home', 'player'],
        carrier: 'player',
        destination: 'home',
        navigate: () => navigation.goBack(),
      });
      await render(null);
    }
  );

  // The pop reverses the run at once, but the navigation controller starts it after the push.
  iosTest.each([[300], [40]])(
    'keeps a view at its X when a pop reverses a running run at x=${0}',
    async ([playerX]) => {
      const x = await renderPlayer(longTransition);
      await expectBarStaysAt(x, {
        bars: ['home', 'player'],
        carrier: 'home',
        destination: 'home',
        navigate: () => navigation.navigate('Player'),
        interrupt: continueAfter(playerSlidTo(playerX), () =>
          navigation.goBack()
        ),
      });
      await render(null);
    }
  );

  iosTest(
    'keeps a view at its X when a pop reverses a run that waits for the push',
    async () => {
      const x = await renderPlayer();
      await expectBarStaysAt(x, {
        bars: ['home', 'player'],
        carrier: 'home',
        destination: 'home',
        navigate: () => navigation.navigate('Player'),
        interrupt: continueAfter(waitForEndedCarrierDuringPush, () =>
          navigation.goBack()
        ),
      });
      await render(null);
    }
  );

  iosTest(
    'keeps a view at its X when a push continues a waiting run to a third screen',
    async () => {
      const x = await renderPlayer();
      await expectBarStaysAt(x, {
        bars: ['home', 'player', 'queue'],
        carrier: 'home',
        destination: 'queue',
        navigate: () => navigation.navigate('Player'),
        interrupt: continueAfter(waitForEndedCarrierDuringPush, () =>
          navigation.navigate('Queue')
        ),
      });
      await render(null);
    }
  );

  iosTest(
    'returns the carrier when the target of a waiting run unmounts',
    async () => {
      const x = await renderPlayer();
      const samples = await recordFramesOf(
        ['home', 'player', 'playerMarker'],
        () => navigation.navigate('Player'),
        async () => {
          await waitForEndedCarrierDuringPush();
          await render(<Player playerBarShown={false} />);
        },
        { landings: 1, cancellations: 0 }
      );
      expect(samples.some(([home]) => isCarried(home, 'home'))).toBe(true);
      for (const [home] of samples) {
        if (isCarried(home, 'home')) {
          expect(home!.x).toBeWithinRange(x - 0.5, x + 0.5);
        }
      }
      // The run ends, and the source shows in its own screen.
      const [returned] = samples[landingIndex(samples, ['home'])];
      expect(returned?.parentTag ?? -1).toBe(mountedTags.home!.parentTag);
      expect(returned?.opacity ?? 0).toBeWithinRange(0.99, 1);
      await render(null);
    }
  );

  // A presentation moves only the presented view, so a run to the screen below lands during the dismissal. The marker
  // shows that a sheet does not move the screen below after the landing.
  iosTest.each([['modal'], ['fullScreenModal']] as const)(
    'lands during the dismissal of a ${0}',
    async ([presentation]) => {
      const x = await renderPlayer(shortTransition, presentation);
      await expectBarStaysAt(x, {
        bars: ['home', 'player'],
        carrier: 'home',
        destination: 'player',
        navigate: () => navigation.navigate('Player'),
      });
      const samples = await expectBarStaysAt(x, {
        bars: ['home', 'player'],
        carrier: 'player',
        destination: 'home',
        navigate: () => navigation.goBack(),
        markers: ['homeMarker'],
        dismissesFullScreen: presentation === 'fullScreenModal',
      });
      expectLandingDuringContainerTransition(samples, ['home', 'player']);
      await render(null);
    }
  );

  iosTest(
    'waits for a sliding Modal that it flies into, but not for its dismissal',
    async () => {
      const x = await renderBars(<ModalPlayer open={false} />);
      await expectBarStaysAt(x, {
        bars: ['home', 'player'],
        carrier: 'home',
        destination: 'player',
        navigate: () => render(<ModalPlayer open />),
      });
      const samples = await expectBarStaysAt(x, {
        bars: ['home', 'player'],
        carrier: 'player',
        destination: 'home',
        navigate: () => render(<ModalPlayer open={false} />),
        dismissesFullScreen: true,
      });
      expectLandingDuringContainerTransition(samples, ['home', 'player']);
      await render(null);
    }
  );
});

function countedTransition(duration: number) {
  return SharedTransition.duration(duration)
    .easing(Easing.linear)
    .withCallback((finished) => {
      'worklet';
      if (finished) {
        landings.value += 1;
      } else {
        cancellations.value += 1;
      }
    });
}

async function renderPlayer(
  transition = shortTransition,
  presentation: Presentation = 'card'
) {
  mountedTags = {};
  await render(<Player transition={transition} presentation={presentation} />);
  await waitForNotification(STACK_READY);
  await waitForSettledScreens(['home']);
  return (await presentedFrameOf('home'))!.x;
}

// After the landing, the bar and the markers stay at their settled frames.
async function expectBarStaysAt(
  x: number,
  {
    bars,
    carrier,
    destination,
    navigate,
    interrupt,
    markers = [],
    dismissesFullScreen = false,
  }: BarRun
) {
  const samples = await recordFramesOf(
    [...bars, ...markers],
    navigate,
    interrupt,
    { landings: 1, cancellations: interrupt ? 1 : 0 }
  );
  const destinationIndex = bars.indexOf(destination);
  const landing = landingIndex(samples, bars);
  expect(landing).toBeWithinRange(1, samples.length - 1);
  bars.forEach((name, bar) => {
    const carried = samples.some((frames) => isCarried(frames[bar], name));
    expect(carried).toBe(name === carrier);
  });
  const settled = samples[samples.length - 1];
  const settledDestination = settled[destinationIndex];
  expect(isVisible(settledDestination)).toBe(true);
  const settledMarkers = settled.slice(bars.length);
  expect(settledMarkers.every((frame) => frame !== null)).toBe(true);
  let gaps = 0;
  let previous: PresentedFrame | undefined;
  samples.forEach((frames, index) => {
    const barFrames = frames.slice(0, bars.length);
    if (barFrames.every((frame) => frame === null)) {
      gaps += 1;
      expect(dismissesFullScreen && index > landing && gaps === 1).toBe(true);
      return;
    }
    const visible = barFrames.filter(isVisible);
    expect(visible.length).toBe(1);
    for (const frame of visible) {
      expect(frame.x).toBeWithinRange(x - 0.5, x + 0.5);
      expect(frame.opacity).toBeWithinRange(0.99, 1);
      if (previous) {
        const maxStep = MAX_SPEED * (frame.time - previous.time);
        expect(Math.abs(frame.y - previous.y)).toBeWithinRange(0, maxStep);
        expect(Math.abs(frame.height - previous.height)).toBeWithinRange(
          0,
          maxStep
        );
      }
    }
    previous = visible[0] ?? previous;
    if (index >= landing) {
      expect(isVisible(frames[destinationIndex])).toBe(true);
      for (const frame of visible) {
        expect(isSameFrame(frame, settledDestination!)).toBe(true);
        expect(frame.visibleWidth).toBeWithinRange(
          frame.width - 0.5,
          frame.width + 0.5
        );
        expect(frame.visibleHeight).toBeWithinRange(
          frame.height - 0.5,
          frame.height + 0.5
        );
      }
      frames.slice(bars.length).forEach((frame, marker) => {
        if (frame) {
          expect(isSameFrame(frame, settledMarkers[marker]!)).toBe(true);
        }
      });
    }
  });
  return samples;
}

// The navigation continues the run while it moves or waits for the push, so it ends the run without a landing.
function continueAfter(reached: () => Promise<void>, navigate: () => void) {
  return async () => {
    const landingsBefore = landings.value;
    const cancellationsBefore = cancellations.value;
    await reached();
    navigate();
    expect(landings.value).toBe(landingsBefore);
    await expectEventually(() => cancellations.value).toBe(
      cancellationsBefore + 1
    );
  };
}

function playerSlidTo(x: number) {
  return () =>
    expectEventually(
      async () => ((await presentedFrameOf('player'))?.x ?? Infinity) <= x
    ).toBe(true);
}

// The frames list the views in the order of names.
async function recordFramesOf(
  names: Tracked[],
  navigate: () => void | Promise<void>,
  interrupt: (() => Promise<void>) | undefined,
  callbacks: Callbacks
) {
  const landingsBefore = landings.value;
  const cancellationsBefore = cancellations.value;
  recordedViews = names;
  await RuntimeTestObserver!.startFrameRecording(recordedTags());
  let samples: Samples = [];
  try {
    await navigate();
    await interrupt?.();
    await expectEventually(
      () =>
        landings.value -
        landingsBefore +
        cancellations.value -
        cancellationsBefore
    ).toBe(callbacks.landings + callbacks.cancellations);
    await waitForSettledScreens(names);
    expect(landings.value - landingsBefore).toBe(callbacks.landings);
    expect(cancellations.value - cancellationsBefore).toBe(
      callbacks.cancellations
    );
  } finally {
    samples = (await RuntimeTestObserver!.takeFrameRecording()) ?? [];
    recordedViews = [];
  }
  return samples;
}

// The carrier ended its flight at the size of its target and waits, while the push still moves the target.
async function waitForEndedCarrierDuringPush() {
  const landingsBefore = landings.value;
  await expectEventually(async () => {
    const before = await presentedFrameOf('home');
    await waitForFrames(2);
    const [home, player] = await Promise.all([
      presentedFrameOf('home'),
      presentedFrameOf('player'),
    ]);
    return (
      isCarried(before, 'home') &&
      isCarried(home, 'home') &&
      isSameFrame(home!, before!) &&
      player !== null &&
      Math.abs(home!.height - player.height) <= 0.5 &&
      player.inContainerTransition
    );
  }).toBe(true);
  expect(landings.value).toBe(landingsBefore);
}

function presentedFrameOf(name: Tracked) {
  return RuntimeTestObserver!.observePresentedFrame(
    mountedTags[name]?.tag ?? -1
  );
}

function Player({
  transition = shortTransition,
  presentation = 'card',
  playerBarShown = true,
}: {
  transition?: SharedTransition;
  presentation?: Presentation;
  playerBarShown?: boolean;
}) {
  return (
    <View style={styles.root}>
      <TransitionContext.Provider value={transition}>
        <PlayerBarContext.Provider value={playerBarShown}>
          <NavigationContainer
            ref={navigation}
            onReady={() => notify(STACK_READY)}>
            <Stack.Navigator>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen
                name="Player"
                component={PlayerScreen}
                options={{ presentation }}
              />
              <Stack.Screen name="Queue" component={QueueScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </PlayerBarContext.Provider>
      </TransitionContext.Provider>
    </View>
  );
}

// The carrier of a run leaves its React parent until the run lands.
function isCarried(frame: PresentedFrame | null | undefined, name: Bar) {
  return (
    frame !== null &&
    frame !== undefined &&
    frame.parentTag !== mountedTags[name]?.parentTag
  );
}

function expectLandingDuringContainerTransition(samples: Samples, bars: Bar[]) {
  const landed = samples[landingIndex(samples, bars)]?.find(isVisible);
  expect(landed?.inContainerTransition ?? false).toBe(true);
}

async function renderBars(bars: Parameters<typeof render>[0]) {
  mountedTags = {};
  await render(bars);
  await waitForSettledScreens(['home']);
  return (await presentedFrameOf('home'))!.x;
}

function ModalPlayer({ open }: { open: boolean }) {
  return (
    <View style={styles.root}>
      <BarView name="home" style={styles.miniBar} active={!open} />
      {open && (
        <Modal animationType="slide">
          <BarView name="player" style={styles.fullBar} active />
        </Modal>
      )}
    </View>
  );
}

async function waitForSettledScreens(names: Tracked[]) {
  await expectEventually(async () => {
    const frames = await Promise.all(names.map(presentedFrameOf));
    return (
      frames.some((frame) => frame !== null) &&
      frames.every((frame) => !frame?.inContainerTransition)
    );
  }).toBe(true);
}

function landingIndex(samples: Samples, bars: Bar[]) {
  let lastCarried = -1;
  samples.forEach((frames, index) => {
    if (bars.some((name, bar) => isCarried(frames[bar], name))) {
      lastCarried = index;
    }
  });
  return lastCarried + 1;
}

function isVisible(frame: PresentedFrame | null): frame is PresentedFrame {
  return (
    frame !== null &&
    frame.opacity > 0.01 &&
    frame.visibleWidth > 0 &&
    frame.visibleHeight > 0
  );
}

function isSameFrame(frame: PresentedFrame, other: PresentedFrame) {
  return (['x', 'y', 'width', 'height'] as const).every(
    (key) => Math.abs(frame[key] - other[key]) <= 0.5
  );
}

function recordedTags() {
  return recordedViews.map((name) => mountedTags[name]?.tag ?? -1);
}

function HomeScreen() {
  const isFocused = useIsFocused();
  return (
    <View style={styles.root}>
      <MarkerView name="homeMarker" />
      <BarView name="home" style={styles.miniBar} active={isFocused} />
    </View>
  );
}

function PlayerScreen() {
  const isFocused = useIsFocused();
  return useContext(PlayerBarContext) ? (
    <BarView name="player" style={styles.fullBar} active={isFocused} />
  ) : (
    <MarkerView name="playerMarker" />
  );
}

function QueueScreen() {
  return (
    <BarView name="queue" style={styles.queueBar} active={useIsFocused()} />
  );
}

function BarView({
  name,
  style,
  active,
}: {
  name: Bar;
  style: StyleProp<ViewStyle>;
  active: boolean;
}) {
  const ref = useTestRef(name);
  const parentRef = useRef<ComponentRef<typeof View>>(null);
  useTrackedView(name, ref, parentRef);
  return (
    <SharedTransitionBoundary isActive={active}>
      <View ref={parentRef} collapsable={false} style={styles.screen}>
        <Animated.View
          ref={ref}
          sharedTransitionTag="screenSlideBar"
          sharedTransitionStyle={useContext(TransitionContext)}
          style={style}
        />
      </View>
    </SharedTransitionBoundary>
  );
}

function MarkerView({ name }: { name: Marker }) {
  const ref = useTestRef(name);
  useTrackedView(name, ref, ref);
  return <View ref={ref} collapsable={false} style={styles.marker} />;
}

function useTrackedView(
  name: Tracked,
  ref: RefObject<unknown>,
  parentRef: RefObject<unknown>
) {
  useLayoutEffect(() => {
    mountedTags[name] = {
      tag: findNodeHandle(ref.current as ComponentRef<typeof View>) ?? -1,
      parentTag:
        findNodeHandle(parentRef.current as ComponentRef<typeof View>) ?? -1,
    };
    if (recordedViews.includes(name)) {
      RuntimeTestObserver!.updateFrameRecordingTags(recordedTags());
    }
  }, [name, ref, parentRef]);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screen: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  miniBar: {
    height: 72,
    borderRadius: 16,
    backgroundColor: '#2d2a3e',
  },
  queueBar: {
    height: 240,
    borderRadius: 24,
    backgroundColor: '#2d2a3e',
  },
  fullBar: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: '#2d2a3e',
  },
  marker: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    backgroundColor: '#e8e6f0',
  },
});
