import {
  createNavigationContainerRef,
  NavigationContainer,
  useIsFocused,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useLayoutEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Platform, StyleSheet, View } from 'react-native';
import type { AnimatedRef, LayoutAnimationType } from 'react-native-reanimated';
import Animated, {
  Easing,
  makeMutable,
  measure,
  SharedTransition,
  SharedTransitionBoundary,
  useAnimatedRef,
} from 'react-native-reanimated';

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

const boxRefs: Record<string, AnimatedRef<Animated.View>> = {};

function StackBox({
  name,
  style,
}: {
  name: string;
  style: StyleProp<ViewStyle>;
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
          sharedTransitionStyle={linearTransition}
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

function StackWithHeader() {
  return (
    <View style={styles.root}>
      <NavigationContainer ref={navigation} onReady={() => notify(STACK_READY)}>
        <Stack.Navigator>
          <Stack.Screen name="First" component={FirstScreen} />
          <Stack.Screen name="Second" component={SecondScreen} />
          <Stack.Screen name="Third" component={ThirdScreen} />
        </Stack.Navigator>
      </NavigationContainer>
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
  const targets = makeMutable<number[]>([]);
  await runOnUIBlocking(() => {
    'worklet';
    const original = global.LayoutAnimationsManager;
    global.LayoutAnimationsManager = {
      start: (tag, type, values, config) => {
        if (type === SHARED_ELEMENT_TRANSITION) {
          targets.value = [...targets.value, values.targetGlobalOriginY ?? NaN];
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
      updateTarget: (tag, values) => {
        targets.value = [...targets.value, values.targetGlobalOriginY ?? NaN];
        return original.updateTarget(tag, values);
      },
    };
    global.managerBeforeStartRecording = original;
  });
  return {
    starts,
    targets,
    stop: () =>
      runOnUIBlocking(() => {
        'worklet';
        global.LayoutAnimationsManager = global.managerBeforeStartRecording;
      }),
  };
}

describe('Shared transition to a new native stack screen', () => {
  // On Android, the first frame of a new screen starts below its header until React Native Screens sends the
  // native frame.
  test('moves toward the target of a new screen below a header', async () => {
    await render(<StackWithHeader />);
    await waitForNotification(STACK_READY);
    await waitForFrames(10);
    const firstWindowY = await measureWindowY(boxRefs.first);
    const { starts, targets, stop } = await recordSharedTransitionStarts();
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
      const forwardTargets = targets.value.slice(
        Platform.OS === 'ios' ? -1 : 0
      );
      navigation.navigate('Third');
      await expectEventually(() => starts.value.length > forwardStarts).toBe(
        true
      );
      expect(starts.value[forwardStarts].sourceY).toBeWithinRange(
        secondY - 1,
        secondY + 1
      );
      for (const targetY of forwardTargets) {
        expect(targetY).toBeWithinRange(secondY - 1, secondY + 1);
      }
    } finally {
      await stop();
    }
    await render(null);
  });
});

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
