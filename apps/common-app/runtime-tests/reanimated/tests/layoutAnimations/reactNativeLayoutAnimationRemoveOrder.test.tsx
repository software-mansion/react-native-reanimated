import { LayoutAnimation, Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  isViewMountedNatively,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const ROW_HEIGHT = 20;
const EXITING = 'e';

const styles = StyleSheet.create({
  list: { width: 100 },
  row: { height: ROW_HEIGHT, backgroundColor: '#2277dd' },
  exitingRow: { backgroundColor: '#dd8844' },
});

function Row({ id }: { id: string }) {
  const ref = useTestRef(id);
  if (id === EXITING) {
    return (
      <Animated.View
        ref={ref}
        exiting={FadeOut.duration(1500)}
        style={[styles.row, styles.exitingRow]}
      />
    );
  }
  return <View ref={ref} collapsable={false} style={styles.row} />;
}

function List({ ids }: { ids: string[] }) {
  return (
    <View collapsable={false} style={styles.list}>
      {ids.map((id) => (
        <Row key={id} id={id} />
      ))}
    </View>
  );
}

// React Native's LayoutAnimation runs on Android only behind the `enableLayoutAnimationsOnAndroid`
// feature flag.
(Platform.OS === 'ios' ? describe : describe.skip)(
  'Layout animations with a removal that React Native LayoutAnimation defers',
  () => {
    // With `duration: 0`, React Native's LayoutAnimation appends the deferred Remove of `z` after
    // the Inserts of the same pull, and shifts its index for each of them. The parent gets
    // Remove m@2, Insert m@0, Insert n@3, Remove z@1. The exiting `e` lies directly below `m`, so
    // Insert m@0 moves it below the host index of the remove cursor of `m`, and a stale cursor
    // gave the host index of `a` for `z`.
    test('removes the right view after an Insert into the same parent', async () => {
      await render(<List ids={['z', 'a', EXITING, 'm']} />);
      await waitForFrames();
      const removedTag = getTestComponent('z').getTag();

      await render(<List ids={['z', 'a', 'm']} />);
      await wait(200);

      LayoutAnimation.configureNext({
        duration: 0,
        delete: { type: 'linear', property: 'opacity' },
      });
      await render(<List ids={['m', 'a', 'n']} />);
      await wait(200);

      expect(await isViewMountedNatively(removedTag)).toBe(false);
      const order = ['m', 'a', 'n'];
      const first = await getTestComponent(order[0]).getMountedViewProps();
      for (const [index, id] of order.entries()) {
        const mounted = await getTestComponent(id).getMountedViewProps();
        expect((mounted?.y ?? NaN) - (first?.y ?? NaN)).toBe(
          index * ROW_HEIGHT,
          ComparisonMode.PIXEL
        );
      }
    });
  }
);
