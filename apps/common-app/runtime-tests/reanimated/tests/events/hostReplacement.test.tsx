import type { ComponentRef, Ref } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { ScrollViewProps } from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import {
  beforeEach,
  describe,
  expect,
  expectEventually,
  getSharedValue,
  registerValue,
  render,
  test,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const LAST_OFFSET = 'HOST_REPLACEMENT_SCROLL_OFFSET';
const READY_ATTEMPTS = 10;

type ScrollHost = ComponentRef<typeof ScrollView>;

let currentHost: ScrollHost | null = null;
let replaceHost: (() => void) | null = null;
let outerRenderCount = 0;

describe('Scroll events after host replacement', () => {
  beforeEach(() => {
    currentHost = null;
    replaceHost = null;
    outerRenderCount = 0;
  });

  test('keeps the handler when only the child replaces its host', async () => {
    await render(<Scenario />);
    await expectScrollEvent(50);
    const initialRenderCount = outerRenderCount;

    for (let generation = 1; generation <= 3; generation++) {
      const previousHost = currentHost;
      if (!replaceHost) {
        throw new Error('Host replacement control was not set');
      }
      replaceHost();
      await expectEventually(
        () => currentHost !== null && currentHost !== previousHost
      ).toBe(true);

      await expectScrollEvent(50 * (generation + 1));
      expect(outerRenderCount).toBe(initialRenderCount, ComparisonMode.NUMBER);
    }
  });
});

function Scenario() {
  outerRenderCount += 1;
  const offset = useSharedValue(-1);
  registerValue(LAST_OFFSET, offset);
  const onScroll = useAnimatedScrollHandler((event) => {
    offset.value = event.contentOffset.x;
  });

  return (
    <AnimatedReplaceableScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
    />
  );
}

function ReplaceableScrollView({
  ref,
  ...props
}: ScrollViewProps & { ref?: Ref<ScrollHost> }) {
  const [hostKey, setHostKey] = useState(0);

  useEffect(() => {
    replaceHost = () => setHostKey((value) => value + 1);
    return () => {
      replaceHost = null;
    };
  }, []);

  const setRef = useCallback(
    (host: ScrollHost | null) => {
      currentHost = host;
      if (typeof ref === 'function') {
        return ref(host);
      }
      if (ref) {
        ref.current = host;
      }
    },
    [ref]
  );

  return (
    <ScrollView
      {...props}
      key={hostKey}
      ref={setRef}
      horizontal
      style={styles.list}>
      <View style={styles.content} />
    </ScrollView>
  );
}

const AnimatedReplaceableScrollView = Animated.createAnimatedComponent(
  ReplaceableScrollView
);

async function expectScrollEvent(offset: number) {
  const host = currentHost;
  if (!host) {
    throw new Error('Scroll view ref was not set');
  }

  let target = offset;
  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt++) {
    target = offset + attempt;
    host.scrollTo({ x: target, animated: false });
    await waitForFrames(5);
    if (Math.abs((await getSharedValue<number>(LAST_OFFSET)) - target) < 0.5) {
      break;
    }
  }

  expect(await getSharedValue<number>(LAST_OFFSET)).toBe(
    target,
    ComparisonMode.PIXEL
  );
}

const styles = StyleSheet.create({
  list: { width: 100, height: 100, flexGrow: 0 },
  content: { width: 1000, height: 100 },
});
