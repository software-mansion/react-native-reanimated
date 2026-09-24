import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

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

const styles = StyleSheet.create({
  wrapper: { opacity: 0.5 },
  kept: { width: 100, height: 60, backgroundColor: '#2277dd' },
  dropped: { width: 100, height: 60, backgroundColor: '#dd5522' },
  nested: { width: 50, height: 20, backgroundColor: '#ddaa22' },
});

const droppedChildren = {
  plain: <View style={styles.dropped} />,
  nested: (
    <View style={styles.dropped}>
      <View style={styles.nested}>
        <View style={styles.nested} />
      </View>
    </View>
  ),
  exiting: (
    <Animated.View exiting={FadeOut.duration(300)} style={styles.dropped} />
  ),
};

function FlattenedWrapper({
  flat,
  dropped,
}: {
  flat: boolean;
  dropped: keyof typeof droppedChildren;
}) {
  const ref = useTestRef('kept');
  return (
    <View style={flat ? undefined : styles.wrapper}>
      <Animated.View ref={ref} style={styles.kept} />
      {!flat && droppedChildren[dropped]}
    </View>
  );
}

describe('View flattening', () => {
  test.each(['plain', 'nested', 'exiting'] as const)(
    'flattens a parent while one of its children is deleted, child: %s',
    async (dropped) => {
      await render(<FlattenedWrapper flat={false} dropped={dropped} />);
      await waitForFrames();
      const tag = getTestComponent('kept').getTag();

      await render(<FlattenedWrapper flat dropped={dropped} />);
      await waitForFrames();
      // unflattens the wrapper while it may still be withheld for the exiting child
      await render(<FlattenedWrapper flat={false} dropped={dropped} />);
      await waitForFrames();
      await render(<FlattenedWrapper flat dropped={dropped} />);
      await wait(500);

      expect(getTestComponent('kept').getTag()).toBe(tag);
    }
  );
});
