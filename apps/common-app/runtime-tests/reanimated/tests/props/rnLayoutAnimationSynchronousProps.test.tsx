import React from 'react';
import { LayoutAnimation, Platform, StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  makeMutable,
  useAnimatedStyle,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';

const LAYOUT_ANIMATION_MS = 2000;

const styles = StyleSheet.create({
  box: { width: 100, height: 100, backgroundColor: 'navy' },
  expandedBox: { width: 200 },
});

function Box({
  opacity,
  expanded,
}: {
  opacity: SharedValue<number>;
  expanded: boolean;
}) {
  const ref = useTestRef('box');
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      ref={ref}
      style={[styles.box, expanded && styles.expandedBox, animatedStyle]}
    />
  );
}

// With synchronously updated props, the opacity below never reaches the shadow
// tree. React Native's LayoutAnimation mounts props interpolated between React
// commits on every frame, which must not revert the opacity of the view.
// On Android, React Native runs LayoutAnimation only with the
// `enableLayoutAnimationsOnAndroid` feature flag, which is off by default.
(Platform.OS === 'ios' ? describe : describe.skip)(
  "React Native's LayoutAnimation",
  () => {
    test('keeps the opacity that an animated style set after the last React commit', async () => {
      const opacity = makeMutable(0);
      await render(<Box opacity={opacity} expanded={false} />);
      await waitForFrames();

      opacity.set(1);
      await waitForFrames(3);
      const box = getTestComponent('box');
      expect((await box.getMountedViewProps())?.opacity).toBeWithinRange(
        0.99,
        1
      );

      LayoutAnimation.configureNext({
        duration: LAYOUT_ANIMATION_MS,
        update: { type: LayoutAnimation.Types.linear },
      });
      await render(<Box opacity={opacity} expanded />);
      await wait(LAYOUT_ANIMATION_MS / 2);

      const mounted = await box.getMountedViewProps();
      // The width shows that the layout animation runs.
      expect(mounted?.width).toBeWithinRange(120, 180);
      expect(mounted?.opacity).toBeWithinRange(0.99, 1);
    });
  }
);
