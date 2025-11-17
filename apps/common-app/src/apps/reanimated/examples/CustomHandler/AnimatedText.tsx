import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import type { AnimatedStyle, SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedProps } from 'react-native-reanimated';

export function AnimatedText({
  style,
  text,
}: {
  style?: StyleProp<AnimatedStyle<TextStyle>>;
  text: SharedValue<string>;
}) {
  const animatedProps = useAnimatedProps(() => {
    return { text: text.value };
  });

  return (
    <Animated.Text
      // @ts-expect-error TODO fix animated props type
      animatedProps={animatedProps}
      style={[styles.text, style]}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    color: 'black',
  },
});
