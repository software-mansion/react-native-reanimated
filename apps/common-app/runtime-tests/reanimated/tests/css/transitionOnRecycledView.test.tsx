import React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

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

const TRANSITION_MS = 2000;

const styles = StyleSheet.create({
  box: { width: 100, height: 100 },
});

function TransitionBox({
  boxKey,
  highlighted,
}: {
  boxKey: number;
  highlighted: boolean;
}) {
  const ref = useTestRef('box');
  return (
    <Animated.View
      key={boxKey}
      ref={ref}
      style={[
        styles.box,
        {
          backgroundColor: highlighted ? 'blue' : 'red',
          transitionProperty: 'backgroundColor',
          transitionDuration: TRANSITION_MS,
          transitionTimingFunction: 'linear',
        },
      ]}
    />
  );
}

function redChannel(hexColor: string) {
  return parseInt(hexColor.slice(1, 3), 16);
}

async function presentedRedChannel() {
  const presented = await getTestComponent('box').getPresentedViewProps();
  return redChannel(presented?.backgroundColor ?? '');
}

describe('CSS transition on a view that replaces a transitioning view', () => {
  test('the new view shows its own color and transition', async () => {
    await render(<TransitionBox boxKey={0} highlighted={false} />);
    await waitForFrames();
    await render(<TransitionBox boxKey={0} highlighted />);
    await wait(TRANSITION_MS / 4);

    // React Native gives the new view the native view of the removed one.
    await render(<TransitionBox boxKey={1} highlighted={false} />);
    await waitForFrames(3);
    expect(await presentedRedChannel()).toBe(255);

    await render(<TransitionBox boxKey={1} highlighted />);
    await waitForFrames(3);
    expect(await presentedRedChannel()).toBeWithinRange(230, 255);
    await wait(TRANSITION_MS / 2);
    expect(await presentedRedChannel()).toBeWithinRange(40, 215);
  });
});
