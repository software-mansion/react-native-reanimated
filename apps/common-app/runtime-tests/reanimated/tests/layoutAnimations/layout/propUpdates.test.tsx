import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadingTransition,
  type LayoutAnimationsValues,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  describe,
  expect,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
  waitForNotification,
} from '../../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../../ReJest/types';

function createTransition(events: { starts: number; finished: boolean[] }) {
  const recordStart = () => {
    events.starts += 1;
    notify('layout-start');
  };
  const recordEnd = (finished: boolean) => {
    events.finished.push(finished);
    if (finished) {
      notify('layout-finished');
    }
  };
  const transition = FadingTransition.duration(800).build();
  return (values: LayoutAnimationsValues) => {
    'worklet';
    scheduleOnRN(recordStart);
    return {
      ...transition(values),
      callback: (finished?: boolean) => {
        'worklet';
        scheduleOnRN(recordEnd, finished === true);
      },
    };
  };
}

function Box({
  layout,
  width = 120,
  blue = false,
  reversed = false,
}: {
  layout: ReturnType<typeof createTransition>;
  width?: number;
  blue?: boolean;
  reversed?: boolean;
}) {
  const ref = useTestRef('box');
  const children = [
    <Animated.View
      key="box"
      ref={ref}
      layout={layout}
      style={[
        styles.box,
        { width, backgroundColor: blue ? '#2277dd' : '#dd5522' },
      ]}
    />,
    <View key="sibling" style={styles.sibling} />,
  ];
  return (
    <View style={styles.container}>
      {reversed ? children.reverse() : children}
    </View>
  );
}

describe('Layout animation prop updates', () => {
  test.each([false, true])(
    'does not animate a color change, reordered: %p',
    async (reversed) => {
      const events = { starts: 0, finished: [] as boolean[] };
      const layout = createTransition(events);
      await render(<Box layout={layout} />);
      await waitForFrames();
      const tag = getTestComponent('box').getTag();

      await render(<Box layout={layout} blue reversed={reversed} />);
      await wait(1000);

      const component = getTestComponent('box');
      expect(component.getTag()).toBe(tag);
      expect(events.starts).toBe(0);
      expect(events.finished).toBe([]);
      expect(await component.getAnimatedStyle('backgroundColor')).toBe(
        '#2277dd',
        ComparisonMode.COLOR
      );
      expect(Number(await component.getAnimatedStyle('opacity'))).toBe(1);
    }
  );

  test('keeps a running transition when only the color changes', async () => {
    const events = { starts: 0, finished: [] as boolean[] };
    const layout = createTransition(events);
    await render(<Box layout={layout} />);
    await render(<Box layout={layout} width={240} />);
    await waitForNotification('layout-start');
    await wait(150);
    expect(events.finished).toBe([]);

    await render(<Box layout={layout} width={240} blue />);
    await waitForNotification('layout-finished');
    await waitForFrames();

    const component = getTestComponent('box');
    expect(events.starts).toBe(1);
    expect(events.finished).toBe([true]);
    expect(Number(await component.getAnimatedStyle('width'))).toBe(240);
    expect(Number(await component.getAnimatedStyle('opacity'))).toBe(1);
    expect(await component.getAnimatedStyle('backgroundColor')).toBe(
      '#2277dd',
      ComparisonMode.COLOR
    );
  });
});

const styles = StyleSheet.create({
  container: { width: 300, height: 160 },
  box: { position: 'absolute', left: 0, top: 0, height: 100 },
  sibling: { position: 'absolute', left: 0, top: 120, width: 70, height: 30 },
});
