import type { Component, ReactElement } from 'react';
import { useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { EntryOrExitLayoutType } from 'react-native-reanimated';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
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

const FADE_IN = FadeIn.duration(100);

const styles = StyleSheet.create({
  list: { width: 200, height: ROWS.length * ROW_HEIGHT },
  cell: { position: 'absolute', left: 0, right: 0, height: ROW_HEIGHT },
  row: { height: ROW_HEIGHT, backgroundColor: '#2277dd' },
});

// The cell is layout-only, so it is flattened and the row is positioned by its own frame.
function Row({
  index,
  placed,
  entering,
}: {
  index: number;
  placed: boolean;
  entering: EntryOrExitLayoutType;
}) {
  const ref = useTestRef(`row${index}`);
  return (
    <View style={[styles.cell, { top: placed ? index * ROW_HEIGHT : 0 }]}>
      <Animated.View ref={ref} entering={entering} style={styles.row} />
    </View>
  );
}

function usePlacedInLayoutEffect(onPlaced: () => void) {
  const [placed, setPlaced] = useState(false);
  useLayoutEffect(() => {
    setPlaced(true);
  }, []);
  useEffect(() => {
    if (placed) {
      onPlaced();
    }
  }, [placed, onPlaced]);
  return placed;
}

function RowsPlacedInLayoutEffect({
  onPlaced,
  entering = FADE_IN,
}: {
  onPlaced: () => void;
  entering?: EntryOrExitLayoutType;
}) {
  const placed = usePlacedInLayoutEffect(onPlaced);
  return (
    <View collapsable={false} style={styles.list}>
      {ROWS.map((index) => (
        <Row key={index} index={index} placed={placed} entering={entering} />
      ))}
    </View>
  );
}

// The cell stops being flattened while it moves, so the row moves into it.
function RowReparentedInLayoutEffect({ onPlaced }: { onPlaced: () => void }) {
  const placed = usePlacedInLayoutEffect(onPlaced);
  const ref = useTestRef('reparented');
  return (
    <View collapsable={false} style={styles.list}>
      <View
        collapsable={placed ? false : undefined}
        style={[styles.cell, { top: placed ? ROW_HEIGHT : 0 }]}>
        <Animated.View ref={ref} entering={FADE_IN} style={styles.row} />
      </View>
    </View>
  );
}

function ZoomedInRow() {
  const ref = useTestRef('zoomed');
  return (
    <Animated.View
      ref={ref}
      entering={ZoomIn.duration(100)}
      style={styles.row}
    />
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

async function renderWithUIThreadHeldUntilPlaced(
  renderElement: (onPlaced: () => void) => ReactElement<Component>
) {
  // The first entering animation initializes the layout animations manager on the UI thread.
  await render(renderElement(() => {}));
  await render(null);
  const onPlaced = await holdUIThreadUntilPlaced();
  await render(renderElement(onPlaced));
}

describe('Entering animation of a view moved before its first paint', () => {
  test('mounts the view at its final frame', async () => {
    await renderWithUIThreadHeldUntilPlaced((onPlaced) => (
      <RowsPlacedInLayoutEffect onPlaced={onPlaced} />
    ));
    await wait(500);

    for (const index of ROWS) {
      const mounted = await getTestComponent(
        `row${index}`
      ).getMountedViewProps();
      expect(mounted?.y).toBe(index * ROW_HEIGHT, ComparisonMode.PIXEL);
    }
  });

  test('mounts a view moved to another parent at its final frame', async () => {
    await renderWithUIThreadHeldUntilPlaced((onPlaced) => (
      <RowReparentedInLayoutEffect onPlaced={onPlaced} />
    ));
    await wait(500);

    const mounted = await getTestComponent('reparented').getMountedViewProps();
    expect(mounted?.y).toBe(0, ComparisonMode.PIXEL);
  });
});

describe('Entering animation that only transforms the view', () => {
  test('shows the view', async () => {
    await render(<ZoomedInRow />);
    await wait(500);

    const mounted = await getTestComponent('zoomed').getMountedViewProps();
    expect(mounted?.opacity).toBe(1, ComparisonMode.FLOAT_DISTANCE);
  });
});
