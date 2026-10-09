import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  render,
  test,
  useTestRef,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const styles = StyleSheet.create({
  box: { width: 100, height: 100 },
  borderedBox: { borderWidth: 4, borderColor: 'black', backgroundColor: 'red' },
});

function AnimatedBackgroundBox({ color }: { color: string }) {
  const ref = useTestRef('box');
  const backgroundColor = useSharedValue(color);
  useEffect(() => {
    backgroundColor.set(color);
  }, [backgroundColor, color]);
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.get(),
  }));
  return <Animated.View ref={ref} style={[styles.box, animatedStyle]} />;
}

function TransparentBox() {
  const ref = useTestRef('box');
  return <Animated.View ref={ref} style={styles.box} />;
}

function BorderedBox() {
  const ref = useTestRef('box');
  return <Animated.View ref={ref} style={[styles.box, styles.borderedBox]} />;
}

describe('Mounted view props', () => {
  test('reads the background color that an animated style sets', async () => {
    await render(<AnimatedBackgroundBox color="red" />);
    await waitForFrames();
    const component = getTestComponent('box');
    expect((await component.getMountedViewProps())?.backgroundColor).toBe(
      'red',
      ComparisonMode.COLOR
    );

    await render(<AnimatedBackgroundBox color="lime" />);
    await expectEventually(
      async () => (await component.getMountedViewProps())?.backgroundColor
    ).toBe('lime', ComparisonMode.COLOR);
  });

  test('reads the background color of a view with an unclipped border', async () => {
    await render(<BorderedBox />);
    await waitForFrames();
    expect(
      (await getTestComponent('box').getMountedViewProps())?.backgroundColor
    ).toBe('red', ComparisonMode.COLOR);
  });

  test('reads a transparent background color when a view has none', async () => {
    await render(<TransparentBox />);
    await waitForFrames();
    expect(
      (await getTestComponent('box').getMountedViewProps())?.backgroundColor
    ).toBe('transparent', ComparisonMode.COLOR);
  });
});
