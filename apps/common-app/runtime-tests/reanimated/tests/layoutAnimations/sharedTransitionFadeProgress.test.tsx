import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  SharedTransition,
  SharedTransitionBoundary,
} from 'react-native-reanimated';
import Screen from 'react-native-screens/src/fabric/ScreenNativeComponent';

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
        activityState={2}
        style={styles.screen}
        onAppear={() => notify('fade-target-appeared')}
        onTransitionProgress={({ nativeEvent }) => {
          console.log(
            '[fade progress initial]',
            JSON.stringify({
              screen: 'target',
              ...nativeEvent,
              realTimestamp: performance.now(),
            })
          );
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
        activityState={2}
        style={styles.screen}
        onAppear={() => notify('fade-source-appeared')}
        onTransitionProgress={({ nativeEvent }) => {
          console.log(
            '[fade progress initial]',
            JSON.stringify({
              screen: 'source',
              ...nativeEvent,
              realTimestamp: performance.now(),
            })
          );
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
      requireReady('ready:events', true);
      await waitForFrames(3);
      const sourceScreen = getTestComponent('fadeSourceScreen').getTag();
      const targetScreen = getTestComponent('fadeTargetScreen').getTag();
      const source = getTestComponent('fadeSource').getTag();
      let ready = false;
      await expectEventually(async () => {
        const [sourceView, child, targetView, targetChild] = await sample(
          ['fadeSource', 'fadeSourceChild', 'fadeTarget', 'fadeTargetChild'],
          'ready:baseline',
          true
        );
        ready =
          !!sourceView &&
          Math.abs(sourceView.width - 60) < 0.5 &&
          sourceView.opacity > 0.99 &&
          !!child &&
          Math.abs(child.opacity - 0.8) < 0.01 &&
          !!targetView &&
          Math.abs(targetView.width - 150) < 0.5 &&
          targetView.opacity === 0 &&
          !!targetChild &&
          Math.abs(targetChild.opacity - 0.6) < 0.01;
        return ready;
      }).toBe(true);
      requireReady('ready:baseline', ready);
      const originalParent = await screenObserver!.observeParent!(source);
      const targetParent = await screenObserver!.observeParent!(
        getTestComponent('fadeTarget').getTag()
      );
      console.log(
        '[fade progress parents]',
        JSON.stringify({
          sourceScreen,
          targetScreen,
          source,
          originalParent,
          targetParent,
          realTimestamp: performance.now(),
        })
      );
      expect(targetParent !== null).toBe(true);
      expect(originalParent !== null).toBe(true);
      requireReady(
        'ready:parents',
        targetParent !== null && originalParent !== null
      );
      await emitProgress(targetScreen, 0, false, false);
      await expectEventually(async () => {
        const parent = await screenObserver!.observeParent!(source);
        console.log(
          '[fade progress parents]',
          JSON.stringify({
            id: 'progress:detached',
            source,
            originalParent,
            parent,
            realTimestamp: performance.now(),
          })
        );
        return parent !== null && parent !== originalParent;
      }).toBe(true);
      await emitProgress(targetScreen, 0.25, false, false);
      await expectProgress(82.5, 0.6);
      await emitProgress(targetScreen, 0.75, false, false);
      await expectProgress(127.5, 0.2);
      if (outcome === 'end') {
        await emitProgress(targetScreen, 1, false, false);
        await expectEventually(async () => {
          const [target, child] = await sample(
            ['fadeTarget', 'fadeTargetChild'],
            'end:partial'
          );
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
        console.log(
          '[fade progress dispatch]',
          JSON.stringify({
            type: 'cancel',
            tag: sourceScreen,
            realTimestamp: performance.now(),
          })
        );
        await screenObserver!.emitScreenGestureCancel!(sourceScreen);
        await expectOpacity('fadeSource', 1);
        await expectOpacity('fadeSourceChild', 0.8);
        await expectOpacity('fadeTarget', 1);
        for (let frame = 0; frame < 12; frame++) {
          const [sourceView, sourceChild, targetView, child] = await sample(
            ['fadeSource', 'fadeSourceChild', 'fadeTarget', 'fadeTargetChild'],
            `cancel:frame:${frame}`
          );
          expect(
            !!sourceView &&
              Math.abs(sourceView.opacity - 1) < 0.01 &&
              !!sourceChild &&
              Math.abs(sourceChild.opacity - 0.8) < 0.01 &&
              !!targetView &&
              Math.abs(targetView.opacity - 1) < 0.01 &&
              !!child &&
              Math.abs(child.opacity - 0.6) < 0.01
          ).toBe(true);
          await waitForFrames(1);
        }
      }
    }
  );
});

function requireReady(id: string, ready: boolean) {
  console.log(
    '[fade progress gate]',
    JSON.stringify({
      id,
      pass: ready,
      realTimestamp: performance.now(),
    })
  );
  if (!ready) throw new Error(`[fade progress gate] ${id} failed`);
}

async function emitProgress(
  tag: number,
  progress: number,
  closing: boolean,
  goingForward: boolean
) {
  console.log(
    '[fade progress dispatch]',
    JSON.stringify({
      tag,
      progress,
      closing,
      goingForward,
      realTimestamp: performance.now(),
    })
  );
  await screenObserver!.emitScreenTransitionProgress!(
    tag,
    progress,
    closing,
    goingForward
  );
}

async function sample(names: string[], id = 'phase', presented = false) {
  const tags = names.map((name) => getTestComponent(name).getTag());
  const result = await runOnUIBlocking(() => {
    'worklet';
    return {
      realTimestamp: performance.now(),
      animationTimestamp: global._getAnimationTimestamp(),
      views: tags.map((tag) => global._obtainMountedViewProps(tag, presented)),
    };
  });
  console.log(
    '[fade progress sample]',
    JSON.stringify({ id, names, tags, ...result })
  );
  return result.views;
}

async function expectProgress(width: number, opacity: number) {
  await expectEventually(async () => {
    const [source, child, target] = await sample(
      ['fadeSource', 'fadeSourceChild', 'fadeTarget'],
      `progress:${width}`
    );
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
    const [view] = await sample([name], `opacity:${name}:${opacity}`);
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
