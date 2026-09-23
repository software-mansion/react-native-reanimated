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

// Y > X > [moved, sibling]. Y unflattens while X flattens in the same commit, so
// the children of X move to Y. The differ emits the Remove of X before the
// Removes of its children. `moved` stays mounted throughout, so its FadeOut must
// never start.
function SwappedWrappers({
  swapped,
  exiting,
}: {
  swapped: boolean;
  exiting: boolean;
}) {
  const ref = useTestRef('moved');
  return (
    <View style={swapped ? styles.wrapper : undefined}>
      <View style={swapped ? undefined : styles.wrapper}>
        <Animated.View
          ref={ref}
          exiting={exiting ? FadeOut.duration(300) : undefined}
          style={styles.kept}
        />
        <View style={styles.dropped} />
      </View>
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

  test.each([false, true])(
    'unflattens a parent while its child flattens, moved child exiting: %s',
    async (exiting) => {
      await render(<SwappedWrappers swapped={false} exiting={exiting} />);
      await waitForFrames();
      const tag = getTestComponent('moved').getTag();

      await render(<SwappedWrappers swapped exiting={exiting} />);
      await waitForFrames();
      await render(<SwappedWrappers swapped={false} exiting={exiting} />);
      await waitForFrames();
      await render(<SwappedWrappers swapped exiting={exiting} />);
      await wait(100);
      // a FadeOut started on the moved view would be about a third through by now
      expect(
        Number(await getTestComponent('moved').getAnimatedStyle('opacity'))
      ).toBe(1);
      await wait(500);

      const moved = getTestComponent('moved');
      expect(moved.getTag()).toBe(tag);
      expect(Number(await moved.getAnimatedStyle('opacity'))).toBe(1);
    }
  );
});
