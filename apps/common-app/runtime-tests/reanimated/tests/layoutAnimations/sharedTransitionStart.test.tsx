import {
  createNavigationContainerRef,
  NavigationContainer,
  useIsFocused,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ComponentRef, ComponentType } from 'react';
import { useLayoutEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import type {
  AnimatedRef,
  CustomSharedTransitionAnimation,
  LayoutAnimationType,
} from 'react-native-reanimated';
import Animated, {
  Easing,
  makeMutable,
  measure,
  SharedTransition,
  SharedTransitionBoundary,
  useAnimatedRef,
  withTiming,
} from 'react-native-reanimated';
import type { ScreenStackProps } from 'react-native-screens';
import { Screen, ScreenContainer, ScreenStack } from 'react-native-screens';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const DURATION = 1000;
const STACK_READY = 'startStackReady';
const FORWARD_FINISHED = 'startForwardFinished';

const linearTransition = SharedTransition.duration(DURATION)
  .easing(Easing.linear)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      notify(FORWARD_FINISHED);
    }
  });

type Routes = { First: undefined; Second: undefined; Third: undefined };
const Stack = createNativeStackNavigator<Routes>();
const navigation = createNavigationContainerRef<Routes>();
const NativeScreenStack: ComponentType<Omit<ScreenStackProps, 'ref'>> =
  ScreenStack;

const boxRefs: Record<string, AnimatedRef<Animated.View>> = {};

function StackBox({
  name,
  style,
  transition = linearTransition,
}: {
  name: string;
  style: StyleProp<ViewStyle>;
  transition?: SharedTransition;
}) {
  const ref = useAnimatedRef<Animated.View>();
  boxRefs[name] = ref;
  const isFocused = useIsFocused();
  return (
    <SharedTransitionBoundary isActive={isFocused}>
      <View collapsable={false} style={styles.content}>
        <Animated.View
          ref={ref}
          sharedTransitionTag="newScreen"
          sharedTransitionStyle={transition}
          style={style}
        />
      </View>
    </SharedTransitionBoundary>
  );
}

function FirstScreen() {
  return <StackBox name="first" style={styles.firstBox} />;
}

function SecondScreen() {
  return <StackBox name="second" style={styles.secondBox} />;
}

function ThirdScreen() {
  return <StackBox name="third" style={styles.thirdBox} />;
}

