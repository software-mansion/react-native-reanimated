import React, { useEffect } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// NOTE: It is recommended to use <Animated.Text> component instead of AnimatedTextInput for text animations.

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function AnimatedTextInputExample() {
  const sv = useSharedValue(0);

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(100, { duration: 1500 }), -1, true);
  }, [sv]);

  const animatedProps = useAnimatedProps(() => {
    return {
      text: `${Math.round(sv.value)}`,
      defaultValue: `${Math.round(sv.value)}`,
    };
  });

  return (
    <View style={styles.container}>
      <AnimatedTextInput
        animatedProps={animatedProps}
        style={styles.input}
        editable={false}
        underlineColorAndroid="transparent"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    fontSize: 100,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
