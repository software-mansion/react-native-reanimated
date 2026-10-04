import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutAnimationFunction } from 'react-native-reanimated';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import { hasNativeLayoutStarts, sample } from './nativeLayoutTestKit';

const DURATION = 1200;
const TRAVEL = 200;
const DROP = 60;
const BOX_SIZE = 50;
const BOX_REF = 'CallbackCommitBox';

const callbacks: string[] = [];
function recordCallback(finished: boolean) {
  callbacks.push(`${finished}`);
}

let moveBox: (left: number) => void = () => {};

type UIRuntimeGlobal = {
  __mapperRun?: () => void;
  _maybeFlushUIUpdatesQueue: () => void;
};

// The first `false` of the layout callback moves the view again and asks for the commit of that change at once.
function Box({
  top,
  hasLeafCallback,
}: {
  top: number;
  hasLeafCallback: boolean;
}) {
  const ref = useTestRef(BOX_REF);
  const left = useSharedValue(0);
  const commits = useSharedValue(0);
  moveBox = (value) => {
    left.value = value;
  };
  const animatedStyle = useAnimatedStyle(() => ({ marginLeft: left.value }));
  const layout = React.useMemo<LayoutAnimationFunction>(
    () => (values) => {
      'worklet';
      const timing = { duration: DURATION, easing: Easing.linear };
      const isDrop = values.targetOriginY !== values.currentOriginY;
      return {
        initialValues: {
          originX: values.currentOriginX,
          originY: values.currentOriginY,
        },
        animations: {
          originX: withTiming(
            values.targetOriginX,
            timing,
            hasLeafCallback
              ? () => {
                  'worklet';
                }
              : undefined
          ),
          originY: isDrop
            ? withSpring(values.targetOriginY)
            : withTiming(values.targetOriginY, timing),
        },
        callback: (finished: boolean) => {
          'worklet';
          scheduleOnRN(recordCallback, finished);
          if (!finished && commits.value === 0) {
            commits.value = 1;
            left.value = left.value - TRAVEL / 2;
            const uiGlobal = globalThis as unknown as UIRuntimeGlobal;
            uiGlobal.__mapperRun?.();
            uiGlobal._maybeFlushUIUpdatesQueue();
          }
        },
      };
    },
    [hasLeafCallback, left, commits]
  );
  return (
    <View style={styles.container}>
      <Animated.View
        ref={ref}
        layout={layout}
        style={[styles.box, { marginTop: top }, animatedStyle]}
      />
    </View>
  );
}

describe('a commit from a layout animation callback', () => {
  // With no callback on a leaf, the native route of iOS can play the first animation.
  for (const hasLeafCallback of [true, false]) {
    test(`the callback of a replaced layout animation commits a change of the view at once (leaf callback: ${hasLeafCallback})`, async () => {
      await render(<Box top={0} hasLeafCallback={hasLeafCallback} />);
      await wait(50);
      callbacks.length = 0;
      moveBox(TRAVEL);
      await wait(DURATION / 4);
      const tag = getTestComponent(BOX_REF).getTag();
      if (hasNativeLayoutStarts) {
        const { playbackKeys } = await sample(tag, 'Position');
        expect(playbackKeys.length).toBe(hasLeafCallback ? 0 : 2);
      }
      await render(<Box top={DROP} hasLeafCallback={hasLeafCallback} />);
      await wait(2.5 * DURATION);
      expect(callbacks.join()).toBe('false,false,true');
      if (hasNativeLayoutStarts) {
        const { model, playbackKeys } = await sample(tag, 'Position');
        expect(playbackKeys.length).toBe(0);
        expect(Math.abs(model[0] - (TRAVEL / 2 + BOX_SIZE / 2)) < 0.01).toBe(
          true
        );
      }
      await render(null);
    });
  }
});

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 200,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: 'teal',
  },
});
