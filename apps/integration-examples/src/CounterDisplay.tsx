import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const BLOCK_DURATION_S = 10;

export function CounterDisplay({ count }: { count: SharedValue<number> }) {
  const [reactCount, setReactCount] = useState(0);

  useAnimatedReaction(
    () => count.get(),
    (newCount) => scheduleOnRN(setReactCount, newCount)
  );

  const textProps = useAnimatedProps(() => ({
    text: String(count.get()),
    defaultValue: String(count.get()),
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${count.get() % 100}%` }));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Shared value, updated on the UI thread</Text>
      <AnimatedTextInput
        testID="shared-value-count"
        editable={false}
        animatedProps={textProps}
        style={styles.count}
      />
      <View style={styles.track}>
        <Animated.View style={[styles.bar, barStyle]} />
      </View>

      <Text style={styles.label}>React state, updated on the JS thread</Text>
      <Text testID="react-state-count" style={styles.count}>
        {reactCount}
      </Text>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${reactCount % 100}%` }]} />
      </View>

      <Button
        testID="block-js-thread"
        title={`Block the JS thread for ${BLOCK_DURATION_S} s`}
        onPress={blockJsThread}
      />
    </View>
  );
}

function blockJsThread() {
  const end = Date.now() + BLOCK_DURATION_S * 1000;
  let now = Date.now();
  while (now < end) {
    now = Date.now();
  }
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    fontSize: 16,
  },
  count: {
    fontSize: 32,
    fontVariant: ['tabular-nums'],
    color: 'black',
    padding: 0,
  },
  track: {
    height: 12,
    backgroundColor: '#ddd',
    marginBottom: 24,
  },
  bar: {
    height: '100%',
    backgroundColor: '#001a72',
  },
});
