import React from 'react';
import type { ViewProps } from 'react-native';
import { Platform, StyleSheet, View } from 'react-native';
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
  drawer: { width: 300, height: 200 },
});

const AndroidDrawerLayout = (
  require('react-native/Libraries/Components/DrawerAndroid/AndroidDrawerLayoutNativeComponent') as {
    default: React.ComponentType<ViewProps & { drawerWidth?: number }>;
  }
).default;

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

function SwappedWrappersDroppingSibling({
  swapped,
  dropped,
}: {
  swapped: boolean;
  dropped: keyof typeof droppedChildren;
}) {
  const ref = useTestRef('moved');
  return (
    <View style={swapped ? styles.wrapper : undefined}>
      <View style={swapped ? undefined : styles.wrapper}>
        {!swapped && droppedChildren[dropped]}
        <Animated.View ref={ref} style={styles.kept} />
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

  test.each(['plain', 'nested', 'exiting'] as const)(
    'unflattens a parent while its child flattens and drops a sibling of the moved child: %s',
    async (dropped) => {
      await render(
        <SwappedWrappersDroppingSibling swapped={false} dropped={dropped} />
      );
      await waitForFrames();
      const tag = getTestComponent('moved').getTag();

      await render(
        <SwappedWrappersDroppingSibling swapped dropped={dropped} />
      );
      await waitForFrames();
      await render(
        <SwappedWrappersDroppingSibling swapped={false} dropped={dropped} />
      );
      await waitForFrames();
      await render(
        <SwappedWrappersDroppingSibling swapped dropped={dropped} />
      );
      await wait(500);

      expect(getTestComponent('moved').getTag()).toBe(tag);
    }
  );
});

function DrawerContent() {
  const ref = useTestRef('content');
  return <Animated.View ref={ref} collapsable={false} style={styles.kept} />;
}

// AndroidDrawerLayout throws when it gets a third child, so a replaced child must be removed before
// its replacement is inserted.
function DrawerWithKeyedContent({ contentKey }: { contentKey: string }) {
  return (
    <AndroidDrawerLayout style={styles.drawer} drawerWidth={100}>
      <DrawerContent key={contentKey} />
      <View collapsable={false} style={styles.dropped} />
    </AndroidDrawerLayout>
  );
}

(Platform.OS === 'android' ? describe : describe.skip)('Removal order', () => {
  test('replaces a child of a view that holds at most two children', async () => {
    await render(<DrawerWithKeyedContent contentKey="a" />);
    await waitForFrames();
    const tag = getTestComponent('content').getTag();

    await render(<DrawerWithKeyedContent contentKey="b" />);
    await waitForFrames();

    expect(getTestComponent('content').getTag()).not.toBe(tag);
  });
});

function SwappedPair({ swapped }: { swapped: boolean }) {
  const first = useTestRef('first');
  const second = useTestRef('second');
  return (
    <View>
      {[first, second].map((ref, index) => (
        <View key={index} style={swapped ? styles.wrapper : undefined}>
          <View style={swapped ? undefined : styles.wrapper}>
            <Animated.View ref={ref} style={styles.kept} />
            <View style={styles.dropped} />
          </View>
        </View>
      ))}
    </View>
  );
}

// At step 2 the flattened wrapper stays in its parent until its Delete, while the parent also loses a
// sibling below it and still holds the exiting view removed at step 1.
function SwapBesideRemovals({ step }: { step: number }) {
  const ref = useTestRef('moved');
  return (
    <View>
      {step === 0 && (
        <Animated.View
          exiting={FadeOut.duration(1000)}
          style={styles.dropped}
        />
      )}
      {step < 2 && <View style={styles.dropped} />}
      <View style={step === 2 ? styles.wrapper : undefined}>
        <View style={step === 2 ? undefined : styles.wrapper}>
          <Animated.View ref={ref} style={styles.kept} />
        </View>
      </View>
    </View>
  );
}

describe('Removed subtrees', () => {
  test('swaps flattening in two wrappers of one parent', async () => {
    await render(<SwappedPair swapped={false} />);
    await waitForFrames();
    const firstTag = getTestComponent('first').getTag();
    const secondTag = getTestComponent('second').getTag();

    await render(<SwappedPair swapped />);
    await waitForFrames();
    await render(<SwappedPair swapped={false} />);
    await waitForFrames();

    expect(getTestComponent('first').getTag()).toBe(firstTag);
    expect(getTestComponent('second').getTag()).toBe(secondTag);
  });

  test('swaps flattening beside a removed sibling and an exiting one', async () => {
    await render(<SwapBesideRemovals step={0} />);
    await waitForFrames();
    const tag = getTestComponent('moved').getTag();

    await render(<SwapBesideRemovals step={1} />);
    await waitForFrames();
    await render(<SwapBesideRemovals step={2} />);
    await wait(1200);

    expect(getTestComponent('moved').getTag()).toBe(tag);
  });
});
