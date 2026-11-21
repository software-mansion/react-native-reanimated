import type { ComponentRef } from 'react';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  getStaticFeatureFlag,
  useAnimatedRef,
} from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';

import {
  describe,
  expect,
  expectEventually,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { Operation } from '../../../ReJest/types';
import { leakingRegistries, NO_LEAKS } from '../reactFreeze/fixture';

type ShadowNodeWrapper = NonNullable<Operation['shadowNodeWrapper']>;

const PENDING_ANIMATED_PROPS = 'AnimatedPropsRegistry: ❌';
const IDLE_MS = 500;
const UNMOUNT_TIMEOUT_MS = 2000;

function Box({ onReady }: { onReady: (wrapper: ShadowNodeWrapper) => void }) {
  const ref = useAnimatedRef<ComponentRef<typeof View>>();

  useEffect(() => {
    onReady(ref() as ShadowNodeWrapper);
  }, [onReady, ref]);

  return <Animated.View ref={ref} style={styles.box} />;
}

describe('pending animated props of an unmounted view', () => {
  test('the unmount drops a typed update that no frame flushed yet', async () => {
    if (!getStaticFeatureFlag('USE_ANIMATION_BACKEND')) {
      return;
    }

    let shadowNodeWrapper: ShadowNodeWrapper | null = null;
    await render(
      <Box
        onReady={(wrapper) => {
          shadowNodeWrapper = wrapper;
        }}
      />
    );
    await wait(IDLE_MS);
    expect(leakingRegistries()).toBe(NO_LEAKS);

    const wrapper = shadowNodeWrapper!;
    runOnUISync(() => {
      'worklet';
      global._updateProps!([
        {
          name: 'View',
          shadowNodeWrapper: wrapper,
          updates: { opacity: 0.5 },
          isAnimatedProps: false,
        },
      ]);
    });
    expect(leakingRegistries()).toBe(PENDING_ANIMATED_PROPS);

    await render(null);
    await expectEventually(leakingRegistries, UNMOUNT_TIMEOUT_MS).toBe(
      NO_LEAKS
    );
  });
});

const styles = StyleSheet.create({
  box: { width: 100, height: 100 },
});
