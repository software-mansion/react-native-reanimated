import React, { Suspense, use } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const EXIT_MS = 600;

const styles = StyleSheet.create({
  box: { width: 100, height: 60, backgroundColor: '#2277dd' },
  hidden: { display: 'none' },
});

function Box() {
  const ref = useTestRef('box');
  return (
    <Animated.View
      ref={ref}
      exiting={FadeOut.duration(EXIT_MS)}
      style={styles.box}
    />
  );
}

function HiddenBox({ hidden }: { hidden: boolean }) {
  const ref = useTestRef('box');
  return (
    <Animated.View
      ref={ref}
      exiting={FadeOut.duration(EXIT_MS)}
      style={[styles.box, hidden && styles.hidden]}
    />
  );
}

const delays = new Map<string, Promise<void>>();

function Suspending({ dataKey }: { dataKey: string }) {
  if (!delays.has(dataKey)) {
    delays.set(
      dataKey,
      new Promise((resolve) => setTimeout(resolve, EXIT_MS / 3))
    );
  }
  use(delays.get(dataKey)!);
  return null;
}

function SuspendedBox({ dataKey }: { dataKey: string }) {
  return (
    <Suspense fallback={<View style={styles.box} />}>
      <Suspending dataKey={dataKey} />
      <Box />
    </Suspense>
  );
}

async function expectBoxShownAt(tag: number) {
  const box = getTestComponent('box');
  expect(box.getTag()).toBe(tag);
  await expectEventually(
    async () => (await box.getMountedViewProps())?.opacity
  ).toBe(1, ComparisonMode.FLOAT_DISTANCE);
}

// React Native hides a `display: none` view by leaving it out of the mounted tree, so showing it
// again creates the same tag while its exit animation still runs.
describe('Views that React re-creates', () => {
  test('shows a view again while its exit animation runs', async () => {
    await render(<HiddenBox hidden={false} />);
    await waitForFrames();
    const tag = getTestComponent('box').getTag();

    await render(<HiddenBox hidden />);
    await wait(EXIT_MS / 3);
    await render(<HiddenBox hidden={false} />);
    await wait(EXIT_MS);

    await expectBoxShownAt(tag);
  });

  test('shows a suspended view again while its exit animation runs', async () => {
    await render(<SuspendedBox dataKey="first" />);
    await wait(EXIT_MS);
    const tag = getTestComponent('box').getTag();

    await render(<SuspendedBox dataKey="second" />);
    await wait(EXIT_MS);

    await expectBoxShownAt(tag);
  });
});
