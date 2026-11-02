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

const outerTransition = SharedTransition.duration(1200);

function NestedScreens() {
  const sourceScreen = useTestRef('nestedSourceScreen');
  const targetScreen = useTestRef('nestedTargetScreen');
  const outerTarget = useTestRef('nestedOuterTarget');
  const innerSource = useTestRef('nestedInnerSource');
  const innerSourceChild = useTestRef('nestedInnerSourceChild');
  const innerTarget = useTestRef('nestedInnerTarget');
  const innerTargetChild = useTestRef('nestedInnerTargetChild');
  return (
    <View style={styles.container}>
      <Screen
        ref={targetScreen}
        activityState={2}
        style={styles.screen}
        onAppear={() => notify('nested-target-appeared')}
        onTransitionProgress={({ nativeEvent }) => {
          if (nativeEvent.progress === 1 && !nativeEvent.closing)
            notify('nested-target-progress-ready');
        }}>
        <SharedTransitionBoundary isActive={false}>
          <Animated.View
            ref={outerTarget}
            sharedTransitionTag="nested-fade-outer"
            sharedTransitionStyle={outerTransition}
            style={styles.target}>
            <Animated.View
              ref={innerTarget}
              sharedTransitionTag="nested-fade-inner"
              sharedTransitionStyle={transition}
              style={styles.innerTarget}>
              <View
                ref={innerTargetChild}
                collapsable={false}
                style={[styles.child, { opacity: 0.6 }]}
              />
            </Animated.View>
          </Animated.View>
        </SharedTransitionBoundary>
      </Screen>
      <Screen
        ref={sourceScreen}
        activityState={2}
        style={styles.screen}
        onAppear={() => notify('nested-source-appeared')}
        onTransitionProgress={({ nativeEvent }) => {
          if (nativeEvent.progress === 1 && !nativeEvent.closing)
            notify('nested-source-progress-ready');
        }}>
        <SharedTransitionBoundary isActive>
          <Animated.View
            sharedTransitionTag="nested-fade-outer"
            sharedTransitionStyle={outerTransition}
            style={styles.outerSource}>
            <Animated.View
              ref={innerSource}
              sharedTransitionTag="nested-fade-inner"
              sharedTransitionStyle={transition}
              style={styles.source}>
              <View
                ref={innerSourceChild}
                collapsable={false}
                style={[styles.child, { opacity: 0.8 }]}
              />
            </Animated.View>
          </Animated.View>
        </SharedTransitionBoundary>
      </Screen>
    </View>
  );
}

