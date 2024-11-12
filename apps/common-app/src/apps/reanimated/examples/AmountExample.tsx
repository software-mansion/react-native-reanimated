import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
  createAnimatedPropAdapter,
} from 'react-native-reanimated';
import { Button, Platform, StyleSheet, TextInput, View } from 'react-native';
import React, { useCallback } from 'react';

Animated.addWhitelistedNativeProps({ text: true });

const textAdapter = createAnimatedPropAdapter(
  (props: Record<string, unknown>) => {
    props._setAttributeDirectly = true;
    props.value = props.text;
  },
  ['value']
);

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const DELTAS = [-100, -10, -1, 1, 10, 100];

export default function AmountExample() {
  const ref = React.useRef(10);

  const sv = useSharedValue(ref.current);

  const text = useDerivedValue(() => {
    return `$${sv.value.toFixed(2)}`;
  });

  const animatedProps = useAnimatedProps(
    () => {
      return { text: text.value, defaultValue: text.value };
    },
    [],
    Platform.OS === 'web' ? [textAdapter] : undefined
  );

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
      <AnimatedTextInput
        animatedProps={animatedProps}
        style={styles.text}
        editable={false}
        underlineColorAndroid="transparent"
      />
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
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 20,
  },
});
