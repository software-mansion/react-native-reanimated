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
  drawer: { height: 200, width: 300 },
  dropped: { backgroundColor: '#dd5522', height: 60, width: 100 },
  kept: { backgroundColor: '#2277dd', height: 60, width: 100 },
  nested: { backgroundColor: '#ddaa22', height: 20, width: 50 },
  wrapper: { opacity: 0.5 },
});

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
const AndroidDrawerLayout = (
  require('react-native/Libraries/Components/DrawerAndroid/AndroidDrawerLayoutNativeComponent') as {
    default: React.ComponentType<ViewProps & { drawerWidth?: number }>;
  }
).default;
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

const droppedChildren = {
  exiting: (
    <Animated.View exiting={FadeOut.duration(300)} style={styles.dropped} />
  ),
  nested: (
    <View style={styles.dropped}>
      <View style={styles.nested}>
        <View style={styles.nested} />
      </View>
    </View>
  ),
  plain: <View style={styles.dropped} />,
};

function FlattenedWrapper({
  dropped,
  flat,
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
  exiting,
  swapped,
}: {
  swapped: boolean;
  exiting: boolean;
}) {
  const ref = useTestRef('moved');
  return (
    <View style={swapped ? styles.wrapper : undefined}>
      <View style={swapped ? undefined : styles.wrapper}>
        <Animated.View
          exiting={exiting ? FadeOut.duration(300) : undefined}
          ref={ref}
          style={styles.kept}
        />
        <View style={styles.dropped} />
      </View>
    </View>
  );
}

function SwappedWrappersDroppingSibling({
  dropped,
  swapped,
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
      await render(<FlattenedWrapper dropped={dropped} flat={false} />);
      await waitForFrames();
      const tag = getTestComponent('kept').getTag();

      await render(<FlattenedWrapper dropped={dropped} flat />);
      await waitForFrames();
      // unflattens the wrapper while it may still be withheld for the exiting child
      await render(<FlattenedWrapper dropped={dropped} flat={false} />);
      await waitForFrames();
      await render(<FlattenedWrapper dropped={dropped} flat />);
      await wait(500);

      expect(getTestComponent('kept').getTag()).toBe(tag);
    }
  );

  test.each([false, true])(
    'unflattens a parent while its child flattens, moved child exiting: %s',
    async (exiting) => {
      await render(<SwappedWrappers exiting={exiting} swapped={false} />);
      await waitForFrames();
      const tag = getTestComponent('moved').getTag();

      await render(<SwappedWrappers exiting={exiting} swapped />);
      await waitForFrames();
      await render(<SwappedWrappers exiting={exiting} swapped={false} />);
      await waitForFrames();
      await render(<SwappedWrappers exiting={exiting} swapped />);
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
        <SwappedWrappersDroppingSibling dropped={dropped} swapped={false} />
      );
      await waitForFrames();
      const tag = getTestComponent('moved').getTag();

      await render(
        <SwappedWrappersDroppingSibling dropped={dropped} swapped />
      );
      await waitForFrames();
      await render(
        <SwappedWrappersDroppingSibling dropped={dropped} swapped={false} />
      );
      await waitForFrames();
      await render(
        <SwappedWrappersDroppingSibling dropped={dropped} swapped />
      );
      await wait(500);

      expect(getTestComponent('moved').getTag()).toBe(tag);
    }
  );
});

function DrawerContent() {
  const ref = useTestRef('content');
  return <Animated.View collapsable={false} ref={ref} style={styles.kept} />;
}

// AndroidDrawerLayout throws when it gets a third child, so a replaced child must be removed before
// its replacement is inserted.
function DrawerWithKeyedContent({ contentKey }: { contentKey: string }) {
  return (
    <AndroidDrawerLayout drawerWidth={100} style={styles.drawer}>
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
