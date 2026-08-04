import React, { forwardRef, useEffect } from 'react';
import type { TextInputProps } from 'react-native';
import { StyleSheet, TextInput, View, Text } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const Box = forwardRef<
  React.ComponentRef<typeof TextInput>,
  TextInputProps & { backgroundColor?: string }
>(({ backgroundColor, ...rest }, ref) => {
  if (backgroundColor !== undefined) {
    throw new Error(
      `Wrapped component received animated style value backgroundColor=${backgroundColor} as a top-level prop`
    );
  }
  return <TextInput ref={ref} editable={false} {...rest} />;
});

const AnimatedBox = Animated.createAnimatedComponent(Box);

export default function SettledPropsLeakExample() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = withTiming(1);
  }, [sv]);

  const text = useDerivedValue(() => `${Math.round(sv.value * 100)}`);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sv.value, [0, 1], ['red', 'lime']),
  }));

  const animatedProps = useAnimatedProps(() => ({
    text: text.value,
    defaultValue: text.value,
  }));

  return (
    <View style={styles.container}>
      <Text>
        The box below animates from red to lime and from 0 to 100. Once the
        animations settle, the input should stay lime and display 100.
      </Text>
      <AnimatedBox
        style={[styles.box, animatedStyle]}
        animatedProps={animatedProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 50,
  },
  box: {
    width: 100,
    height: 100,
    textAlign: 'center',
  },
});
