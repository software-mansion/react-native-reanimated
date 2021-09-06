import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
} from 'react-native';
import Animated, { useAnimatedProps } from 'react-native-reanimated';

Animated.addWhitelistedNativeProps({ text: true });

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function AnimatedText({
  style,
  text,
}: {
  style?: StyleProp<Animated.AnimateStyle<StyleProp<TextStyle>>>;
  text: Animated.SharedValue<string>;
}): React.ReactElement {
  const animatedProps = useAnimatedProps(() => {
    return ({ text: text.value } as unknown) as TextInputProps;
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
