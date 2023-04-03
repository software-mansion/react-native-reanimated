import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Button,
  TextInput,
  TextInputProps,
  StyleSheet,
  View,
} from 'react-native';

import React from 'react';

Animated.addWhitelistedNativeProps({ text: true });

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function AnimatedTextInputExample() {
  const ref = React.useRef(0);

  const sv = useSharedValue(0);

  const text = useDerivedValue(() => {
    return Math.round(sv.value * 100).toString();
  });

  const animatedProps = useAnimatedProps(() => {
    return { text: text.value } as TextInputProps;
  });

  const handleToggle = () => {
    ref.current = 1 - ref.current;
    sv.value = withTiming(ref.current, { duration: 1000 });
  };

  return (
    <>
      <View style={styles.buttons}>
        <Button onPress={handleToggle} title="Toggle" />
      </View>
      <AnimatedTextInput
        underlineColorAndroid="transparent"
        editable={false}
        value={text.value}
        style={styles.text}
        animatedProps={animatedProps}
      />
    </>
  );
}

const styles = StyleSheet.create({
  buttons: {
    marginVertical: 50,
  },
  text: {
    fontSize: 100,
    textAlign: 'center',
  },
});
