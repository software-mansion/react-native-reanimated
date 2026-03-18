import React, { useCallback } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const DELTAS = [-100, -10, -1, 1, 10, 100];

export default function AmountExample() {
  const ref = React.useRef(10);

  const sv = useSharedValue(ref.current);

  const animatedProps = useAnimatedProps(() => {
    return { text: `$${sv.value.toFixed(2)}` };
  });

  const setValue = useCallback(
    (delta: number) => {
      ref.current += delta;
      sv.value = withTiming(ref.current, {
        duration: (Math.log(Math.abs(delta)) + 2) * 120,
      });
    },
    [sv]
  );

  return (
    <View style={styles.container}>
      <Animated.Text animatedProps={animatedProps} style={styles.text} />
      <View style={styles.row}>
        {DELTAS.map((delta) => (
          <Button
            key={delta}
            title={`${delta > 0 ? '+' : ''}${delta}`}
            onPress={() => setValue(delta)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 80,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 20,
  },
});
