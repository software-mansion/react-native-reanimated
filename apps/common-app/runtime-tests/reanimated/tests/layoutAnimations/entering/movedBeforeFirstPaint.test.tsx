import { useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { createSynchronizable, scheduleOnUI } from 'react-native-worklets';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../../ReJest/types';

const ROW_HEIGHT = 50;
const ROWS = [0, 1, 2];

const styles = StyleSheet.create({
  list: { width: 200, height: ROWS.length * ROW_HEIGHT },
  cell: { position: 'absolute', left: 0, right: 0, height: ROW_HEIGHT },
  row: { height: ROW_HEIGHT, backgroundColor: '#2277dd' },
});

// The cell is layout-only, so it is flattened and the row is positioned by its own frame.
function Row({ index, placed }: { index: number; placed: boolean }) {
  const ref = useTestRef(`row${index}`);
  return (
    <View style={[styles.cell, { top: placed ? index * ROW_HEIGHT : 0 }]}>
      <Animated.View
        ref={ref}
        entering={FadeIn.duration(100)}
        style={styles.row}
      />
    </View>
  );
}

function RowsPlacedInLayoutEffect({ onPlaced }: { onPlaced: () => void }) {
  const [placed, setPlaced] = useState(false);
  useLayoutEffect(() => {
    setPlaced(true);
  }, []);
  useEffect(() => {
    if (placed) {
      onPlaced();
    }
  }, [placed, onPlaced]);
  return (
    <View collapsable={false} style={styles.list}>
      {ROWS.map((index) => (
        <Row key={index} index={index} placed={placed} />
      ))}
    </View>
  );
}

// On Android the entering animations start on the UI thread after the commit that inserts
// the rows. Holding that thread until the layout effect commit is done makes the commit
// arrive before they start, as it does in release builds.
async function holdUIThreadUntilPlaced() {
  const holding = createSynchronizable(false);
  const placed = createSynchronizable(false);
  scheduleOnUI(() => {
    holding.setBlocking(true);
    const start = performance.now();
    while (!placed.getBlocking() && performance.now() - start < 2000) {
      // do nothing
    }
  });
  // JS timers fire on the UI thread, so only microtasks can wait for it here.
  while (!holding.getBlocking()) {
    await Promise.resolve();
  }
  return () => placed.setBlocking(true);
}

describe('Entering animation of a view moved before its first paint', () => {
  test('mounts the view at its final frame', async () => {
    // The first entering animation initializes the layout animations manager on the UI thread.
    await render(<RowsPlacedInLayoutEffect onPlaced={() => {}} />);
    await render(null);

    const onPlaced = await holdUIThreadUntilPlaced();
    await render(<RowsPlacedInLayoutEffect onPlaced={onPlaced} />);
    await wait(500);

    for (const index of ROWS) {
      const mounted = await getTestComponent(
        `row${index}`
      ).getMountedViewProps();
      expect(mounted?.y).toBe(index * ROW_HEIGHT, ComparisonMode.PIXEL);
    }
  });
});
