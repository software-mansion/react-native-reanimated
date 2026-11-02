import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  configureReanimatedLogger,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import {
  afterEach,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  notify,
  render,
  test,
  useTestRef,
  waitForNotification,
} from '../../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../../ReJest/types';

// Reading or writing `sv.value` (or calling `sv.get()` / `sv.set()`) while
// React re-renders a component logs a strict-mode warning, the first render
// and useEffect do not, and `strict: false` silences it. The warnings are
// captured with the public `onLog` callback of configureReanimatedLogger, not
// by patching console.
//
// BOX_REF animates `opacity` (a non-layout prop, useAnimatedStyle -> ShadowTree
// commit, read with getAnimatedStyle) to check that a write during render
// still reaches the UI.

const BOX_REF = 'ACCESS_DURING_RENDER_BOX';
// Notifications stay set for the whole test, so each render gets its own.
const effectDone = (counter: number) =>
  `ACCESS_DURING_RENDER_EFFECT_DONE_${counter}`;

const WRITE_WARNING = 'Writing to `value` during component render';
const READ_WARNING = 'Reading from `value` during component render';

const MAX_COUNTER = 10;

type AccessIn = 'render' | 'effect';
// `get` and `set` go through the `value` accessors, so they warn the same way.
type AccessWith = 'value' | 'getSet';

function accessSharedValue(
  sv: SharedValue<number>,
  counter: number,
  accessWith: AccessWith
) {
  if (accessWith === 'value') {
    sv.value = counter;
    // oxlint-disable-next-line no-unused-expressions
    sv.value;
  } else {
    sv.set(counter);
    sv.get();
  }
}

const capturedLogs: string[] = [];

function captureLogs({ strict }: { strict: boolean }) {
  capturedLogs.length = 0;
  configureReanimatedLogger({ strict }, ({ message }) => {
    capturedLogs.push(message);
  });
}

function countLogs(text: string) {
  return capturedLogs.filter((message) => message.includes(text)).length;
}

function Scenario({
  counter,
  accessIn,
  accessWith,
}: {
  counter: number;
  accessIn: AccessIn;
  accessWith: AccessWith;
}) {
  const ref = useTestRef(BOX_REF);
  const sv = useSharedValue(0);

  if (accessIn === 'render') {
    accessSharedValue(sv, counter, accessWith);
  }

  useEffect(() => {
    if (accessIn === 'effect') {
      accessSharedValue(sv, counter, accessWith);
    }
    // Runs after any access in this commit, so the test can wait for it.
    notify(effectDone(counter));
  }, [sv, counter, accessIn, accessWith]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: sv.value / MAX_COUNTER,
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        ref={ref}
        collapsable={false}
        style={[styles.box, animatedStyle]}
      />
    </View>
  );
}

async function renderAndWaitForEffect(
  counter: number,
  accessIn: AccessIn,
  accessWith: AccessWith = 'value'
) {
  await render(
    <Scenario counter={counter} accessIn={accessIn} accessWith={accessWith} />
  );
  await waitForNotification(effectDone(counter));
}

describe('shared value access during render', () => {
  afterEach(() => {
    // Back to the default config, without the onLog callback.
    configureReanimatedLogger({});
  });

  test('the first render does not warn', async () => {
    captureLogs({ strict: true });

    await renderAndWaitForEffect(0, 'render');

    expect(countLogs(WRITE_WARNING)).toBe(0, ComparisonMode.NUMBER);
    expect(countLogs(READ_WARNING)).toBe(0, ComparisonMode.NUMBER);
  });

  test.each([
    {
      description: 'a write and a read during a re-render warn once each',
      accessIn: 'render' as const,
      accessWith: 'value' as const,
      strict: true,
      expectedWarnings: 1,
    },
    {
      description: 'set() and get() during a re-render warn once each',
      accessIn: 'render' as const,
      accessWith: 'getSet' as const,
      strict: true,
      expectedWarnings: 1,
    },
    {
      description: 'a write and a read in useEffect do not warn',
      accessIn: 'effect' as const,
      accessWith: 'value' as const,
      strict: true,
      expectedWarnings: 0,
    },
    {
      description: 'set() and get() in useEffect do not warn',
      accessIn: 'effect' as const,
      accessWith: 'getSet' as const,
      strict: true,
      expectedWarnings: 0,
    },
    {
      description: 'strict: false silences the warnings',
      accessIn: 'render' as const,
      accessWith: 'value' as const,
      strict: false,
      expectedWarnings: 0,
    },
  ])(
    '${description}',
    async ({ accessIn, accessWith, strict, expectedWarnings }) => {
      await renderAndWaitForEffect(0, accessIn, accessWith);
      // Capture only the re-render, like the example's "Re-render" button.
      captureLogs({ strict });

      await renderAndWaitForEffect(1, accessIn, accessWith);

      expect(countLogs(WRITE_WARNING)).toBe(
        expectedWarnings,
        ComparisonMode.NUMBER
      );
      expect(countLogs(READ_WARNING)).toBe(
        expectedWarnings,
        ComparisonMode.NUMBER
      );
    }
  );

  test.each([
    { description: 'during render', accessIn: 'render' as const },
    { description: 'in useEffect', accessIn: 'effect' as const },
  ])('a write ${description} reaches the UI', async ({ accessIn }) => {
    const counter = MAX_COUNTER / 2;
    await renderAndWaitForEffect(0, accessIn);
    await renderAndWaitForEffect(counter, accessIn);

    await expectEventually(async () =>
      Number(await getTestComponent(BOX_REF).getAnimatedStyle('opacity'))
    ).toBe(counter / MAX_COUNTER, ComparisonMode.FLOAT_DISTANCE);
  });
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'blue',
  },
});
