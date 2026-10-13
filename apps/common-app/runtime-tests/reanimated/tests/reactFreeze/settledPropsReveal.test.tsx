import React, { useEffect, useLayoutEffect } from 'react';
import { Freeze } from 'react-freeze';
import { StyleSheet } from 'react-native';
import Animated, {
  getStaticFeatureFlag,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';

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

const BOX_REF = 'settledRevealBox';
const STALE_OPACITY = 1;
const CURRENT_OPACITY = 0;

// Settle threshold (1000 ms) + two GC ticks (500 ms each) + margin.
const FROZEN_MS = 3000;

const SETTLE_TIMEOUT_MS = 500;

type HostInstance = {
  __internalInstanceHandle?: { stateNode?: { node?: unknown } };
};

const probe: {
  boxHost: HostInstance | null;
  opacity: SharedValue<number> | null;
  readOnReveal: boolean;
  revealOpacity: number | null;
} = {
  boxHost: null,
  opacity: null,
  readOnReveal: false,
  revealOpacity: null,
};

function readCommittedOpacity(host: HostInstance): number {
  const shadowNodeWrapper = host.__internalInstanceHandle?.stateNode?.node;
  if (shadowNodeWrapper === undefined) {
    throw new Error(`'${BOX_REF}' has no shadow node`);
  }
  return Number(
    runOnUISync(() => {
      'worklet';
      return global._obtainProp(shadowNodeWrapper, 'opacity');
    })
  );
}

// Placed before the box, so React runs this layout effect on reveal before the
// box re-attaches its animated style.
function RevealProbe() {
  useLayoutEffect(() => {
    if (!probe.readOnReveal || probe.boxHost === null) {
      return;
    }
    probe.readOnReveal = false;
    probe.revealOpacity = readCommittedOpacity(probe.boxHost);
  }, []);

  return null;
}

function Box({ label }: { label: string }) {
  const ref = useTestRef(BOX_REF);
  const opacity = useSharedValue(STALE_OPACITY);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  useEffect(() => {
    // The ref is detached while frozen, so keep the host instance around.
    probe.boxHost = ref.current as HostInstance | null;
    probe.opacity = opacity;
  }, [opacity, ref]);

  return (
    <Animated.View
      ref={ref}
      accessibilityLabel={label}
      style={[styles.box, animatedStyle]}
    />
  );
}

function Fixture({
  frozen,
  label = 'box',
}: {
  frozen: boolean;
  label?: string;
}) {
  return (
    <Freeze freeze={frozen}>
      <RevealProbe />
      <Box label={label} />
    </Freeze>
  );
}

async function readShadowTreeOpacity() {
  return Number(await getTestComponent(BOX_REF).getAnimatedStyle('opacity'));
}

describe('settled props across a Suspense reveal', () => {
  test('the reveal commit keeps the animated value React did not receive', async () => {
    if (!getStaticFeatureFlag('FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS')) {
      return;
    }
    probe.boxHost = null;
    probe.opacity = null;
    probe.readOnReveal = false;
    probe.revealOpacity = null;

    await render(<Fixture frozen={false} />);
    await waitForFrames(2);

    // Before the initial value settles, so React holds the first render's style.
    probe.opacity!.set(CURRENT_OPACITY);
    await expectEventually(readShadowTreeOpacity, SETTLE_TIMEOUT_MS).toBe(
      CURRENT_OPACITY,
      ComparisonMode.FLOAT_DISTANCE
    );

    await render(<Fixture frozen />);
    await wait(FROZEN_MS);

    probe.readOnReveal = true;
    await render(<Fixture frozen={false} />);
    await waitForFrames(2);

    expect(probe.readOnReveal).toBe(false);
    expect(probe.revealOpacity!).toBe(
      CURRENT_OPACITY,
      ComparisonMode.FLOAT_DISTANCE
    );
  });

  test('React holds the animated value once the revealed view settles', async () => {
    if (!getStaticFeatureFlag('FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS')) {
      return;
    }

    await render(<Fixture frozen={false} />);
    await waitForFrames(2);

    probe.opacity!.set(CURRENT_OPACITY);
    await expectEventually(readShadowTreeOpacity, SETTLE_TIMEOUT_MS).toBe(
      CURRENT_OPACITY,
      ComparisonMode.FLOAT_DISTANCE
    );

    await render(<Fixture frozen />);
    await wait(FROZEN_MS);
    await render(<Fixture frozen={false} />);

    await wait(FROZEN_MS);
    await render(<Fixture frozen={false} label="re-rendered box" />);
    await waitForFrames(2);
    expect(await readShadowTreeOpacity()).toBe(
      CURRENT_OPACITY,
      ComparisonMode.FLOAT_DISTANCE
    );
  });
});

const styles = StyleSheet.create({
  box: {
    width: 100,
    height: 100,
    backgroundColor: 'navy',
  },
});
