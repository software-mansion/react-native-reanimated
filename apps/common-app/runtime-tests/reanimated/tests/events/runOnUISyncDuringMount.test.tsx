import { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';

import {
  describe,
  notify,
  render,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const ROUNDS = 30;
const HOLD_MS = 100;

function List() {
  const offset = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    offset.value = event.contentOffset.y;
  });
  return (
    <Animated.ScrollView
      onScroll={onScroll}
      contentOffset={{ x: 0, y: 100 }}
      style={styles.list}>
      <View style={styles.content} />
    </Animated.ScrollView>
  );
}

function Scene({ round }: { round: number }) {
  useLayoutEffect(() => {
    // The UI thread mounts the list while this worklet holds UI Runtime. The
    // list scrolls to its content offset in its layout, and the scroll event
    // waits for UI Runtime inside the frame callback of ReactChoreographer.
    runOnUISync(() => {
      'worklet';
      const end = Date.now() + HOLD_MS;
      while (Date.now() < end) {
        // Hold UI Runtime.
      }
      requestAnimationFrame(() => {});
    });
  }, [round]);
  return <List key={round} />;
}

describe('runOnUISync during a mount', () => {
  test('requests an animation frame while a mounted view sends an event', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      await render(<Scene round={round} />);
    }
    runOnUISync(() => {
      'worklet';
      requestAnimationFrame(() => notify('frame'));
    });
    await waitForNotification('frame');
  });
});

const styles = StyleSheet.create({
  list: { width: 200, height: 200 },
  content: { width: 200, height: 1000 },
});
