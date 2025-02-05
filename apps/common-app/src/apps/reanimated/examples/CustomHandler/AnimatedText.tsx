import React from 'react';
import type { StyleProp, TextInputProps, TextStyle } from 'react-native';
import { StyleSheet, TextInput } from 'react-native';
import type { AnimatedStyle, SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedProps } from 'react-native-reanimated';

Animated.addWhitelistedNativeProps({ text: true });

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function AnimatedText({
  style,
  text,
}: {
  style?: StyleProp<AnimatedStyle<TextStyle>>;
  text: SharedValue<string>;
}) {
  const animatedProps = useAnimatedProps(() => {
    return { text: text.value } as unknown as TextInputProps;
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      value={text.value}
      style={[styles.text, style]}
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    color: 'black',
  },
});
