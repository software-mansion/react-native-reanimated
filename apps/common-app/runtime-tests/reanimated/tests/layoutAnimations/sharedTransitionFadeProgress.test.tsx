import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import { Screen } from 'react-native-screens';

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

const screenObserver = RuntimeTestObserver as unknown as {
  emitScreenTransitionProgress?: (
    tag: number,
    progress: number,
    closing: boolean,
    goingForward: boolean
  ) => Promise<void>;
  emitScreenGestureCancel?: (tag: number) => Promise<void>;
  observeParent?: (tag: number) => Promise<number | null>;
} | null;
const transition = SharedTransition.duration(1200).fadeContent();

function Screens() {
  const sourceScreen = useTestRef('fadeSourceScreen');
  const targetScreen = useTestRef('fadeTargetScreen');
  const source = useTestRef('fadeSource');
  const target = useTestRef('fadeTarget');
  const child = useTestRef('fadeSourceChild');
  const targetChild = useTestRef('fadeTargetChild');
  return (
    <View style={styles.container}>
      <Screen
        ref={targetScreen}
        enabled
        activityState={2}
        style={styles.screen}
        onAppear={() => notify('fade-target-appeared')}
        onTransitionProgress={({ nativeEvent }) => {
          if (nativeEvent.progress === 1 && !nativeEvent.closing)
            notify('fade-target-progress-ready');
        }}>
        <SharedTransitionBoundary isActive={false}>
          <Animated.View
            ref={target}
            sharedTransitionTag="fade-progress"
            sharedTransitionStyle={transition}
            style={styles.target}>
            <View
              ref={targetChild}
              collapsable={false}
              style={[styles.child, { opacity: 0.6 }]}
            />
          </Animated.View>
        </SharedTransitionBoundary>
      </Screen>
      <Screen
        ref={sourceScreen}
        enabled
        activityState={2}
        style={styles.screen}
        onAppear={() => notify('fade-source-appeared')}
        onTransitionProgress={({ nativeEvent }) => {
          if (nativeEvent.progress === 1 && !nativeEvent.closing)
            notify('fade-source-progress-ready');
        }}>
        <SharedTransitionBoundary isActive>
          <Animated.View
            ref={source}
            sharedTransitionTag="fade-progress"
            sharedTransitionStyle={transition}
            style={styles.source}>
            <View
              ref={child}
              collapsable={false}
              style={[styles.child, { opacity: 0.8 }]}
            />
          </Animated.View>
        </SharedTransitionBoundary>
      </Screen>
    </View>
  );
}

describe('Shared transition content fade during Screen progress', () => {
  const progressTest =
    Platform.OS === 'ios' &&
    typeof screenObserver?.emitScreenTransitionProgress === 'function' &&
    typeof screenObserver.emitScreenGestureCancel === 'function' &&
    typeof screenObserver.observeParent === 'function'
      ? test
      : test.skip;

  progressTest.each([['end'], ['cancel']] as const)(
    'fades progress children on ${0}',
    async ([outcome]) => {
      await render(<Screens />);
      await waitForNotification('fade-source-appeared');
      await waitForNotification('fade-target-appeared');
      await waitForNotification('fade-source-progress-ready');
      await waitForNotification('fade-target-progress-ready');
      await waitForFrames(3);
      const sourceScreen = getTestComponent('fadeSourceScreen').getTag();
      const targetScreen = getTestComponent('fadeTargetScreen').getTag();
      const source = getTestComponent('fadeSource').getTag();
      const originalParent = await screenObserver!.observeParent!(source);
      expect(originalParent !== null).toBe(true);
      await screenObserver!.emitScreenTransitionProgress!(
        targetScreen,
        0,
        false,
        false
      );
      await expectEventually(async () => {
        const parent = await screenObserver!.observeParent!(source);
        return parent !== null && parent !== originalParent;
      }).toBe(true);
      await screenObserver!.emitScreenTransitionProgress!(
        targetScreen,
        0.25,
        false,
        false
      );
      await expectProgress(82.5, 0.6);
      await screenObserver!.emitScreenTransitionProgress!(
        targetScreen,
        0.75,
        false,
        false
      );
      await expectProgress(127.5, 0.2);
      if (outcome === 'end') {
        await screenObserver!.emitScreenTransitionProgress!(
          targetScreen,
          1,
          false,
          false
        );
        await expectEventually(async () => {
          const [target, child] = await sample([
            'fadeTarget',
            'fadeTargetChild',
          ]);
          return (
            !!target &&
            target.opacity > 0.99 &&
            !!child &&
            child.opacity > 0.01 &&
            child.opacity < 0.58
          );
        }).toBe(true);
        await expectOpacity('fadeTargetChild', 0.6);
      } else {
        await screenObserver!.emitScreenGestureCancel!(sourceScreen);
        await expectOpacity('fadeSource', 1);
        await expectOpacity('fadeSourceChild', 0.8);
        await expectOpacity('fadeTarget', 0);
        for (let frame = 0; frame < 12; frame++) {
          const [child] = await sample(['fadeTargetChild']);
          expect(!!child && Math.abs(child.opacity - 0.6) < 0.01).toBe(true);
          await waitForFrames(1);
        }
      }
    }
  );
});

function sample(names: string[]) {
  const tags = names.map((name) => getTestComponent(name).getTag());
  return runOnUIBlocking(() => {
    'worklet';
    return tags.map((tag) => global._obtainMountedViewProps(tag, false));
  });
}

async function expectProgress(width: number, opacity: number) {
  await expectEventually(async () => {
    const [source, child, target] = await sample([
      'fadeSource',
      'fadeSourceChild',
      'fadeTarget',
    ]);
    return (
      !!source &&
      Math.abs(source.width - width) < 0.5 &&
      source.opacity > 0.99 &&
      !!child &&
      Math.abs(child.opacity - opacity) < 0.01 &&
      target?.opacity === 0
    );
  }).toBe(true);
}

async function expectOpacity(name: string, opacity: number) {
  await expectEventually(async () => {
    const [view] = await sample([name]);
    return !!view && Math.abs(view.opacity - opacity) < 0.01;
  }).toBe(true);
}

const styles = StyleSheet.create({
  container: { width: 300, height: 400 },
  screen: { position: 'absolute', left: 0, top: 0, width: 300, height: 400 },
  source: { width: 60, height: 60, backgroundColor: 'red' },
  target: { width: 150, height: 150, backgroundColor: 'blue' },
  child: { width: 20, height: 15, backgroundColor: 'white' },
});
