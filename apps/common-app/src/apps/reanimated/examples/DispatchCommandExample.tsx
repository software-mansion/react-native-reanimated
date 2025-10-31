import React from 'react';
import { Button, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  dispatchCommand,
  useAnimatedRef,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function DispatchCommandExample() {
  const aref = useAnimatedRef<TextInput>();

  const focusFromJS = () => {
    console.log(_WORKLET);
    aref.current?.focus();
  };

  const blurFromJS = () => {
    console.log(_WORKLET);
    aref.current?.blur();
  };

  const focusFromUI = () => {
    scheduleOnUI(() => {
      console.log(_WORKLET);
      dispatchCommand(aref, 'focus');
    });
  };

  const blurFromUI = () => {
    scheduleOnUI(() => {
      console.log(_WORKLET);
      dispatchCommand(aref, 'blur');
    });
  };

  return (
    <View style={styles.container}>
      <AnimatedTextInput ref={aref} style={styles.input} />
      <Button onPress={focusFromJS} title="Focus from JS" />
      <Button onPress={blurFromJS} title="Blur from JS" />
      <Button onPress={focusFromUI} title="Focus from UI" />
      <Button onPress={blurFromUI} title="Blur from UI" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    width: 200,
    padding: 5,
  },
});