describe('Shared transition content fade during Screen progress', () => {
  const progressTest =
    Platform.OS === 'ios' && RuntimeTestObserver ? test : test.skip;

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
      let ready = false;
      await expectEventually(async () => {
        const [sourceView, child, targetView, targetChild] = await sample(
          ['fadeSource', 'fadeSourceChild', 'fadeTarget', 'fadeTargetChild'],
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
      const originalParent = await RuntimeTestObserver!.observeParent(source);
      const targetParent = await RuntimeTestObserver!.observeParent(
        getTestComponent('fadeTarget').getTag()
      );
      expect(targetParent !== null).toBe(true);
      expect(originalParent !== null).toBe(true);
      requireReady(
        'ready:parents',
        targetParent !== null && originalParent !== null
      );
      await RuntimeTestObserver!.emitScreenTransitionProgress(
        targetScreen,
        0,
        false,
        false
      );
      await expectEventually(async () => {
        const parent = await RuntimeTestObserver!.observeParent(source);
        return parent !== null && parent !== originalParent;
      }).toBe(true);
      await RuntimeTestObserver!.emitScreenTransitionProgress(
        targetScreen,
        0.25,
        false,
        false
      );
      await expectProgress(82.5, 0.6);
      await RuntimeTestObserver!.emitScreenTransitionProgress(
        targetScreen,
        0.75,
        false,
        false
      );
      await expectProgress(127.5, 0.2);
      if (outcome === 'end') {
        await RuntimeTestObserver!.emitScreenTransitionProgress(
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
        await RuntimeTestObserver!.emitScreenGestureCancel(sourceScreen);
        await expectOpacity('fadeSource', 1);
        await expectOpacity('fadeSourceChild', 0.8);
        await expectOpacity('fadeTarget', 1);
        for (let frame = 0; frame < 12; frame++) {
          const [sourceView, sourceChild, targetView, child] = await sample([
            'fadeSource',
            'fadeSourceChild',
            'fadeTarget',
            'fadeTargetChild',
          ]);
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

describe('Nested shared transition content fade during Screen progress', () => {
  const progressTest =
    Platform.OS === 'ios' && RuntimeTestObserver ? test : test.skip;

  progressTest.each([['end'], ['cancel']] as const)(
    'fades the nested target children only when the outer target shows on ${0}',
    async ([outcome]) => {
      await render(<NestedScreens />);
      await waitForNotification('nested-source-appeared');
      await waitForNotification('nested-target-appeared');
      await waitForNotification('nested-source-progress-ready');
      await waitForNotification('nested-target-progress-ready');
      await waitForFrames(3);
      const sourceScreen = getTestComponent('nestedSourceScreen').getTag();
      const targetScreen = getTestComponent('nestedTargetScreen').getTag();
      const innerSource = getTestComponent('nestedInnerSource').getTag();
      const originalParent =
        await RuntimeTestObserver!.observeParent(innerSource);
      requireReady('nested:parent', originalParent !== null);
      await expectOpacity('nestedInnerTargetChild', 0.6);

      await RuntimeTestObserver!.emitScreenTransitionProgress(
        targetScreen,
        0,
        false,
        false
      );
      await expectEventually(async () => {
        const parent = await RuntimeTestObserver!.observeParent(innerSource);
        return parent !== null && parent !== originalParent;
      }).toBe(true);
      await RuntimeTestObserver!.emitScreenTransitionProgress(
        targetScreen,
        0.5,
        false,
        false
      );
      await expectEventually(async () => {
        const [source, child, outerTarget] = await sample([
          'nestedInnerSource',
          'nestedInnerSourceChild',
          'nestedOuterTarget',
        ]);
        return (
          !!source &&
          Math.abs(source.width - 75) < 0.5 &&
          !!child &&
          Math.abs(child.opacity - 0.4) < 0.01 &&
          outerTarget?.opacity === 0
        );
      }).toBe(true);

      if (outcome === 'end') {
        await RuntimeTestObserver!.emitScreenTransitionProgress(
          targetScreen,
          1,
          false,
          false
        );
        let fadingFrames = 0;
        let fadingWhileHidden = 0;
        for (let frame = 0; frame < 180; frame++) {
          const [outerTarget, innerTarget, child] = await sample([
            'nestedOuterTarget',
            'nestedInnerTarget',
            'nestedInnerTargetChild',
          ]);
          if (
            fadingFrames > 0 &&
            child &&
            Math.abs(child.opacity - 0.6) < 0.01
          ) {
            break;
          }
          if (child && child.opacity > 0.01 && child.opacity < 0.58) {
            fadingFrames++;
            if (
              !outerTarget ||
              outerTarget.opacity < 0.99 ||
              !innerTarget ||
              innerTarget.opacity < 0.99
            ) {
              fadingWhileHidden++;
            }
          }
          await waitForFrames(1);
        }
        expect(fadingFrames > 0).toBe(true);
        expect(fadingWhileHidden).toBe(0);
        await expectOpacity('nestedOuterTarget', 1);
        await expectOpacity('nestedInnerTargetChild', 0.6);
      } else {
        await RuntimeTestObserver!.emitScreenGestureCancel(sourceScreen);
        await expectOpacity('nestedInnerSource', 1);
        await expectOpacity('nestedInnerSourceChild', 0.8);
        for (let frame = 0; frame < 12; frame++) {
          const [child] = await sample(['nestedInnerTargetChild']);
          expect(!!child && Math.abs(child.opacity - 0.6) < 0.01).toBe(true);
          await waitForFrames(1);
        }
      }
    }
  );
});

function requireReady(id: string, ready: boolean) {
  if (!ready) throw new Error(`[fade progress gate] ${id} failed`);
}

function sample(names: string[], presented = false) {
  const tags = names.map((name) => getTestComponent(name).getTag());
  return runOnUIBlocking(() => {
    'worklet';
    return tags.map((tag) => global._obtainMountedViewProps(tag, presented));
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
  outerSource: { width: 100, height: 100, backgroundColor: 'green' },
  innerTarget: { width: 90, height: 90, backgroundColor: 'yellow' },
  child: { width: 20, height: 15, backgroundColor: 'white' },
});