function StackWithHeader({ modal = false }: { modal?: boolean }) {
  return (
    <View style={styles.root}>
      <NavigationContainer ref={navigation} onReady={() => notify(STACK_READY)}>
        <Stack.Navigator>
          <Stack.Screen name="First" component={FirstScreen} />
          <Stack.Screen
            name="Second"
            component={SecondScreen}
            options={{ presentation: modal ? 'modal' : 'card' }}
          />
          <Stack.Screen name="Third" component={ThirdScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const customSheetAnimation: CustomSharedTransitionAnimation = (values) => {
  'worklet';
  return {
    originX: withTiming(values.targetOriginX, { duration: DURATION }),
    originY: withTiming(values.targetOriginY, { duration: DURATION }),
    width: withTiming(values.targetWidth, { duration: DURATION }),
    height: withTiming(values.targetHeight, { duration: DURATION }),
    transform: [
      {
        matrix: withTiming(values.targetTransformMatrix, {
          duration: DURATION,
        }),
      },
    ],
  };
};

const sheetTargetTransition = SharedTransition.duration(DURATION).easing(
  Easing.linear
);

let sheetTestId = 0;

function StackWithSheet({
  animated,
  transition,
  dismissed,
  phase,
}: {
  animated: boolean;
  transition: SharedTransition;
  dismissed: string;
  phase: 'source' | 'sheet' | 'closed';
}) {
  const isSheetOpen = phase === 'sheet';
  return (
    <View style={styles.root}>
      <NativeScreenStack
        style={{ flex: 1 }}
        onFinishTransitioning={() => {
          if (phase === 'closed') notify(dismissed);
        }}>
        <Screen
          isNativeStack
          activityState={2}
          style={{ flex: 1 }}
          onAppear={() => notify(STACK_READY)}>
          <SharedTransitionBoundary isActive={!isSheetOpen}>
            <View collapsable={false} style={styles.content}>
              <Animated.View
                sharedTransitionTag="newScreen"
                sharedTransitionStyle={transition}
                style={styles.sheetSource}
              />
            </View>
          </SharedTransitionBoundary>
        </Screen>
        {isSheetOpen && (
          <Screen
            isNativeStack
            activityState={2}
            style={{ flex: 1 }}
            stackPresentation="formSheet"
            stackAnimation={animated ? 'default' : 'none'}
            sheetAllowedDetents={[0.72, 1]}>
            <SharedTransitionBoundary isActive>
              <View collapsable={false} style={styles.content}>
                <Animated.View
                  sharedTransitionTag="newScreen"
                  sharedTransitionStyle={sheetTargetTransition}
                  style={styles.sheetTarget}
                />
              </View>
            </SharedTransitionBoundary>
          </Screen>
        )}
      </NativeScreenStack>
    </View>
  );
}

declare global {
  var managerBeforeStartRecording: typeof global.LayoutAnimationsManager;
}

// LayoutAnimationType.SHARED_ELEMENT_TRANSITION, which the package exports only as a type.
const SHARED_ELEMENT_TRANSITION = 4 as LayoutAnimationType;

type SharedTransitionStart = { sourceY: number; targetY: number };

function measureWindowY(ref: AnimatedRef<Animated.View>) {
  return runOnUIBlocking(() => {
    'worklet';
    return measure(ref)?.pageY ?? NaN;
  });
}

// Records the source and target that each shared transition start gets, in root coordinates.
async function recordSharedTransitionStarts() {
  const starts = makeMutable<SharedTransitionStart[]>([]);
  await runOnUIBlocking(() => {
    'worklet';
    const original = global.LayoutAnimationsManager;
    global.LayoutAnimationsManager = {
      start: (tag, type, values, config) => {
        if (type === SHARED_ELEMENT_TRANSITION) {
          starts.value = [
            ...starts.value,
            {
              sourceY: values.currentGlobalOriginY ?? NaN,
              targetY: values.targetGlobalOriginY ?? NaN,
            },
          ];
        }
        original.start(tag, type, values, config);
      },
      stop: original.stop,
    };
    global.managerBeforeStartRecording = original;
  });
  return {
    starts,
    stop: () =>
      runOnUIBlocking(() => {
        'worklet';
        global.LayoutAnimationsManager = global.managerBeforeStartRecording;
      }),
  };
}

describe('Shared transition to a new native stack screen', () => {
  (Platform.OS === 'android' ? test : test.skip)(
    'keeps a native-stack modal transition enabled',
    async () => {
      await render(<StackWithHeader modal />);
      await waitForNotification(STACK_READY);
      await waitForFrames(10);
      const { starts, stop } = await recordSharedTransitionStarts();
      try {
        navigation.navigate('Second');
        await waitForNotification(FORWARD_FINISHED);
        expect(starts.value.length).toBeWithinRange(1, 100);
        const targetRef = boxRefs.second;
        const props = await runOnUIBlocking(() => {
          'worklet';
          return measure(targetRef);
        });
        expect(props?.width).toBe(160);
      } finally {
        await stop();
      }
      await render(null);
    }
  );

  // On Android, the first frame of a new screen starts below its header until React Native Screens sends the
  // native frame.
  test('moves toward the target of a new screen below a header', async () => {
    await render(<StackWithHeader />);
    await waitForNotification(STACK_READY);
    await waitForFrames(10);
    const firstWindowY = await measureWindowY(boxRefs.first);
    const { starts, stop } = await recordSharedTransitionStarts();
    try {
      navigation.navigate('Second');
      await waitForNotification(FORWARD_FINISHED);
      await waitForFrames(10);
      const secondWindowY = await measureWindowY(boxRefs.second);
      const forwardStarts = starts.value.length;
      expect(forwardStarts).toBeWithinRange(1, 100);
      const rootOffset = firstWindowY - starts.value[0].sourceY;
      const secondY = secondWindowY - rootOffset;
      expect(secondY).toBeWithinRange(1, 10000);
      navigation.navigate('Third');
      await expectEventually(() => starts.value.length > forwardStarts).toBe(
        true
      );
      expect(starts.value[forwardStarts].sourceY).toBeWithinRange(
        secondY - 1,
        secondY + 1
      );
      // On iOS, a later start of the push corrects the target of its first start.
      const forwardTargets = starts.value
        .slice(Platform.OS === 'ios' ? forwardStarts - 1 : 0, forwardStarts)
        .map(({ targetY }) => targetY);
      for (const targetY of forwardTargets) {
        expect(targetY).toBeWithinRange(secondY - 1, secondY + 1);
      }
    } finally {
      await stop();
    }
    await render(null);
  });
});

if (Platform.OS === 'ios') {
  describe('Shared transition to a native sheet', () => {
    test.each([
      { animated: true, custom: false },
      { animated: false, custom: false },
      { animated: true, custom: true },
      { animated: false, custom: true },
    ])(
      'does not start toward the sheet placeholder (animated: ${animated}, custom: ${custom})',
      async ({ animated, custom }) => {
        const id = sheetTestId++;
        const forwardFinished = `sheetForwardFinished${id}`;
        const dismissed = `sheetDismissed${id}`;
        const transition = (
          custom
            ? SharedTransition.custom(customSheetAnimation)
            : SharedTransition.duration(DURATION).easing(Easing.linear)
        ).withCallback((finished) => {
          'worklet';
          if (finished) notify(forwardFinished);
        });
        const renderSheet = (phase: 'source' | 'sheet' | 'closed') =>
          render(
            <StackWithSheet
              animated={animated}
              transition={transition}
              dismissed={dismissed}
              phase={phase}
            />
          );
        await renderSheet('source');
        await waitForNotification(STACK_READY);
        await waitForFrames(10);
        const { starts, stop } = await recordSharedTransitionStarts();
        try {
          await renderSheet('sheet');
          await waitForNotification(forwardFinished);
          await waitForFrames(10);
          expect(starts.value.length).toBe(1);
          const first = starts.value[0];
          expect(first.targetY).toBeWithinRange(first.sourceY + 1, 10000);
        } finally {
          try {
            await stop();
            await renderSheet('closed');
            await waitForNotification(dismissed);
          } finally {
            await render(null);
          }
        }
      }
    );
  });
}

if (Platform.OS === 'ios') {
  describe('Shared transition to a full-screen modal', () => {
    test.each([
      { native: true, animated: true },
      { native: true, animated: false },
      { native: false, animated: true },
      { native: false, animated: false },
    ])(
      'finishes both directions and restores the source parent (native: ${native}, animated: ${animated})',
      async ({ native, animated }) => {
        const id = sheetTestId++;
        const forwardFinished = `fullScreenForwardFinished${id}`;
        const reverseFinished = `fullScreenReverseFinished${id}`;
        const dismissed = `fullScreenDismissed${id}`;
        const callbacks = makeMutable({ forward: 0, reverse: 0, failed: 0 });
        const sourceTransition = SharedTransition.duration(DURATION)
          .easing(Easing.linear)
          .withCallback((finished) => {
            'worklet';
            callbacks.value = {
              ...callbacks.value,
              forward: callbacks.value.forward + (finished ? 1 : 0),
              failed: callbacks.value.failed + (finished ? 0 : 1),
            };
            if (finished) notify(forwardFinished);
          });
        const targetTransition = SharedTransition.duration(DURATION)
          .easing(Easing.linear)
          .withCallback((finished) => {
            'worklet';
            callbacks.value = {
              ...callbacks.value,
              reverse: callbacks.value.reverse + (finished ? 1 : 0),
              failed: callbacks.value.failed + (finished ? 0 : 1),
            };
            if (finished) notify(reverseFinished);
          });
        const show = (phase: 'source' | 'open' | 'closed') =>
          render(
            <FullScreenModal
              native={native}
              animated={animated}
              phase={phase}
              sourceTransition={sourceTransition}
              targetTransition={targetTransition}
              dismissed={dismissed}
            />
          );
        await show('source');
        await waitForFrames(10);
        const sourceTag = getTestComponent('fullScreenSource').getTag();
        const parent = await RuntimeTestObserver!.observeParent(sourceTag);
        expect(parent).not.toBe(null);
        let closed = false;
        try {
          await show('open');
          await waitForNotification(forwardFinished);
          await waitForFrames(10);
          const targetTag = getTestComponent('fullScreenTarget').getTag();
          expect(await RuntimeTestObserver!.observeParent(targetTag)).not.toBe(
            null
          );
          await show('closed');
          await waitForNotification(dismissed);
          closed = true;
          await waitForNotification(reverseFinished);
          await waitForFrames(10);
          const result = await runOnUIBlocking(() => {
            'worklet';
            return callbacks.value;
          });
          expect(result.forward).toBe(1);
          expect(result.reverse).toBe(1);
          expect(result.failed).toBe(0);
          expect(getTestComponent('fullScreenSource').getTag()).toBe(sourceTag);
          expect(await RuntimeTestObserver!.observeParent(sourceTag)).toBe(
            parent
          );
        } finally {
          try {
            if (!closed) {
              await show('closed');
              await waitForNotification(dismissed);
            }
          } finally {
            await render(null);
          }
        }
      }
    );
  });
}

function FullScreenModal({
  native,
  animated,
  phase,
  sourceTransition,
  targetTransition,
  dismissed,
}: {
  native: boolean;
  animated: boolean;
  phase: 'source' | 'open' | 'closed';
  sourceTransition: SharedTransition;
  targetTransition: SharedTransition;
  dismissed: string;
}) {
  const open = phase === 'open';
  const source = (
    <FullScreenBox source active={!open} transition={sourceTransition} />
  );
  const target = (
    <FullScreenBox source={false} active={open} transition={targetTransition} />
  );
  if (!native) {
    return (
      <View style={styles.root}>
        {source}
        <Modal
          visible={open}
          presentationStyle="fullScreen"
          animationType={animated ? 'slide' : 'none'}
          onDismiss={() => notify(dismissed)}>
          {target}
        </Modal>
      </View>
    );
  }
  return (
    <NativeScreenStack
      style={styles.root}
      onFinishTransitioning={() => {
        if (phase === 'closed') notify(dismissed);
      }}>
      <Screen isNativeStack activityState={2} style={styles.root}>
        {source}
      </Screen>
      {open && (
        <Screen
          isNativeStack
          activityState={2}
          style={styles.root}
          stackPresentation="fullScreenModal"
          stackAnimation={animated ? 'default' : 'none'}>
          {target}
        </Screen>
      )}
    </NativeScreenStack>
  );
}

function FullScreenBox({
  source,
  active,
  transition,
}: {
  source: boolean;
  active: boolean;
  transition: SharedTransition;
}) {
  const ref = useTestRef(source ? 'fullScreenSource' : 'fullScreenTarget');
  return (
    <SharedTransitionBoundary isActive={active}>
      <View collapsable={false} style={styles.content}>
        <Animated.View
          ref={ref}
          sharedTransitionTag="fullScreen"
          sharedTransitionStyle={transition}
          style={source ? styles.sheetSource : styles.sheetTarget}
        />
      </View>
    </SharedTransitionBoundary>
  );
}

function MountedBoundaries({ active }: { active: boolean }) {
  return (
    <View style={styles.root}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          sharedTransitionTag="mounted"
          sharedTransitionStyle={linearTransition}
          style={styles.busySource}
        />
      </SharedTransitionBoundary>
      <SharedTransitionBoundary isActive={active}>
        {active && (
          <Animated.View
            sharedTransitionTag="mounted"
            sharedTransitionStyle={linearTransition}
            style={styles.busyTarget}
          />
        )}
      </SharedTransitionBoundary>
    </View>
  );
}

if (Platform.OS === 'ios') {
  describe('Shared transition to a pre-mounted boundary', () => {
    test('starts a new target inside a boundary that is already in the window', async () => {
      await render(<MountedBoundaries active={false} />);
      await waitForFrames(10);
      const { starts, stop } = await recordSharedTransitionStarts();
      try {
        await render(<MountedBoundaries active />);
        await waitForNotification(FORWARD_FINISHED);
        expect(starts.value.length).toBe(1);
        const first = starts.value[0];
        expect(first.targetY - first.sourceY).toBeWithinRange(199.5, 200.5);
      } finally {
        await stop();
        await render(null);
      }
    });
  });
}

function PendingScreen({
  active,
  showTarget,
  nativeActive,
  targetTop = 200,
  hostWidth = 10,
}: {
  active: boolean;
  showTarget: boolean;
  nativeActive: boolean;
  targetTop?: number;
  hostWidth?: number;
}) {
  const source = useTestRef('heldSource');
  const sourceRef = useAnimatedRef<Animated.View>();
  const targetRef = useAnimatedRef<Animated.View>();
  boxRefs.heldSource = sourceRef;
  boxRefs.heldTarget = targetRef;
  return (
    <View style={styles.root}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          ref={(node: ComponentRef<typeof Animated.View> | null) => {
            source.current = node;
            sourceRef(node);
          }}
          sharedTransitionTag="held"
          sharedTransitionStyle={linearTransition}
          style={styles.busySource}
        />
      </SharedTransitionBoundary>
      <View
        collapsable={false}
        style={{ position: 'absolute', width: hostWidth, height: 1 }}
      />
      <ScreenContainer style={styles.root}>
        <Screen
          activityState={nativeActive ? 2 : 0}
          freezeOnBlur={false}
          style={styles.root}>
          <SharedTransitionBoundary isActive={active}>
            {showTarget && (
              <Animated.View
                ref={targetRef}
                sharedTransitionTag="held"
                sharedTransitionStyle={linearTransition}
                style={[styles.busyTarget, { top: targetTop }]}
              />
            )}
          </SharedTransitionBoundary>
        </Screen>
      </ScreenContainer>
    </View>
  );
}

if (Platform.OS === 'ios') {
  describe('Shared transition with a pending native boundary', () => {
    test('uses the latest target geometry after unrelated updates while waiting', async () => {
      await render(
        <PendingScreen active={false} showTarget nativeActive={false} />
      );
      await waitForFrames(10);
      const sourceWindowY = await measureWindowY(boxRefs.heldSource);
      const { starts, stop } = await recordSharedTransitionStarts();
      try {
        await render(<PendingScreen active showTarget nativeActive={false} />);
        await waitForFrames(10);
        expect(starts.value.length).toBe(0);
        await render(
          <PendingScreen
            active
            showTarget
            nativeActive={false}
            targetTop={250}
            hostWidth={30}
          />
        );
        await waitForFrames(10);
        expect(starts.value.length).toBe(0);
        await render(
          <PendingScreen
            active
            showTarget
            nativeActive
            targetTop={250}
            hostWidth={30}
          />
        );
        await waitForNotification(FORWARD_FINISHED);
        await waitForFrames(10);
        expect(starts.value.length).toBe(1);
        const targetWindowY = await measureWindowY(boxRefs.heldTarget);
        const rootOffset = sourceWindowY - starts.value[0].sourceY;
        expect(starts.value[0].targetY).toBeWithinRange(
          targetWindowY - rootOffset - 1,
          targetWindowY - rootOffset + 1
        );
      } finally {
        try {
          await stop();
        } finally {
          await render(null);
        }
      }
    });
    test.each([true, false])(
      'cancels a held start to a detached screen before a late attachment (remove target: %p)',
      async (removeTarget) => {
        await render(
          <PendingScreen active={false} showTarget nativeActive={false} />
        );
        await waitForFrames(10);
        const sourceTag = getTestComponent('heldSource').getTag();
        const parent = await RuntimeTestObserver!.observeParent(sourceTag);
        const { starts, stop } = await recordSharedTransitionStarts();
        try {
          await render(
            <PendingScreen active showTarget nativeActive={false} />
          );
          await waitForFrames(10);
          expect(await RuntimeTestObserver!.observeParent(sourceTag)).not.toBe(
            parent
          );
          expect(starts.value.length).toBe(0);
          await render(
            <PendingScreen
              active={removeTarget}
              showTarget={!removeTarget}
              nativeActive={false}
            />
          );
          await expectEventually(
            async () =>
              (await RuntimeTestObserver!.observeParent(sourceTag)) === parent
          ).toBe(true);
          expect(
            (await getTestComponent('heldSource').getMountedViewProps())
              ?.opacity
          ).toBe(1);
          expect(starts.value.length).toBe(0);
          await render(
            <PendingScreen active={false} showTarget nativeActive />
          );
          await waitForFrames(10);
          expect(starts.value.length).toBe(0);
          expect(getTestComponent('heldSource').getTag()).toBe(sourceTag);
        } finally {
          try {
            await stop();
          } finally {
            await render(null);
          }
        }
      }
    );
  });
}

const BUSY_TIME = 2 * DURATION;
const TARGET_WIDTH = 150;
const SOURCE_WIDTH = 60;

const busyTransition = SharedTransition.duration(DURATION / 2).easing(
  Easing.linear
);

// The busy task runs after React commits the screen, while its frames wait for the JS thread.
function BusyTarget() {
  const ref = useTestRef('busyTarget');
  useLayoutEffect(() => {
    const end = Date.now() + BUSY_TIME;
    while (Date.now() < end) {
      // Keeps the JS thread busy.
    }
  }, []);
  return (
    <SharedTransitionBoundary isActive>
      <Animated.View
        ref={ref}
        sharedTransitionTag="busy"
        sharedTransitionStyle={busyTransition}
        style={styles.busyTarget}
      />
    </SharedTransitionBoundary>
  );
}

function BusyScreens({ active }: { active: boolean }) {
  const ref = useTestRef('busySource');
  return (
    <View style={styles.root}>
      <SharedTransitionBoundary isActive={!active}>
        <Animated.View
          ref={ref}
          sharedTransitionTag="busy"
          sharedTransitionStyle={busyTransition}
          style={styles.busySource}
        />
      </SharedTransitionBoundary>
      {active && <BusyTarget />}
    </View>
  );
}

function readPresentedWidth(tag: number) {
  return runOnUIBlocking(() => {
    'worklet';
    return global._obtainMountedViewProps(tag, true)?.width;
  });
}

describe('Shared transition that starts while the JS thread is busy', () => {
  test('moves the view after the JS thread is free again', async () => {
    await render(<BusyScreens active={false} />);
    await waitForFrames(3);
    const sourceTag = getTestComponent('busySource').getTag();

    await render(<BusyScreens active />);
    await expectEventually(async () => {
      const width = await readPresentedWidth(sourceTag);
      return (
        width !== undefined &&
        width > SOURCE_WIDTH + 5 &&
        width < TARGET_WIDTH - 5
      );
    }).toBe(true);
    await render(null);
  });
});

const IDLE_FINISHED = 'idleUpdateFinished';
const IDLE_OFFSET = 200;

const idleTransition = SharedTransition.duration(DURATION / 4)
  .easing(Easing.linear)
  .withCallback((finished) => {
    'worklet';
    if (finished) {
      notify(IDLE_FINISHED);
    }
  });

function IdleUpdateScreens({
  active,
  offset,
}: {
  active: boolean;
  offset: number;
}) {
  const sourceRef = useAnimatedRef<Animated.View>();
  const targetRef = useAnimatedRef<Animated.View>();
  boxRefs.idleSource = sourceRef;
  boxRefs.idleTarget = targetRef;
  return (
    <View style={styles.root}>
      <SharedTransitionBoundary isActive={!active}>
        <View collapsable={false} style={{ top: offset }}>
          <Animated.View
            ref={sourceRef}
            sharedTransitionTag="idleUpdate"
            sharedTransitionStyle={idleTransition}
            style={styles.busySource}
          />
        </View>
      </SharedTransitionBoundary>
      {active && (
        <SharedTransitionBoundary isActive>
          <Animated.View
            ref={targetRef}
            sharedTransitionTag="idleUpdate"
            sharedTransitionStyle={idleTransition}
            style={styles.busyTarget}
          />
        </SharedTransitionBoundary>
      )}
    </View>
  );
}

describe('Shared transition after an update that starts no transition', () => {
  test('starts from where the update moved the source', async () => {
    await render(<IdleUpdateScreens active={false} offset={0} />);
    await waitForFrames(3);
    const sourceYBefore = await measureWindowY(boxRefs.idleSource);
    await render(<IdleUpdateScreens active={false} offset={IDLE_OFFSET} />);
    await waitForFrames(3);
    const sourceY = await measureWindowY(boxRefs.idleSource);
    expect(sourceY - sourceYBefore).toBeWithinRange(
      IDLE_OFFSET - 1,
      IDLE_OFFSET + 1
    );
    const { starts, stop } = await recordSharedTransitionStarts();
    try {
      await render(<IdleUpdateScreens active offset={IDLE_OFFSET} />);
      await waitForNotification(IDLE_FINISHED);
      await waitForFrames(3);
      const targetY = await measureWindowY(boxRefs.idleTarget);
      expect(starts.value.length).toBe(1);
      const start = starts.value[0];
      expect(start.targetY - start.sourceY).toBeWithinRange(
        targetY - sourceY - 1,
        targetY - sourceY + 1
      );
    } finally {
      await stop();
    }
    await render(null);
  });
});

const styles = StyleSheet.create({
  root: { width: 380, height: 700 },
  content: { flex: 1, padding: 10, backgroundColor: 'white' },
  firstBox: {
    width: 100,
    height: 40,
    marginTop: 300,
    backgroundColor: '#2277dd',
  },
  secondBox: {
    width: 160,
    height: 90,
    marginTop: 40,
    backgroundColor: '#2277dd',
  },
  thirdBox: {
    width: 100,
    height: 40,
    marginTop: 200,
    backgroundColor: '#2277dd',
  },
  sheetSource: {
    width: 150,
    height: 130,
    marginTop: 70,
    backgroundColor: '#2277dd',
  },
  sheetTarget: {
    width: 300,
    height: 260,
    marginTop: 28,
    backgroundColor: '#2277dd',
  },
  busySource: {
    width: SOURCE_WIDTH,
    height: 60,
    backgroundColor: '#dd5522',
  },
  busyTarget: {
    position: 'absolute',
    top: 200,
    left: 60,
    width: TARGET_WIDTH,
    height: 150,
    backgroundColor: '#2277dd',
  },
});
