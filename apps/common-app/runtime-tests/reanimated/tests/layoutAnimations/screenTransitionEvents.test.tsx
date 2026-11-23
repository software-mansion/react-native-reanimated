import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  makeMutable,
  useAnimatedReaction,
  useEvent,
} from 'react-native-reanimated';
import {
  ReanimatedScreenProvider,
  useReanimatedTransitionProgress,
} from 'react-native-screens/reanimated';
import Screen from 'react-native-screens/src/fabric/ScreenNativeComponent';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  describe,
  expectEventually,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const STACK_READY = 'transitionEventsStackReady';
const PUSH_ENDED = 'transitionEventsPushEnded';

type Routes = { First: undefined; Second: undefined };
const Stack = createNativeStackNavigator<Routes>();
const navigation = createNavigationContainerRef<Routes>();

type ProgressSample = {
  screen: string;
  progress: number;
  goingForward: number;
};
const samples = makeMutable<ProgressSample[]>([]);

function ProgressRecorder({ screen }: { screen: string }) {
  // react-native-screens types the hook with the old Animated.SharedValue type.
  const { progress, goingForward } =
    useReanimatedTransitionProgress() as unknown as Record<
      'progress' | 'goingForward',
      SharedValue<number>
    >;
  useAnimatedReaction(
    () => ({ progress: progress.value, goingForward: goingForward.value }),
    (current) => {
      samples.value = [...samples.value, { screen, ...current }];
    }
  );
  return <View style={styles.content} />;
}

function FirstScreen() {
  return <ProgressRecorder screen="first" />;
}

function SecondScreen() {
  return <ProgressRecorder screen="second" />;
}

function StackWithProgress() {
  return (
    <View style={styles.root}>
      <ReanimatedScreenProvider>
        <NavigationContainer
          ref={navigation}
          onReady={() => notify(STACK_READY)}>
          <Stack.Navigator>
            <Stack.Screen name="First" component={FirstScreen} />
            <Stack.Screen
              name="Second"
              component={SecondScreen}
              listeners={{
                transitionEnd: (event) => {
                  if (!event.data.closing) {
                    notify(PUSH_ENDED);
                  }
                },
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ReanimatedScreenProvider>
    </View>
  );
}

function sawProgress(screen: string, goingForward: number) {
  return samples.value.some(
    (sample) =>
      sample.screen === screen &&
      sample.goingForward === goingForward &&
      sample.progress > 0
  );
}

describe('Screen transition events with worklet handlers', () => {
  test('useReanimatedTransitionProgress updates on push and pop', async () => {
    samples.value = [];
    await render(<StackWithProgress />);
    await waitForNotification(STACK_READY);
    await waitForFrames(10);

    navigation.navigate('Second');
    await expectEventually(() => sawProgress('second', 1)).toBe(true);
    await waitForNotification(PUSH_ENDED);

    navigation.goBack();
    // The screen that appears records the pop, because the closing screen unmounts.
    await expectEventually(() => sawProgress('first', 0)).toBe(true);
    await render(null);
  });

  // Only the iOS test observer can emit onGestureCancel.
  const gestureCancelTest =
    Platform.OS === 'ios' && RuntimeTestObserver ? test : test.skip;

  gestureCancelTest('runs a worklet handler for onGestureCancel', async () => {
    const cancels = makeMutable(0);
    await render(<GestureCancelScreen cancels={cancels} />);
    await waitForFrames(3);
    const screen = getTestComponent('gestureCancelScreen').getTag();
    await RuntimeTestObserver!.emitScreenGestureCancel(screen);
    await expectEventually(() => cancels.value).toBe(1);
  });
});

const AnimatedScreen = Animated.createAnimatedComponent(Screen);

function GestureCancelScreen({
  cancels,
}: {
  cancels: ReturnType<typeof makeMutable<number>>;
}) {
  const ref = useTestRef('gestureCancelScreen');
  const onGestureCancel = useEvent(() => {
    'worklet';
    cancels.value += 1;
  }, ['onGestureCancel']);
  return (
    <AnimatedScreen
      ref={ref}
      activityState={2}
      style={styles.screen}
      onGestureCancel={onGestureCancel}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  screen: { position: 'absolute', left: 0, top: 0, width: 300, height: 400 },
});
