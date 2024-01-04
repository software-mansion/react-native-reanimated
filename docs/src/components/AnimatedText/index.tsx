import React from 'react';
import { TextInput } from 'react-native';
import Animated, { useAnimatedProps } from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
Animated.addWhitelistedNativeProps({ text: true });

export default function AnimatedText({ text, ...props }) {
  return (
    <AnimatedTextInput
      editable={false}
      {...props}
      value={text.value}
      // @ts-ignore
      animatedProps={useAnimatedProps(() => ({ text: text.value }))}
    />
  );
}
