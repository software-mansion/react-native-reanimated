import React, { Suspense, use } from 'react';
import type { ViewStyle } from 'react-native';
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

function Wrapper({ style, withBox }: { style?: ViewStyle; withBox: boolean }) {
  const ref = useTestRef('wrapper');
  return (
    <View ref={ref} style={style}>
      {withBox && <Box />}
    </View>
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

async function expectShownAt(name: string, tag: number) {
  const component = getTestComponent(name);
  expect(component.getTag()).toBe(tag);
  await expectEventually(
    async () => (await component.getMountedViewProps())?.opacity
  ).toBe(1, ComparisonMode.FLOAT_DISTANCE);
}

// On iOS, React Native hides a `display: none` view by leaving it out of the mounted tree, so
// showing it again creates the same tag while its exit animation still runs.
describe('Views that React re-creates', () => {
  test('shows a view again while its exit animation runs', async () => {
    await render(<HiddenBox hidden={false} />);
    await waitForFrames();
    const tag = getTestComponent('box').getTag();

    await render(<HiddenBox hidden />);
    await wait(EXIT_MS / 3);
    await render(<HiddenBox hidden={false} />);
    await wait(EXIT_MS);

    await expectShownAt('box', tag);
  });

  test('shows a suspended view again while its exit animation runs', async () => {
    await render(<SuspendedBox dataKey="first" />);
    await wait(EXIT_MS);
    const tag = getTestComponent('box').getTag();

    await render(<SuspendedBox dataKey="second" />);
    await wait(EXIT_MS);

    await expectShownAt('box', tag);
  });

  // A wrapper without a style flattens, and its removal is withheld while its child exits.
  test('shows a flattened wrapper again without the props of its earlier commits', async () => {
    await render(
      <Wrapper style={{ opacity: 0.5, backgroundColor: '#aa0000' }} withBox />
    );
    await waitForFrames();
    await render(
      <Wrapper style={{ opacity: 0.5, backgroundColor: '#00aa00' }} withBox />
    );
    await waitForFrames();
    const tag = getTestComponent('wrapper').getTag();

    await render(<Wrapper withBox={false} />);
    await waitForFrames();
    await render(
      <Wrapper style={{ backgroundColor: '#00aa00' }} withBox={false} />
    );
    await wait(EXIT_MS);

    await expectShownAt('wrapper', tag);
  });
});
