import {
  StyleSheet,
  TextInput,
  View,
  Dimensions,
  Text,
  // useWindowDimensions,
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

export const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const initialHeight = Dimensions.get('window').height;
    function onResize() {
      setKeyboardHeight(initialHeight - visualViewport.height);
    }
    const resizeListener = visualViewport?.addEventListener('resize', onResize);
    return () => {
      resizeListener.remove();
    };
  }, []);

  return keyboardHeight;
};

export default function AnimatedKeyboardExample() {
  const keyboardHeight = useKeyboardHeight();
  const [text, setText] = useState('');

  const sv = useSharedValue(550);

  useEffect(() => {
    setText(`current keyboard height is ${keyboardHeight}`);
    sv.value = withTiming(550 - keyboardHeight, { duration: 100 });
  }, [keyboardHeight, sv]);

  const animatedStyle = useAnimatedStyle(() => {
    return { height: sv.value };
  });

  const onInputFocus = () => {};

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text>{text}</Text>
      <TextInput style={styles.textInput} onFocus={onInputFocus} />
      <View style={styles.measuringBox} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 5,
    borderColor: 'green',
  },
  textInput: {
    flex: 1,
    borderColor: 'blue',
    borderStyle: 'solid',
    borderWidth: 2,
    width: 200,
    marginVertical: 30,
  },
  measuringBox: {
    width: 300,
    flex: 5,
    borderColor: 'purple',
    borderWidth: 2,
  },
});
